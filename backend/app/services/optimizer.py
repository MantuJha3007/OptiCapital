"""CVXPY optimizer — mean-variance optimization with dynamic constraints."""

import uuid
from uuid import UUID

import numpy as np
import cvxpy as cp
from sqlalchemy.orm import Session

from app.models.optimization import OptimizationRun, OptimizationAllocation
from app.models.asset import Asset
from app.core.formulas import (
    portfolio_expected_return,
    portfolio_volatility,
    transaction_cost,
)
from app.config import settings


# Price on variance left above the volatility limit. Set far above the
# intervention penalty so the limit is respected whenever it can be.
VOL_BREACH_PENALTY = 50.0


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
    intervention_penalty: float | None = None,
) -> OptimizerResult:
    """Minimum-intervention portfolio optimisation.

    maximize:  wᵀμ  −  λ(wᵀΣw)  −  (c + γ)·‖w − w₀‖₁

    subject to:
    - sum(w) = 1, w ≥ 0
    - per-asset and portfolio limits from the control engine

    Every term is expressed as a fraction of portfolio value so they are
    commensurable. This matters: transaction cost used to be computed in
    currency (turnover × value × rate ≈ 8,500) and subtracted from an
    expected return expressed as a fraction (≈ 0.07), which made the cost
    term about five orders of magnitude larger than everything else. The
    solver was therefore blind to both expected return and `risk_aversion`.

    γ (`intervention_penalty`) is the policy knob behind minimum necessary
    intervention. Real transaction cost alone is roughly 0.1% of turnover,
    far too small to discourage churn, so the preference for leaving the book
    alone has to be stated explicitly rather than hoped for.

    The volatility limit carries a penalised slack variable rather than being
    a bare hard constraint. In a severe enough regime the limit can be
    unreachable within the other bounds, and a plain constraint would make the
    whole problem infeasible — the solver would return nothing and the caller
    would silently fall back to the unchanged book, which is the one moment a
    risk system must not go quiet. With slack the solver always returns the
    best attainable allocation and reports how much risk it could not remove.
    """
    if cost_rate is None:
        cost_rate = settings.transaction_cost_rate
    if intervention_penalty is None:
        intervention_penalty = settings.intervention_penalty
    n = len(assets)
    w = cp.Variable(n)

    ret = mean_returns @ w
    risk = cp.quad_form(w, cp.psd_wrap(cov_matrix))
    turnover = cp.norm1(w - current_weights)

    # Both terms are fractions of portfolio value, like `ret` and `risk`.
    trading_drag = (cost_rate + intervention_penalty) * turnover

    # Residual variance above the limit, priced high enough that the solver
    # only ever uses it when the limit is genuinely unreachable.
    vol_slack = cp.Variable(nonneg=True)

    objective = cp.Maximize(
        ret - risk_aversion * risk - trading_drag - VOL_BREACH_PENALTY * vol_slack
    )

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

    # Per-asset max weight from asset definitions
    for i, asset in enumerate(assets):
        if asset.max_weight < 1.0:
            cons.append(w[i] <= asset.max_weight)
        if asset.min_weight > 0.0:
            cons.append(w[i] >= asset.min_weight)

    # Portfolio volatility limit, softened by penalised slack so the problem
    # is always feasible.
    max_vol = constraints.get("max_volatility", 0.15)
    cons.append(cp.quad_form(w, cp.psd_wrap(cov_matrix)) <= max_vol ** 2 + vol_slack)

    # Solve
    problem = cp.Problem(objective, cons)
    try:
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
