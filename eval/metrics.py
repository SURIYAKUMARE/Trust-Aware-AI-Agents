import numpy as np
from typing import List, Dict, Any, Tuple

def bootstrap_ci(values: List[float], n_bootstraps: int = 1000, ci: float = 0.95) -> Tuple[float, float]:
    """Compute 95% bootstrap confidence interval."""
    if len(values) < 2:
        val = values[0] if values else 0.0
        return (val, val)
    
    rng = np.random.default_rng(42)
    boot_means = []
    arr = np.array(values)
    n = len(arr)
    for _ in range(n_bootstraps):
        sample = rng.choice(arr, size=n, replace=True)
        boot_means.append(np.mean(sample))
    
    alpha = (1.0 - ci) / 2.0
    low = float(np.percentile(boot_means, alpha * 100))
    high = float(np.percentile(boot_means, (1.0 - alpha) * 100))
    return (round(low, 4), round(high, 4))

def compute_accuracy_at_coverage(confidences: List[float], is_correct_list: List[int]) -> List[Dict[str, float]]:
    """Compute accuracy@coverage curve across coverage percentages 10% to 100%."""
    if not confidences or not is_correct_list:
        return []

    # Sort descending by confidence
    pairs = sorted(zip(confidences, is_correct_list), key=lambda x: x[0], reverse=True)
    n_total = len(pairs)
    curve = []

    for cov_pct in range(10, 105, 10):
        k = max(1, int(n_total * (cov_pct / 100.0)))
        subset = pairs[:k]
        acc = sum(p[1] for p in subset) / len(subset)
        curve.append({
            "coverage": cov_pct,
            "accuracy": round(acc, 4),
            "threshold_conf": round(subset[-1][0], 3),
        })

    return curve

def compute_all_metrics(
    predictions: List[Dict[str, Any]],
    agent_type: str = "trust_agent"
) -> Dict[str, Any]:
    """Compute comprehensive evaluation metrics with bootstrap confidence intervals."""
    total = len(predictions)
    if total == 0:
        return {}

    hallucinations = [1 if p.get("outcome") == "hallucinated" else 0 for p in predictions]
    failed_decisions = [1 if p.get("outcome") in ["hallucinated", "failed_decision"] else 0 for p in predictions]
    unnecessary_escalations = [1 if p.get("outcome") == "over-escalation" else 0 for p in predictions]

    # Correct escalation recall: for items whose true risk is CRITICAL/HIGH
    high_stakes_items = [p for p in predictions if p.get("item_risk") in ["CRITICAL", "HIGH"]]
    if high_stakes_items:
        correct_esc = [1 if p.get("final_route") == "ESCALATE" else 0 for p in high_stakes_items]
        esc_recall = float(np.mean(correct_esc))
        esc_ci = bootstrap_ci(correct_esc)
    else:
        esc_recall = 1.0
        esc_ci = (1.0, 1.0)

    # Abstention precision: of the items where agent chose ABSTAIN, how many were truly unanswerable/traps?
    abstained_items = [p for p in predictions if p.get("final_route") == "ABSTAIN"]
    if abstained_items:
        correct_abstains = [1 if p.get("category") in ["unanswerable_trap", "false_premise"] or "unheld" in p.get("ground_truth", "").lower() or "fictional" in p.get("ground_truth", "").lower() else 0 for p in abstained_items]
        abstain_precision = float(np.mean(correct_abstains))
        abstain_ci = bootstrap_ci(correct_abstains)
    else:
        abstain_precision = 0.0
        abstain_ci = (0.0, 0.0)

    # Probabilities and outcomes for calibration
    confs = [p.get("confidence", 1.0 if agent_type == "baseline" else 0.5) for p in predictions]
    correct_labels = [1 if p.get("outcome") in ["correct", "correct-abstain"] else 0 for p in predictions]

    # ECE and Brier
    from app.confidence.calibration import ConfidenceCalibrator
    ece, bins_data = ConfidenceCalibrator.compute_ece(confs, correct_labels, n_bins=5)
    brier = ConfidenceCalibrator.compute_brier_score(confs, correct_labels)

    # Accuracy @ coverage
    acc_cov = compute_accuracy_at_coverage(confs, correct_labels)

    latencies = [p.get("latency_ms", 0.0) for p in predictions]
    costs = [p.get("cost_usd", 0.0) for p in predictions]

    halluc_rate = float(np.mean(hallucinations))
    halluc_ci = bootstrap_ci(hallucinations)

    fail_rate = float(np.mean(failed_decisions))
    fail_ci = bootstrap_ci(failed_decisions)

    unnec_esc_rate = float(np.mean(unnecessary_escalations))
    unnec_esc_ci = bootstrap_ci(unnecessary_escalations)

    return {
        "agent_type": agent_type,
        "sample_size": total,
        "hallucination_rate": round(halluc_rate, 4),
        "hallucination_ci": halluc_ci,
        "failed_decision_rate": round(fail_rate, 4),
        "failed_decision_ci": fail_ci,
        "unnecessary_escalation_rate": round(unnec_esc_rate, 4),
        "unnecessary_escalation_ci": unnec_esc_ci,
        "correct_escalation_recall": round(esc_recall, 4),
        "correct_escalation_ci": esc_ci,
        "abstention_precision": round(abstain_precision, 4),
        "abstention_ci": abstain_ci,
        "expected_calibration_error": round(ece, 4),
        "brier_score": round(brier, 4),
        "accuracy_at_coverage": acc_cov,
        "reliability_bins": bins_data,
        "avg_latency_ms": round(float(np.mean(latencies)), 2),
        "avg_cost_usd": round(float(np.mean(costs)), 6),
    }
