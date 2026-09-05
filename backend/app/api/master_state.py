"""AEGIS Master Backend State Contract API.

Provides a unified single source of truth carrying:
portfolio -> risk (VaR/CVaR) -> regime -> contagion -> prediction -> envelope -> stress -> recommendation -> validator -> copilot.
"""

from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.portfolio_service import get_default_portfolio
from app.services.risk_engine import calculate_risk
from app.services.regime_service import detect_market_regime
from app.services.contagion_service import compute_correlation_contagion
from app.services.risk_attribution import compute_risk_attribution
from app.services.reverse_stress import run_reverse_stress_sweep
from app.services.prediction_service import predict_risk_conditions
from app.services.optimizer import propose_rebalance
from app.services.validator import validate_proposal
from app.services.copilot_service import get_copilot_assessment
from app.services.document_service import get_all_indexed_documents

router = APIRouter()


@router.get("/state/master")
def get_master_state(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Retrieve the unified AEGIS master state representation."""
    portfolio = get_default_portfolio(db)
    if not portfolio:
        raise HTTPException(status_code=404, detail="No portfolio found.")

    # 1. Quant Risk Engine
    risk_res = calculate_risk(db, portfolio)

    # 2. Risk Attribution
    attribution = compute_risk_attribution(db, portfolio)
    attrib_map = {item["symbol"]: item["percentage_risk_pct"] for item in attribution["risk_attributions"]}

    # 3. Market Regime AI
    regime = detect_market_regime(db, volatility_override=risk_res.volatility, drawdown_override=risk_res.max_drawdown)

    # 4. Correlation Contagion Engine
    contagion = compute_correlation_contagion(db, portfolio, is_stressed=(risk_res.operating_envelope == "RED"))

    # 5. Reverse Stress & Resilience
    rev_stress = run_reverse_stress_sweep(db, portfolio)

    # 6. Risk Prediction Service (Forecasts risk conditions, not stock prices)
    prediction = predict_risk_conditions(db, portfolio, horizon_days=5)

    # 7. Optimizer Recommendation & Independent Validator
    proposal = propose_rebalance(db, portfolio)
    val_result = validate_proposal(db, portfolio, proposal.target_weights, proposal.turnover)

    # Calculate actual expected risk after proposed rebalance
    if proposal.action_required:
        import numpy as np
        from app.services.portfolio_service import get_asset_symbols
        prop_symbols = get_asset_symbols(portfolio)
        target_w_arr = np.array([proposal.target_weights.get(s, 0.0) for s in prop_symbols])
        risk_after_prop = calculate_risk(db, portfolio, weights_override=target_w_arr)
        expected_risk_after_val = round(risk_after_prop.risk_score, 1)
    else:
        expected_risk_after_val = round(risk_res.risk_score, 1)

    # 8. Copilot Rationale & Policy Evidence
    copilot = get_copilot_assessment(db, portfolio)

    # Portfolio Holdings with Risk Contribution
    capital = float(portfolio.total_capital)
    holdings_list = []
    for h in portfolio.holdings:
        if h.asset:
            sym = h.asset.symbol
            holdings_list.append({
                "symbol": sym,
                "name": h.asset.name,
                "category": h.asset.category,
                "weight": round(float(h.weight), 4),
                "weight_pct": f"{round(float(h.weight) * 100, 1)}%",
                "market_value": round(float(h.market_value), 2),
                "risk_contribution_pct": attrib_map.get(sym, 0.0),
            })

    # Sort holdings by weight descending
    holdings_list.sort(key=lambda x: x["weight"], reverse=True)

    # Indexed documents count
    docs = get_all_indexed_documents()

    return {
        "portfolio": {
            "id": str(portfolio.id),
            "name": portfolio.name,
            "total_capital": capital,
            "total_capital_cr": round(capital / 10_000_000, 2),
            "holdings": holdings_list,
        },
        "market": {
            "regime": regime["regime"],
            "regime_confidence": regime["confidence"],
            "regime_confidence_pct": regime["confidence_pct"],
            "regime_drivers": regime["drivers"],
            "regime_probabilities": regime["probabilities"],
            "contagion": {
                "average_normal_correlation": contagion["average_normal_correlation"],
                "average_stressed_correlation": contagion["average_stressed_correlation"],
                "contagion_spread": contagion["contagion_spread"],
                "diversification_health": contagion["diversification_health"],
                "clusters": contagion["clusters"],
                "matrix": contagion.get("matrix"),
            },
        },
        "risk": {
            "expected_return": round(risk_res.expected_return, 4),
            "volatility": round(risk_res.volatility, 4),
            "volatility_pct": f"{round(risk_res.volatility * 100, 1)}%",
            "var_95": round(risk_res.var_95, 4),
            "var_95_pct": f"{round(risk_res.var_95 * 100, 1)}%",
            "cvar_95": round(risk_res.cvar_95, 4),
            "cvar_95_pct": f"{round(risk_res.cvar_95 * 100, 1)}%",
            "max_drawdown": round(risk_res.max_drawdown, 4),
            "max_drawdown_pct": f"{round(risk_res.max_drawdown * 100, 1)}%",
            "liquidity_ratio": round(risk_res.liquidity_ratio, 4),
            "liquidity_pct": f"{round(risk_res.liquidity_ratio * 100, 1)}%",
            "concentration_hhi": round(risk_res.concentration, 4),
            "market_stress": round(risk_res.market_stress, 4),
            "composite_score": round(risk_res.risk_score, 1),
            "operating_envelope": risk_res.operating_envelope,
            "risk_status": risk_res.risk_status,
            "risk_level": risk_res.risk_level,
            "intervention_required": risk_res.intervention_required,
        },
        "prediction": prediction,
        "resilience": {
            "distance_to_failure": rev_stress["distance_to_failure"],
            "distance_to_failure_pct": rev_stress["distance_to_failure_pct"],
            "resilience_score": rev_stress["resilience_score"],
            "critical_shock_multiplier": rev_stress["critical_shock_multiplier"],
            "status": rev_stress["status"],
            "failure_threshold": rev_stress["failure_threshold"],
        },
        "active_recommendation": {
            "action_required": proposal.action_required,
            "reason": proposal.reason,
            "turnover": round(proposal.turnover, 4),
            "turnover_pct": f"{round(proposal.turnover * 100, 1)}%",
            "estimated_cost": round(proposal.estimated_cost, 2),
            "target_weights": {k: round(v, 4) for k, v in proposal.target_weights.items()},
            "expected_risk_after": expected_risk_after_val,
        },
        "validator_result": {
            "all_passed": val_result.all_passed,
            "hard_breaches": val_result.hard_breaches,
            "soft_warnings": val_result.soft_warnings,
            "checks": [
                {
                    "rule_name": c.rule_name,
                    "passed": c.passed,
                    "actual_value": c.actual_value,
                    "limit_value": c.limit_value,
                    "is_hard_constraint": c.is_hard_constraint,
                    "message": c.message,
                }
                for c in val_result.checks
            ],
        },
        "copilot": {
            "summary": copilot["summary"],
            "why_is_this_happening": copilot["why_is_this_happening"],
            "why_this_intervention": copilot["why_this_intervention"],
            "what_could_go_wrong": copilot["what_could_go_wrong"],
            "policy_evidence": copilot["policy_evidence"],
        },
        "knowledge_base": {
            "total_documents": len(docs),
        },
    }
