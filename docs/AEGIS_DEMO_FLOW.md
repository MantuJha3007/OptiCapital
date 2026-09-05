# AEGIS: Hackathon Judging Demo Flow & Presentation Script

**Product Identity:** AEGIS (Adaptive Capital Resilience & Risk-Control System)  
**Total Target Duration:** 3 Minutes (180 Seconds)  
**Target Audience:** Hackathon Technical Judges & Investment/Risk Specialists  
**Core Story:** *From Passive Risk Breach to Autonomous Closed-Loop Resilience.*

---

## 1. Demo Setup Checklist (Pre-Flight)

Execute these steps prior to the presentation:
```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Seed Database (Fresh Demo Data)
cd backend
python -m app.seed.seed_database

# 3. Start Backend API
uvicorn app.main:app --reload

# 4. Start Frontend
cd ../frontend
npm run dev
```
Open browser to `http://localhost:5173`. Verify the dashboard loads with **₹1.00 Cr** capital and **SAFE (GREEN)** risk status.

---

## 2. Minute-by-Minute 23-Step Judging Storyboard

```text
[0:00 - 0:30] Phase 1: The Healthy Baseline (Observe & Measure)
[0:30 - 1:00] Phase 2: The Macro Shock (Detect & Diagnose)
[1:00 - 1:45] Phase 3: The Defensive Control (Decide, Optimize & Validate)
[1:45 - 2:30] Phase 4: Resolution & Resilience Proof (Simulate, Re-test & Reverse Stress)
[2:30 - 3:00] Phase 5: Institutional Audit & Q&A
```

---

### Step 1: Open Dashboard
- **Action:** Open `http://localhost:5173`.
- **Narration:** *"Welcome to AEGIS—our closed-loop adaptive capital resilience and risk-control system."*

### Step 2: Show Healthy Portfolio
- **Action:** Point to the Portfolio Summary card. Total Capital: **₹1,00,00,000 (₹1 Crore)**.
- **Narration:** *"We are managing an institutional multi-asset portfolio comprising Equity, Government Bonds, Corporate Bonds, Gold, and Cash."*

### Step 3: Show GREEN State
- **Action:** Highlight the Risk Gauge and Safe Operating Envelope badge.
- **Visual Cue:** Risk Score: **24.2 / 100**, Mode: **SAFE (GREEN)**.
- **Narration:** *"Right now, capital is operating safely inside our dynamic Safe Operating Envelope. Notice that AEGIS does not recommend trading; it suppresses turnover when risk is within acceptable bounds."*

### Step 4: Select MARKET CRASH Scenario
- **Action:** In the Stress Lab panel, click on the **Market Crash** scenario card.
- **Visual Cue:** Shock matrix highlights: Equity $-30\%$, Corp Bonds $-10\%$, Gov Bonds $-5\%$, Gold $+12\%$.
- **Narration:** *"Let's simulate a severe market crash: a 30% drop in equities with a flight to safety."*

### Step 5: Run Simulation
- **Action:** Click the vibrant blue **[RUN SIMULATION]** button.
- **Narration:** *"We execute the forward stress test."*

### Step 6: Show Risk Increase
- **Action:** Point to the post-shock metric comparison.
- **Visual Cue:** Volatility spikes from 12.8% to 23.4%, drawdown deepens, portfolio value drops.
- **Narration:** *"Immediately, the shock hits the portfolio, destroying capital and spiking volatility."*

### Step 7: Show GREEN $\to$ RED Transition
- **Action:** Point to the Risk Gauge animating from emerald green to crimson red.
- **Visual Cue:** Score escalates from **24.2** to **84.6**, Mode: **CRISIS (RED)**.
- **Narration:** *"The portfolio has violently breached the Safe Operating Envelope. Mode transitions from GREEN to RED."*

### Step 8: Show WHY Risk Increased (Risk Attribution)
- **Action:** Point to the Threshold Breaches and Risk Attribution.
- **Visual Cue:** 3 hard breaches: Volatility > 15%, Drawdown > 10%, Cash fell below 10%. Equity accounts for 91% of total risk.
- **Narration:** *"AEGIS doesn't just sound an alarm—it diagnoses the breach: Equity now accounts for 91% of portfolio risk."*

### Step 9: Control Engine Requests Intervention
- **Action:** Point to the Control Mode banner.
- **Visual Cue:** Action: `CRISIS_PROTECTION`, Dynamic Constraints: Max Equity clamped to 20%, Min Cash raised to 20%.
- **Narration:** *"The Control Engine intervenes, dynamically tightening constraints to protect remaining capital."*

### Step 10: Run Minimum-Intervention Optimizer
- **Action:** Point to the Optimizer output card.
- **Narration:** *"Now notice the key AEGIS innovation: rather than wiping out the portfolio to chase an unconstrained theoretical optimum, CVXPY calculates the minimum necessary intervention."*

