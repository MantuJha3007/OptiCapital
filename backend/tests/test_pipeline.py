"""End-to-end tests for the control loop.

The existing suite tests formulas in isolation, which is why a serious defect
survived it: a scenario shock only repriced weights, so a market crash made
the measured risk score go DOWN — the asset that crashed simply occupied a
smaller share of the book afterwards. Every formula involved was individually
correct, so no unit test failed.

These tests exercise the assembled pipeline through the API, and assert the
directional properties the product actually promises.
"""

import numpy as np
import pytest

from app.core.constants import ACTION_HOLD
from app.core.formulas import shock_severity, stress_covariance


# ── The regression that unit tests could not see ──────────────────────────


class TestShockRaisesRisk:
    def test_market_crash_increases_risk_score(self, client, scenarios):
        crash = scenarios["Market Crash"]
        r = client.post("/api/scenarios/run", json={"scenario_id": str(crash.id)})
        assert r.status_code == 200
        d = r.json()

        assert d["shock"]["portfolio_loss"] < 0, "a crash must lose money"
        assert d["after_shock"]["risk_score"] > d["before"]["risk_score"], (
            "a market crash must raise the risk score. If this fails, risk is "
            "probably being recomputed against the calm historical covariance, "
            "which reports a safer portfolio after a crash."
        )

    def test_market_crash_raises_volatility(self, client, scenarios):
        crash = scenarios["Market Crash"]
        d = client.post(
            "/api/scenarios/run", json={"scenario_id": str(crash.id)}
        ).json()
        assert d["after_shock"]["volatility"] > d["before"]["volatility"]

    def test_shock_loss_is_counted_as_drawdown(self, client, scenarios):
        crash = scenarios["Market Crash"]
        d = client.post(
            "/api/scenarios/run", json={"scenario_id": str(crash.id)}
        ).json()
        realised = abs(d["shock"]["portfolio_loss"])
        assert d["after_shock"]["drawdown"] >= realised - 1e-6, (
            "the shock's own loss is a realised drawdown and must not be "
            "discarded by recomputing from unshocked price history"
        )

    def test_severity_orders_the_scenarios(self, client, scenarios):
        """A worse scenario must not produce a calmer portfolio."""
        scores = {}
        for name in ("Normal Market", "Inflation Shock", "Market Crash"):
            d = client.post(
                "/api/scenarios/run", json={"scenario_id": str(scenarios[name].id)}
            ).json()
            scores[name] = d["after_shock"]["risk_score"]

        assert scores["Normal Market"] < scores["Inflation Shock"]
        assert scores["Inflation Shock"] < scores["Market Crash"]


# ── Minimum necessary intervention ────────────────────────────────────────


class TestMinimumIntervention:
    def test_benign_scenario_holds_and_trades_nothing(self, client, scenarios):
        d = client.post(
            "/api/scenarios/run",
            json={"scenario_id": str(scenarios["Normal Market"].id)},
        ).json()

        assert d["control"]["breaches"] == []
        assert d["recommendation"]["action"] == ACTION_HOLD
        assert d["recommendation"]["turnover"] == pytest.approx(0.0, abs=1e-9), (
            "a HOLD verdict must leave the book alone; reporting a trade list "
            "alongside 'no intervention required' contradicts the verdict"
        )
        assert d["recommendation"]["transaction_cost"] == pytest.approx(0.0)

    def test_breach_triggers_an_intervention(self, client, scenarios):
        d = client.post(
            "/api/scenarios/run",
            json={"scenario_id": str(scenarios["Market Crash"].id)},
        ).json()
        assert len(d["control"]["breaches"]) > 0
        assert d["recommendation"]["action"] != ACTION_HOLD
        assert d["recommendation"]["turnover"] > 0

    def test_intervention_reduces_risk(self, client, scenarios):
        d = client.post(
            "/api/scenarios/run",
            json={"scenario_id": str(scenarios["Market Crash"].id)},
        ).json()
        rec = d["recommendation"]
        assert rec["risk_after"] < rec["risk_before"]

    def test_allocation_is_a_valid_portfolio(self, client, scenarios):
        for name in scenarios:
            d = client.post(
                "/api/scenarios/run", json={"scenario_id": str(scenarios[name].id)}
            ).json()
            weights = list(d["recommendation"]["allocation"].values())
            assert all(w >= -1e-6 for w in weights), f"{name}: negative weight"
            assert sum(weights) == pytest.approx(1.0, abs=1e-3), f"{name}: not fully invested"


# ── Control response ──────────────────────────────────────────────────────


