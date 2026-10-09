import io
import base64
import numpy as np
from PIL import Image, ImageChops, ImageEnhance
import cv2
from typing import Dict, Any, List, Tuple

from app.image_forensics.schemas import DetectorFinding

class ImageManipulationDetector:
    """Detects digital manipulation, copy-move, splicing, and compression discrepancies
    using Error Level Analysis (ELA) and block-level noise variance mapping.
    """

    def analyze(self, image: Image.Image) -> Tuple[DetectorFinding, str]:
        evidence: List[str] = []
        metrics: Dict[str, Any] = {}

        # -------------------------------------------------------------
        # TECHNIQUE 1: Error Level Analysis (ELA)
        # Resave at fixed 95% quality and compute per-pixel compression differential.
        # Higher difference indicates regions with inconsistent error levels (e.g. spliced objects).
        # -------------------------------------------------------------
        rgb_img = image.convert("RGB")
        
        # Save temporary JPEG in memory at 95% quality
        buf = io.BytesIO()
        rgb_img.save(buf, "JPEG", quality=95)
        buf.seek(0)
        resaved_img = Image.open(buf)

        # Calculate pixel difference
        diff = ImageChops.difference(rgb_img, resaved_img)
        
        # Extract max difference
        extrema = diff.getextrema()
        max_diff = max([ex[1] for ex in extrema])
        metrics["ela_max_diff"] = max_diff

        # Scale difference to maximize visual contrast (scale factor ~ 255.0 / max_diff)
        scale = 255.0 / max(1, max_diff) if max_diff > 0 else 1.0
        scale = min(scale, 15.0)  # Clamp multiplier to avoid noise blowout
        diff_scaled = ImageEnhance.Brightness(diff).enhance(scale)

        # Apply a colormap (JET/Inferno) for forensic investigation visualization
        diff_np = np.array(diff_scaled)
        diff_gray = cv2.cvtColor(diff_np, cv2.COLOR_RGB2GRAY)
        heatmap_colored = cv2.applyColorMap(diff_gray, cv2.COLORMAP_JET)
        heatmap_rgb = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)
        heatmap_img = Image.fromarray(heatmap_rgb)

        # Convert heatmap to base64 Data URI
        out_buf = io.BytesIO()
        # Resize heatmap if massive to optimize payload size
        if heatmap_img.width > 1200:
            heatmap_img.thumbnail((1200, 1200))
        heatmap_img.save(out_buf, format="PNG")
        heatmap_b64 = base64.b64encode(out_buf.getvalue()).decode("utf-8")
        heatmap_data_uri = f"data:image/png;base64,{heatmap_b64}"

        # -------------------------------------------------------------
        # TECHNIQUE 2: Block-Level Noise Variance Consistency
        # Split image into 32x32 blocks and compute Laplacian variance.
        # Spliced regions from different cameras/sources exhibit stark variance boundaries.
        # -------------------------------------------------------------
        gray_np = cv2.cvtColor(np.array(rgb_img), cv2.COLOR_RGB2GRAY)
        h, w = gray_np.shape
        block_size = 32
        block_vars = []

        for y in range(0, h - block_size + 1, block_size):
            for x in range(0, w - block_size + 1, block_size):
                block = gray_np[y:y+block_size, x:x+block_size]
                lap = cv2.Laplacian(block, cv2.CV_64F)
                block_vars.append(lap.var())

        block_var_std = float(np.std(block_vars)) if block_vars else 0.0
        block_var_mean = float(np.mean(block_vars)) if block_vars else 1.0
        variance_coefficient = block_var_std / max(1.0, block_var_mean)
        metrics["block_variance_coefficient"] = round(variance_coefficient, 3)

        # Calculate manipulation score
        ela_mean_diff = float(np.mean(diff_gray))
        metrics["ela_mean_diff"] = round(ela_mean_diff, 2)

        manip_score = 0.15  # Baseline

        if ela_mean_diff > 35.0 and variance_coefficient > 1.8:
            manip_score = 0.78
            evidence.append(f"Elevated localized Error Level Analysis (ELA) variance ({ela_mean_diff:.1f}); indicates compression rate discrepancies across image zones.")
            evidence.append(f"High inter-block noise variance coefficient ({variance_coefficient:.2f}); consistent with multi-source splicing or localized editing.")
        elif ela_mean_diff > 25.0:
            manip_score = 0.52
            evidence.append("Moderate localized ELA differential detected; consistent with localized filtering, text overlays, or regional retouching.")
        elif variance_coefficient > 2.2:
            manip_score = 0.48
            evidence.append("Non-uniform noise distribution across image grid; potential regional sharpening or composition.")
        else:
            manip_score = 0.18
            evidence.append("Error Level Analysis demonstrates uniform compression decay across all regions; no conspicuous splicing boundaries found.")

        # Determine assessment string
        if manip_score >= 0.70:
            assessment = "Evidence of possible manipulation"
        elif manip_score <= 0.35:
            assessment = "No significant manipulation signals detected"
        else:
            assessment = "Inconclusive"

        pct_val = int(round(manip_score * 100))

        finding = DetectorFinding(
            task="Image Manipulation & Splicing Detection",
            model_or_tool="Error Level Analysis (ELA @ 95% Q) & Block Noise Variance Mapping",
            assessment=assessment,
            score=round(manip_score, 2),
            score_display=f"{pct_val}%",
            evidence_detected=evidence,
            limitations=(
                "ELA identifies compression discrepancies. However, repeated JPEG saves, "
                "social media transcoding, contrast adjustments, natural hard edges, or text overlays "
                "can legitimately cause elevated ELA brightness without malicious tampering. "
                "The accompanying heatmap should be used as an investigative guide, not definitive legal proof."
            ),
            supporting_metrics=metrics,
        )

        return finding, heatmap_data_uri

image_manipulation_detector = ImageManipulationDetector()
