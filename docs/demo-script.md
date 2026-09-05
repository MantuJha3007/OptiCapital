# Demo Script

## Setup

```bash
docker compose up -d                       # or use SQLite, see README
cd backend && python -m app.seed.seed_database
cd backend && uvicorn app.main:app --reload
cd frontend && npm run dev
```

Open http://localhost:5173.

**Between rehearsals**, restore the starting book — approving a crisis
rebalance leaves it defensive:

```bash
cd backend && python -m app.seed.seed_database --reset
```

---

## 1. The resting state (30s)

Point at the header: **SAFE**, score **22.8**, ₹1.00 Cr.

> "The headline is a verdict, not a number: **no intervention required**. The
> whole interface is coloured by the live risk regime — green here, and it
> will change as the regime does. Colour always means risk."

Point at *Optimiser bounds in force*: every limit has headroom.

---

## 2. Where risk actually lives (45s)

**Risk Attribution.**

> "The book is 37% equity. But equity carries far more of the *risk* than it
> does of the capital — the two bars share a baseline and grow in opposite
> directions, so the asymmetry is the first thing you see."

Point at the intensity multiplier.

> "Above 1.00x, a sleeve consumes more of the risk budget than of the
> capital. That is where a reduction buys the most safety per rupee moved.
> These are Euler risk contributions, so they sum exactly to total risk."

---

## 3. The hidden fragility (45s)

**Contagion.**

> "Reported HHI says 0.25 — a diversified book. But concentration is about
> behaviour, not labels."

Point at *Largest single block*.

> "38% of capital sits in one correlated block that spans two asset classes,
> and it carries 54% of the risk. Bank equity and financial-sector credit are
> in different rows of the allocation chart and read as diversification. They
> are the same exposure."

Drag a node; the network relaxes. Click one to inspect it.

---

## 4. The control loop under stress (90s) — the core of the demo

**Stress Studio → Normal Market → Run.**

> "Verdict: **HOLD**. Turnover zero. The system declining to act is the
> point — continuous re-optimisation is how you generate cost and churn."

**Now Market Crash → Run.** Watch the pipeline step through.

> "Risk goes 22.8 → **62.3**. Regime escalates SAFE → **STRESS**, and notice
> the interface has changed colour with it."

Point at *Control response*: every limit tightened automatically.

> "Equity ceiling 50% → 35%, cash floor 10% → 15%, volatility cap 15% → 12%.
> Nobody typed those; the regime selected them."

Point at *Minimum necessary intervention*.

> "3 of 5 positions move. Cost ₹6.0K — 0.06% of capital. The objective
> penalises turnover heavily enough that the solver stops the moment the book
> is back inside its limits, instead of rebuilding toward a fresh optimum."

**Approve.**

---

## 5. Trust (30s)

**Execution Ledger.**

> "Every decision, expanded into the chain the engine actually followed:
> trigger, condition, decision, recommendation, validation, outcome —
> reconstructed from the stored reasoning, not narrated afterwards."

Point at the trajectory chart.

> "Holds are logged with the same weight as interventions. A system that only
> records the times it acted can't show you that it declined to act."

---

## Questions you should expect

**"Does a crash really raise the score, or did you hard-code that?"**
A shock is repriced as a regime change: volatilities expand and correlations
converge toward 1. Modelled naively it inverts — the fallen asset occupies a
smaller share, so measured risk *drops* after a crash. `test_pipeline.py`
asserts the direction, and six tests fail if the stress model is removed.

**"Why is crash turnover so large?"**
It is the minimum that satisfies the constraints. Taking a 30%-volatility
book to a 12% limit with correlations converged cannot be done with a small
trade. The system states the size and the cost rather than hiding it.

**"Where does the correlation data come from?"**
Sleeve weights are derived from the live class weights returned by
`/api/portfolio`. The intra-class decomposition and correlation matrix are
local to the frontend and documented as such in `src/lib/exposure.ts`, behind
a single seam (`buildExposure`) for a future `/api/correlation` endpoint.

**"What is simulated?"**
Everything. No order reaches a venue. Market data is synthetic but
generated with a Cholesky decomposition of a specified correlation matrix,
and holdings updates on approval are real database writes.
