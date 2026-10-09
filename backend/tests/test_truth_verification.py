"""Automated Acceptance Test Suite for TrustGuard AI Universal Truth Verification Engine.
Validates all 12 mandatory acceptance criteria.
"""
import os
import sys
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.truth_verification import (
    universal_truth_pipeline,
    math_verification_engine,
    opinion_engine,
    code_verification_engine,
    VerificationStatus,
    VerificationDomain,
)

def test_01_math_incorrect_equality():
    """TEST 1: Input: 2 + 2 = 6 -> Expected: INCORRECT; correct result is 4."""
    report = asyncio.run(universal_truth_pipeline.verify("2 + 2 = 6"))
    assert report.status == VerificationStatus.INCORRECT
    assert "4" in report.correct_information
    assert "not 6" in report.why_explanation or "4" in report.why_explanation
    assert report.evidence_confidence == 100
    assert report.domain == VerificationDomain.MATHEMATICS


def test_02_math_correct_equality():
    """TEST 2: Input: 2 + 2 = 4 -> Expected: CORRECT."""
    report = asyncio.run(universal_truth_pipeline.verify("2 + 2 = 4"))
    assert report.status == VerificationStatus.CORRECT
    assert report.evidence_confidence == 100
    assert report.domain == VerificationDomain.MATHEMATICS


def test_03_math_multiplication_equality():
    """TEST 3: Input: 10 × 5 = 50 -> Expected: CORRECT."""
    report = asyncio.run(universal_truth_pipeline.verify("10 × 5 = 50"))
    assert report.status == VerificationStatus.CORRECT
    assert report.evidence_confidence == 100
    assert report.domain == VerificationDomain.MATHEMATICS


def test_04_geographic_false_capital():
    """TEST 4: Input: The capital of Australia is Sydney. -> Expected: INCORRECT; correct capital is Canberra."""
    report = asyncio.run(universal_truth_pipeline.verify("The capital of Australia is Sydney."))
    assert report.status == VerificationStatus.INCORRECT
    assert "canberra" in report.correct_information.lower()
    assert report.domain == VerificationDomain.GEOGRAPHY


def test_05_code_output_verification():
    """TEST 5: Code containing an incorrect output claim -> Expected: Detect error & correct."""
    snippet = "int a = 2;\nint b = 2;\nint result = a + b;\nSystem.out.println(result);\nThe output is 6"
    report = asyncio.run(universal_truth_pipeline.verify(snippet))
    assert report.status == VerificationStatus.INCORRECT
    assert report.domain == VerificationDomain.PROGRAMMING
    assert "4" in report.correct_information


def test_06_historical_incorrect_date():
    """TEST 6: Historical claim with incorrect date -> Expected: Verify date against sources & correct."""
    report = asyncio.run(universal_truth_pipeline.verify("The Apollo 11 moon landing occurred in 1975."))
    assert report.status == VerificationStatus.INCORRECT
    assert "1969" in report.correct_information
    assert report.domain == VerificationDomain.HISTORY


def test_07_current_affairs_evidence():
    """TEST 7: Current affairs claim verification with live evidence."""
    report = asyncio.run(universal_truth_pipeline.verify("The President of India is Narendra Modi."))
    assert report.status == VerificationStatus.INCORRECT
    assert "prime minister" in report.why_explanation.lower() or "droupadi murmu" in report.correct_information.lower()


def test_08_ambiguous_claim_clarification():
    """TEST 8: Ambiguous claim without context -> Expected: Explain ambiguity & ask for clarification."""
    report = asyncio.run(universal_truth_pipeline.verify("The president resigned today"))
    assert report.status == VerificationStatus.UNVERIFIED
    assert report.requires_clarification is True


def test_09_search_provider_failure_truthful():
    """TEST 9: Search provider failure -> Expected: Report verification failed without inventing results."""
    report = asyncio.run(universal_truth_pipeline.verify(
        "Some arbitrary historical claim",
        simulate_search_failure=True
    ))
    assert report.status == VerificationStatus.UNVERIFIED
    assert report.evidence_confidence == 0
    assert "unavailable" in report.why_explanation.lower() or "failed" in report.why_explanation.lower()


def test_10_correct_statement_preserved():
    """TEST 10: Correct statement -> Expected: Preserve correct statement without unnecessary correction."""
    report = asyncio.run(universal_truth_pipeline.verify("The capital of France is Paris."))
    assert report.status == VerificationStatus.CORRECT
    assert "paris" in report.correct_information.lower()


def test_11_contradicted_future_trap():
    """TEST 11: Claim contradicted by official facts."""
    report = asyncio.run(universal_truth_pipeline.verify("Who won the 2031 Chess Olympiad?"))
    # Future event cannot have a winner
    assert report.status in [VerificationStatus.INCORRECT, VerificationStatus.UNVERIFIED]


def test_12_subjective_opinion_not_applicable():
    """TEST 12: Input: 'Java is better than Python.' -> Expected: NOT_APPLICABLE (context-dependent opinion)."""
    report = asyncio.run(universal_truth_pipeline.verify("Java is better than Python."))
    assert report.status == VerificationStatus.NOT_APPLICABLE
    assert report.is_opinion is True
    assert "context" in report.why_explanation.lower()
    assert report.domain == VerificationDomain.OPINION_PREFERENCE
