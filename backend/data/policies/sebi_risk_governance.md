# Regulatory Risk Governance & Independent Validation Standard

## SEBI & Basel III Capital Preservation Directives
Under SEBI Circular SEBI/HO/IMD/DF2/CIR/P/2021/024 and Basel Committee on Banking Supervision (BCBS 239) risk governance standards:

### Independent Certification of Optimization
Algorithmic portfolio optimization models (e.g., CVXPY, Quadratic Programming) cannot act as their own compliance certifier. An independent mathematical validator must verify that candidate weights satisfy all mandatory constraints prior to committee review:
1. Full Budget Conservation: Sum of weights must equal 1.0000 within a tolerance of 1e-4.
2. Long-Only Invariant: No short selling or negative allocations without explicit leverage mandate.
3. Liquidity Floor: Sovereign cash and short-term equivalents must never fall below the mode limit.
4. Asset Concentration Cap: No individual asset class may exceed 50.0% of total capital.
5. Volatility Ceiling: Post-rebalance projected annualized volatility must strictly comply with the active envelope ceiling.

### Fiduciary Audit Log Requirement
Every automated recommendation, parameter adjustment, user review, approval, and rejection must produce an immutable cryptographic timestamp and database audit record documenting the before/after metrics, turnover, and explicit rationale.
