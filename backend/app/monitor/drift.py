from typing import List, Dict, Any, Optional
import numpy as np
from app.config import settings

class DriftDetector:
    """Monitors running confidence calibration drift.
    Alerts when the rolling ECE or confidence-accuracy discrepancy
    exceeds the configured threshold (default 0.10).
    """
    
    def __init__(self, window_size: int = 50, ece_threshold: float = settings.DRIFT_ECE_THRESHOLD):
        self.window_size = window_size
        self.ece_threshold = ece_threshold

    def check_drift(self, confidences: List[float], labels: List[int]) -> Dict[str, Any]:
        if len(confidences) < 10 or len(labels) < 10:
            return {
                "drift_detected": False,
                "reason": "Insufficient sample window (< 10 requests with labels)",
                "rolling_ece": 0.0,
                "gap": 0.0,
            }

        # Take rolling window
        recent_conf = np.array(confidences[-self.window_size:])
        recent_labels = np.array(labels[-self.window_size:])

        avg_conf = float(np.mean(recent_conf))
        avg_acc = float(np.mean(recent_labels))
        gap = abs(avg_conf - avg_acc)

        # Approximate rolling ECE
        # 5 bins for rolling window
        bin_edges = np.linspace(0.0, 1.0, 6)
        ece = 0.0
        for i in range(5):
            mask = (recent_conf >= bin_edges[i]) & (recent_conf < bin_edges[i+1] if i < 4 else recent_conf <= bin_edges[i+1])
            count = np.sum(mask)
            if count > 0:
                bin_acc = np.mean(recent_labels[mask])
                bin_c = np.mean(recent_conf[mask])
                ece += (count / len(recent_conf)) * abs(bin_acc - bin_c)

        is_drift = (ece > self.ece_threshold) or (gap > self.ece_threshold)

        return {
            "drift_detected": bool(is_drift),
            "rolling_ece": round(float(ece), 4),
            "gap": round(float(gap), 4),
            "avg_confidence": round(avg_conf, 4),
            "avg_accuracy": round(avg_acc, 4),
            "threshold": self.ece_threshold,
            "reason": (
                f"DRIFT ALERT: Rolling calibration error ({ece:.2f}) or gap ({gap:.2f}) exceeds tolerance ({self.ece_threshold:.2f})"
                if is_drift else "Confidence calibration is healthy and within normal operating tolerance."
            )
        }

drift_detector = DriftDetector()
