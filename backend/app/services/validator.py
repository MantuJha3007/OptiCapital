"""Independent Candidate Validator service.

Decoupled verification layer certifying candidate portfolio allocations
against mathematical invariants and institutional mandate boundaries.
"""

from typing import Dict, List, Any
import numpy as np

from app.models.asset import Asset
from app.core.formulas import portfolio_volatility


class ValidationResult:
    def __init__(
        self,
        status: str,  # "PASS" | "BLOCKED"
        is_valid: bool,
        checks: List[Dict[str, Any]],
        violations: List[str],
    ):
        self.status = status
        self.is_valid = is_valid
        self.valid = is_valid
        self.checks = checks
        self.violations = violations

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status,
            "valid": self.valid,
            "is_valid": self.is_valid,
            "checks": self.checks,
            "violations": self.violations,
        }


def validate_candidate_allocation(
    candidate_weights: np.ndarray,
    assets: List[Asset],
    cov_matrix: np.ndarray,
    constraints: Dict[str, Any],
    max_single_asset_weight: float = 0.50,
    current_weights: np.ndarray | None = None,
    max_turnover: float = 0.70,
    max_stress_var: float = 0.08,
) -> ValidationResult:
    """Independently verify candidate allocation against institutional invariants.

    1. Budget constraint: sum(w) == 1.0 (+/- 1e-3)
    2. No-shorting constraint: all w_i >= 0 (+/- 1e-4)
    3. Mode Equity ceiling: w[EQUITY] <= max_equity (+/- 1e-3)
    4. Mode Cash floor: w[CASH] >= min_cash (- 1e-3)
    5. Volatility ceiling: sqrt(w^T Sigma w) <= max_volatility (+/- 1e-3)
    6. Single-asset concentration limit: max(w) <= max_single_asset_weight (+/- 1e-3)
    7. Turnover limit: turnover <= max_turnover (+/- 1e-3)
    8. Stress VaR / Risk constraint: 95% 1-day VaR <= max_stress_var (+/- 1e-3)
    """
    checks = []
    violations = []

    # Check 1: Budget Sum
    budget_sum = float(np.sum(candidate_weights))
    sum_ok = abs(budget_sum - 1.0) <= 1e-3
    checks.append({
        "name": "BUDGET_SUM_CONSERVATIVE",
        "label": "Weight Budget (100%)",
        "passed": sum_ok,
        "value": round(budget_sum, 4),
        "target": 1.0,
    })
    if not sum_ok:
        violations.append(f"Budget sum ({budget_sum:.4f}) does not equal 1.0000.")

    # Check 2: No-shorting / Long-only
    min_weight = float(np.min(candidate_weights))
    no_short_ok = min_weight >= -1e-4
    checks.append({
        "name": "LONG_ONLY_CONSTRAINT",
        "label": "Long-Only (No Shorting)",
        "passed": no_short_ok,
        "value": round(min_weight, 4),
        "target": ">= 0.0",
    })
    if not no_short_ok:
        violations.append(f"Negative weight detected ({min_weight:.4f}).")

    symbol_to_idx = {a.symbol: i for i, a in enumerate(assets)}

    # Check 3: Equity Cap
    max_equity = constraints.get("max_equity", 0.50)
    if "EQUITY" in symbol_to_idx:
        equity_weight = float(candidate_weights[symbol_to_idx["EQUITY"]])
        equity_ok = equity_weight <= (max_equity + 1e-3)
        checks.append({
            "name": "EQUITY_CAP_CONSTRAINT",
            "label": f"Equity Cap ({max_equity:.0%})",
            "passed": equity_ok,
            "value": round(equity_weight, 4),
            "target": f"<= {max_equity:.2f}",
        })
        if not equity_ok:
            violations.append(f"Equity weight ({equity_weight:.1%}) exceeds mode limit ({max_equity:.0%}).")

    # Check 4: Cash Floor
    min_cash = constraints.get("min_cash", 0.10)
    if "CASH" in symbol_to_idx:
        cash_weight = float(candidate_weights[symbol_to_idx["CASH"]])
        cash_ok = cash_weight >= (min_cash - 1e-3)
        checks.append({
            "name": "CASH_FLOOR_CONSTRAINT",
            "label": f"Cash Floor ({min_cash:.0%})",
            "passed": cash_ok,
            "value": round(cash_weight, 4),
            "target": f">= {min_cash:.2f}",
        })
        if not cash_ok:
            violations.append(f"Cash reserve ({cash_weight:.1%}) below mode floor ({min_cash:.0%}).")

    # Check 5: Volatility Ceiling
    port_vol = portfolio_volatility(candidate_weights, cov_matrix)
    max_vol = constraints.get("max_volatility", 0.15)
    vol_ok = port_vol <= (max_vol + 1e-3)
    checks.append({
        "name": "VOLATILITY_CEILING",
        "label": f"Volatility Ceiling ({max_vol:.0%})",
        "passed": vol_ok,
        "value": round(port_vol, 4),
        "target": f"<= {max_vol:.2f}",
    })
    if not vol_ok:
        violations.append(f"Portfolio volatility ({port_vol:.1%}) exceeds ceiling ({max_vol:.0%}).")

    # Check 6: Single-Asset Concentration Limit
    max_alloc = float(np.max(candidate_weights))
    alloc_ok = max_alloc <= (max_single_asset_weight + 1e-3)
    checks.append({
        "name": "CONCENTRATION_LIMIT",
        "label": f"Single-Asset Limit ({max_single_asset_weight:.0%})",
        "passed": alloc_ok,
        "value": round(max_alloc, 4),
        "target": f"<= {max_single_asset_weight:.2f}",
    })
    if not alloc_ok:
        violations.append(f"Single position concentration ({max_alloc:.1%}) exceeds limit ({max_single_asset_weight:.0%}).")

    # Check 7: Turnover Limit Constraint (where applicable)
    if "max_turnover" in constraints and current_weights is not None:
        t_limit = float(constraints["max_turnover"])
        turnover_val = 0.5 * float(np.sum(np.abs(candidate_weights - current_weights)))
        turnover_ok = turnover_val <= (t_limit + 1e-3)
        checks.append({
            "name": "TURNOVER_LIMIT_CONSTRAINT",
            "label": f"Turnover Limit ({t_limit:.0%})",
            "passed": turnover_ok,
            "value": round(turnover_val, 4),
            "target": f"<= {t_limit:.2f}",
        })
        if not turnover_ok:
            violations.append(f"Portfolio turnover ({turnover_val:.1%}) exceeds friction limit ({t_limit:.0%}).")

    # Check 8: Stress VaR Constraint (where applicable)
    if "max_stress_var" in constraints:
        s_var_limit = float(constraints["max_stress_var"])
        stress_1d_var = float(1.645 * (port_vol / np.sqrt(252)))
        var_ok = stress_1d_var <= (s_var_limit + 1e-3)
        checks.append({
            "name": "STRESS_VAR_CONSTRAINT",
            "label": f"Stress 1-Day VaR ({s_var_limit:.1%})",
            "passed": var_ok,
            "value": round(stress_1d_var, 4),
            "target": f"<= {s_var_limit:.2f}",
        })
        if not var_ok:
            violations.append(f"Stress 1-Day VaR ({stress_1d_var:.2%}) exceeds risk mandate ({s_var_limit:.1%}).")

    is_valid = len(violations) == 0
    status = "PASS" if is_valid else "BLOCKED"

    return ValidationResult(
        status=status,
        is_valid=is_valid,
        checks=checks,
        violations=violations,
    )


