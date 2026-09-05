# AEGIS Financial & Mathematical Model

**Product Identity:** AEGIS (Adaptive Capital Resilience & Risk-Control System)  
**Document Status:** Canonical Mathematical Specification  

---

## 1. Portfolio Return & Risk Metrics

Let $w \in \mathbb{R}^N$ be the portfolio allocation weight vector satisfying:
$$\sum_{i=1}^N w_i = 1.0, \quad w_i \ge 0 \quad \forall i$$

### 1.1 Expected Return
$$E[R_p] = w^T \mu = \sum_{i=1}^N w_i \mu_i$$
where $\mu \in \mathbb{R}^N$ is the vector of annualized asset expected returns.

### 1.2 Portfolio Volatility
$$\sigma_p = \sqrt{w^T \Sigma w}$$
where $\Sigma \in \mathbb{R}^{N \times N}$ is the annualized return covariance matrix computed from historical daily log returns $r_t = \ln(P_t / P_{t-1})$:
$$\Sigma = 252 \times \text{Cov}(r)$$

### 1.3 Maximum Drawdown (MDD)
Given cumulative wealth trajectory $W_t = W_0 \prod_{s=1}^t (1 + R_s)$:
$$\text{Peak}_t = \max_{0 \le s \le t} W_s$$
$$\text{Drawdown}_t = \frac{\text{Peak}_t - W_t}{\text{Peak}_t}$$
$$\text{MDD} = \max_{0 \le t \le T} \text{Drawdown}_t$$

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

The composite risk score synthesizes individual normalized risk dimensions:

$$\text{Risk Score} = 0.30 \cdot S_{\text{vol}} + 0.25 \cdot S_{\text{dd}} + 0.20 \cdot S_{\text{conc}} + 0.15 \cdot S_{\text{liq}} + 0.10 \cdot S_{\text{stress}}$$

### Component Normalization Functions:
1. **Volatility Score:**
   $$S_{\text{vol}} = \min\left(\frac{\sigma_p}{0.30}, 1.0\right) \times 100$$
2. **Drawdown Score:**
   $$S_{\text{dd}} = \min\left(\frac{\text{MDD}}{0.20}, 1.0\right) \times 100$$
3. **Concentration Score:**
   $$S_{\text{conc}} = \max\left(\frac{\text{HHI} - 0.20}{0.80}, 0.0\right) \times 100$$
4. **Liquidity Score (Inverse):**
   $$S_{\text{liq}} = (1.0 - L) \times 100$$
5. **Market Stress Score:**
   $$S_{\text{stress}} = S \times 100$$

---

## 3. Safe Operating Envelope (SOE) & Dynamic Bounds

| Parameter | GREEN (Safe) | YELLOW (Caution) | ORANGE (Warning) | RED (Crisis) |
| :--- | :--- | :--- | :--- | :--- |
| **Score Range** | $0 \le \text{Score} < 30$ | $30 \le \text{Score} < 60$ | $60 \le \text{Score} < 80$ | $80 \le \text{Score} \le 100$ |
| **Max Equity ($w_{\text{equity}}$)** | $\le 50\%$ | $\le 45\%$ | $\le 35\%$ | $\le 20\%$ |
| **Min Cash ($w_{\text{cash}}$)** | $\ge 5\%$ | $\ge 10\%$ | $\ge 15\%$ | $\ge 20\%$ |
| **Max Volatility ($\sigma_p$)** | $\le 15\%$ | $\le 14\%$ | $\le 12\%$ | $\le 10\%$ |
| **Max Drawdown Limit** | $\le 10\%$ | $\le 10\%$ | $\le 8\%$ | $\le 5\%$ |
| **Operational Stance** | `HOLD` | `ADVISORY` | `REBALANCE` | `CRISIS_PROTECTION` |

