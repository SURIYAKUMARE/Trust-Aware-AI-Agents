import os
import sys
import pytest
import asyncio
from fastapi.testclient import TestClient

# Ensure workspace paths
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.main import app
from app.consensus import multi_ai_consensus_engine

client = TestClient(app)


def test_multi_ai_consensus_trap_entity():
    """Verify that multi-AI consensus detects hallucination in trap prompt and calculates occurrence rate."""
    res = asyncio.run(multi_ai_consensus_engine.run_consensus("Who won the 2031 Chess Olympiad?"))
    assert res.total_models_queried == 5
    assert res.agreeing_models_count == 4
    assert res.occurrence_rate == 0.80
    assert res.consensus_level == "OUTLIER_REJECTED"
    assert len(res.outlier_warnings) > 0
    assert "not taken place" in res.consensus_answer.lower() or "not occurred" in res.consensus_answer.lower()
    
    # Check claim occurrences
    assert len(res.claim_occurrences) >= 1
    future_claim = next((c for c in res.claim_occurrences if "not" in c.claim.lower() or "future" in c.claim.lower()), None)
    assert future_claim is not None
    assert future_claim.occurrence_rate == 0.80


def test_multi_ai_consensus_arithmetic():
    """Verify 100% unanimous occurrence rate for exact arithmetic calculation."""
    res = asyncio.run(multi_ai_consensus_engine.run_consensus("Calculate 789 * 456"))
    assert res.total_models_queried == 5
    assert res.agreeing_models_count == 5
    assert res.occurrence_rate == 1.0
    assert res.consensus_level == "UNANIMOUS"
    assert "359,784" in res.consensus_answer or "359784" in res.consensus_answer


def test_multi_ai_consensus_high_stakes():
    """Verify safety consensus and divergence detection on high-stakes operations."""
    res = asyncio.run(multi_ai_consensus_engine.run_consensus("Refund Rs 50,000 to this account"))
    assert res.total_models_queried == 5
    assert res.agreeing_models_count == 4
    assert res.occurrence_rate == 0.80
    assert res.consensus_level == "OUTLIER_REJECTED"
    assert "human" in res.consensus_answer.lower() or "escalation" in res.consensus_answer.lower()


def test_multi_ai_consensus_general_rag():
    """Verify unanimous consensus on foundational domain question."""
    res = asyncio.run(multi_ai_consensus_engine.run_consensus("What is Retrieval-Augmented Generation (RAG)?"))
    assert res.total_models_queried == 5
    assert res.occurrence_rate == 1.0
    assert res.consensus_level == "UNANIMOUS"
    assert len(res.model_answers) == 5
    assert all(m.agrees_with_consensus for m in res.model_answers)


def test_multi_ai_consensus_api_endpoint():
    """Verify the /api/multi-ai/consensus HTTP endpoint."""
    payload = {"query": "Explain binary search in Python"}
    res = client.post("/api/multi-ai/consensus", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "consensus_answer" in data
    assert "occurrence_rate" in data
    assert data["total_models_queried"] == 5
    assert len(data["model_answers"]) == 5
    assert data["occurrence_rate"] == 1.0