class InvariantCheckItem:
    def __init__(self, rule_name: str, passed: bool, actual_value: float, limit_value: str, is_hard: bool, message: str):
        self.rule_name = rule_name
        self.passed = passed
        self.actual_value = actual_value
        self.limit_value = limit_value
        self.is_hard_constraint = is_hard
        self.message = message


class ExtendedValidationResult:
    def __init__(self, all_passed: bool, hard_breaches: int, soft_warnings: int, checks: list[InvariantCheckItem]):
        self.all_passed = all_passed
        self.hard_breaches = hard_breaches
        self.soft_warnings = soft_warnings
        self.checks = checks


def validate_proposal(
    db: Any,
    portfolio: Any,
    target_weights: dict[str, float] | np.ndarray,
    turnover: float = 0.0,
) -> ExtendedValidationResult:
    """Independently validate candidate rebalancing proposal against 6 fiduciary safety invariants."""
    from app.services.portfolio_service import get_assets_ordered, get_holdings_data
    from app.services.control_engine import evaluate_controls
    from app.services.risk_engine import calculate_risk
    from app.services.market_data_service import get_price_dataframe, compute_annualized_stats
    from uuid import UUID

    assets = get_assets_ordered(portfolio)
    asset_ids, current_w, exp_rets, vols, _, _ = get_holdings_data(portfolio)
    risk = calculate_risk(db, portfolio)
    control = evaluate_controls(risk)

    if isinstance(target_weights, dict):
        ordered_weights = np.array([float(target_weights.get(a.symbol, 0.0)) for a in assets])
    else:
        ordered_weights = np.array(target_weights)

    prices = get_price_dataframe(db, [UUID(a) for a in asset_ids])
    if not prices.empty:
        _, cov_matrix = compute_annualized_stats(prices, asset_ids)
    else:
        cov_matrix = np.diag(vols ** 2)

    raw_result = validate_candidate_allocation(
        candidate_weights=ordered_weights,
        assets=assets,
        cov_matrix=cov_matrix,
        constraints=control.constraints,
        current_weights=current_w,
    )

    check_items = []
    hard_breaches = 0
    for chk in raw_result.checks:
        passed = chk.get("passed", True)
        if not passed:
            hard_breaches += 1
        check_items.append(InvariantCheckItem(
            rule_name=chk.get("name", chk.get("label", "Invariant")),
            passed=passed,
            actual_value=float(chk.get("value", 0.0)),
            limit_value=str(chk.get("target", "")),
            is_hard=True,
            message="Satisfied" if passed else f"Breached {chk.get('target', '')}",
        ))

    return ExtendedValidationResult(
        all_passed=raw_result.is_valid,
        hard_breaches=hard_breaches,
        soft_warnings=0,
        checks=check_items,
    )

