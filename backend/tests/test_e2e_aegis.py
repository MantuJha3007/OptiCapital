"""End-to-End Test for AEGIS MVP Milestone 1:
Normal Portfolio -> Market Crash -> CRISIS / RED Envelope -> Minimum Intervention Optimizer -> Independent Validator (PASS) -> Rebalance Approval -> Updated Portfolio
"""

import pytest
from app.database import SessionLocal
from app.models.portfolio import Portfolio
from app.models.scenario import Scenario
from app.models.holding import Holding
from app.services.scenario_engine import run_scenario
from app.services.rebalancer import approve_rebalance
from app.services.risk_engine import calculate_risk


from decimal import Decimal
from app.models.asset import Asset


def reset_holdings(db):
    portfolio = db.query(Portfolio).first()
    if not portfolio:
        return
    asset_map = {a.symbol: a for a in db.query(Asset).all()}
    defaults = {
        "EQUITY": 0.45,
        "GOV_BONDS": 0.25,
        "CORP_BONDS": 0.15,
        "GOLD": 0.10,
        "CASH": 0.05,
    }
    capital = float(portfolio.total_capital)
    for sym, w in defaults.items():
        if sym in asset_map:
            h = db.query(Holding).filter(Holding.portfolio_id == portfolio.id, Holding.asset_id == asset_map[sym].id).first()
            if h:
                h.weight = w
                h.market_value = Decimal(str(round(w * capital, 2)))
    db.commit()


