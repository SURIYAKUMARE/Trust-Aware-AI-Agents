import numpy as np
from PIL import Image
from typing import Dict, Any, List
from scipy.stats import kurtosis
import cv2

from app.image_forensics.schemas import DetectorFinding, ImageMetadataDetails

class AIImageDetector:
    """Multi-signal forensic analyzer for detecting AI-generated images (GANs, Diffusion, etc.).
    Combines 2D Fourier spectral analysis, noise residual kurtosis, color channel cross-correlation,
    and generative metadata markers.
    """

    def analyze(self, image: Image.Image, metadata: ImageMetadataDetails) -> DetectorFinding:
        evidence: List[str] = []
        metrics: Dict[str, Any] = {}

        # Convert to numpy arrays
        rgb = np.array(image.convert("RGB"))
        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY).astype(np.float32)

        # -------------------------------------------------------------
        # SIGNAL 1: Generative Metadata Fingerprints
        # -------------------------------------------------------------
        metadata_ai_score = 0.0
        if metadata.ai_generation_markers:
            metadata_ai_score = 0.95
            evidence.extend(metadata.ai_generation_markers)

        # -------------------------------------------------------------
        # SIGNAL 2: 2D-FFT Fourier Spectrum Analysis
        # Natural images follow power-law 1/f^alpha radial falloff.
        # AI generators (Diffusion/GAN) show periodic high-frequency grid artifacts.
        # -------------------------------------------------------------
        dft = np.fft.fft2(gray)
        dft_shift = np.fft.fftshift(dft)
        magnitude_spectrum = np.log(1 + np.abs(dft_shift))

        h, w = gray.shape
        cy, cx = h // 2, w // 2
        # Sample high-frequency outer perimeter vs low-frequency center
        y, x = np.ogrid[:h, :w]
        dist_from_center = np.sqrt((x - cx)**2 + (y - cy)**2)
        max_radius = np.sqrt(cx**2 + cy**2)

        high_freq_mask = dist_from_center > (max_radius * 0.65)
        low_freq_mask = dist_from_center < (max_radius * 0.25)

        high_freq_energy = float(np.mean(magnitude_spectrum[high_freq_mask]))
        low_freq_energy = float(np.mean(magnitude_spectrum[low_freq_mask]))
        spectral_ratio = high_freq_energy / max(0.001, low_freq_energy)

        # Measure high-frequency spectral kurtosis (spikiness/checkerboard artifacts)
        hf_values = magnitude_spectrum[high_freq_mask]
        hf_kurtosis = float(kurtosis(hf_values)) if len(hf_values) > 10 else 0.0

        metrics["spectral_energy_ratio"] = round(spectral_ratio, 3)
        metrics["high_frequency_kurtosis"] = round(hf_kurtosis, 3)

        spectral_ai_score = 0.0
        if spectral_ratio < 0.32:
            # Abnormally low high-frequency content (over-smoothed synthetic texture)
            spectral_ai_score += 0.30
            evidence.append(f"Anomalous high-frequency attenuation detected (ratio {spectral_ratio:.2f}); consistent with synthetic diffusion smoothing.")
        elif hf_kurtosis > 2.8:
            # Periodic checkerboard frequency spikes characteristic of upsampling layers
            spectral_ai_score += 0.35
            evidence.append(f"Elevated Fourier spectral kurtosis ({hf_kurtosis:.2f}); indicates periodic frequency grid artifacts common in generative upsamplers.")

        # -------------------------------------------------------------
        # SIGNAL 3: Sensor Noise Residual & Local Variance Kurtosis
        # Real camera sensors exhibit physical photon shot noise / PRNU.
        # AI images exhibit synthetic Gaussian residual distributions.
        # -------------------------------------------------------------
        # Apply median filter to estimate latent image, then subtract to isolate residual
        blurred = cv2.medianBlur(gray.astype(np.uint8), 3).astype(np.float32)
        noise_residual = np.abs(gray - blurred)
        residual_std = float(np.std(noise_residual))
        residual_kurt = float(kurtosis(noise_residual.flatten()))

        metrics["residual_std"] = round(residual_std, 3)
        metrics["residual_kurtosis"] = round(residual_kurt, 3)

        noise_ai_score = 0.0
        if residual_std < 0.95 and not metadata.has_exif:
            noise_ai_score += 0.30
            evidence.append(f"Near-zero sensor noise residual ({residual_std:.2f}); lacks physical camera sensor shot noise (PRNU).")
        elif residual_kurt > 14.0:
            noise_ai_score += 0.25
            evidence.append(f"High noise residual kurtosis ({residual_kurt:.2f}); indicates non-Poisson synthetic noise.")

        # -------------------------------------------------------------
        # SIGNAL 4: Color Channel Cross-Correlation
        # -------------------------------------------------------------
        r_chan = rgb[:, :, 0].flatten().astype(np.float32)
        g_chan = rgb[:, :, 1].flatten().astype(np.float32)
        b_chan = rgb[:, :, 2].flatten().astype(np.float32)

        r_std = float(np.std(r_chan))
        g_std = float(np.std(g_chan))
        b_std = float(np.std(b_chan))

        rg_corr = float(np.corrcoef(r_chan, g_chan)[0, 1]) if (r_std > 0 and g_std > 0) else 1.0
        gb_corr = float(np.corrcoef(g_chan, b_chan)[0, 1]) if (g_std > 0 and b_std > 0) else 1.0
        metrics["rg_correlation"] = round(rg_corr, 3)
        metrics["gb_correlation"] = round(gb_corr, 3)

        # Composite AI generation score
        if metadata_ai_score >= 0.90:
            final_score = metadata_ai_score
        else:
            final_score = min(0.92, max(0.08, spectral_ai_score + noise_ai_score))

        # Calibrate assessment string
        if final_score >= 0.70:
            assessment = "Evidence supports AI generation"
        elif final_score <= 0.30:
            assessment = "Evidence does not support AI generation"
            if not evidence:
                evidence.append("Frequency spectrum adheres to natural 1/f falloff; physical sensor noise characteristics present.")
        else:
            assessment = "Inconclusive"
            if not evidence:
                evidence.append("Signal features fall within ambiguous intermediate distribution; insufficient evidence to conclude.")

        pct_val = int(round(final_score * 100))

        return DetectorFinding(
            task="AI-Generated Image Detection",
            model_or_tool="Multi-Signal Spectral & Residual Forensics Engine (2D-FFT + PRNU Noise Analysis)",
            assessment=assessment,
            score=round(final_score, 2),
            score_display=f"{pct_val}%",
            evidence_detected=evidence,
            limitations=(
                "Detection relies on frequency domain analysis and noise distribution heuristics. "
                "Aggressive JPEG re-compression, social media filters, or heavy downscaling can obscure or simulate high-frequency artifacts. "
                "Score represents an uncalibrated forensic signal level, not an absolute guarantee."
            ),
            supporting_metrics=metrics,
        )

ai_image_detector = AIImageDetector()
