# AEGIS Demo Script & Pitch Guide

**Product Identity:** AEGIS (Adaptive Capital Resilience & Risk-Control System)  
**Detailed 23-Step Script:** See [AEGIS_DEMO_FLOW.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/AEGIS_DEMO_FLOW.md)  
**Authoritative Architecture:** See [CURRENT_SYSTEM_ARCHITECTURE.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/CURRENT_SYSTEM_ARCHITECTURE.md)  
**Target Duration:** 3 Minutes  

---

## 1. Fast Setup (Zero-Config Native)

```bash
# Terminal 1 - Backend (Uses local SQLite database opti_capital.db by default)
cd backend
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
python -m app.seed.seed_database
uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`.

---

## 2. Live Demo Sequence (180 Seconds)

### Step 1: Healthy Baseline (30 seconds)
- Open `http://localhost:5173`.
- Highlight **₹1.00 Cr** capital, 5 asset classes, and **SAFE (GREEN)** risk score (24.2 / 100).
- *"AEGIS monitors institutional capital within a dynamic Safe Operating Envelope. Notice it deliberately avoids unnecessary trading when conditions are safe."*

### Step 2: The Macro Shock (35 seconds)
- In Tab 1 (`Command Center`), select the **Market Crash** scenario (-30% Equity).
- Click **[RUN SIMULATION]**.
- Point out the risk score surging to **84.6 (CRISIS / RED)**.
- Switch to Tab 3 (`Euler Attribution`): *"Euler's risk decomposition reveals Equity accounts for 91% of stressed portfolio risk despite being only 38% of capital."*
- Switch to Tab 2 (`Correlation Contagion`): *"Notice cross-asset correlations spiking, illustrating diversification breakdown."*

### Step 3: Minimum-Intervention Control (40 seconds)
- Return to Tab 1 (`Command Center`).
- Point out the Control Mode: `CRISIS_PROTECTION`.
- Highlight the **CVXPY Minimum-Intervention proposal**:
  - Equity clamped from 38% $\to$ 20%.
  - Cash increased from 6% $\to$ 20%.
  - Turnover is only 18.5%, holding transaction fee to **₹3,520**.
- Point to the **Independent Validator**: *"All 6 safety invariants certified PASS before presenting to the risk committee."*

### Step 4: Approval & Reverse Stress (45 seconds)
- Click **[APPROVE REBALANCE]**.
- Watch holdings update in database; risk score drops to **26.1 (SAFE / GREEN)**.
- Switch to Tab 4 (`Reverse Stress Lab`):
  - Show the **Distance to Failure** expanding from **8.2%** to **28.4%**.
  - Adjust the interactive Failure Threshold slider.
  - *"We proved quantitatively that capital resilience has been restored."*

### Step 5: AI Copilot & Audit Trail (30 seconds)
- Click the **Floating AI Copilot** icon in the bottom right.
- Type: *"Why did the system increase cash to 20%?"*
- Highlight the instant fiduciary explanation with institutional policy citations (IPS §4.2).
- Switch to Tab 6 (`Audit & Outcomes`):
  - Highlight the immutable compliance ledger and 5-day simulated outcome tracking (loss avoided).

---

## 3. Key Differentiators to Emphasize

1. **Closed-Loop Control vs Constant Churn:** *"We don't chase unconstrained optimal portfolios every minute. We keep capital resilient and intervene only when necessary."*
2. **Minimum Intervention:** *"We make the smallest adjustment that restores safety, minimizing transaction fee drag."*
3. **Reverse Stress Testing:** *"We don't just ask what happens in a crash; we calculate the exact Distance to Failure before capital breaks."*
4. **Deterministic Math with AI Explanation:** *"Financial math is 100% deterministic and auditable; AI explains decisions without hallucinating trades."*
5. **Decoupled Safety Certification:** *"An independent validator checks every candidate portfolio before human review."*
