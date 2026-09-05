# AEGIS: Architecture Decision Records (ADR)

**Product Identity:** AEGIS (Adaptive Capital Resilience & Risk-Control System)  
**Status:** Accepted & Canonical  
**Purpose:** Formal record of architectural, mathematical, and governance decisions to prevent drift or conflicting interpretations across the team.

---

## ADR-001: AEGIS as the Unified Final Product Concept

### Context
Two concepts existed across project materials: "Smart Capital Guard" (the engineering codebase and initial implementation plan) and "AEGIS" (the final solution proposal synthesizing capital control and resilience intelligence from the hackathon slide deck).

### Decision
The unified, canonical product name and identity is **AEGIS — Adaptive Capital Resilience & Risk-Control System**. All user-facing interfaces, documentation, and presentations will use AEGIS.

### Consequences
- Unambiguous identity for pitch, presentation, and evaluation.
- The repository codebase remains the direct foundation for AEGIS without renaming internal code namespaces unnecessarily.

---

## ADR-002: Smart Capital Guard as the Technical Implementation Foundation

### Context
The team leader previously created a working implementation and a 3,155-line technical specification for Smart Capital Guard, including FastAPI backend routes, PostgreSQL models, CVXPY optimization, and a React frontend.

### Decision
Do **NOT** rebuild the project from scratch. Treat Smart Capital Guard as the proven engineering foundation. All AEGIS capabilities will be implemented as modular extensions directly onto the existing repository.

### Consequences
- Maximizes hackathon velocity and capitalizes on existing working code.
- Eliminates redundant work, preserving working database migrations, seed scripts, and services.

---

## ADR-003: Architecture Extension Over Replacement

### Context
A temptation in hackathons is to discard prior code when a more sophisticated concept is adopted. 

### Decision
Follow the architectural evolution path:
$$\text{Smart Capital Guard Foundation} + \text{Safe Operating Envelope} + \text{Risk Attribution} + \text{Reverse Stress Testing} + \text{Independent Validation} = \text{AEGIS}$$

### Consequences
- Existing services (`risk_engine.py`, `scenario_engine.py`, `rebalancer.py`, `portfolio_service.py`) are retained and wrapped with higher-level intelligence.

---

## ADR-004: Minimum-Intervention Optimization vs Global Re-Optimization

### Context
Generic portfolio optimizers seek the globally optimal unconstrained portfolio for a given time step. In reality, continuous re-optimization causes massive portfolio turnover, high transaction costs, tax drag, and overreaction to estimation errors.

### Decision
AEGIS adopts the **Minimum Necessary Intervention Principle**. When an envelope boundary is breached, the optimizer does not ask *"What is the globally optimal portfolio?"*; it asks:
> *"What is the smallest feasible portfolio adjustment that restores the portfolio safely within its operating envelope?"*

Mathematically, the objective minimizes the squared Euclidean divergence from the current portfolio $\frac{1}{2} \|w - w_{\text{current}}\|_2^2$ and $L_1$ turnover, subject to dynamic safety constraints.

### Consequences
- Dramatically lower turnover and transaction costs.
- Higher institutional realism and defensibility before risk committees.

---

## ADR-005: Decoupled Independent Validator

### Context
In many financial systems, the optimizer is assumed to satisfy constraints implicitly. However, numerical solver inaccuracies, soft-constraint trade-offs, or bad solver convergence can produce candidate allocations that violate strict limits.

### Decision
Implement a dedicated **Independent Validator** service completely decoupled from CVXPY. The entity that generates allocations (the Optimizer) cannot certify them. Candidate weights must pass a strict boolean checklist before being presented to the user. If validation fails, the recommendation is `BLOCKED` and a deterministic safe cash rule is applied.

### Consequences
- Eliminates solver hallucination risk.
- Conforms to institutional risk separation-of-concerns principles.

---

## ADR-006: Reverse Stress Testing as the Primary WOW Feature

### Context
Forward stress testing ("What happens if Equity drops 30%?") is standard in financial software. While necessary, it does not demonstrate proactive resilience intelligence.

### Decision
Adopt **Reverse Stress Testing** as the centerpiece innovation. Reverse stress testing asks:
> *"What combination of market shocks would break the portfolio through its failure boundary?"*

AEGIS runs a deterministic shock sweep to identify the exact critical shock $\alpha^*$ and displays the portfolio's **Distance to Failure (DtF)** and **Resilience Score**.

### Consequences
- Memorable, high-impact judging demonstration.
- Visually shows that the post-rebalance portfolio has expanded its resilience buffer.

---

## ADR-007: Deterministic Core with AI as Explanation Layer Only

### Context
There is a risk of treating "AI" as an autonomous stock picker, trade executor, or unconstrained decision-maker. In financial risk management, non-deterministic black-box LLMs cannot be trusted with capital allocation.

### Decision
1. All risk metrics, envelope boundaries, convex optimizations, and validation checks are **100% deterministic mathematical calculations**.
2. AI / LLM capabilities are strictly confined to an **Explanation Layer**: synthesizing structured JSON audit events into natural language briefings for human executives.
3. AI must **never** invent asset weights, modify numerical outputs, or authorize transactions.

### Consequences
- 100% mathematical auditability.
- Zero risk of financial hallucinations during judging.

---

## ADR-008: Simulation-Only Operational Boundary

### Context
Financial software must have clear regulatory and operational scope.

### Decision
AEGIS is strictly a **decision-support and simulation platform**. It contains no live broker integrations, API execution gateways, or direct capital debiting. All rebalance actions are simulated updates within the local PostgreSQL database.

### Consequences
- Absolute safety during demonstrations.
- Clear compliance boundary for hackathon evaluation.

---

## ADR-009: Hysteresis for Anti-Chattering Control

### Context
When a portfolio's risk score oscillates around a boundary threshold (e.g., 30.0), small market ticks can cause continuous, alternating warnings and rebalance triggers.

### Decision
Implement an asymmetric **Hysteresis Band** of $\delta = 3.0$ points. Returning to a safer operating mode requires the risk score to drop $\delta$ points below the breach threshold.

### Consequences
- Suppresses trading churn and false-positive alarm fatigue.
- Stabilizes UI and operational workflows.

---

## ADR-010: Immutable PostgreSQL Audit Trail

### Context
Institutional risk governance mandates that every assessment, breach, solver run, candidate allocation, and human decision be preserved permanently for regulatory review.

### Decision
All state transitions are persisted across 11 normalized PostgreSQL tables:
- `risk_snapshots`
- `optimization_runs`
- `optimization_allocations`
- `rebalance_actions`
- `alerts`

No record is overwritten; state updates create new audit rows.

### Consequences
- Full traceability for auditing and review.
- Enables rich decision history visualization in the UI.
