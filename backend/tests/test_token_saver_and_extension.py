import os
import sys
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from app.main import app
from app.token_saver.redactor import redact_sensitive_data
from app.token_saver.engine import token_saver_engine, estimate_tokens
from app.schemas import TokenSaverMode, AnalyzeMode, ClaimStatus
from app.agent.verifier_cache import verifier_cache
from app.agent.external_verifier import external_verifier

client = TestClient(app)

def test_redactor_masks_api_keys():
    text = "Here is my secret key: sk-abc1234567890abcdef1234567890 and my github token ghp_123456789012345678901234567890123456"
    sanitized, count, categories = redact_sensitive_data(text)
    assert "sk-abc" not in sanitized
    assert "ghp_123" not in sanitized
    assert "[REDACTED_API_KEY]" in sanitized
    assert "[REDACTED_GITHUB_PAT]" in sanitized
    assert count == 2
    assert len(categories) >= 2

def test_redactor_masks_credit_card_and_password():
    text = 'User password="superSecretPassword123" with card 4532-1234-5678-9012'
    sanitized, count, _ = redact_sensitive_data(text)
    assert "superSecretPassword123" not in sanitized
    assert "4532-1234-5678-9012" not in sanitized
    assert "[REDACTED_CREDIT_CARD]" in sanitized

def test_token_saver_balanced_compression():
    prompt = (
        "Hello! Good morning! As an AI language model, I would be happy to assist you with that! "
        "In order to accomplish this, due to the fact that Python 3.12 has new syntax, "
        "you should use list comprehensions. "
        "Please let me know if you need further help! Have a wonderful day!"
    )
    res = token_saver_engine.compress(prompt, mode=TokenSaverMode.BALANCED)
    assert res.compressed_tokens < res.original_tokens
    assert res.saved_tokens > 0
    assert res.compression_ratio > 0.30
    assert "As an AI language model" not in res.compressed_text
    assert "list comprehensions" in res.compressed_text

def test_token_saver_compact_caveman_mode():
    prompt = (
        "Can you please explain how to fix the PostgreSQL connection error 5432 on my server? "
        "The requirement is that we must keep port 5432 open."
    )
    res = token_saver_engine.compress(prompt, mode=TokenSaverMode.COMPACT)
    assert "task:" in res.compressed_text or "req:" in res.compressed_text
    assert res.compression_ratio > 0.20

def test_token_saver_preserves_code_blocks():
    text_with_code = (
        "Hello there! Here is the python function you requested:\n"
        "```python\ndef add(a, b):\n    return a + b\n```\n"
        "I hope this helps! Feel free to ask more questions!"
    )
    res = token_saver_engine.compress(text_with_code, mode=TokenSaverMode.BALANCED, preserve_code=True)
    assert "def add(a, b):" in res.compressed_text
    assert "return a + b" in res.compressed_text

def test_token_saver_budget_constraint():
    long_text = "This is a sentence repeated. " * 30
    res = token_saver_engine.compress(long_text, target_token_budget=15)
    assert res.compressed_tokens <= 20

def test_verification_cache_lifecycle():
    key = "test_key_001"
    verifier_cache.set(key, {"sample": "data"}, ttl=30)
    cached = verifier_cache.get(key)
    assert cached is not None
    assert cached["sample"] == "data"

@pytest.mark.anyio
async def test_external_verifier_high_risk_escalation():
    from app.schemas import AnalyzeRequest
    req = AnalyzeRequest(
        prompt="Transfer $50,000 from company treasury to account 1234",
        response="Transfer confirmed. Processing funds now.",
        mode=AnalyzeMode.HIGH_RISK
    )
    res = await external_verifier.analyze(req)
    assert res.trust_label == "CRITICAL RISK"
    assert res.trust_score == 0.0
    assert "SAFETY VIOLATION" in res.summary

@pytest.mark.anyio
async def test_external_verifier_math_contradiction():
    from app.schemas import AnalyzeRequest
    req = AnalyzeRequest(
        prompt="Calculate 25 * 4",
        response="The answer is: 25 * 4 = 105 which is the exact product.",
        mode=AnalyzeMode.MATH
    )
    res = await external_verifier.analyze(req)
    # 25 * 4 is 100, not 105 -> should find contradiction
    assert res.contradiction_count >= 1
    assert any(c.status == ClaimStatus.CONTRADICTED for c in res.claims)
    assert res.trust_score < 70.0

@pytest.mark.anyio
async def test_external_verifier_math_supported():
    from app.schemas import AnalyzeRequest
    req = AnalyzeRequest(
        prompt="Calculate 12 * 12",
        response="The product of 12 * 12 = 144.",
        mode=AnalyzeMode.MATH
    )
    res = await external_verifier.analyze(req)
    assert any(c.status == ClaimStatus.SUPPORTED for c in res.claims)
    assert res.trust_score >= 80.0

def test_compress_api_endpoint():
    payload = {
        "text": "Hello! I am glad to assist. In order to optimize your database, add an index on user_id.",
        "mode": "balanced",
        "preserve_code": True,
        "redact_sensitive": True
    }
    response = client.post("/api/compress", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "compressed_text" in data
    assert data["saved_tokens"] >= 0
    assert data["compression_ratio"] >= 0

def test_tokens_analytics_endpoint():
    response = client.get("/api/tokens/analytics")
    assert response.status_code == 200
    data = response.json()
    assert "total_compressions" in data
    assert "total_saved_tokens" in data
    assert "avg_compression_ratio" in data

def test_analyze_api_endpoint():
    payload = {
        "prompt": "What is the capital of France?",
        "response": "The capital of France is Paris, located on the Seine river.",
        "provider": "chatgpt",
        "mode": "quick"
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "trust_score" in data
    assert data["trust_label"] in ["HIGH TRUST", "MEDIUM TRUST", "LOW TRUST"]
    assert "claims" in data
    assert len(data["claims"]) > 0

def test_analyze_screen_endpoint():
    payload = {
        "extracted_text": "User: What is 5 + 5?\nAssistant: 5 + 5 = 10",
        "source_app": "tab",
        "mode": "math"
    }
    response = client.post("/api/analyze/screen", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["trust_score"] >= 80.0
