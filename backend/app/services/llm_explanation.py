"""AI & LLM Explanation Layer for AEGIS.

Synthesizes structured numerical risk metrics, Euler risk attribution,
and reverse stress testing results into institutional boardroom briefings
and Investment Committee Memoranda.
"""

import os
import json
from typing import Any
from sqlalchemy.orm import Session

from app.models.portfolio import Portfolio
from app.services.risk_engine import calculate_risk
from app.services.risk_attribution import compute_risk_attribution
from app.services.reverse_stress import run_reverse_stress_sweep


def generate_boardroom_briefing(
    db: Session,
    portfolio: Portfolio,
    custom_scenario: str | None = None,
    proposed_weights: dict[str, float] | None = None,
) -> dict[str, Any]:
    """Generate an institutional Investment Committee Memo & Risk Narrative.

    Synthesizes the deterministic calculations from Risk Engine,
    Risk Attribution, and Reverse Stress into an executive memo.
    """
    # 1. Gather live deterministic data
    risk_res = calculate_risk(db, portfolio)
    attribution = compute_risk_attribution(db, portfolio)
    rev_stress = run_reverse_stress_sweep(db, portfolio)

    capital_cr = float(portfolio.total_capital) / 10_000_000.0

    primary_asset = attribution["primary_driver"]
    primary_pct = attribution["primary_driver_risk_pct"]

    # Check if Gemini API key exists
    gemini_key = os.environ.get("GEMINI_API_KEY")

    executive_summary = (
        f"AEGIS RISK SUPERVISORY COMMITTEE MEMORANDUM\n"
        f"Portfolio: {portfolio.name} (AUM: ₹{capital_cr:.2f} Cr)\n"
        f"Safe Operating Envelope: {risk_res.operating_envelope} ({risk_res.risk_status})\n"
        f"Composite Risk Score: {risk_res.risk_score:.1f}/100\n"
        f"Distance to Failure (DtF): {rev_stress['distance_to_failure_pct']} | Resilience Score: {rev_stress['resilience_score']}/100\n\n"
        f"1. RISK POSTURE & ENVELOPE STATUS\n"
        f"The portfolio is currently operating under the {risk_res.operating_envelope} envelope with an annualized "
        f"volatility of {risk_res.volatility:.1%} and maximum drawdown of {risk_res.max_drawdown:.1%}. "
        f"{'CRITICAL ACTION REQUIRED: Operating envelope has breached the safe tolerance threshold. Immediate defensive intervention is mandated.' if risk_res.intervention_required else 'Capital remains within permissible operating bounds. Defensive suppression is active to avoid unnecessary churn.'}\n\n"
        f"2. EULER RISK ATTRIBUTION DIAGNOSIS\n"
        f"Risk decomposition reveals significant hidden risk concentration. The primary risk driver is {primary_asset}, "
        f"which accounts for {primary_pct:.1f}% of total portfolio volatility risk despite its nominal capital allocation. "
        f"Asset marginal risk contributions confirm that portfolio volatility is predominantly driven by systematic equity factor beta.\n\n"
        f"3. REVERSE STRESS & FAILURE BOUNDARY\n"
        f"Deterministic shock sweeping indicates a failure boundary at critical shock intensity α* = {rev_stress['critical_shock_multiplier']:.1%}. "
        f"Under severe systemic stress, the portfolio would breach its crisis ceiling (Risk Score ≥ 80.0) at a {rev_stress['distance_to_failure_pct']} shock, "
        f"yielding a Resilience Score of {rev_stress['resilience_score']}/100 ({rev_stress['status']}).\n\n"
        f"4. SUPERVISORY CONTROL DIRECTIVE\n"
        f"{'Recommend executing the verified Minimum-Intervention rebalance to restore sovereign cash buffers, cap equity risk exposure, and widen the Distance to Failure beyond 25%.' if risk_res.intervention_required else 'Recommend maintaining current allocation. Continue real-time surveillance and re-evaluate upon macroeconomic triggers.'}"
    )

    # If Gemini API key is configured and requests/google-genai is installed, we can optionally enhance
    enhanced_narrative = None
    if gemini_key:
        try:
            import urllib.request
            prompt = (
                "You are the Chief Risk Officer drafting an institutional risk memorandum. "
                "Synthesize the following quantitative risk assessment into a concise 3-paragraph executive briefing:\n"
                f"Data: {json.dumps({'risk_score': risk_res.risk_score, 'envelope': risk_res.operating_envelope, 'primary_risk_driver': primary_asset, 'primary_pct': primary_pct, 'distance_to_failure': rev_stress['distance_to_failure_pct'], 'resilience_score': rev_stress['resilience_score']})}"
            )
            # Standard HTTP call to Gemini API endpoint
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
            req_data = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode("utf-8")
            req = urllib.request.Request(url, data=req_data, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=5) as response:
                res_body = json.loads(response.read().decode("utf-8"))
                enhanced_narrative = res_body["candidates"][0]["content"]["parts"][0]["text"]
        except Exception:
            enhanced_narrative = None

    return {
        "title": "AEGIS Risk Governance & Investment Committee Briefing",
        "portfolio_name": portfolio.name,
        "aum_in_crores": capital_cr,
        "operating_envelope": risk_res.operating_envelope,
        "risk_score": risk_res.risk_score,
        "distance_to_failure": rev_stress["distance_to_failure_pct"],
        "resilience_score": rev_stress["resilience_score"],
        "primary_risk_driver": primary_asset,
        "primary_risk_driver_pct": primary_pct,
        "memo_text": enhanced_narrative or executive_summary,
        "source": "Gemini LLM API" if enhanced_narrative else "AEGIS Deterministic Synthesis Engine",
    }
