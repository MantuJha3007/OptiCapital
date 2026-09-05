"""CVXPY optimizer — mean-variance optimization with dynamic constraints."""

import uuid
from uuid import UUID

import numpy as np
import cvxpy as cp
from sqlalchemy.orm import Session

from app.models.optimization import OptimizationRun, OptimizationAllocation
from app.models.asset import Asset
from app.models.portfolio import Portfolio
from app.core.formulas import (
    portfolio_expected_return,
    portfolio_volatility,
    transaction_cost,
)
from app.config import settings


class OptimizerResult:
    """Result of the CVXPY optimization."""

    def __init__(
        self,
        status: str,
        weights: np.ndarray,
        expected_return: float,
        volatility: float,
        txn_cost: float,
        explanation: str,
    ):
        self.status = status
        self.weights = weights
        self.expected_return = expected_return
        self.volatility = volatility
        self.txn_cost = txn_cost
        self.explanation = explanation


def optimize_portfolio(
    mean_returns: np.ndarray,
    cov_matrix: np.ndarray,
    current_weights: np.ndarray,
    assets: list[Asset],
    portfolio_value: float,
    risk_aversion: float,
    constraints: dict,
    cost_rate: float | None = None,
) -> OptimizerResult:
    """Run CVXPY mean-variance optimization.

    maximize: wᵀμ - λ(wᵀΣw) - transaction_cost

    Subject to:
    - sum(w) = 1
    - w >= 0
    - Dynamic per-asset and portfolio constraints from control engine
    """
    if cost_rate is None:
        cost_rate = settings.transaction_cost_rate

    n = len(assets)
    w = cp.Variable(n)

    # AEGIS Minimum-Intervention Formulation:
    # 1. Minimize Euclidean deviation from existing weights: 0.5 * ||w - w_0||_2^2
    # 2. Penalize turnover / transaction friction: gamma * ||w - w_0||_1
    # 3. Penalize portfolio variance: lambda * w^T Sigma w
    # 4. Moderate return incentive: - kappa * w^T mu
    deviation = 0.5 * cp.sum_squares(w - current_weights)
    turnover = cp.norm1(w - current_weights)
    risk = cp.quad_form(w, cov_matrix)
    ret = mean_returns @ w

    objective = cp.Minimize(deviation + 2.0 * turnover + risk_aversion * risk - 0.05 * ret)

    # Constraints
    cons = [
        cp.sum(w) == 1,
        w >= 0,
    ]

    # Map assets to indices by symbol
    symbol_to_idx = {a.symbol: i for i, a in enumerate(assets)}

    # Per-asset constraints from control engine
    max_equity = constraints.get("max_equity", 0.50)
    min_cash = constraints.get("min_cash", 0.10)

    if "EQUITY" in symbol_to_idx:
        cons.append(w[symbol_to_idx["EQUITY"]] <= max_equity)
    if "CASH" in symbol_to_idx:
        cons.append(w[symbol_to_idx["CASH"]] >= min_cash)

    # Per-asset limits and mandatory single-asset concentration cap (<= 50%)
    max_single_asset = constraints.get("max_single_asset", 0.50)
    for i, asset in enumerate(assets):
        upper_bound = min(asset.max_weight, max_single_asset)
        cons.append(w[i] <= upper_bound)
        if asset.min_weight > 0.0:
            cons.append(w[i] >= asset.min_weight)

    # Portfolio volatility constraint
    max_vol = constraints.get("max_volatility", 0.15)
    cons.append(cp.quad_form(w, cov_matrix) <= max_vol ** 2)

    # Solve with CLARABEL / OSQP / SCS
    problem = cp.Problem(objective, cons)
    try:
        try:
            problem.solve(solver=cp.CLARABEL, verbose=False)
        except Exception:
            problem.solve(solver=cp.SCS, verbose=False)
    except Exception as e:
        return OptimizerResult(
            status="FAILED",
            weights=current_weights,
            expected_return=float(mean_returns @ current_weights),
            volatility=float(np.sqrt(current_weights @ cov_matrix @ current_weights)),
            txn_cost=0.0,
            explanation=f"Optimizer failed: {str(e)}",
        )

    if problem.status not in ("optimal", "optimal_inaccurate"):
        return OptimizerResult(
            status=f"FAILED_{problem.status.upper()}",
            weights=current_weights,
            expected_return=float(mean_returns @ current_weights),
            volatility=float(np.sqrt(current_weights @ cov_matrix @ current_weights)),
            txn_cost=0.0,
            explanation=f"Optimizer could not find a feasible solution (status: {problem.status}).",
        )

    optimal_weights = np.array(w.value).flatten()
    # Clip small negatives from numerical noise
    optimal_weights = np.maximum(optimal_weights, 0.0)
    optimal_weights = optimal_weights / optimal_weights.sum()

    opt_return = portfolio_expected_return(optimal_weights, mean_returns)
    opt_vol = portfolio_volatility(optimal_weights, cov_matrix)
    opt_txn = transaction_cost(current_weights, optimal_weights, portfolio_value, cost_rate)

    return OptimizerResult(
        status="OPTIMAL",
        weights=optimal_weights,
        expected_return=opt_return,
        volatility=opt_vol,
        txn_cost=opt_txn,
        explanation="",  # Will be filled by explanation service
    )