### Step 11: Show Proposed Allocation
- **Action:** Point to the Allocation Diff table.
- **Visual Cue:** Equity reduced from 38% $\to$ 20%, Cash increased from 6% $\to$ 20%.
- **Narration:** *"It adjusts only what is strictly necessary to return the portfolio inside the safe envelope."*

### Step 12: Show Turnover and Transaction Cost
- **Action:** Highlight the Turnover and Transaction Cost cards.
- **Visual Cue:** Turnover: **18.5%**, Transaction Cost: **₹3,520**.
- **Narration:** *"By minimizing turnover, transaction costs are held to just ₹3,520 instead of the massive churn of a full rebalance."*

### Step 13: Run Independent Validation
- **Action:** Highlight the Independent Validator section.
- **Narration:** *"Crucially: the optimizer cannot certify its own output. Candidate weights are independently verified by our Validator."*

### Step 14: Show PASS Badge
- **Action:** Point to the green verification checkmarks.
- **Visual Cue:** `VALIDATOR: PASS (6/6 Invariants Satisfied)`.
- **Narration:** *"Weight sum, non-negativity, volatility ceilings, and cash floors are independently certified."*

### Step 15: Approve Simulated Rebalance
- **Action:** Click the green **[APPROVE REBALANCE]** button.
- **Narration:** *"As the risk officer, I approve the rebalance recommendation."*

### Step 16: Recalculate Risk
- **Action:** Watch the dashboard update live.
- **Narration:** *"The database updates the simulated holdings in PostgreSQL and recomputes the portfolio risk."*

### Step 17: Show RED $\to$ GREEN Recovery
- **Action:** Point to the Risk Gauge animating back down.
- **Visual Cue:** Score drops to **26.1**, Mode: **SAFE (GREEN)**.
- **Narration:** *"The portfolio has returned safely inside the operating envelope."*

### Step 18: Re-Run Stress Test
- **Action:** Re-run the simulation against the post-rebalance portfolio.
- **Narration:** *"We re-stress the rebalanced portfolio to test its new defensive structure."*

### Step 19: Show Improved Resilience
- **Action:** Point to the dramatically reduced loss and lower post-shock volatility.
- **Narration:** *"Under the exact same crash, the defensive portfolio incurs only a fraction of the original drawdown."*

### Step 20: Run Reverse Stress Test (The WOW Feature)
- **Action:** Click **[RUN REVERSE STRESS TEST]**.
- **Narration:** *"Now for our centerpiece feature: Reverse Stress Testing. Traditional systems ask 'What happens in a crash?' AEGIS asks: 'How close is this portfolio to breaking?'"*

### Step 21: Show Failure Boundary
- **Action:** Point to the Distance to Failure (DtF) metric and progression chart.
- **Visual Cue:** Before rebalance: DtF was **8.2%** (Vulnerable). After rebalance: DtF is **28.4%** (Robust).
- **Narration:** *"Before intervention, a mere 8% additional shock would cause catastrophic failure. Now, the failure boundary has pushed out to 28%."*

### Step 22: Show Complete Audit History
- **Action:** Scroll to the Decision History audit table.
- **Visual Cue:** PostgreSQL audit rows showing timestamp, scenario, optimizer status, validator pass, and approved rebalance.
- **Narration:** *"Every metric, constraint breach, candidate allocation, and approval is immutably logged in PostgreSQL for regulatory audit."*

### Step 23: Show Synthesized Explanation
- **Action:** Highlight the Natural Language Explanation card.
- **Narration:** *"Finally, AEGIS translates the entire mathematical decision into a clear boardroom summary: why we intervened, what changed, what it cost, and how resilience was restored. That is AEGIS."*

---

## 3. High-Probability Judge Questions & Defensible Answers

### Q1: "Why not use a modern AI/LLM to pick the portfolio weights?"
> **Answer:** *"In institutional risk governance, non-deterministic models cannot manage capital limits. A neural net might hallucinate allocations or violate hard cash reserves. AEGIS keeps all financial logic 100% deterministic using convex quadratic programming and mathematical risk decomposition. We use AI exclusively as an explanation layer to translate math into executive briefings."*

### Q2: "What makes minimum-intervention better than standard Mean-Variance Optimization?"
> **Answer:** *"Standard MVO suffers from extreme estimation error sensitivity and continuous churn. At every tick it wants to rebuild the portfolio, costing thousands in transaction fees. AEGIS treats capital as a control system: if you are inside the safe envelope, do nothing. If you breach it, make the smallest possible adjustment that restores compliance."*

### Q3: "What is the difference between Forward and Reverse Stress Testing?"
> **Answer:** *"Forward stress tests a known shock scenario that someone thought of beforehand. Reverse stress testing searches backward from a catastrophic failure condition to identify the minimum combination of shocks that causes a breach. It quantitatively measures your true distance to failure."*
