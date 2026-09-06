"""Scenario engine — applies shocks and runs the full risk→control→optimize pipeline."""

import uuid
from uuid import UUID
from decimal import Decimal

import numpy as np
from sqlalchemy.orm import Session, joinedload

from app.models.scenario import Scenario, ScenarioShock
from app.models.portfolio import Portfolio
from app.services.portfolio_service import (
    get_holdings_data,
    get_assets_ordered,
    get_asset_symbols,
)
from app.services.market_data_service import (
    get_price_dataframe,
    compute_annualized_stats,
)
from app.services.risk_engine import calculate_risk, save_risk_snapshot
from app.services.control_engine import evaluate_controls
from app.services.optimizer import optimize_portfolio, save_optimization_run
from app.services.explanation_service import generate_explanation
from app.services.rebalancer import determine_action, save_rebalance_action
from app.core.constants import ACTION_HOLD
from app.core.formulas import (
    transaction_cost as calc_txn_cost,
    portfolio_turnover,
    shock_severity,
    stress_covariance,
)
from app.config import settings


def get_all_scenarios(db: Session) -> list[Scenario]:
    """Load all scenarios with their shocks."""
    return (
        db.query(Scenario)
        .options(joinedload(Scenario.shocks).joinedload(ScenarioShock.asset))
        .all()
    )


def get_scenario_by_id(db: Session, scenario_id: UUID) -> Scenario | None:
    """Load a scenario by ID with shocks."""
    return (
        db.query(Scenario)
        .options(joinedload(Scenario.shocks).joinedload(ScenarioShock.asset))
        .filter(Scenario.id == scenario_id)
        .first()
    )


