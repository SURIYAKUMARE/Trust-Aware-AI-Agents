import os
import pickle
import numpy as np
from typing import Tuple, List, Optional
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression
import logging

logger = logging.getLogger(__name__)

class ConfidenceCalibrator:
    """Calibrates raw ensemble confidence scores using Isotonic Regression
    or Platt Scaling fitted on the evaluation dev set.
    Persists to disk and includes ECE (Expected Calibration Error) and Brier metrics.
    """
    
    def __init__(self, filepath: Optional[str] = None):
        self.filepath = filepath or "./eval/results/calibrator.pkl"
        self.isotonic: Optional[IsotonicRegression] = None
        self.platt: Optional[LogisticRegression] = None
        self.is_fitted = False
        self._try_load()

    def _try_load(self):
        if self.filepath and os.path.exists(self.filepath):
            try:
                with open(self.filepath, "rb") as f:
                    data = pickle.load(f)
                    self.isotonic = data.get("isotonic")
                    self.platt = data.get("platt")
                    self.is_fitted = True
                    logger.info(f"Loaded calibrated model from {self.filepath}")
            except Exception as e:
                logger.warning(f"Could not load calibrator from {self.filepath}: {e}")

    def save(self):
        if not self.filepath:
            return
        os.makedirs(os.path.dirname(self.filepath), exist_ok=True)
        try:
            with open(self.filepath, "wb") as f:
                pickle.dump({"isotonic": self.isotonic, "platt": self.platt}, f)
            logger.info(f"Saved calibrator to {self.filepath}")
        except Exception as e:
            logger.warning(f"Failed to save calibrator: {e}")

    def fit(self, y_prob: List[float], y_true: List[int]):
        """Fit isotonic regression and Platt scaling on dev set probabilities and outcomes."""
        X = np.array(y_prob, dtype=np.float64).reshape(-1, 1)
        y = np.array(y_true, dtype=np.int32)

        # Isotonic regression (out-of-bounds clipping to [0, 1])
        iso = IsotonicRegression(out_of_bounds="clip", y_min=0.01, y_max=0.99)
        iso.fit(X.ravel(), y)
        self.isotonic = iso

        # Platt scaling (Logistic Regression on logits)
        platt = LogisticRegression(C=1.0, solver="lbfgs")
        platt.fit(X, y)
        self.platt = platt

        self.is_fitted = True
        self.save()

    def calibrate(self, raw_score: float) -> float:
        """Apply fitted calibration. If not yet fitted, applies an honest smooth conservative adjustment."""
        clamped_raw = max(0.01, min(0.99, float(raw_score)))
        
        if self.is_fitted and self.isotonic is not None:
            calibrated = float(self.isotonic.predict([clamped_raw])[0])
            return round(max(0.02, min(0.98, calibrated)), 3)
        
        # Default monotonic identity mapping with slight conservative boundary temper
        if clamped_raw >= 0.85:
            calibrated = 0.85 + (clamped_raw - 0.85) * 0.90
        elif clamped_raw <= 0.30:
            calibrated = clamped_raw * 0.85
        else:
            calibrated = clamped_raw
        return round(max(0.02, min(0.99, calibrated)), 3)

    @staticmethod
    def compute_ece(probs: List[float], labels: List[int], n_bins: int = 10) -> Tuple[float, List[dict]]:
        """Compute Expected Calibration Error (ECE) and bin details for reliability diagrams."""
        if not probs or not labels or len(probs) != len(labels):
            return 0.0, []

        probs_arr = np.array(probs)
        labels_arr = np.array(labels)
        bin_edges = np.linspace(0.0, 1.0, n_bins + 1)
        ece = 0.0
        bins_data = []

        for i in range(n_bins):
            low = bin_edges[i]
            high = bin_edges[i + 1]
            mask = (probs_arr >= low) & (probs_arr < high if i < n_bins - 1 else probs_arr <= high)
            bin_count = int(np.sum(mask))

            if bin_count > 0:
                bin_acc = float(np.mean(labels_arr[mask]))
                bin_conf = float(np.mean(probs_arr[mask]))
                diff = abs(bin_acc - bin_conf)
                ece += (bin_count / len(probs)) * diff
                bins_data.append({
                    "bin_center": round((low + high) / 2.0, 3),
                    "confidence": round(bin_conf, 3),
                    "accuracy": round(bin_acc, 3),
                    "count": bin_count,
                })
            else:
                bins_data.append({
                    "bin_center": round((low + high) / 2.0, 3),
                    "confidence": round((low + high) / 2.0, 3),
                    "accuracy": 0.0,
                    "count": 0,
                })

        return round(float(ece), 4), bins_data

    @staticmethod
    def compute_brier_score(probs: List[float], labels: List[int]) -> float:
        """Compute mean squared error between probabilities and binary outcomes."""
        if not probs or not labels:
            return 0.0
        return round(float(np.mean((np.array(probs) - np.array(labels)) ** 2)), 4)

calibrator = ConfidenceCalibrator()
