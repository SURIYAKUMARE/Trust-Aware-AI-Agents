"""Sightengine AI-Generated Image Detection Service.
Connects securely to the Sightengine AI image detection API (models=genai)
to inspect uploaded images for generative model characteristics.
Credentials (SIGHTENGINE_API_USER, SIGHTENGINE_API_SECRET) are managed strictly server-side.
"""
import time
import logging
from typing import Dict, Any, Optional
import httpx
from PIL import Image
import io

from app.config import settings
from app.image_forensics.schemas import AIDetectionResponse

logger = logging.getLogger("trustagent.image_forensics.sightengine")

SIGHTENGINE_API_URL = "https://api.sightengine.com/1.0/check.json"
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20MB limit
SUPPORTED_FORMATS = {"JPEG", "JPG", "PNG", "WEBP"}


class SightengineService:
    def __init__(self):
        self.api_url = SIGHTENGINE_API_URL
        self.timeout_seconds = 15.0
        self.ai_threshold = 0.85
        self.authentic_threshold = 0.50

    def validate_image_payload(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """Validates file presence, size, and image container format without logging content."""
        if not file_bytes:
            raise ValueError("Empty image payload provided.")

        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            raise ValueError(f"Image file size ({len(file_bytes) / (1024 * 1024):.1f}MB) exceeds the 20MB limit.")

        try:
            with Image.open(io.BytesIO(file_bytes)) as img:
                img_format = (img.format or "").upper()
                if img_format not in SUPPORTED_FORMATS:
                    raise ValueError(f"Unsupported format '{img_format}'. Supported formats: JPEG, PNG, WEBP.")
                width, height = img.size
        except Exception as e:
            if isinstance(e, ValueError):
                raise
            raise ValueError("Corrupted or invalid image file. Unable to decode image stream.")

        mime_type = "image/jpeg"
        if img_format == "PNG":
            mime_type = "image/png"
        elif img_format == "WEBP":
            mime_type = "image/webp"

        return {
            "format": img_format,
            "width": width,
            "height": height,
            "mime_type": mime_type,
            "file_size_kb": round(len(file_bytes) / 1024.0, 1),
        }

    async def detect_ai_generated(
        self,
        file_bytes: bytes,
        filename: str,
        threshold: Optional[float] = None,
    ) -> AIDetectionResponse:
        """Executes AI image detection via Sightengine API (models=genai)
        and normalizes output into TrustGuard AI format.
        """
        t0 = time.perf_counter()
        active_threshold = threshold if threshold is not None else self.ai_threshold

        # 1. Validation
        try:
            val_info = self.validate_image_payload(file_bytes, filename)
        except ValueError as val_err:
            elapsed = round((time.perf_counter() - t0) * 1000, 1)
            return AIDetectionResponse(
                analysis_status="Unable to analyze",
                detection_result="Inconclusive",
                ai_probability=0.0,
                ai_probability_raw=0.0,
                explanation=str(val_err),
                filename=filename,
                file_size_kb=round(len(file_bytes) / 1024.0, 1) if file_bytes else 0.0,
                format="UNKNOWN",
                latency_ms=elapsed,
            )

        format_str = val_info["format"]
        file_size_kb = val_info["file_size_kb"]
        mime_type = val_info["mime_type"]

        # 2. Server-side Credentials Check
        api_user = (settings.SIGHTENGINE_API_USER or "").strip()
        api_secret = (settings.SIGHTENGINE_API_SECRET or "").strip()

        if not api_user or not api_secret:
            elapsed = round((time.perf_counter() - t0) * 1000, 1)
            logger.warning("Sightengine API credentials (SIGHTENGINE_API_USER / SIGHTENGINE_API_SECRET) not set.")
            return AIDetectionResponse(
                analysis_status="Unable to analyze",
                detection_result="Inconclusive",
                ai_probability=0.0,
                ai_probability_raw=0.0,
                explanation="AI Image Detection service credentials are not configured on the server. Please configure SIGHTENGINE_API_USER and SIGHTENGINE_API_SECRET.",
                filename=filename,
                file_size_kb=file_size_kb,
                format=format_str,
                thresholds={"ai_threshold": active_threshold, "authentic_threshold": self.authentic_threshold},
                latency_ms=elapsed,
            )

        # 3. Secure HTTP Multipart Request to Sightengine
        data_payload = {
            "models": "genai",
            "api_user": api_user,
            "api_secret": api_secret,
        }
        files_payload = {
            "media": (filename, file_bytes, mime_type),
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                res = await client.post(
                    self.api_url,
                    data=data_payload,
                    files=files_payload,
                )

            elapsed = round((time.perf_counter() - t0) * 1000, 1)

            # Handle HTTP errors
            if res.status_code in (401, 403):
                logger.error("Authentication error contacting Sightengine API.")
                return AIDetectionResponse(
                    analysis_status="Unable to analyze",
                    detection_result="Inconclusive",
                    ai_probability=0.0,
                    ai_probability_raw=0.0,
                    explanation="Authentication failed with the image detection service. Please verify server API credentials.",
                    filename=filename,
                    file_size_kb=file_size_kb,
                    format=format_str,
                    latency_ms=elapsed,
                )

            if res.status_code >= 400:
                logger.error(f"Sightengine API returned HTTP {res.status_code}")
                return AIDetectionResponse(
                    analysis_status="Unable to analyze",
                    detection_result="Inconclusive",
                    ai_probability=0.0,
                    ai_probability_raw=0.0,
                    explanation=f"Image detection service returned status code {res.status_code}.",
                    filename=filename,
                    file_size_kb=file_size_kb,
                    format=format_str,
                    latency_ms=elapsed,
                )

            res_json = res.json()

            # Handle Sightengine error payload format
            if res_json.get("status") == "failure":
                err_dict = res_json.get("error", {})
                err_msg = err_dict.get("message", "Unknown service error")
                logger.warning(f"Sightengine reported failure: {err_msg}")
                return AIDetectionResponse(
                    analysis_status="Unable to analyze",
                    detection_result="Inconclusive",
                    ai_probability=0.0,
                    ai_probability_raw=0.0,
                    explanation=f"Detection service reported: {err_msg}",
                    filename=filename,
                    file_size_kb=file_size_kb,
                    format=format_str,
                    latency_ms=elapsed,
                )

            # Parse 'type' block containing ai_generated probability
            type_block = res_json.get("type", {})
            if "ai_generated" not in type_block:
                logger.error("Sightengine response missing 'type.ai_generated' field.")
                return AIDetectionResponse(
                    analysis_status="Unable to analyze",
                    detection_result="Inconclusive",
                    ai_probability=0.0,
                    ai_probability_raw=0.0,
                    explanation="Detection response missing required 'ai_generated' metric.",
                    filename=filename,
                    file_size_kb=file_size_kb,
                    format=format_str,
                    latency_ms=elapsed,
                )

            ai_raw = float(type_block["ai_generated"])
            ai_raw_clamped = max(0.0, min(1.0, ai_raw))
            ai_pct = round(ai_raw_clamped * 100.0, 1)

            # Extract any per-generator breakdowns if provided by API
            generators: Dict[str, float] = {}
            for k, v in type_block.items():
                if k != "ai_generated" and isinstance(v, (int, float)):
                    generators[k] = round(float(v) * 100.0, 1)

            # Determine Result Category based on configurable threshold
            if ai_raw_clamped >= active_threshold:
                detection_result = "Likely AI-generated"
                explanation = (
                    f"High probability of AI generation ({ai_pct}%). The image exhibits structural artifacts "
                    "and texture distribution patterns characteristic of generative AI diffusion models."
                )
            elif ai_raw_clamped <= self.authentic_threshold:
                detection_result = "Likely authentic"
                explanation = (
                    f"Low probability of AI generation ({ai_pct}%). The image does not exhibit dominant synthetic "
                    "synthesis markers. However, a low score is a probabilistic indicator, not an absolute guarantee of authenticity."
                )
            else:
                detection_result = "Inconclusive"
                explanation = (
                    f"Intermediate probability ({ai_pct}%). The visual features fall between natural photography "
                    "and synthetic generation, indicating ambiguous signals that warrant contextual review."
                )

            return AIDetectionResponse(
                analysis_status="Successfully analyzed",
                detection_result=detection_result,
                ai_probability=ai_pct,
                ai_probability_raw=round(ai_raw_clamped, 4),
                explanation=explanation,
                generator_analysis=generators,
                filename=filename,
                file_size_kb=file_size_kb,
                format=format_str,
                thresholds={"ai_threshold": active_threshold, "authentic_threshold": self.authentic_threshold},
                latency_ms=elapsed,
            )

        except httpx.TimeoutException:
            elapsed = round((time.perf_counter() - t0) * 1000, 1)
            logger.error("Timeout connecting to image detection API.")
            return AIDetectionResponse(
                analysis_status="Unable to analyze",
                detection_result="Inconclusive",
                ai_probability=0.0,
                ai_probability_raw=0.0,
                explanation="The image detection request timed out. Please try again.",
                filename=filename,
                file_size_kb=file_size_kb,
                format=format_str,
                latency_ms=elapsed,
            )
        except Exception as ex:
            elapsed = round((time.perf_counter() - t0) * 1000, 1)
            logger.error(f"Unexpected error in image detection: {ex}", exc_info=True)
            return AIDetectionResponse(
                analysis_status="Unable to analyze",
                detection_result="Inconclusive",
                ai_probability=0.0,
                ai_probability_raw=0.0,
                explanation=f"Detection error: {str(ex)}",
                filename=filename,
                file_size_kb=file_size_kb,
                format=format_str,
                latency_ms=elapsed,
            )


sightengine_service = SightengineService()
