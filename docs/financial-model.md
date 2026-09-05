# AEGIS Financial & Mathematical Model

**Product Identity:** AEGIS (Adaptive Capital Resilience & Risk-Control System)  
**Document Status:** Canonical Mathematical Specification  
**Verification:** All formulas implemented in `backend/app/core/formulas.py` and validated by 97 passing tests.

---

## 1. Portfolio Return & Risk Metrics

Let $w \in \mathbb{R}^N$ be the portfolio allocation weight vector satisfying:
$$\sum_{i=1}^N w_i = 1.0, \quad w_i \ge 0 \quad \forall i$$

### 1.1 Expected Return
$$E[R_p] = w^T \mu = \sum_{i=1}^N w_i \mu_i$$
where $\mu \in \mathbb{R}^N$ is the vector of annualized expected asset returns.

### 1.2 Portfolio Volatility
$$\sigma_p = \sqrt{w^T \Sigma w}$$
where $\Sigma \in \mathbb{R}^{N \times N}$ is the annualized return covariance matrix computed from historical daily log returns $r_t = \ln(P_t / P_{t-1})$:
$$\Sigma = 252 \times \text{Cov}(r)$$

### 1.3 Maximum Drawdown (MDD)
Given cumulative wealth trajectory $W_t = W_0 \prod_{s=1}^t (1 + R_s)$:
$$\text{Peak}_t = \max_{0 \le s \le t} W_s, \quad \text{Drawdown}_t = \frac{\text{Peak}_t - W_t}{\text{Peak}_t}, \quad \text{MDD} = \max_{0 \le t \le T} \text{Drawdown}_t$$

### 1.4 Liquidity Ratio
$$L = \sum_{i=1}^N w_i \ell_i$$
where $\ell_i \in [0.0, 1.0]$ represents the normalized liquidity factor of asset $i$.

### 1.5 Concentration Index (HHI)
$$\text{HHI} = \sum_{i=1}^N w_i^2$$
- Equal-weight 5-asset portfolio: $\text{HHI} = 5 \times (0.20)^2 = 0.20$.
- Single-asset monopoly: $\text{HHI} = 1.00$.

### 1.6 Market Stress Indicator ($S$)
$$S = \min\left(\max\left(\frac{\sigma_p}{\sigma_{\text{historical\_avg}}} - 1.0, 0.0\right), 1.0\right)$$

---

## 2. Composite Risk Score (0–100)

The composite risk score synthesizes 5 normalized risk dimensions:

$$S_{\text{risk}} = 0.30 \cdot S_{\text{vol}} + 0.25 \cdot S_{\text{dd}} + 0.20 \cdot S_{\text{conc}} + 0.15 \cdot S_{\text{liq}} + 0.10 \cdot S_{\text{stress}}$$

### Component Normalization Functions:
1. **Volatility Score:** $S_{\text{vol}} = \min\left(\frac{\sigma_p}{0.30}, 1.0\right) \times 100$
2. **Drawdown Score:** $S_{\text{dd}} = \min\left(\frac{\text{MDD}}{0.20}, 1.0\right) \times 100$
3. **Concentration Score:** $S_{\text{conc}} = \max\left(\frac{\text{HHI} - 0.20}{0.80}, 0.0\right) \times 100$
4. **Liquidity Score (Inverse):** $S_{\text{liq}} = (1.0 - L) \times 100$
5. **Market Stress Score:** $S_{\text{stress}} = S \times 100$

Score is clamped strictly to $[0.0, 100.0]$.

---

## 3. Tail Risk Metrics (VaR & CVaR)

Implemented in `backend/app/core/formulas.py`:

### 3.1 Parametric Value at Risk ($\text{VaR}_{95}$)
$$\text{VaR}_{95} = -(\mu_p - 1.645 \cdot \sigma_p) = 1.645 \cdot \sigma_p - \mu_p$$
Represents the maximum expected daily loss at a 95% confidence level.

### 3.2 Parametric Conditional Value at Risk ($\text{CVaR}_{95}$)
$$\text{CVaR}_{95} = -\mu_p + \sigma_p \cdot \frac{\phi(1.645)}{1 - 0.95} \approx -\mu_p + 2.0627 \cdot \sigma_p$$
where $\phi(\cdot)$ is the standard normal probability density function. Represents expected tail loss given that the loss exceeds $\text{VaR}_{95}$.

---

## 4. Predictive Modeling & Correlation Contagion

### 4.1 EWMA Volatility Forecasting
Implemented in `backend/app/services/prediction_service.py` using RiskMetrics decay:
$$\sigma_{t}^2 = (1 - \lambda) r_{t-1}^2 + \lambda \sigma_{t-1}^2, \quad \lambda = 0.94$$

### 4.2 Correlation Contagion Metric ($C_{\text{contagion}}$)
Implemented in `backend/app/services/contagion_service.py`:
$$C_{\text{contagion}} = \frac{1}{\binom{N}{2}} \sum_{i < j} (\rho_{ij,\text{stressed}} - \rho_{ij,\text{normal}})$$
Quantifies the systematic breakdown of diversification during crisis panics.

---

## 5. Safe Operating Envelope (SOE) & Hysteresis

