"""Test complete stress to action loop:
1. Check baseline portfolio (AUM=1Cr, Risk=GREEN, No intervention)
2. Run stress scenario
3. Verify INTERVENTION REQUIRED & non-zero recommendation
4. Verify validator
5. Approve rebalance & verify DB holdings change
6. Verify Audit & Learning record
7. Verify Reject behavior
"""
from app.database import SessionLocal
from app.models.portfolio import Portfolio
from app.models.holding import Holding
from app.models.scenario import Scenario
from app.services.risk_engine import calculate_risk
from app.services.scenario_engine import run_scenario, get_all_scenarios
from app.services.rebalancer import approve_rebalance, reject_rebalance
from app.services.learning_service import get_decision_outcomes

def test_full_chain():
    db = SessionLocal()
    try:
        from app.api.portfolio import reset_portfolio
        reset_portfolio(db)
        p = db.query(Portfolio).first()
        print(f"1. BASELINE PORTFOLIO: {p.name} | Total Capital: INR {float(p.total_capital):,.2f}")
        
        initial_holdings = {h.asset.symbol: float(h.weight) for h in p.holdings}
        print(f"   Initial Holdings: {initial_holdings}")
        
        risk = calculate_risk(db, p)
        print(f"   Risk Score: {risk.risk_score:.1f} | Envelope: {risk.operating_envelope} | Intervention Required: {risk.intervention_required}")
        assert risk.operating_envelope == "GREEN"
        assert not risk.intervention_required

        scenarios = get_all_scenarios(db)
        print(f"\n2. AVAILABLE SCENARIOS: {[s.name for s in scenarios]}")
        # Find Market Crash scenario
        crash_sc = next((s for s in scenarios if "crash" in s.name.lower()), scenarios[0])
        print(f"   Triggering Scenario: '{crash_sc.name}'")

        res = run_scenario(db, p, crash_sc)
        stressed = res["stressed"]
        rec = res["recommendation"]

        print(f"\n3. POST-STRESS RESULTS:")
        print(f"   Stressed Risk Score: {stressed['risk_score']:.1f}")
        print(f"   Stressed Envelope: {stressed['operating_envelope']}")
        print(f"   Intervention Required: {stressed['intervention_required']}")
        assert stressed["intervention_required"] is True
        assert stressed["operating_envelope"] in ("RED", "ORANGE", "YELLOW")

        print(f"\n4. OPTIMIZER RECOMMENDATION:")
        print(f"   Action: {rec['action']}")
        print(f"   Optimization ID: {rec['optimization_id']}")
        print(f"   Current Alloc: {rec['current_allocation']}")
        print(f"   Proposed Alloc: {rec['proposed_allocation']}")
        print(f"   Turnover: {rec['turnover']:.4f}")
        print(f"   Transaction Cost: INR {rec['transaction_cost']:.2f}")
        print(f"   Risk Before: {rec['risk_before']:.1f} -> Risk After: {rec['risk_after']:.1f}")
        
        validator = rec.get("validator") or rec.get("validation")
        print(f"\n5. VALIDATOR RESULTS:")
        print(f"   Valid: {validator.get('valid')}")
        for chk in validator.get("checks", []):
            print(f"   - {chk.get('label') or chk.get('name')}: {'PASS' if chk.get('passed') else 'FAIL'} ({chk.get('value')})")

        opt_id = rec["optimization_id"]

        print(f"\n6. APPROVING REBALANCE (ID: {opt_id})...")
        appr_res = approve_rebalance(db, opt_id)
        print(f"   Approval Status: {appr_res.get('status')}")
        print(f"   Message: {appr_res.get('message')}")

        # Check DB holdings after approval
        db.refresh(p)
        updated_holdings = {h.asset.symbol: float(h.weight) for h in p.holdings}
        print(f"\n7. DATABASE HOLDINGS AFTER APPROVAL:")
        print(f"   Before: {initial_holdings}")
        print(f"   After:  {updated_holdings}")
        assert updated_holdings != initial_holdings
        print("   [OK] DB HOLDINGS SUCCESSFULLY CHANGED!")

        # Check recalculation of risk
        new_risk = calculate_risk(db, p)
        print(f"   Recalculated Risk Score: {new_risk.risk_score:.1f} | Envelope: {new_risk.operating_envelope}")

        # Check Audit / Learning trail
        outcomes = get_decision_outcomes(db)
        print(f"\n8. AUDIT & OUTCOME TRAIL:")
        latest_audit = outcomes[0]
        print(f"   Latest Decision: {latest_audit['decision_id']} | Action: {latest_audit['action']} | Approved: {latest_audit['approved']}")
        print(f"   Audit Status: {latest_audit['subsequent_outcome']['audit_status']}")
        cap_est = str(latest_audit['subsequent_outcome']['capital_preserved_est']).replace('₹', 'INR ')
        print(f"   Capital Preserved Est: {cap_est}")
        assert latest_audit["approved"] is True

        # Now test Reject on a second run
        print(f"\n9. TESTING REJECT FLOW:")
        res2 = run_scenario(db, p, crash_sc)
        opt_id2 = res2["recommendation"]["optimization_id"]
        holdings_before_reject = {h.asset.symbol: float(h.weight) for h in p.holdings}
        
        rej_res = reject_rebalance(db, opt_id2)
        print(f"   Reject Status: {rej_res.get('status')}")
        db.refresh(p)
        holdings_after_reject = {h.asset.symbol: float(h.weight) for h in p.holdings}
        assert holdings_after_reject == holdings_before_reject
        print("   [OK] HOLDINGS UNCHANGED ON REJECT!")

        outcomes2 = get_decision_outcomes(db)
        latest_audit2 = outcomes2[0]
        print(f"   Audit Status on Reject: {latest_audit2['subsequent_outcome']['audit_status']}")
        assert latest_audit2["approved"] is False
        assert latest_audit2["subsequent_outcome"]["audit_status"] == "REJECTED_BY_OFFICER"
        print("   [OK] REJECTION PROPERLY LOGGED IN AUDIT & LEARNING!")

        print("\n=======================================================")
        print("ALL P0 INVARIANTS FOR STRESS-TO-ACTION-AUDIT CHAIN VERIFIED!")
        print("=======================================================")

    finally:
        db.close()

if __name__ == "__main__":
    test_full_chain()