class TestAEGISEndToEndMilestone1:
    """Verify the complete detect -> stress -> control -> optimize -> validate -> approve loop."""

    def setup_method(self):
        db = SessionLocal()
        try:
            reset_holdings(db)
        finally:
            db.close()

    def teardown_method(self):
        db = SessionLocal()
        try:
            reset_holdings(db)
        finally:
            db.close()

    def test_complete_aegis_mvp_flow(self):
        db = SessionLocal()
        try:
            # 1. Baseline Portfolio
            portfolio = db.query(Portfolio).first()
            assert portfolio is not None, "Seeded portfolio must exist"

            baseline_risk = calculate_risk(db, portfolio)
            assert baseline_risk.risk_score < 30.0, f"Baseline risk must be SAFE, got {baseline_risk.risk_score}"
            assert baseline_risk.risk_level == "SAFE"
            assert baseline_risk.operating_envelope == "GREEN"
            assert baseline_risk.intervention_required is False

            # 2. Select and run Market Crash scenario
            crash_scenario = db.query(Scenario).filter(Scenario.name == "Market Crash").first()
            assert crash_scenario is not None, "Market Crash scenario must exist"

            sim_result = run_scenario(db, portfolio, crash_scenario)

            # 3. Verify Stressed State breaches the Safe Operating Envelope
            stressed = sim_result["stressed"]
            assert stressed["risk_score"] >= 80.0, f"Market Crash must breach CRISIS threshold (>=80), got {stressed['risk_score']}"
            assert stressed["risk_level"] == "CRISIS"
            assert stressed["operating_envelope"] == "RED"
            assert stressed["intervention_required"] is True
            assert stressed["drawdown"] > 0.15, "Immediate compounded drawdown must be elevated"
            assert stressed["volatility"] > 0.15, "Market volatility must be stressed"

            # 4. Verify Control Engine Breaches & Dynamic Mode
            control = sim_result["control"]
            assert control["mode"] == "CRISIS"
            assert control["operating_envelope"] == "RED"
            assert control["intervention_required"] is True
            assert len(control["breaches"]) > 0

            # 5. Verify Minimum-Intervention Proposed Allocation & Validator PASS
            rec = sim_result["recommendation"]
            assert rec["action"] == "CRISIS_PROTECTION"
            assert rec["intervention_required"] is True

            val = rec["validator"]
            assert val["status"] == "PASS"
            assert val["valid"] is True
            assert len(val["violations"]) == 0
            assert len(val["checks"]) == 6

            # Verify the 6 invariant checks specifically
            check_names = {c["name"] for c in val["checks"]}
            assert "BUDGET_SUM_CONSERVATIVE" in check_names
            assert "LONG_ONLY_CONSTRAINT" in check_names
            assert "EQUITY_CAP_CONSTRAINT" in check_names
            assert "CASH_FLOOR_CONSTRAINT" in check_names
            assert "VOLATILITY_CEILING" in check_names
            assert "CONCENTRATION_LIMIT" in check_names

            for c in val["checks"]:
                assert c["passed"] is True, f"Check {c['name']} failed"

            # 6. Verify Human Rebalance Approval
            opt_id = rec["optimization_id"]
            approval_result = approve_rebalance(db, opt_id)
            assert approval_result["approved"] is True
            assert approval_result["status"] == "APPROVED"
            assert "before_after" in approval_result
            assert "improvements" in approval_result["before_after"]

            # 7. Verify Updated Portfolio Holdings
            db.refresh(portfolio)
            updated_holdings = db.query(Holding).filter(Holding.portfolio_id == portfolio.id).all()
            assert len(updated_holdings) > 0

            # Post-rebalance risk should be lower
            post_risk = calculate_risk(db, portfolio)
            assert post_risk.risk_score < stressed["risk_score"]
            assert post_risk.risk_score < 60.0

        finally:
            db.close()

    def test_rebalance_rejection_flow(self):
        """Verify: Trigger Crash -> Recommendation -> Validator PASS -> REJECT -> Holdings Unchanged & Audit Recorded."""
        from app.services.rebalancer import reject_rebalance
        from app.services.learning_service import get_decision_outcomes

        db = SessionLocal()
        try:
            portfolio = db.query(Portfolio).first()
            assert portfolio is not None

            # Capture initial weights
            initial_weights = {h.asset.symbol: float(h.weight) for h in portfolio.holdings if h.asset}

            # Run Crash Scenario
            crash_scenario = db.query(Scenario).filter(Scenario.name.ilike("%Market Crash%")).first()
            sim_result = run_scenario(db, portfolio, crash_scenario)
            rec = sim_result["recommendation"]
            opt_id = rec["optimization_id"]

            # Rebalance Rejection
            rej_result = reject_rebalance(db, opt_id)
            assert rej_result["status"] == "REJECTED"
            assert rej_result["approved"] is False

            # Verify Holdings have NOT changed
            db.refresh(portfolio)
            current_weights = {h.asset.symbol: float(h.weight) for h in portfolio.holdings if h.asset}
            for sym, w in initial_weights.items():
                assert abs(current_weights[sym] - w) < 1e-4

            # Verify Audit Trail records rejection
            outcomes = get_decision_outcomes(db)
            assert len(outcomes) > 0
            latest = outcomes[0]
            assert latest["approved"] is False
            assert latest["subsequent_outcome"]["audit_status"] == "REJECTED_BY_OFFICER"
            assert latest["subsequent_outcome"]["loss_avoided_pct"] == "0.0%"

        finally:
            db.close()

    def test_euler_attribution_mathematical_properties(self):
        """Verify: Euler component risk decomposition satisfies sum(PRC) == 100% and identifies primary driver."""
        from app.services.risk_attribution import compute_risk_attribution

        db = SessionLocal()
        try:
            portfolio = db.query(Portfolio).first()
            attribution = compute_risk_attribution(db, portfolio)

            assert "risk_attributions" in attribution
            assert len(attribution["risk_attributions"]) == 5

            # Sum of percentage risk contributions must equal 1.0 (100%)
            total_prc = sum(item["percentage_risk_contribution"] for item in attribution["risk_attributions"])
            assert abs(total_prc - 1.0) < 1e-3

            # Primary driver must be the highest risk contributor
            assert attribution["primary_driver"] != "None"
            assert attribution["primary_driver_risk_pct"] > 30.0

        finally:
            db.close()

    def test_reverse_stress_resilience_shift(self):
        """Verify: Reverse stress testing failure boundary shifts and resilience increases post-defensive rebalance."""
        from app.services.reverse_stress import run_reverse_stress_sweep

        db = SessionLocal()
        try:
            portfolio = db.query(Portfolio).first()

            # Vulnerable allocation (high equity, low cash)
            vulnerable_weights = {"EQUITY": 0.70, "CORP_BONDS": 0.20, "GOV_BONDS": 0.05, "GOLD": 0.03, "CASH": 0.02}
            rev_vulnerable = run_reverse_stress_sweep(db, portfolio, weights_override=vulnerable_weights)

            # Defensive allocation (trimmed equity, high cash/gold)
            defensive_weights = {"EQUITY": 0.20, "CORP_BONDS": 0.10, "GOV_BONDS": 0.30, "GOLD": 0.20, "CASH": 0.20}
            rev_defensive = run_reverse_stress_sweep(db, portfolio, weights_override=defensive_weights)

            # Critical shock multiplier and distance to failure must increase
            assert rev_defensive["distance_to_failure"] >= rev_vulnerable["distance_to_failure"]
            assert rev_defensive["resilience_score"] > rev_vulnerable["resilience_score"]

        finally:
            db.close()

