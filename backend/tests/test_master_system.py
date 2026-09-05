"""Integration tests for AEGIS Institutional Risk-Control System:
Regime AI, Contagion Lens, Reverse Stress, RAG, Copilot, and Master State Contract.
"""

import pytest
from app.database import SessionLocal
from app.services.portfolio_service import get_default_portfolio
from app.services.regime_service import detect_market_regime
from app.services.contagion_service import compute_correlation_contagion
from app.services.reverse_stress import run_reverse_stress_sweep
from app.services.rag_service import query_rag, get_policy_evidence_for_risk_state
from app.services.copilot_service import get_copilot_assessment
from app.services.learning_service import get_decision_outcomes


class TestAEGISMasterSystem:
    def setup_method(self):
        self.db = SessionLocal()
        self.portfolio = get_default_portfolio(self.db)

    def teardown_method(self):
        self.db.close()

    def test_market_regime_detection(self):
        # Calm test
        res_calm = detect_market_regime(self.db, volatility_override=0.10, drawdown_override=0.04)
        assert res_calm["regime"] in ("CALM", "TRANSITION")
        assert res_calm["confidence"] > 0.40

        # Crisis test
        res_crisis = detect_market_regime(self.db, volatility_override=0.30, drawdown_override=0.20)
        assert res_crisis["regime"] == "CRISIS"
        assert len(res_crisis["drivers"]) > 0

    def test_correlation_contagion_lens(self):
        res = compute_correlation_contagion(self.db, self.portfolio, is_stressed=True)
        assert res["average_stressed_correlation"] > res["average_normal_correlation"]
        assert res["contagion_spread"] > 0.10
        assert len(res["clusters"]) >= 2
        # Verify growth cluster risk contribution
        growth_cluster = res["clusters"][0]
        assert growth_cluster["risk_contribution"] > growth_cluster["capital_exposure"]

    def test_reverse_stress_testing(self):
        res = run_reverse_stress_sweep(self.db, self.portfolio, failure_threshold_score=80.0)
        assert res["distance_to_failure"] > 0.0
        assert "distance_to_failure_pct" in res
        assert 0.0 <= res["resilience_score"] <= 100.0
        assert len(res["sweep_points"]) > 10

    def test_rag_intelligence_retrieval(self):
        # Query policy on cash floor and equity cap
        results = query_rag("cash floor equity limit safe operating envelope", top_k=2)
        assert len(results) > 0
        assert any("policy" in r["document"].lower() or "governance" in r["document"].lower() for r in results)

        evidence = get_policy_evidence_for_risk_state(84.0, "RED", "Equity")
        assert len(evidence) > 0

    def test_ai_risk_manager_copilot(self):
        assessment = get_copilot_assessment(self.db, self.portfolio, user_query="Why is this intervention required?")
        assert len(assessment["why_is_this_happening"]) > 20
        assert len(assessment["why_this_intervention"]) > 20
        assert len(assessment["what_could_go_wrong"]) > 20
        assert len(assessment["policy_evidence"]) > 0
        assert assessment["custom_response"] is not None

    def test_audit_outcomes_learning(self):
        outcomes = get_decision_outcomes(self.db)
        assert len(outcomes) > 0
        first = outcomes[0]
        assert "decision_id" in first
        assert "loss_avoided_pct" in first["subsequent_outcome"]
        assert "capital_preserved_est" in first["subsequent_outcome"]