| Parameter | GREEN (Safe) | YELLOW (Caution) | ORANGE (Warning) | RED (Crisis) |
| :--- | :--- | :--- | :--- | :--- |
| **Score Range** | $0 \le S < 30$ | $30 \le S < 60$ | $60 \le S < 80$ | $80 \le S \le 100$ |
| **Max Equity ($w_{\text{equity}}$)** | $\le 50\%$ | $\le 45\%$ | $\le 35\%$ | $\le 20\%$ |
| **Min Cash ($w_{\text{cash}}$)** | $\ge 5\%$ | $\ge 10\%$ | $\ge 15\%$ | $\ge 20\%$ |
| **Max Volatility ($\sigma_p$)** | $\le 15\%$ | $\le 14\%$ | $\le 12\%$ | $\le 10\%$ |
| **Max Drawdown Limit** | $\le 10\%$ | $\le 10\%$ | $\le 8\%$ | $\le 5\%$ |
| **Operational Stance** | `HOLD` | `ADVISORY` | `REBALANCE` | `CRISIS_PROTECTION` |

### Anti-Chattering Hysteresis
To prevent boundary oscillation when risk scores fluctuate near zone thresholds:
$$S_{\text{recovery}} \le \text{Threshold} - \delta \quad (\delta = 3.0)$$
- YELLOW $\to$ GREEN recovery: $S \le 27.0$.
- ORANGE $\to$ YELLOW recovery: $S \le 57.0$.
- RED $\to$ ORANGE recovery: $S \le 77.0$.

---

## 6. Minimum-Intervention Optimization Formulation

Implemented in `backend/app/services/optimizer.py` using CVXPY:

$$\min_{w \in \mathbb{R}^N} \quad \frac{1}{2} \|w - w_0\|_2^2 + \gamma \sum_{i=1}^N |w_i - w_{0,i}| + \lambda w^T \Sigma w - \kappa w^T \mu$$

Subject to:
$$\begin{aligned}
\sum_{i=1}^N w_i &= 1.0 \\
w_i &\ge 0 \quad \forall i \\
w_{\text{equity}} &\le \text{MaxEquity}_{\text{zone}} \\
w_{\text{cash}} &\ge \text{MinCash}_{\text{zone}} \\
w_i &\le w_i^{\max}, \quad w_i \ge w_i^{\min} \\
w^T \Sigma w &\le \sigma_{\max,\text{zone}}^2
\end{aligned}$$

Where:
- $w_0$: Current portfolio weight vector.
- $\frac{1}{2} \|w - w_0\|_2^2$: Euclidean minimum-intervention penalty.
- $\gamma \sum |w_i - w_{0,i}|$: $L_1$ portfolio turnover penalty.
- $\lambda$: Risk aversion multiplier on portfolio variance.
- $\kappa$: Return incentive weight.

---

## 7. Transaction Cost & Turnover Friction

$$\text{Turnover} = \sum_{i=1}^N |w_i^* - w_{0,i}|$$
$$C_{\text{txn}} = \text{Turnover} \times V_{\text{portfolio}} \times r_{\text{cost}}$$
Where $r_{\text{cost}} = 0.0010$ (10 basis points).

---

## 8. Euler's Risk Decomposition

Implemented in `backend/app/services/risk_attribution.py`:

The Marginal Risk Contribution ($\text{MCR}_i$) of asset $i$ to portfolio volatility $\sigma_p$ is:
$$\text{MCR}_i = \frac{\partial \sigma_p}{\partial w_i} = \frac{(\Sigma w)_i}{\sigma_p}$$

Absolute Risk Contribution ($\text{ARC}_i$):
$$\text{ARC}_i = w_i \cdot \text{MCR}_i = \frac{w_i (\Sigma w)_i}{\sigma_p}$$
Euler's Theorem guarantees: $\sum_{i=1}^N \text{ARC}_i = \sigma_p$.

Percentage Risk Contribution ($\text{PRC}_i$):
$$\text{PRC}_i = \frac{\text{ARC}_i}{\sigma_p} = \frac{w_i (\Sigma w)_i}{\sigma_p^2}$$
Identifies hidden concentration where an asset's risk contribution vastly exceeds its capital allocation.

---

## 9. Reverse Stress Testing & Distance to Failure

Implemented in `backend/app/services/reverse_stress.py`:

Given a crisis shock vector $\mathbf{s} \in \mathbb{R}^N$ and shock multiplier $\alpha \ge 0$:
$$V_i(\alpha) = w_i^0 \cdot V_{\text{portfolio}} \cdot (1 + \alpha \cdot s_i)$$
$$V_{\text{total}}(\alpha) = \sum_{i=1}^N V_i(\alpha)$$
$$w_i(\alpha) = \frac{V_i(\alpha)}{V_{\text{total}}(\alpha)}$$

The failure boundary is the critical multiplier $\alpha^*$ satisfying:
$$\alpha^* = \inf \left\{ \alpha \in [0.02, 0.50] \mid S_{\text{risk}}(w(\alpha)) \ge 80.0 \right\}$$

- **Distance to Failure (DtF):** $\text{DtF} = \alpha^*$
- **Resilience Score:** $\text{Resilience} = \min\left(\frac{\text{DtF}}{0.30}, 1.0\right) \times 100$
