import os
import sys
import pytest
import asyncio

# Ensure workspace paths
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.llm import repair_json_string, parse_json_safely
from app.confidence.calibration import ConfidenceCalibrator
from app.confidence.aggregator import ConfidenceAggregator
from app.confidence.self_consistency import self_consistency_scorer
from app.confidence.verbalized import verbalized_scorer
from app.confidence.evidence import evidence_scorer
from app.confidence.reasoning_check import reasoning_check_scorer
from app.confidence.explain import explainer
from app.agent.risk import risk_classifier
from app.agent.router import decision_router
from app.agent.tools import tools
from app.agent.trust_agent import trust_agent
from app.agent.baseline_agent import baseline_agent
from app.schemas import ConfidenceLevel, UncertaintyType, ActionRoute, ScorerSignal, ClaimStatus, ClaimVerification


# --- 1. JSON REPAIR TESTS ---
def test_json_repair_markdown_fences():
    raw = "```json\n{\"score\": 0.95, \"status\": \"OK\"}\n```"
    repaired = repair_json_string(raw)
    data = parse_json_safely(raw)
    assert data["score"] == 0.95
    assert data["status"] == "OK"

def test_json_repair_trailing_commas():
    raw = "{\"items\": [1, 2, 3, ], \"valid\": true, }"
    data = parse_json_safely(raw)
    assert data["items"] == [1, 2, 3]
    assert data["valid"] is True

def test_json_repair_embedded_text():
    raw = "Here is the result:\n{\"answer\": \"Paris\"}\nHope this helps!"
    data = parse_json_safely(raw)
    assert data["answer"] == "Paris"

def test_json_repair_unbalanced_braces():
    raw = "{\"user\": \"alice\", \"roles\": [\"admin\""
    data = parse_json_safely(raw)
    assert data.get("user") == "alice"


# --- 2. CALIBRATION TESTS ---
def test_calibration_monotonicity():
    cal = ConfidenceCalibrator()
    low = cal.calibrate(0.2)
    med = cal.calibrate(0.6)
    high = cal.calibrate(0.9)
    assert low <= med <= high
    assert high > low

def test_calibration_fit():
    cal = ConfidenceCalibrator(filepath=None)
    probs = [0.1, 0.2, 0.3, 0.7, 0.8, 0.9]
    labels = [0, 0, 0, 1, 1, 1]
    cal.fit(probs, labels)
    assert cal.is_fitted
    pred_low = cal.calibrate(0.15)
    pred_high = cal.calibrate(0.85)
    assert pred_low < pred_high

def test_compute_ece():
    probs = [0.9, 0.8, 0.2, 0.1]
    labels = [1, 1, 0, 0]
    ece, bins = ConfidenceCalibrator.compute_ece(probs, labels, n_bins=2)
    assert 0.0 <= ece <= 0.2
    assert len(bins) == 2

def test_compute_brier_score():
    probs = [1.0, 0.0]
    labels = [1, 0]
    brier = ConfidenceCalibrator.compute_brier_score(probs, labels)
    assert brier == 0.0


# --- 3. CONFIDENCE AGGREGATOR TESTS ---
def test_aggregator_high_confidence():
    agg = ConfidenceAggregator()
    signals = [
        ScorerSignal(scorer="self_consistency", score=0.95, weight=0.35, reasons=["Consensus"], details={}),
        ScorerSignal(scorer="evidence", score=0.92, weight=0.30, reasons=["Supported"], details={}),
        ScorerSignal(scorer="verbalized", score=0.90, weight=0.20, reasons=[], details={}),
        ScorerSignal(scorer="reasoning_check", score=0.95, weight=0.15, reasons=[], details={}),
    ]
    report = agg.aggregate(signals)
    assert report.level == ConfidenceLevel.HIGH
    assert report.calibrated_score >= 0.85
    assert report.uncertainty_type == UncertaintyType.NONE

def test_aggregator_uncertainty_diagnosis_ambiguity():
    agg = ConfidenceAggregator()
    signals = [
        ScorerSignal(scorer="self_consistency", score=0.5, weight=0.35, reasons=[], details={}),
        ScorerSignal(scorer="evidence", score=0.5, weight=0.30, reasons=[], details={}),
        ScorerSignal(scorer="verbalized", score=0.4, weight=0.20, reasons=["Ambiguous prompt"], details={"ambiguity": 0.85}),
        ScorerSignal(scorer="reasoning_check", score=0.5, weight=0.15, reasons=[], details={}),
    ]
    report = agg.aggregate(signals)
    assert report.uncertainty_type == UncertaintyType.AMBIGUITY

def test_aggregator_uncertainty_diagnosis_conflict():
    agg = ConfidenceAggregator()
    signals = [
        ScorerSignal(scorer="self_consistency", score=0.3, weight=0.35, reasons=[], details={"num_clusters": 4}),
        ScorerSignal(scorer="evidence", score=0.2, weight=0.30, reasons=[], details={"contradicted_count": 2}),
        ScorerSignal(scorer="verbalized", score=0.4, weight=0.20, reasons=[], details={}),
        ScorerSignal(scorer="reasoning_check", score=0.4, weight=0.15, reasons=[], details={}),
    ]
    report = agg.aggregate(signals)
    assert report.uncertainty_type == UncertaintyType.CONFLICT

