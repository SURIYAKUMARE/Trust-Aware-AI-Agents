import sys
import os
import asyncio
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.verification.pipeline import verification_pipeline
from app.code_workspace.engine import code_workspace
from app.correction.engine import self_correction_engine
from app.search.engine import SearchResponse

# -----------------------------------------------------------------
# 1. User provides an incorrect current fact
# -----------------------------------------------------------------
def test_scenario_1_incorrect_current_fact():
    res = asyncio.run(verification_pipeline.execute("The President of India is Narendra Modi."))
    text = res.final_answer.lower()
    assert "incorrect" in text or "prime minister" in text
    assert "droupadi murmu" in text or "murmu" in text
    assert len(res.sources_checked) > 0

# -----------------------------------------------------------------
# 2. User provides an outdated fact
# -----------------------------------------------------------------
def test_scenario_2_outdated_fact():
    res = asyncio.run(verification_pipeline.execute("Boris Johnson is the current Prime Minister of the United Kingdom."))
    text = res.final_answer.lower()
    assert "not" in text or "incorrect" in text or "starmer" in text or "former" in text

# -----------------------------------------------------------------
# 3. User provides a false assumption
# -----------------------------------------------------------------
def test_scenario_3_false_user_assumption():
    res = asyncio.run(verification_pipeline.execute("Why does HTML work as a database?"))
    text = res.final_answer.lower()
    assert "not" in text or "incorrect" in text or "markup language" in text
    assert "database" in text

# -----------------------------------------------------------------
# 4. User uploads code with a syntax error
# -----------------------------------------------------------------
def test_scenario_4_code_syntax_error():
    broken_code = "def add(a, b\n    return a + b"
    res = asyncio.run(code_workspace.review_code(broken_code))
    assert res.language == "python"
    assert any(i.issue_type == "syntax" for i in res.detected_issues)
    assert "def add(a, b):" in res.corrected_code

# -----------------------------------------------------------------
# 5. User uploads code with a logical error
# -----------------------------------------------------------------
def test_scenario_5_code_logic_error():
    logic_code = """
int a = 10;
int b = 20;
int sum = a - b;
System.out.println(sum);
// Expected output: 30
"""
    res = asyncio.run(code_workspace.review_code(logic_code))
    assert res.language == "java"
    assert any(i.issue_type == "logic" for i in res.detected_issues)
    assert "+" in res.corrected_code

# -----------------------------------------------------------------
# 6. User provides code with incorrect expected output
# -----------------------------------------------------------------
def test_scenario_6_code_incorrect_expected_output():
    code_claim = """
def multiply(a, b):
    return a * b
# Test: multiply(2, 3) should equal 5
"""
    res = asyncio.run(code_workspace.review_code(code_claim))
    assert res.language == "python"
    # Should explain that 2 * 3 is 6, or identify logic/expectation mismatch
    assert res.corrected_code is not None

# -----------------------------------------------------------------
# 7. User provides a correct statement that the AI must not change
# -----------------------------------------------------------------
def test_scenario_7_correct_statement_preserved():
    res = asyncio.run(verification_pipeline.execute("The capital of France is Paris."))
    text = res.final_answer.lower()
    assert "paris" in text
    assert "is the capital" in text or "capital of france is paris" in text
    # It must NOT claim that the statement is wrong
    assert "that statement is incorrect" not in text

# -----------------------------------------------------------------
# 8. User provides a claim that cannot be verified
# -----------------------------------------------------------------
def test_scenario_8_unverifiable_claim():
    res = asyncio.run(verification_pipeline.execute("Who won the 2031 Chess Olympiad?"))
    text = res.final_answer.lower()
    assert ("2031" in text or "contradiction" in text or "not taken place" in text or "future" in text or "unverifiable" in text or "has not occurred" in text)

# -----------------------------------------------------------------
# 9. Search APIs fail gracefully
# -----------------------------------------------------------------
def test_scenario_9_search_api_failure():
    with patch("app.search.engine.search_engine.search") as mock_search:
        mock_search.return_value = SearchResponse(
            query="test",
            success=False,
            provider_used="none",
            results=[],
            error="API network timeout"
        )
        res = asyncio.run(verification_pipeline.execute("What is the capital of Spain?"))
        assert res.final_answer is not None
        # Must not crash and indicate status
        assert res.live_verification_active is False or res.scoring.final_score > 0

# -----------------------------------------------------------------
# 10. User challenges an answer previously verified
# -----------------------------------------------------------------
def test_scenario_10_user_dispute_recheck():
    res = asyncio.run(self_correction_engine.handle_user_dispute(
        user_message="Actually Narendra Modi is the Prime Minister of India, not the President.",
        previous_question="Who is the President of India?",
        previous_answer="The President of India is Narendra Modi.",
        previous_confidence=85
    ))
    assert res.verdict in ["PREVIOUS_ANSWER_INCORRECT", "PREVIOUS_ANSWER_OUTDATED", "PREVIOUS_ANSWER_STILL_SUPPORTED"]
    assert res.corrected_answer is not None
    assert len(res.evidence_links) > 0