### Anti-Chattering Hysteresis
To prevent boundary oscillation when risk scores hover around $30.0$, $60.0$, or $80.0$, de-escalation requires:
$$\text{Score}_{\text{recovery}} \le \text{Threshold} - \delta \quad (\delta = 3.0)$$
- YELLOW $\to$ GREEN recovery: $\text{Score} \le 27.0$.
- ORANGE $\to$ YELLOW recovery: $\text{Score} \le 57.0$.
- RED $\to$ ORANGE recovery: $\text{Score} \le 77.0$.

---

## 4. Minimum-Intervention Optimization Formulation

Rather than re-optimizing the entire portfolio toward an unconstrained point, AEGIS solves:

$$\min_{w \in \mathbb{R}^N} \quad \frac{1}{2} \|w - w_0\|_2^2 + \gamma \sum_{i=1}^N |w_i - w_{0,i}| + \lambda w^T \Sigma w - \kappa w^T \mu$$

Subject to:
$$\begin{aligned}
\sum_{i=1}^N w_i &= 1.0 \\
w_i &\ge 0 \quad \forall i \\
w_{\text{equity}} &\le \text{MaxEquity}_{\text{mode}} \\
w_{\text{cash}} &\ge \text{MinCash}_{\text{mode}} \\
w_i &\le w_i^{\max}, \quad w_i \ge w_i^{\min} \\
w^T \Sigma w &\le \sigma_{\max,\text{mode}}^2
\end{aligned}$$

Where:
- $w_0$: Current portfolio weight vector.
- $\frac{1}{2} \|w - w_0\|_2^2$: Minimum Euclidean intervention penalty.
- $\gamma \sum |w_i - w_{0,i}|$: $L_1$ portfolio turnover penalty.
- $\lambda$: Risk aversion multiplier on portfolio variance.
- $\kappa$: Return incentive weight.

---

## 5. Transaction Cost & Turnover Friction

$$\text{Turnover} = \sum_{i=1}^N |w_i^* - w_{0,i}|$$
$$C_{\text{txn}} = \text{Turnover} \times V_{\text{portfolio}} \times r_{\text{cost}}$$
Where $r_{\text{cost}} = 0.0010$ (10 basis points).

---

## 6. Risk Attribution via Euler's Decomposition

The marginal risk contribution of asset $i$ to portfolio volatility $\sigma_p$ is:
$$\text{MCR}_i = \frac{\partial \sigma_p}{\partial w_i} = \frac{(\Sigma w)_i}{\sigma_p}$$

Absolute Risk Contribution (ARC):
$$\text{ARC}_i = w_i \cdot \text{MCR}_i = \frac{w_i (\Sigma w)_i}{\sigma_p}$$
Euler's Theorem guarantees: $\sum_{i=1}^N \text{ARC}_i = \sigma_p$.

Percentage Risk Contribution (PRC):
$$\text{PRC}_i = \frac{\text{ARC}_i}{\sigma_p} = \frac{w_i (\Sigma w)_i}{\sigma_p^2}$$
Identifies hidden concentration where an asset's risk contribution vastly exceeds its capital allocation.

---

## 7. Reverse Stress Testing & Distance to Failure

Given a crisis shock vector $\mathbf{s} \in \mathbb{R}^N$ and shock multiplier $\alpha \ge 0$:
$$V_i(\alpha) = w_i^0 \cdot V_{\text{portfolio}} \cdot (1 + \alpha \cdot s_i)$$
$$V_{\text{total}}(\alpha) = \sum_{i=1}^N V_i(\alpha)$$
$$w_i(\alpha) = \frac{V_i(\alpha)}{V_{\text{total}}(\alpha)}$$

The failure boundary is the critical multiplier $\alpha^*$ satisfying:
$$\alpha^* = \inf \left\{ \alpha \in [0, 0.50] \mid \text{RiskScore}(w(\alpha)) \ge 80.0 \right\}$$

- **Distance to Failure (DtF):** $\text{DtF} = \alpha^*$
- **Resilience Score:** $\text{Resilience} = \min\left(\frac{\text{DtF}}{0.30}, 1.0\right) \times 100$