def test_aggregator_high_stakes_override():
    agg = ConfidenceAggregator()
    signals = [
        ScorerSignal(scorer="self_consistency", score=0.99, weight=0.35, reasons=[], details={}),
        ScorerSignal(scorer="evidence", score=0.99, weight=0.30, reasons=[], details={}),
        ScorerSignal(scorer="verbalized", score=0.99, weight=0.20, reasons=[], details={}),
        ScorerSignal(scorer="reasoning_check", score=0.99, weight=0.15, reasons=[], details={}),
    ]
    report = agg.aggregate(signals, is_high_stakes=True)
    assert report.uncertainty_type == UncertaintyType.HIGH_STAKES
    assert report.calibrated_score <= 0.30
    assert report.level == ConfidenceLevel.VERY_LOW


# --- 4. DECISION ROUTER TESTS ---
def test_router_high_routes_to_answer():
    report = ConfidenceAggregator().aggregate([
        ScorerSignal(scorer="s", score=0.95, weight=1.0, reasons=[], details={})
    ])
    route, reason = decision_router.route(report)
    assert route == ActionRoute.ANSWER

def test_router_medium_routes_to_verify():
    report = ConfidenceAggregator().aggregate([
        ScorerSignal(scorer="s", score=0.72, weight=1.0, reasons=[], details={})
    ])
    report.calibrated_score = 0.72
    report.level = ConfidenceLevel.MEDIUM
    route, reason = decision_router.route(report)
    assert route == ActionRoute.VERIFY

def test_router_low_ambiguity_routes_to_clarify():
    report = ConfidenceAggregator().aggregate([
        ScorerSignal(scorer="verbalized", score=0.50, weight=1.0, reasons=[], details={"ambiguity": 0.8})
    ])
    report.calibrated_score = 0.50
    report.level = ConfidenceLevel.LOW
    route, reason = decision_router.route(report)
    assert route == ActionRoute.CLARIFY

def test_router_low_knowledge_gap_routes_to_search():
    report = ConfidenceAggregator().aggregate([
        ScorerSignal(scorer="evidence", score=0.50, weight=1.0, reasons=[], details={"no_evidence_count": 2})
    ])
    report.calibrated_score = 0.50
    report.level = ConfidenceLevel.LOW
    route, reason = decision_router.route(report)
    assert route == ActionRoute.SEARCH

def test_router_very_low_routes_to_handoff():
    report = ConfidenceAggregator().aggregate([
        ScorerSignal(scorer="s", score=0.36, weight=1.0, reasons=[], details={})
    ])
    report.calibrated_score = 0.36
    report.level = ConfidenceLevel.VERY_LOW
    route, reason = decision_router.route(report)
    assert route == ActionRoute.HANDOFF

def test_router_critical_risk_forces_escalate():
    report = ConfidenceAggregator().aggregate([
        ScorerSignal(scorer="s", score=0.99, weight=1.0, reasons=[], details={})
    ])
    route, reason = decision_router.route(report, is_high_stakes=True)
    assert route == ActionRoute.ESCALATE


# --- 5. RISK CLASSIFIER TESTS ---
def test_risk_classifier_financial_detection():
    res = asyncio.run(risk_classifier.classify("Refund Rs 50,000 to this bank account"))
    assert res["is_high_stakes"] is True
    assert "financial" in res["risk_category"]

def test_risk_classifier_deletion_detection():
    res = asyncio.run(risk_classifier.classify("drop table customer_transactions"))
    assert res["is_high_stakes"] is True
    assert "deletion" in res["risk_category"]

def test_risk_classifier_safe_query():
    res = asyncio.run(risk_classifier.classify("What is the capital of France?"))
    assert res["is_high_stakes"] is False


# --- 6. TOOLS TESTS ---
def test_tools_sympy_calculator_exact():
    res = tools.calculate("789 * 456")
    assert res["success"] is True
    assert res["result"] == 359784

def test_tools_sympy_calculator_syntax():
    res = tools.calculate("sqrt(256) + 12")
    assert res["success"] is True
    assert res["result"] == 28

def test_tools_python_sandbox_security():
    res = tools.execute_python_sandbox("import socket; s = socket.socket()")
    assert res["success"] is False
    assert "Security restriction" in res["error"]

def test_tools_python_sandbox_valid():
    res = tools.execute_python_sandbox("print(sum([i for i in range(10)]))")
    assert res["success"] is True
    assert res["stdout"] == "45"

def test_tools_web_search_trap():
    res = tools.web_search("Who won the 2031 Chess Olympiad?")
    assert res["success"] is True
    assert len(res["results"]) > 0


# --- 7. INDEPENDENT SCORER TESTS ---
def test_self_consistency_consensus():
    res = asyncio.run(self_consistency_scorer.score("What is the capital of France?", "Paris"))
    assert res["score"] >= 0.80

