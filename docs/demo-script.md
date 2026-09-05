# AEGIS Demo Script & Pitch Guide

**Product Identity:** AEGIS (Adaptive Capital Resilience & Risk-Control System)  
**Detailed 23-Step Script:** See [AEGIS_DEMO_FLOW.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/AEGIS_DEMO_FLOW.md)  
**Target Duration:** 3 Minutes  

---

## 1. Setup (Prior to Demo)

```bash
docker compose up -d
cd backend && python -m app.seed.seed_database
cd backend && uvicorn app.main:app --reload
cd frontend && npm run dev
```

---

## 2. Live Demo Sequence

### Step 1: Healthy Baseline (30 seconds)
- Open `http://localhost:5173`.
- Highlight **₹1.00 Cr** capital, diversified allocation, and **SAFE (GREEN)** risk score (24.2 / 100).
- *"AEGIS monitors capital within a dynamic Safe Operating Envelope. Notice it avoids unnecessary trading when conditions are safe."*

### Step 2: The Macro Shock (45 seconds)
- Select the **Market Crash** scenario (-30% Equity).
- Click **[RUN SIMULATION]**.
- Point out the risk score animating to **84.6 (CRISIS / RED)**.
- Highlight the **Risk Attribution**: *"Equity alone accounts for 91% of stressed portfolio risk."*

### Step 3: Minimum-Intervention Control (45 seconds)
- Point out the Control Mode: `CRISIS_PROTECTION`.
- Highlight the **CVXPY Minimum-Intervention proposal**:
  - Equity reduced from 38% $\to$ 20%.
  - Cash increased from 6% $\to$ 20%.
  - Turnover is only 18.5%, holding transaction cost to **₹3,520**.
- Point to the **Independent Validator**: *"All 6 safety invariants certified PASS before presenting to the risk officer."*

### Step 4: Approval & Resilience Proof (30 seconds)
- Click **[APPROVE REBALANCE]**.
- Watch holdings update in PostgreSQL; risk score drops to **26.1 (SAFE / GREEN)**.
- Trigger **Reverse Stress Testing**:
  - Show the **Distance to Failure** expanding from **8.2%** to **28.4%**.
  - *"We proved quantitatively that capital resilience has been restored."*

### Step 5: Audit Trail & Wrap-up (30 seconds)
- Scroll to the **Decision History** audit ledger.
- *"Every assessment, breach, solver run, and human approval is immutably logged in PostgreSQL for regulatory audit."*

---

## 3. Key Differentiators to Emphasize

1. **Closed-Loop Control vs Constant Churn:** *"We don't chase unconstrained optimal portfolios every minute. We keep capital resilient and intervene only when necessary."*
2. **Minimum Intervention:** *"We make the smallest adjustment that restores safety, minimizing transaction friction."*
3. **Reverse Stress Testing:** *"We don't just ask what happens in a crash; we show you how close your capital is to breaking before it does."*
4. **Deterministic Math with AI Explanation:** *"Financial math is 100% deterministic and auditable; AI explains decisions without hallucinating trades."*