def run_scenario(
    db: Session,
    portfolio: Portfolio,
    scenario: Scenario,
) -> dict:
    """Execute a full scenario simulation.

    Steps:
    1. Load current portfolio state
    2. Calculate pre-shock risk
    3. Apply scenario shocks
    4. Calculate post-shock risk
    5. Run control engine
    6. Run optimizer with dynamic constraints
    7. Calculate transaction cost
    8. Generate recommendation
    9. Save results to PostgreSQL
    10. Return complete before/after response
    """
    # --- 1. Current portfolio data ---
    asset_ids, weights, exp_rets, vols, liq_scores, _ = get_holdings_data(portfolio)
    assets = get_assets_ordered(portfolio)
    symbols = get_asset_symbols(portfolio)
    portfolio_value = float(portfolio.total_capital)

    # --- 2. Pre-shock risk ---
    risk_before = calculate_risk(db, portfolio)
    save_risk_snapshot(db, portfolio.id, risk_before)

    # --- 3. Apply shocks ---
    shock_map = {}
    for shock in scenario.shocks:
        shock_map[str(shock.asset_id)] = shock.shock_percentage

    shocked_values = np.zeros(len(assets))
    for i, aid in enumerate(asset_ids):
        shock_pct = shock_map.get(aid, 0.0)
        shocked_values[i] = weights[i] * portfolio_value * (1 + shock_pct)

    total_after_shock = float(np.sum(shocked_values))
    portfolio_loss = (total_after_shock - portfolio_value) / portfolio_value

    # Post-shock weights (renormalised)
    if total_after_shock > 0:
        shocked_weights = shocked_values / total_after_shock
    else:
        shocked_weights = weights.copy()

    # Load baseline market covariance
    prices = get_price_dataframe(db, [UUID(a) for a in asset_ids])
    if not prices.empty:
        mean_rets, base_cov = compute_annualized_stats(prices, asset_ids)
    else:
        mean_rets = exp_rets
        base_cov = np.diag(vols ** 2)

    # --- 4. Post-shock risk under stressed covariance ---
    asset_shocks = np.array([shock_map.get(aid, 0.0) for aid in asset_ids])
    severity = shock_severity(asset_shocks, portfolio_loss)
    cov_matrix = stress_covariance(base_cov, severity)

    # The shock's own loss is a realised drawdown that price history cannot see.
    realised_drawdown = abs(min(portfolio_loss, 0.0))

    risk_after = calculate_risk(
        db,
        portfolio,
        weights_override=shocked_weights,
        cov_matrix=cov_matrix,
        mean_returns=mean_rets,
        drawdown_override=realised_drawdown,
        stress_override=severity,
    )
    save_risk_snapshot(db, portfolio.id, risk_after)

    # --- 5. Control engine ---
    control = evaluate_controls(risk_after)

    # --- 6. Optimizer ---
    # Solved against the stressed covariance: the recommendation has to be
    # safe in the regime the portfolio is actually in, not the calm one.
    opt_result = optimize_portfolio(
        mean_returns=mean_rets,
        cov_matrix=cov_matrix,
        current_weights=shocked_weights,
        assets=assets,
        portfolio_value=total_after_shock,
        risk_aversion=settings.risk_aversion,
        constraints=control.constraints,
    )

    # --- 7. Save optimization ---
    opt_run = save_optimization_run(
        db=db,
        portfolio_id=portfolio.id,
        risk_level=control.risk_level,
        risk_aversion=settings.risk_aversion,
        return_before=risk_after.expected_return,
        vol_before=risk_after.volatility,
        result=opt_result,
        assets=assets,
        old_weights=shocked_weights,
    )

    # --- 8. Post-optimisation risk, measured in the same stressed regime ---
    risk_optimized = calculate_risk(
        db,
        portfolio,
        weights_override=opt_result.weights,
        cov_matrix=cov_matrix,
        mean_returns=mean_rets,
        drawdown_override=realised_drawdown,
        stress_override=severity,
    )

    # --- 9. Independent Candidate Validation ---
    from app.services.validator import validate_candidate_allocation
    validation = validate_candidate_allocation(
        opt_result.weights, assets, cov_matrix, control.constraints, current_weights=shocked_weights
    )

    # --- 10. Determine action and save ---
    # On HOLD the recommendation is the current book. The optimiser still ran
    # and its result is preserved in optimization_runs for audit, but the
    # recommendation recorded and surfaced has to match the verdict: telling
    # someone no intervention is required and then handing them a trade list
    # and a bill is the contradiction this system exists to avoid.
    action = determine_action(risk_after, control)

    if action == ACTION_HOLD:
        recommended_weights = shocked_weights
        txn_cost_val = 0.0
        risk_after_action = risk_after.risk_score
    else:
        recommended_weights = opt_result.weights
        txn_cost_val = opt_result.txn_cost
        risk_after_action = risk_optimized.risk_score

    rebalance = save_rebalance_action(
        db=db,
        portfolio_id=portfolio.id,
        optimization_id=opt_run.id,
        action=action,
        transaction_cost=txn_cost_val,
        risk_before=risk_after.risk_score,
        risk_after=risk_after_action,
        reason=generate_explanation(
            risk_before=risk_before,
            risk_after=risk_after,
            control=control,
            assets=assets,
            old_weights=shocked_weights,
            new_weights=recommended_weights,
        ),
    )

    # --- 11. Build response ---
    allocation_dict = {
        symbols[i].lower(): round(float(recommended_weights[i]), 4)
        for i in range(len(symbols))
    }

    # The post-shock weights are the baseline the recommendation is measured
    # against: turnover, cost and the explanation are all relative to the book
    # as it stands AFTER the shock, not before it. Returning them explicitly
    # stops the client having to re-derive the renormalisation, and stops the
    # allocation table and the explanation quoting different "current" weights.
    weights_after_shock = {
        sym.lower(): round(float(shocked_weights[i]), 4)
        for i, sym in enumerate(symbols)
    }

    shock_details = {}
    for shock in scenario.shocks:
        shock_details[shock.asset.symbol.lower()] = shock.shock_percentage

    response = {
        "scenario": {
            "id": str(scenario.id),
            "name": scenario.name,
            "description": scenario.description,
        },
        "current": {
            "risk_score": round(risk_before.risk_score, 1),
            "status": risk_before.operating_envelope,
            "risk_level": risk_before.risk_level,
            "operating_envelope": risk_before.operating_envelope,
            "intervention_required": risk_before.intervention_required,
            "allocation": {symbols[i].lower(): round(float(weights[i]), 4) for i in range(len(symbols))},
        },
        "stressed": {
            "risk_score": round(risk_after.risk_score, 1),
            "status": risk_after.operating_envelope,
            "risk_level": risk_after.risk_level,
            "risk_status": risk_after.risk_level,
            "operating_envelope": risk_after.operating_envelope,
            "intervention_required": risk_after.intervention_required,
            "volatility": round(risk_after.volatility, 4),
            "drawdown": round(risk_after.max_drawdown, 4),
            "liquidity": round(risk_after.liquidity_ratio, 4),
        },
        "before": {
            "portfolio_value": portfolio_value,
            "risk_score": round(risk_before.risk_score, 1),
            "risk_level": risk_before.risk_level,
            "operating_envelope": risk_before.operating_envelope,
            "volatility": round(risk_before.volatility, 4),
            "drawdown": round(risk_before.max_drawdown, 4),
            "liquidity": round(risk_before.liquidity_ratio, 4),
            "weights_after": weights_after_shock,
            "concentration": round(risk_before.concentration, 4),
            "market_stress": round(risk_before.market_stress, 4),
            "allocation": {symbols[i].lower(): round(float(weights[i]), 4) for i in range(len(symbols))},
            "status": risk_before.operating_envelope,
        },
        "shock": {
            "details": shock_details,
            "portfolio_loss": round(portfolio_loss, 4),
            "portfolio_value_after": round(total_after_shock, 2),
            "weights_after": weights_after_shock,
        },
        "after_shock": {
            "risk_score": round(risk_after.risk_score, 1),
            "risk_level": risk_after.risk_level,
            "risk_status": risk_after.risk_level,
            "operating_envelope": risk_after.operating_envelope,
            "intervention_required": risk_after.intervention_required,
            "volatility": round(risk_after.volatility, 4),
            "drawdown": round(risk_after.max_drawdown, 4),
            "liquidity": round(risk_after.liquidity_ratio, 4),
        },
        "control": {
            "mode": control.risk_level,
            "operating_envelope": control.operating_envelope,
            "intervention_required": control.intervention_required,
            "breaches": control.breaches,
            "constraints": control.constraints,
        },
        "recommendation": {
            "action": action,
            "optimization_id": str(opt_run.id),
            "allocation": allocation_dict,
            "current_allocation": weights_after_shock,
            "proposed_allocation": allocation_dict,
            "transaction_cost": round(txn_cost_val, 2),
            "turnover": round(
                portfolio_turnover(shocked_weights, recommended_weights), 4
            ),
            "risk_before": round(risk_after.risk_score, 1),
            "risk_after": round(risk_after_action, 1),
            "intervention_required": risk_after.intervention_required,
            "explanation": rebalance.reason or "",
            "validator": validation.to_dict(),
            "validation": validation.to_dict(),
        },
    }

    return response