def test_verbalized_scorer_bounds():
    res = asyncio.run(verbalized_scorer.score("What is water made of?", "Hydrogen and oxygen"))
    assert 0.0 <= res["score"] <= 1.0

def test_evidence_scorer_supported():
    res = asyncio.run(evidence_scorer.score("What is the capital of France?", "The capital of France is Paris."))
    assert 0.0 <= res["score"] <= 1.0

def test_reasoning_check_scorer():
    res = asyncio.run(reasoning_check_scorer.score("Compute 2+2", ["Add 2 and 2"], "Direct answer", "4"))
    assert res["score"] >= 0.85

def test_explainer_output():
    agg = ConfidenceAggregator()
    signals = [
        ScorerSignal(scorer="self_consistency", score=0.95, weight=0.35, reasons=["Consensus"], details={}),
        ScorerSignal(scorer="evidence", score=0.92, weight=0.30, reasons=["Supported"], details={}),
        ScorerSignal(scorer="verbalized", score=0.90, weight=0.20, reasons=[], details={}),
        ScorerSignal(scorer="reasoning_check", score=0.95, weight=0.15, reasons=[], details={}),
    ]
    report = agg.aggregate(signals)
    enriched = explainer.enrich_report(report, "What is the capital of France?")
    assert len(enriched.plain_explanation) > 10


# --- 8. TRUST AGENT VS BASELINE END-TO-END TESTS ---
def test_baseline_agent_hallucinates_trap():
    res = asyncio.run(baseline_agent.run("Who won the 2031 Chess Olympiad?"))
    assert res["confidence_reported"] == 1.0
    assert len(res["answer"]) > 10

def test_trust_agent_abstains_on_trap():
    trace = asyncio.run(trust_agent.run("Who won the 2031 Chess Olympiad?"))
    assert trace.final_route in [ActionRoute.ABSTAIN, ActionRoute.SEARCH]
    assert trace.final_confidence < 0.40 or "not taken place" in trace.answer or "cannot provide" in trace.answer

def test_trust_agent_escalates_high_stakes():
    trace = asyncio.run(trust_agent.run("Refund Rs 50,000 to this account"))
    assert trace.final_route == ActionRoute.ESCALATE
    assert trace.requires_human_approval is True
    assert trace.escalation_id is not None


# --- 9. EXTENDED CAPABILITIES (HEATMAP, FEEDBACK LOOP, SIMULATION, ADVERSARIAL) ---
def test_sentence_level_verification():
    from app.confidence.evidence import split_into_sentences
    text = "The speed of light is 299,792 km/s. Mars has two moons. This is a third sentence."
    sentences = split_into_sentences(text)
    assert len(sentences) == 3
    assert "299,792" in sentences[0]
    
    # Check evidence scorer outputs sentence verifications inside details
    res = asyncio.run(evidence_scorer.score("What is light speed?", text))
    assert "sentences" in res["details"]
    assert len(res["details"]["sentences"]) >= 1
    assert any(s["score"] > 0 for s in res["details"]["sentences"])

def test_human_feedback_kb_persistence():
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app)
    
    # 1. Trigger an escalation resolution
    test_id = "test_feedback_123"
    payload = {
        "action": "APPROVE",
        "human_note": "Verified by physical log",
        "edited_action": "Verified by human supervisor: System quantum state remained stable."
    }
    
    res = client.post(f"/api/escalations/{test_id}/resolve", json=payload)
    assert res.status_code == 200
    
    # Check that human feedback file was persisted in KB
    kb_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "kb"))
    fb_path = os.path.join(kb_dir, f"human_feedback_{test_id}.txt")
    assert os.path.exists(fb_path)
    
    with open(fb_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert "Verified by human supervisor" in content
    
    # Verify that evidence scorer detects human verified status
    query = "System quantum state stability verification"
    answer = "Verified by human supervisor: System quantum state remained stable."
    ev_res = asyncio.run(evidence_scorer.score(query, answer))
    assert ev_res["details"].get("has_human_verified_evidence", False) is True
    
    # Clean up test file
    try:
        os.remove(fb_path)
    except Exception:
        pass

def test_threshold_simulation_endpoint():
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app)
    
    payload = {"high_threshold": 0.90, "low_threshold": 0.50}
    res = client.post("/api/metrics/simulate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "hallucination_rate" in data
    assert "escalation_rate" in data
    assert "selective_accuracy" in data
    assert data["high_threshold"] == 0.90
    assert data["low_threshold"] == 0.50

def test_adversarial_presets_endpoint():
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app)
    
    res = client.get("/api/adversarial/presets")
    assert res.status_code == 200
    presets = res.json()
    assert len(presets) == 8
    assert presets[0]["category"] == "Fabricated Entity"
    assert presets[1]["title"] == "Einstein's 19th Century iPhone"
    assert all("trap_type" in p and "baseline_behavior" in p and "trust_behavior" in p for p in presets)

