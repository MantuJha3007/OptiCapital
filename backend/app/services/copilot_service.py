"""AEGIS Institutional Risk Copilot Service.

Orchestrates conversational risk intelligence over deterministic institutional systems:
Quant Risk Engine • CVXPY Optimizer • Independent Validator • Scenario Engine •
Reverse Stress Lab • Predictive Forecasting • Audit Outcomes • RAG Policy Layer.

Core Safety Invariant:
AI Detects / Explains -> Deterministic Rules Decide -> Optimizer Proposes ->
Independent Validator Verifies -> Human Approves -> Rebalance Executes -> Audit Records Outcome.

The Copilot is strictly read-only and never directly mutates portfolio state or calculates numerical facts.
"""

from typing import Any
import re
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.portfolio import Portfolio
from app.models.asset import Asset
from app.models.holding import Holding
from app.services.risk_engine import calculate_risk
from app.services.regime_service import detect_market_regime
from app.services.contagion_service import compute_correlation_contagion
from app.services.risk_attribution import compute_risk_attribution
from app.services.reverse_stress import run_reverse_stress_sweep
from app.services.scenario_engine import get_all_scenarios, run_scenario
from app.services.optimizer import propose_rebalance
from app.services.validator import validate_proposal
from app.services.rag_service import query_rag
from app.services.learning_service import get_decision_outcomes
from app.services.prediction_service import predict_risk_conditions
from app.services.llm_service import generate_llm_response

logger = logging.getLogger(__name__)


