"""Institutional unit and integration tests for AEGIS Copilot."""

import pytest
from app.database import SessionLocal
from app.models.portfolio import Portfolio
from app.services.copilot_service import get_copilot_assessment, classify_copilot_intent


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def sample_portfolio(db_session):
    port = db_session.query(Portfolio).first()
    if not port:
        port = Portfolio(name="AEGIS Institutional Fund")
        db_session.add(port)
        db_session.commit()
        db_session.refresh(port)
    return port


class TestAEGISCopilotInstitutional:
    """Validate that AEGIS Copilot behaves as an institutional risk intelligence assistant."""

    def test_greeting_intent_and_response(self, db_session, sample_portfolio):
        """'Hi' receives a normal conversational greeting, not an executive risk briefing."""
        intent = classify_copilot_intent("Hi")
        assert intent == "GREETING"

        res = get_copilot_assessment(db_session, sample_portfolio, user_query="Hi")
        answer = res["answer"]
        assert len(answer) < 500
        assert "briefing" not in answer.lower()
        assert "AEGIS Institutional Copilot" in answer or "AEGIS Copilot" in answer or "Hello" in answer or "Hi" in answer
        assert len(res["policy_evidence"]) == 0
        assert len(res["tool_calls"]) == 0

    def test_capabilities_intent_and_response(self, db_session, sample_portfolio):
        """'What can you help me with?' explains assistant capabilities concisely."""
        intent = classify_copilot_intent("What can you help me with?")
        assert intent == "CAPABILITIES"

        res = get_copilot_assessment(db_session, sample_portfolio, user_query="What can you help me with?")
        answer = res["answer"]
        assert "portfolio" in answer.lower() or "risk" in answer.lower()
        assert len(res["policy_evidence"]) == 0

    def test_current_capital_query(self, db_session, sample_portfolio):
        """'What is our total capital?' returns accurate live capital figures."""
        intent = classify_copilot_intent("What is our total capital?")
        assert intent == "CAPITAL_INFO"

        res = get_copilot_assessment(db_session, sample_portfolio, user_query="What is our total capital?")
        answer = res["answer"]
        assert "total capital" in answer.lower() or "portfolio value" in answer.lower() or "₹" in answer
        assert "get_current_capital" in res["tool_calls"]

    def test_portfolio_summary_query(self, db_session, sample_portfolio):
        """'What's happening in the portfolio?' returns holdings breakdown and status."""
        intent = classify_copilot_intent("What's happening in the portfolio?")
        assert intent == "PORTFOLIO_SUMMARY"

        res = get_copilot_assessment(db_session, sample_portfolio, user_query="What's happening in the portfolio?")
        assert "get_portfolio_summary" in res["tool_calls"]
        assert len(res["answer"]) > 50

    def test_risk_explanation_query(self, db_session, sample_portfolio):
        """'Why is this happening?' diagnoses the portfolio risk driver."""
        intent = classify_copilot_intent("Why is this happening?")
        assert intent == "RISK_EXPLANATION"

        res = get_copilot_assessment(db_session, sample_portfolio, user_query="Why is this happening?")
        answer = res["answer"]
        assert "risk" in answer.lower()
        assert "get_current_risk" in res["tool_calls"]

    def test_optimizer_explanation_query(self, db_session, sample_portfolio):
        """'Why was this optimizer intervention recommended?' cites optimizer and policy evidence."""
        intent = classify_copilot_intent("Why was this optimizer intervention recommended?")
        assert intent == "OPTIMIZER_EXPLANATION"

        res = get_copilot_assessment(db_session, sample_portfolio, user_query="Why was this optimizer intervention recommended?")
        assert "get_optimizer_proposal" in res["tool_calls"]
        assert len(res["policy_evidence"]) > 0

    def test_policy_rag_query(self, db_session, sample_portfolio):
        """Policy inquiry returns real RAG citations from IPS / governance docs."""
        intent = classify_copilot_intent("What does the anti-churning policy say?")
        assert intent == "POLICY_RAG"

        res = get_copilot_assessment(db_session, sample_portfolio, user_query="What does the anti-churning policy say?")
        assert "search_policy" in res["tool_calls"]
        assert len(res["policy_evidence"]) > 0

    def test_stress_reverse_query(self, db_session, sample_portfolio):
        """'What could go wrong?' or 'What breaks us?' calls reverse stress engine."""
        intent = classify_copilot_intent("What breaks us?")
        assert intent == "STRESS_REVERSE"

        res = get_copilot_assessment(db_session, sample_portfolio, user_query="What breaks us?")
        assert "get_reverse_stress_results" in res["tool_calls"]
        assert "failure boundary" in res["answer"].lower() or "critical" in res["answer"].lower() or "shock" in res["answer"].lower()

    def test_conversational_follow_up(self, db_session, sample_portfolio):
        """Follow-up questions are resolved in the context of previous dialog turns."""
        history = [
            {"role": "user", "content": "What is causing the risk in our portfolio?"},
            {"role": "assistant", "content": "Equity is the primary driver generating over 80% of portfolio risk variance."},
        ]
        intent = classify_copilot_intent("How much?", conversation_history=history)
        assert intent == "FOLLOW_UP"

        res = get_copilot_assessment(
            db_session,
            sample_portfolio,
            user_query="How much?",
            conversation_history=history,
        )
        assert "get_current_risk" in res["tool_calls"]
        assert "%" in res["answer"]