def save_optimization_run(
    db: Session,
    portfolio_id: UUID,
    risk_level: str,
    risk_aversion: float,
    return_before: float,
    vol_before: float,
    result: OptimizerResult,
    assets: list[Asset],
    old_weights: np.ndarray,
) -> OptimizationRun:
    """Persist optimisation run and allocations to PostgreSQL."""
    run = OptimizationRun(
        id=uuid.uuid4(),
        portfolio_id=portfolio_id,
        risk_level=risk_level,
        risk_aversion=risk_aversion,
        expected_return_before=return_before,
        volatility_before=vol_before,
        expected_return_after=result.expected_return,
        volatility_after=result.volatility,
        transaction_cost=round(result.txn_cost, 2),
        status=result.status,
    )
    db.add(run)

    for i, asset in enumerate(assets):
        alloc = OptimizationAllocation(
            id=uuid.uuid4(),
            optimization_id=run.id,
            asset_id=asset.id,
            old_weight=float(old_weights[i]),
            new_weight=float(result.weights[i]),
        )
        db.add(alloc)

    db.commit()
    db.refresh(run)
    return run


class ProposalResult:
    """Convenience wrapper for proposed rebalancing action."""

    def __init__(
        self,
        action_required: bool,
        reason: str,
        turnover: float,
        estimated_cost: float,
        target_weights: dict[str, float],
    ):
        self.action_required = action_required
        self.reason = reason
        self.turnover = turnover
        self.estimated_cost = estimated_cost
        self.target_weights = target_weights


def propose_rebalance(db: Session, portfolio: Portfolio) -> ProposalResult:
    """Generate deterministic minimum-intervention rebalance proposal."""
    from app.services.portfolio_service import get_holdings_data, get_assets_ordered, get_asset_symbols
    from app.services.risk_engine import calculate_risk
    from app.services.control_engine import evaluate_controls
    from app.services.market_data_service import get_price_dataframe, compute_annualized_stats
    from app.core.formulas import portfolio_turnover

    risk = calculate_risk(db, portfolio)
    control = evaluate_controls(risk)
    asset_ids, current_w, exp_rets, vols, _, _ = get_holdings_data(portfolio)
    assets = get_assets_ordered(portfolio)
    symbols = get_asset_symbols(portfolio)
    val = float(portfolio.total_capital)

    if not risk.intervention_required:
        return ProposalResult(
            action_required=False,
            reason="Portfolio operating within Safe Operating Envelope.",
            turnover=0.0,
            estimated_cost=0.0,
            target_weights={s: round(float(w), 4) for s, w in zip(symbols, current_w)},
        )

    prices = get_price_dataframe(db, [UUID(a) for a in asset_ids])
    if not prices.empty:
        mean_rets, cov_matrix = compute_annualized_stats(prices, asset_ids)
    else:
        mean_rets = exp_rets
        cov_matrix = np.diag(vols ** 2)

    res = optimize_portfolio(
        mean_returns=mean_rets,
        cov_matrix=cov_matrix,
        current_weights=current_w,
        assets=assets,
        portfolio_value=val,
        risk_aversion=settings.risk_aversion,
        constraints=control.constraints,
    )

    t_over = float(portfolio_turnover(current_w, res.weights))
    target_map = {s: round(float(w), 4) for s, w in zip(symbols, res.weights)}

    return ProposalResult(
        action_required=True,
        reason=f"Risk score {risk.risk_score:.1f} breached envelope ({risk.operating_envelope}). Minimum intervention optimization computed.",
        turnover=t_over,
        estimated_cost=float(res.txn_cost),
        target_weights=target_map,
    )