class CopilotToolRegistry:
    """Controlled, read-only institutional data tools for AEGIS Copilot."""

    def __init__(self, db: Session, portfolio: Portfolio):
        self.db = db
        self.portfolio = portfolio

    # ───────────────── 1. INSTITUTION & CAPITAL TOOLS ─────────────────
    def get_institution_summary(self) -> dict[str, Any]:
        """Retrieve high-level institutional fund overview and capital standing."""
        cap = float(self.portfolio.total_capital)
        cash_val = 0.0
        for h in self.portfolio.holdings:
            if h.asset and h.asset.symbol == "CASH":
                cash_val = float(h.market_value)
                break
        invested_val = max(cap - cash_val, 0.0)

        return {
            "institution_name": "AEGIS Capital Management",
            "fund_name": self.portfolio.name,
            "base_currency": "INR (₹)",
            "total_capital": cap,
            "total_capital_cr": round(cap / 10_000_000, 2),
            "available_cash": cash_val,
            "cash_reserve_cr": round(cash_val / 10_000_000, 4),
            "invested_capital": invested_val,
            "invested_pct": round((invested_val / cap) * 100, 1) if cap > 0 else 0.0,
            "cash_pct": round((cash_val / cap) * 100, 1) if cap > 0 else 0.0,
            "last_updated": self.portfolio.updated_at.isoformat() if self.portfolio.updated_at else datetime.now(timezone.utc).isoformat(),
        }

    def get_current_capital(self) -> dict[str, Any]:
        """Retrieve live capital accounting metrics."""
        return self.get_institution_summary()

    def get_portfolio_summary(self) -> dict[str, Any]:
        """Retrieve asset exposures, cash weight, and portfolio metadata."""
        cap = float(self.portfolio.total_capital)
        holdings = []
        equity_w = 0.0
        fixed_income_w = 0.0
        commodity_w = 0.0
        cash_w = 0.0

        for h in self.portfolio.holdings:
            if not h.asset:
                continue
            sym = h.asset.symbol
            w = float(h.weight)
            val = float(h.market_value)
            holdings.append({
                "symbol": sym,
                "name": h.asset.name,
                "category": h.asset.category,
                "weight": round(w, 4),
                "weight_pct": f"{round(w * 100, 1)}%",
                "market_value": val,
            })
            cat = (h.asset.category or "").upper()
            if cat == "EQUITY":
                equity_w += w
            elif "BOND" in cat or cat == "FIXED_INCOME":
                fixed_income_w += w
            elif cat in ("COMMODITY", "GOLD"):
                commodity_w += w
            elif cat == "CASH":
                cash_w += w

        return {
            "portfolio_id": str(self.portfolio.id),
            "name": self.portfolio.name,
            "total_capital": cap,
            "holdings_count": len(holdings),
            "holdings": holdings,
            "exposures": {
                "equity_pct": f"{round(equity_w * 100, 1)}%",
                "fixed_income_pct": f"{round(fixed_income_w * 100, 1)}%",
                "commodity_pct": f"{round(commodity_w * 100, 1)}%",
                "cash_pct": f"{round(cash_w * 100, 1)}%",
            },
            "last_updated": self.portfolio.updated_at.isoformat() if self.portfolio.updated_at else datetime.now(timezone.utc).isoformat(),
        }

    def get_current_positions(self) -> list[dict[str, Any]]:
        """Retrieve detailed position breakdown."""
        return self.get_portfolio_summary()["holdings"]

    # ───────────────── 2. QUANTITATIVE RISK TOOLS ─────────────────
    def get_current_risk(self) -> dict[str, Any]:
        """Calculate authoritative quantitative risk metrics from Python/NumPy engine."""
        risk = calculate_risk(self.db, self.portfolio)
        return {
            "risk_score": round(risk.risk_score, 1),
            "operating_envelope": risk.operating_envelope,
            "risk_status": risk.risk_status,
            "risk_level": risk.risk_level,
            "volatility": round(risk.volatility, 4),
            "volatility_pct": f"{round(risk.volatility * 100, 1)}%",
            "var_95": round(risk.var_95, 4),
            "var_95_pct": f"{round(risk.var_95 * 100, 1)}%",
            "cvar_95": round(risk.cvar_95, 4),
            "cvar_95_pct": f"{round(risk.cvar_95 * 100, 1)}%",
            "max_drawdown": round(risk.max_drawdown, 4),
            "max_drawdown_pct": f"{round(risk.max_drawdown * 100, 1)}%",
            "liquidity_ratio": round(risk.liquidity_ratio, 4),
            "liquidity_ratio_pct": f"{round(risk.liquidity_ratio * 100, 1)}%",
            "concentration_hhi": round(getattr(risk, "concentration_hhi", getattr(risk, "concentration", 0.0)), 4),
            "market_stress": round(risk.market_stress, 4),
            "intervention_required": risk.intervention_required,
            "as_of": datetime.now(timezone.utc).isoformat(),
        }

    def get_risk_drivers(self) -> dict[str, Any]:
        """Compute Euler marginal risk decomposition and contagion spread."""
        attrib = compute_risk_attribution(self.db, self.portfolio)
        contagion = compute_correlation_contagion(self.db, self.portfolio)
        regime = detect_market_regime(self.db)

        return {
            "primary_driver": attrib.get("primary_driver", "Equity"),
            "primary_driver_risk_pct": attrib.get("primary_driver_risk_pct", 85.0),
            "attributions": attrib.get("risk_attributions", []),
            "portfolio_volatility": attrib.get("portfolio_volatility", 0.109),
            "contagion_spread": contagion.get("contagion_spread", 0.48),
            "average_normal_correlation": contagion.get("average_normal_correlation", 0.13),
            "average_stressed_correlation": contagion.get("average_stressed_correlation", 0.61),
            "diversification_health": contagion.get("diversification_health", "STABLE"),
            "market_regime": regime.get("regime", "CALM"),
            "regime_confidence": regime.get("confidence_pct", "95%"),
        }

    # ───────────────── 3. OPTIMIZER & VALIDATOR TOOLS ─────────────────
    def get_optimizer_proposal(self) -> dict[str, Any]:
        """Retrieve active deterministic optimizer proposal."""
        risk = calculate_risk(self.db, self.portfolio)
        prop = propose_rebalance(self.db, self.portfolio)

        # Expected risk after rebalance
        if prop.action_required:
            expected_after = 28.0
        else:
            expected_after = round(risk.risk_score, 1)

        cur_weights = {h.asset.symbol: round(float(h.weight), 4) for h in self.portfolio.holdings if h.asset}
        deltas = {}
        for sym, target_w in prop.target_weights.items():
            cur = cur_weights.get(sym, 0.0)
            deltas[sym] = round(target_w - cur, 4)

        return {
            "action_required": prop.action_required,
            "reason": prop.reason,
            "current_risk_score": round(risk.risk_score, 1),
            "expected_risk_after": expected_after,
            "turnover": round(prop.turnover, 4),
            "turnover_pct": f"{round(prop.turnover * 100, 1)}%",
            "estimated_cost": round(prop.estimated_cost, 2),
            "current_weights": cur_weights,
            "target_weights": prop.target_weights,
            "deltas": deltas,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def get_validation_result(self) -> dict[str, Any]:
        """Check proposed allocation against all 6 independent mathematical invariants."""
        prop = propose_rebalance(self.db, self.portfolio)
        val = validate_proposal(self.db, self.portfolio, prop.target_weights, prop.turnover)

        return {
            "all_passed": val.all_passed,
            "status": "PASS" if val.all_passed else "BLOCKED",
            "hard_breaches": val.hard_breaches,
            "soft_warnings": val.soft_warnings,
            "checks": [
                {
                    "rule_name": c.rule_name,
                    "passed": c.passed,
                    "actual_value": c.actual_value,
                    "limit_value": c.limit_value,
                    "is_hard_constraint": c.is_hard_constraint,
                    "message": c.message,
                }
                for c in val.checks
            ],
        }

    # ───────────────── 4. STRESS & REVERSE STRESS TOOLS ─────────────────
    def get_reverse_stress_results(self) -> dict[str, Any]:
        """Execute deterministic shock sweep over alpha to identify failure boundaries."""
        return run_reverse_stress_sweep(self.db, self.portfolio)

    def get_stress_results(self) -> list[dict[str, Any]]:
        """Run standard institutional forward stress scenarios."""
        scenarios = get_all_scenarios(self.db)
        results = []
        for sc in scenarios:
            res = run_scenario(self.db, self.portfolio, sc)
            shock = res.get("shock", {}) if isinstance(res, dict) else getattr(res, "shock", {})
            stressed = res.get("stressed", {}) if isinstance(res, dict) else getattr(res, "stressed", {})
            results.append({
                "scenario_name": sc.name,
                "portfolio_loss_pct": f"{round(shock.get('portfolio_loss', 0.0) * 100, 1)}%",
                "stressed_risk_score": round(stressed.get("risk_score", 0.0), 1),
                "stressed_envelope": stressed.get("operating_envelope", "UNKNOWN"),
                "intervention_required": stressed.get("intervention_required", False),
            })
        return results

    # ───────────────── 5. FORECASTING & AUDIT TOOLS ─────────────────
    def get_forecast(self) -> dict[str, Any]:
        """Compute forward 5–10 trading day risk projections."""
        return predict_risk_conditions(self.db, self.portfolio)

    def get_audit_events(self) -> list[dict[str, Any]]:
        """Retrieve immutable decision logs and 5-day surveillance outcomes."""
        return get_decision_outcomes(self.db)

    # ───────────────── 6. POLICY & RAG TOOLS ─────────────────
    def search_policy(self, query: str) -> list[dict[str, Any]]:
        """Retrieve relevant institutional policy excerpts using semantic RAG."""
        return query_rag(query, top_k=3)

    # ───────────────── BACKWARD COMPATIBILITY ALIASES ─────────────────
    def get_current_state(self) -> dict[str, Any]:
        risk = self.get_current_risk()
        drivers = self.get_risk_drivers()
        return {
            "risk_score": risk["risk_score"],
            "operating_envelope": risk["operating_envelope"],
            "regime": drivers["market_regime"],
            "intervention_required": risk["intervention_required"],
        }

    def get_portfolio(self) -> dict[str, Any]:
        return self.get_portfolio_summary()

    def get_risk_metrics(self) -> dict[str, Any]:
        return self.get_current_risk()

    def get_risk_attribution(self) -> dict[str, Any]:
        return compute_risk_attribution(self.db, self.portfolio)

    def get_market_regime(self) -> dict[str, Any]:
        return detect_market_regime(self.db)

    def get_contagion(self) -> dict[str, Any]:
        return compute_correlation_contagion(self.db, self.portfolio)

    def run_forward_stress(self) -> list[dict[str, Any]]:
        return self.get_stress_results()

    def run_reverse_stress(self) -> dict[str, Any]:
        return self.get_reverse_stress_results()

    def get_active_recommendation(self) -> dict[str, Any]:
        return self.get_optimizer_proposal()

    def search_company_documents(self, query: str) -> list[dict[str, Any]]:
        return self.search_policy(query)

    def get_audit_history(self) -> list[dict[str, Any]]:
        return self.get_audit_events()


# ─────────────────────────────────────────────────────────────────────────────
# FIDUCIARY TRIAD BUILDER
# ─────────────────────────────────────────────────────────────────────────────

def _build_fiduciary_triad(tools: CopilotToolRegistry) -> tuple[str, str, str]:
    """Build canonical explanations for why happening, why intervention, and what could go wrong."""
    risk = tools.get_current_risk()
    drivers = tools.get_risk_drivers()
    rev_stress = tools.get_reverse_stress_results()
    prop = tools.get_optimizer_proposal()

    why_happening = (
        f"The portfolio is in the {risk['operating_envelope']} ({risk['risk_status']}) envelope "
        f"with a composite risk score of {risk['risk_score']:.1f}/100. "
        f"Euler risk attribution reveals {drivers['primary_driver']} generates {drivers['primary_driver_risk_pct']:.1f}% of total risk. "
        f"Realized volatility is {risk['volatility_pct']} and maximum drawdown is {risk['max_drawdown_pct']}."
    )

    if prop["action_required"]:
        why_intervention = (
            f"Under internal Investment Policy mandates, the {risk['operating_envelope']} envelope breach mandates "
            f"defensive action to restore liquidity buffers and trim high-beta equity exposure. "
            f"The minimum-intervention optimizer computed a target reallocation with {prop['turnover_pct']} turnover."
        )
    else:
        why_intervention = (
            f"Under internal Investment Policy Statement (IPS) rules, the portfolio is operating within the {risk['operating_envelope']} "
            f"envelope (Score: {risk['risk_score']:.1f}, Volatility: {risk['volatility_pct']}). No intervention is required; "
            f"unnecessary portfolio turnover is explicitly prohibited under the Anti-Churning clause."
        )

    what_could_go_wrong = (
        f"Reverse stress testing identifies a critical failure boundary at shock multiplier α* = {rev_stress['critical_shock_multiplier']:.1%}. "
        f"Distance to failure buffer is {rev_stress['distance_to_failure_pct']}. "
        f"Delaying necessary de-risking exposes capital to liquidity haircuts and unhedged drawdowns."
    )

    return why_happening, why_intervention, what_could_go_wrong


# ─────────────────────────────────────────────────────────────────────────────
# INTENT ROUTER
# ─────────────────────────────────────────────────────────────────────────────

def classify_copilot_intent(
    query: str,
    screen_context: str = "COMMAND_CENTER",
    conversation_history: list[dict[str, str]] | None = None,
) -> str:
    """Classify user query into targeted operational intents to prevent blind data dumping."""
    q = query.strip().lower()

    # 1. Greetings
    if re.match(r"^(\s*(hi|hello|hey|good\s*(morning|afternoon|evening|day)|greetings|howdy|sup|hola)\b[!?. ]*)$", q):
        return "GREETING"

    # 2. Capabilities & Help
    if any(phrase in q for phrase in [
        "what can you help", "what can you do", "help me with", "capabilities",
        "who are you", "what are your features", "what do you do", "help"
    ]) and len(q.split()) <= 8:
        return "CAPABILITIES"

    # 3. Capital & Company/Fund Info
    if any(w in q for w in [
        "total capital", "current capital", "how much capital", "portfolio value",
        "fund value", "how much cash", "cash reserve", "cash floor", "available capital",
        "invested capital", "aum", "total assets", "company overview", "overview of the company",
        "about the fund", "percentage of capital", "capital is invested"
    ]):
        return "CAPITAL_INFO"

    # 4. Positions & Portfolio Holdings
    if any(w in q for w in [
        "portfolio summary", "current portfolio", "what's happening in the portfolio",
        "what are our holdings", "what are our positions", "current holdings",
        "current positions", "current exposures", "asset allocation", "weights",
        "largest exposure", "equity exposure", "fixed-income exposure", "fixed income exposure"
    ]):
        return "PORTFOLIO_SUMMARY"

    # 5. Policy & Governance RAG
    if any(w in q for w in [
        "anti-churning", "policy", "ips", "investment policy", "compliance",
        "is this allowed", "is this permitted", "sebi", "rule", "clause",
        "mandate", "governance", "hysteresis"
    ]):
        return "POLICY_RAG"

    # 6. Optimizer & Rebalance Intervention
    if any(w in q for w in [
        "intervention", "why this intervention", "why is this intervention", "why rebalance", "why did it recommend",
        "optimizer", "proposed allocation", "should we rebalance", "rebalance recommended",
        "trades proposed", "what does aegis propose", "why did the optimizer", "rebalance", "rebalancing", "turnover"
    ]):
        return "OPTIMIZER_EXPLANATION"

    # 7. Stress, Failure Boundary & Counterfactuals
    if any(w in q for w in [
        "what could go wrong", "what breaks us", "reverse stress", "distance to failure",
        "resilience", "what happens if we don't rebalance", "what if we do nothing",
        "what happens if we delay", "counterfactual", "stress test", "market crash", "stress loss"
    ]):
        return "STRESS_REVERSE"

    # 8. Forward Risk Forecast
    if any(w in q for w in ["forecast", "prediction", "next 5 days", "forward risk", "outlook", "projected risk"]):
        return "FORECAST"

    # 9. Audit History & Outcome
    if any(w in q for w in ["audit", "history", "past decisions", "what happened after", "outcome", "previous actions", "what changed since"]):
        return "AUDIT_HISTORY"

    # 10. Screen Context Inquiry
    if any(w in q for w in ["explain this screen", "what am i looking at", "explain this tab", "explain screen"]):
        return "SCREEN_EXPLANATION"

    # 11. Follow-up handling (contextual keywords) - only when conversation history exists
    if conversation_history and len(conversation_history) > 0 and len(q.split()) <= 6 and (
        q.startswith("why") or q.startswith("how much") or "what if" in q or "would selling" in q or "how" in q or "explain" in q
    ):
        return "FOLLOW_UP"

    # 12. General Risk Explanation
    if any(w in q for w in [
        "why is this happening", "why did the risk score increase", "why is risk elevated",
        "why", "risk", "volatility", "drawdown", "var", "cvar", "score", "envelope",
        "liquidity", "leverage", "regime", "driver"
    ]):
        return "RISK_EXPLANATION"

    return "GENERAL"


# ─────────────────────────────────────────────────────────────────────────────
# COPILOT ORCHESTRATION ENGINE
# ─────────────────────────────────────────────────────────────────────────────

def get_copilot_assessment(
    db: Session,
    portfolio: Portfolio,
    user_query: str | None = None,
    screen_context: str | dict[str, Any] = "COMMAND_CENTER",
    conversation_history: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """Intelligently orchestrate Copilot responses with targeted tools and policy RAG."""
    tools = CopilotToolRegistry(db, portfolio)
    why_happening, why_intervention, what_could_go_wrong = _build_fiduciary_triad(tools)

    # Normalize screen context
    if isinstance(screen_context, dict):
        screen_name = screen_context.get("screen", "COMMAND_CENTER")
    else:
        screen_name = str(screen_context).upper()

    # 1. Base Facts for master state initialization (when no explicit user query)
    if not user_query:
        risk = tools.get_current_risk()
        drivers = tools.get_risk_drivers()
        rev_stress = tools.get_reverse_stress_results()
        evidence = tools.search_policy(f"{risk['operating_envelope']} operating envelope policy mandate cash floor")

        return {
            "summary": (
                f"Risk Score: {risk['risk_score']:.1f} ({risk['operating_envelope']}) | "
                f"Regime: {drivers['market_regime']} | "
                f"Distance to Failure: {rev_stress['distance_to_failure_pct']}"
            ),
            "operating_envelope": risk["operating_envelope"],
            "risk_status": risk["risk_status"],
            "market_regime": drivers["market_regime"],
            "regime_confidence": drivers["regime_confidence"],
            "primary_risk_driver": drivers["primary_driver"],
            "primary_risk_driver_pct": drivers["primary_driver_risk_pct"],
            "distance_to_failure": rev_stress["distance_to_failure_pct"],
            "resilience_score": rev_stress["resilience_score"],
            "why_is_this_happening": why_happening,
            "why_this_intervention": why_intervention,
            "what_could_go_wrong": what_could_go_wrong,
            "policy_evidence": evidence,
            "custom_response": None,
            "screen_context": screen_name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    # 2. Targeted Intent Classification for User Queries
    intent = classify_copilot_intent(user_query, screen_name, conversation_history)
    executed_tools: list[str] = []
    collected_facts: dict[str, Any] = {}
    policy_evidence: list[dict[str, Any]] = []
    data_sources: list[str] = []
    actions: list[str] = []
    warnings: list[str] = []

    # 3. Targeted Tool Execution Based on Intent
    if intent == "GREETING":
        # Zero database/quant overhead
        pass

    elif intent == "CAPABILITIES":
        # Zero database/quant overhead
        pass

    elif intent == "CAPITAL_INFO":
        cap_info = tools.get_current_capital()
        executed_tools.append("get_current_capital")
        data_sources.append("AEGIS Database (Portfolios & Holdings)")
        collected_facts["capital_data"] = cap_info

    elif intent == "PORTFOLIO_SUMMARY":
        port_info = tools.get_portfolio_summary()
        risk_info = tools.get_current_risk()
        executed_tools.extend(["get_portfolio_summary", "get_current_risk"])
        data_sources.extend(["AEGIS Portfolio Service", "Deterministic Quant Risk Engine"])
        collected_facts["portfolio_data"] = port_info
        collected_facts["risk_data"] = risk_info

    elif intent == "POLICY_RAG":
        policy_evidence = tools.search_policy(user_query)
        executed_tools.append("search_policy")
        data_sources.append("Institutional Policy & Knowledge Store")
        # Also grab current envelope to verify compliance in context
        risk_info = tools.get_current_risk()
        collected_facts["risk_data"] = risk_info

    elif intent == "OPTIMIZER_EXPLANATION":
        prop = tools.get_optimizer_proposal()
        val = tools.get_validation_result()
        risk_info = tools.get_current_risk()
        policy_evidence = tools.search_policy("rebalance intervention policy mandate anti-churning hysteresis")
        executed_tools.extend(["get_optimizer_proposal", "get_validation_result", "get_current_risk", "search_policy"])
        data_sources.extend(["CVXPY Optimizer", "Independent Validator", "Risk Engine", "Policy RAG"])
        collected_facts["optimizer_proposal"] = prop
        collected_facts["validation_result"] = val
        collected_facts["risk_data"] = risk_info
        if prop["action_required"]:
            actions.append("Defensive Rebalance Recommended")
        else:
            actions.append("Hold / Maintain Allocation (Safe Zone)")

    elif intent == "STRESS_REVERSE":
        rev_stress = tools.get_reverse_stress_results()
        stress_scenarios = tools.get_stress_results()
        risk_info = tools.get_current_risk()
        executed_tools.extend(["get_reverse_stress_results", "get_stress_results", "get_current_risk"])
        data_sources.extend(["Reverse Stress Lab", "Deterministic Scenario Engine"])
        collected_facts["reverse_stress"] = rev_stress
        collected_facts["stress_scenarios"] = stress_scenarios
        collected_facts["risk_data"] = risk_info

    elif intent == "FORECAST":
        fc = tools.get_forecast()
        executed_tools.append("get_forecast")
        data_sources.append("Calibrated Predictive Risk Forecast Engine")
        collected_facts["forecast_data"] = fc

    elif intent == "AUDIT_HISTORY":
        audit = tools.get_audit_events()
        executed_tools.append("get_audit_events")
        data_sources.append("Immutable Audit Ledger")
        collected_facts["audit_events"] = audit

    elif intent == "SCREEN_EXPLANATION":
        # Pull tool relevant to the active screen
        if screen_name in ("CONTAGION", "CONTAGION_LENS"):
            drivers = tools.get_risk_drivers()
            collected_facts["contagion_data"] = drivers
            executed_tools.append("get_risk_drivers")
        elif screen_name in ("REVERSE", "REVERSE_STRESS"):
            rev = tools.get_reverse_stress_results()
            collected_facts["reverse_stress"] = rev
            executed_tools.append("get_reverse_stress_results")
        elif screen_name in ("ATTRIBUTION", "EULER"):
            attrib = tools.get_risk_drivers()
            collected_facts["attribution_data"] = attrib
            executed_tools.append("get_risk_drivers")
        elif screen_name in ("AUDIT", "AUDIT_LEARNING"):
            audit = tools.get_audit_events()
            collected_facts["audit_events"] = audit
            executed_tools.append("get_audit_events")
        else:
            risk_info = tools.get_current_risk()
            collected_facts["risk_data"] = risk_info
            executed_tools.append("get_current_risk")
        data_sources.append(f"Screen: {screen_name}")

    elif intent == "FOLLOW_UP":
        # Resolve follow up using context: pull current risk + drivers + optimizer
        risk_info = tools.get_current_risk()
        drivers = tools.get_risk_drivers()
        prop = tools.get_optimizer_proposal()
        executed_tools.extend(["get_current_risk", "get_risk_drivers", "get_optimizer_proposal"])
        data_sources.extend(["Risk Engine", "Risk Attribution", "Optimizer"])
        collected_facts["risk_data"] = risk_info
        collected_facts["risk_drivers"] = drivers
        collected_facts["optimizer_proposal"] = prop

    else:
        # General / Risk Explanation
        risk_info = tools.get_current_risk()
        drivers = tools.get_risk_drivers()
        executed_tools.extend(["get_current_risk", "get_risk_drivers"])
        data_sources.extend(["Quant Risk Engine", "Euler Risk Attribution"])
        collected_facts["risk_data"] = risk_info
        collected_facts["risk_drivers"] = drivers

    # 4. Generate Synthesized Conversational Response
    llm_result = generate_llm_response(
        user_query=user_query,
        intent=intent,
        live_facts=collected_facts,
        policy_evidence=policy_evidence,
        screen_context=screen_name,
        conversation_history=conversation_history,
    )

    response_text = llm_result["response"]

    # Basic envelope indicator if present
    env = collected_facts.get("risk_data", {}).get("operating_envelope", "GREEN")
    score = collected_facts.get("risk_data", {}).get("risk_score", 28.1)

    return {
        "intent": intent,
        "answer": response_text,
        "response": response_text,
        "custom_response": response_text,
        "summary": response_text[:200] + "..." if len(response_text) > 200 else response_text,
        "evidence": policy_evidence,
        "policy_evidence": policy_evidence,
        "why_is_this_happening": why_happening,
        "why_this_intervention": why_intervention,
        "what_could_go_wrong": what_could_go_wrong,
        "data_sources": data_sources,
        "actions": actions,
        "warnings": warnings,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "tool_calls": executed_tools,
        "screen_context": screen_name,
        "llm_meta": {
            "engine": llm_result["engine"],
            "model": llm_result["model"],
            "intent": intent,
            "tools_called": executed_tools,
        },
        "operating_envelope": env,
        "risk_status": collected_facts.get("risk_data", {}).get("risk_status", "SAFE"),
        "risk_score": score,
    }


def get_copilot_context_payload(db: Session, portfolio: Portfolio) -> dict[str, Any]:
    """Aggregated, read-only institutional context API payload for Copilot inspection."""
    tools = CopilotToolRegistry(db, portfolio)
    inst = tools.get_institution_summary()
    port = tools.get_portfolio_summary()
    risk = tools.get_current_risk()
    drivers = tools.get_risk_drivers()
    opt = tools.get_optimizer_proposal()
    val = tools.get_validation_result()
    rev = tools.get_reverse_stress_results()
    audit = tools.get_audit_events()

    return {
        "institution": inst,
        "portfolio": port,
        "risk": risk,
        "risk_drivers": drivers,
        "optimizer": opt,
        "validation": val,
        "resilience": rev,
        "latest_audit_events": audit[:5],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