class TestControlResponse:
    def test_constraints_tighten_as_regime_escalates(self, client, scenarios):
        calm = client.post(
            "/api/scenarios/run",
            json={"scenario_id": str(scenarios["Normal Market"].id)},
        ).json()
        crash = client.post(
            "/api/scenarios/run",
            json={"scenario_id": str(scenarios["Market Crash"].id)},
        ).json()

        assert crash["control"]["constraints"]["max_equity"] <= calm["control"]["constraints"]["max_equity"]
        assert crash["control"]["constraints"]["min_cash"] >= calm["control"]["constraints"]["min_cash"]
        assert crash["control"]["constraints"]["max_volatility"] <= calm["control"]["constraints"]["max_volatility"]

    def test_severe_scenario_escalates_beyond_warning(self, client, scenarios):
        """The engine defines four regimes; the upper bands must be reachable."""
        d = client.post(
            "/api/scenarios/run",
            json={"scenario_id": str(scenarios["Systemic Crisis"].id)},
        ).json()
        assert d["after_shock"]["risk_level"] in ("STRESS", "CRISIS")


# ── Stress repricing ──────────────────────────────────────────────────────


class TestStressCovariance:
    def _cov(self):
        vols = np.array([0.22, 0.06, 0.10, 0.15, 0.01])
        corr = np.array([
            [1.00, 0.20, 0.40, -0.10, 0.0],
            [0.20, 1.00, 0.60, -0.05, 0.0],
            [0.40, 0.60, 1.00, 0.00, 0.0],
            [-0.10, -0.05, 0.00, 1.00, 0.0],
            [0.00, 0.00, 0.00, 0.00, 1.0],
        ])
        return np.outer(vols, vols) * corr

    def test_zero_severity_is_a_no_op(self):
        cov = self._cov()
        assert np.allclose(stress_covariance(cov, 0.0), cov)

    def test_stress_raises_portfolio_volatility(self):
        cov = self._cov()
        w = np.array([0.37, 0.27, 0.15, 0.10, 0.11])
        base = float(np.sqrt(w @ cov @ w))
        stressed = float(np.sqrt(w @ stress_covariance(cov, 0.8) @ w))
        assert stressed > base * 1.5

    def test_stressed_matrix_stays_positive_semidefinite(self):
        """CVXPY rejects an indefinite quadratic form, so this must hold."""
        cov = self._cov()
        for severity in (0.1, 0.35, 0.7, 1.0):
            eigenvalues = np.linalg.eigvalsh(stress_covariance(cov, severity))
            assert eigenvalues.min() > -1e-10, f"not PSD at severity {severity}"

    def test_correlations_converge_toward_one(self):
        cov = stress_covariance(self._cov(), 1.0)
        vols = np.sqrt(np.diag(cov))
        corr = cov / np.outer(vols, vols)
        # The equity/gold hedge is negative at rest and must not stay negative
        # under full severity: that failure of diversification is the point.
        assert corr[0, 3] > 0.5

    def test_severity_is_bounded_and_ordered(self):
        mild = shock_severity(np.array([-0.02, 0.0, 0.0]), -0.01)
        severe = shock_severity(np.array([-0.50, -0.25, 0.0]), -0.30)
        assert 0.0 <= mild < severe <= 1.0
        assert shock_severity(np.array([0.02, 0.01]), 0.015) == 0.0


# ── API surface ───────────────────────────────────────────────────────────


class TestApi:
    def test_health(self, client):
        d = client.get("/api/health").json()
        assert d["status"] == "ok"
        assert d["database"] == "connected"

    def test_portfolio_weights_sum_to_one(self, client):
        d = client.get("/api/portfolio").json()
        assert sum(h["weight"] for h in d["holdings"]) == pytest.approx(1.0, abs=1e-6)

    def test_baseline_portfolio_is_inside_its_envelope(self, client):
        """The demo book must start clean, or 'no action required' is never shown."""
        m = client.get("/api/risk").json()["metrics"]
        assert m["risk_level"] == "SAFE"
        assert m["max_drawdown"] <= 0.10
        assert m["concentration"] <= 0.30

    def test_optimize_endpoint(self, client):
        d = client.post("/api/optimize", json={}).json()
        assert d["status"] == "OPTIMAL"
        assert sum(a["new_weight"] for a in d["allocations"]) == pytest.approx(1.0, abs=1e-3)
        assert d["explanation"]

    def test_rebalance_approve_updates_holdings(self, client, scenarios):
        run = client.post(
            "/api/scenarios/run",
            json={"scenario_id": str(scenarios["Market Crash"].id)},
        ).json()
        opt_id = run["recommendation"]["optimization_id"]

        approved = client.post(
            "/api/rebalance", json={"optimization_id": opt_id, "approved": True}
        )
        assert approved.status_code == 200

        after = client.get("/api/portfolio").json()
        assert sum(h["weight"] for h in after["holdings"]) == pytest.approx(1.0, abs=1e-3)

        history = client.get("/api/rebalance/history").json()
        assert any(h["approved"] for h in history), "approval must be auditable"

    def test_unknown_scenario_is_rejected(self, client):
        r = client.post(
            "/api/scenarios/run",
            json={"scenario_id": "00000000-0000-0000-0000-000000000000"},
        )
        assert r.status_code == 404
