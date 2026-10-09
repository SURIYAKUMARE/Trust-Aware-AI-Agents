import io
import os
import sys
import pytest
from unittest.mock import patch, MagicMock
from PIL import Image
from fastapi.testclient import TestClient
import httpx

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.config import settings
from app.image_forensics.sightengine_service import sightengine_service

client = TestClient(app)

def create_sample_image(fmt="JPEG", width=120, height=120, color=(100, 150, 200)) -> bytes:
    """Helper to generate in-memory valid image bytes."""
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


# --------------------------------------------------------------------------
# 1. Valid JPEG Image
# --------------------------------------------------------------------------
def test_valid_jpeg_image_detection():
    jpeg_bytes = create_sample_image("JPEG")
    mock_sightengine_response = {
        "status": "success",
        "request": {"id": "req_123", "timestamp": 1712600000.0},
        "type": {
            "ai_generated": 0.88,
            "midjourney": 0.82,
            "dall_e": 0.05
        }
    }

    with patch.object(settings, "SIGHTENGINE_API_USER", "test_user_key"), \
         patch.object(settings, "SIGHTENGINE_API_SECRET", "test_secret_key"):
        with patch("httpx.AsyncClient.post") as mock_post:
            mock_res = MagicMock()
            mock_res.status_code = 200
            mock_res.json.return_value = mock_sightengine_response
            mock_post.return_value = mock_res

            response = client.post(
                "/api/image/detect",
                files={"file": ("photo.jpg", jpeg_bytes, "image/jpeg")}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["analysis_status"] == "Successfully analyzed"
            assert data["detection_result"] == "Likely AI-generated"
            assert data["ai_probability"] == 88.0
            assert data["ai_probability_raw"] == 0.88
            assert data["format"] == "JPEG"
            assert data["generator_analysis"]["midjourney"] == 82.0


# --------------------------------------------------------------------------
# 2. Valid PNG Image (also tests /api/image/check alias)
# --------------------------------------------------------------------------
def test_valid_png_image_detection():
    png_bytes = create_sample_image("PNG")
    mock_sightengine_response = {
        "status": "success",
        "request": {"id": "req_png_456"},
        "type": {
            "ai_generated": 0.12
        }
    }

    with patch.object(settings, "SIGHTENGINE_API_USER", "test_user_key"), \
         patch.object(settings, "SIGHTENGINE_API_SECRET", "test_secret_key"):
        with patch("httpx.AsyncClient.post") as mock_post:
            mock_res = MagicMock()
            mock_res.status_code = 200
            mock_res.json.return_value = mock_sightengine_response
            mock_post.return_value = mock_res

            response = client.post(
                "/api/image/check",
                files={"file": ("graphic.png", png_bytes, "image/png")}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["analysis_status"] == "Successfully analyzed"
            assert data["detection_result"] == "Likely authentic"
            assert data["ai_probability"] == 12.0
            assert data["ai_probability_raw"] == 0.12
            assert data["format"] == "PNG"


# --------------------------------------------------------------------------
# 3. Unsupported File Type / Corrupted File
# --------------------------------------------------------------------------
def test_unsupported_file_type_rejected():
    text_file_bytes = b"This is a plain text file pretending to be an image."

    with patch.object(settings, "SIGHTENGINE_API_USER", "test_user_key"), \
         patch.object(settings, "SIGHTENGINE_API_SECRET", "test_secret_key"):
        response = client.post(
            "/api/image/detect",
            files={"file": ("fake_image.jpg", text_file_bytes, "image/jpeg")}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["analysis_status"] == "Unable to analyze"
        assert data["detection_result"] == "Inconclusive"
        assert "Corrupted or invalid image file" in data["explanation"]


# --------------------------------------------------------------------------
# 4. Oversized File (>20MB)
# --------------------------------------------------------------------------
def test_oversized_file_rejected():
    with patch("app.image_forensics.sightengine_service.MAX_FILE_SIZE_BYTES", 500):
        jpeg_bytes = create_sample_image("JPEG", width=200, height=200) # > 500 bytes

        with patch.object(settings, "SIGHTENGINE_API_USER", "test_user_key"), \
             patch.object(settings, "SIGHTENGINE_API_SECRET", "test_secret_key"):
            response = client.post(
                "/api/image/detect",
                files={"file": ("large_image.jpg", jpeg_bytes, "image/jpeg")}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["analysis_status"] == "Unable to analyze"
            assert data["detection_result"] == "Inconclusive"
            assert "exceeds the 20MB limit" in data["explanation"]


# --------------------------------------------------------------------------
# 5. API Authentication Failure (Mock 401 response)
# --------------------------------------------------------------------------
def test_api_authentication_failure():
    jpeg_bytes = create_sample_image("JPEG")

    with patch.object(settings, "SIGHTENGINE_API_USER", "invalid_user"), \
         patch.object(settings, "SIGHTENGINE_API_SECRET", "invalid_secret"):
        with patch("httpx.AsyncClient.post") as mock_post:
            mock_res = MagicMock()
            mock_res.status_code = 401
            mock_res.json.return_value = {"status": "failure", "error": {"message": "Invalid API user or secret"}}
            mock_post.return_value = mock_res

            response = client.post(
                "/api/image/detect",
                files={"file": ("test.jpg", jpeg_bytes, "image/jpeg")}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["analysis_status"] == "Unable to analyze"
            assert data["detection_result"] == "Inconclusive"
            assert "Authentication failed" in data["explanation"]
            # Ensure secret is NOT in output
            assert "invalid_secret" not in response.text


# --------------------------------------------------------------------------
# 6. API Timeout or Unavailable Service (Mock Timeout / 503)
# --------------------------------------------------------------------------
def test_api_timeout_handling():
    jpeg_bytes = create_sample_image("JPEG")

    with patch.object(settings, "SIGHTENGINE_API_USER", "test_user_key"), \
         patch.object(settings, "SIGHTENGINE_API_SECRET", "test_secret_key"):
        with patch("httpx.AsyncClient.post", side_effect=httpx.TimeoutException("Connection timed out")):
            response = client.post(
                "/api/image/detect",
                files={"file": ("test.jpg", jpeg_bytes, "image/jpeg")}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["analysis_status"] == "Unable to analyze"
            assert data["detection_result"] == "Inconclusive"
            assert "timed out" in data["explanation"].lower()


def test_api_service_unavailable_503():
    jpeg_bytes = create_sample_image("JPEG")

    with patch.object(settings, "SIGHTENGINE_API_USER", "test_user_key"), \
         patch.object(settings, "SIGHTENGINE_API_SECRET", "test_secret_key"):
        with patch("httpx.AsyncClient.post") as mock_post:
            mock_res = MagicMock()
            mock_res.status_code = 503
            mock_res.json.return_value = {"status": "failure"}
            mock_post.return_value = mock_res

            response = client.post(
                "/api/image/detect",
                files={"file": ("test.jpg", jpeg_bytes, "image/jpeg")}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["analysis_status"] == "Unable to analyze"
            assert data["detection_result"] == "Inconclusive"
            assert "503" in data["explanation"]


# --------------------------------------------------------------------------
# 7. Successful Response Containing AI Probability Score (0.92 -> 92%)
# --------------------------------------------------------------------------
def test_successful_probability_conversion():
    jpeg_bytes = create_sample_image("JPEG")
    mock_sightengine_response = {
        "status": "success",
        "type": {
            "ai_generated": 0.92,
            "stable_diffusion": 0.89,
            "midjourney": 0.03
        }
    }

    with patch.object(settings, "SIGHTENGINE_API_USER", "test_user_key"), \
         patch.object(settings, "SIGHTENGINE_API_SECRET", "test_secret_key"):
        with patch("httpx.AsyncClient.post") as mock_post:
            mock_res = MagicMock()
            mock_res.status_code = 200
            mock_res.json.return_value = mock_sightengine_response
            mock_post.return_value = mock_res

            response = client.post(
                "/api/image/detect",
                files={"file": ("synth_art.jpg", jpeg_bytes, "image/jpeg")},
                data={"threshold": 0.85}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["analysis_status"] == "Successfully analyzed"
            assert data["detection_result"] == "Likely AI-generated"
            assert data["ai_probability"] == 92.0
            assert data["ai_probability_raw"] == 0.92
            assert "92.0%" in data["explanation"]
            assert data["generator_analysis"]["stable_diffusion"] == 89.0


# --------------------------------------------------------------------------
# 8. Response with Missing or Malformed Fields
# --------------------------------------------------------------------------
def test_missing_ai_generated_field():
    jpeg_bytes = create_sample_image("JPEG")
    malformed_response = {
        "status": "success",
        "type": {}  # missing 'ai_generated'
    }

    with patch.object(settings, "SIGHTENGINE_API_USER", "test_user_key"), \
         patch.object(settings, "SIGHTENGINE_API_SECRET", "test_secret_key"):
        with patch("httpx.AsyncClient.post") as mock_post:
            mock_res = MagicMock()
            mock_res.status_code = 200
            mock_res.json.return_value = malformed_response
            mock_post.return_value = mock_res

            response = client.post(
                "/api/image/detect",
                files={"file": ("test.jpg", jpeg_bytes, "image/jpeg")}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["analysis_status"] == "Unable to analyze"
            assert data["detection_result"] == "Inconclusive"
            assert "missing required 'ai_generated' metric" in data["explanation"].lower()


# --------------------------------------------------------------------------
# 9. Server Credentials Unconfigured (Graceful Degrade)
# --------------------------------------------------------------------------
def test_unconfigured_credentials_safe_degrade():
    jpeg_bytes = create_sample_image("JPEG")

    with patch.object(settings, "SIGHTENGINE_API_USER", ""), \
         patch.object(settings, "SIGHTENGINE_API_SECRET", ""):
        response = client.post(
            "/api/image/detect",
            files={"file": ("test.jpg", jpeg_bytes, "image/jpeg")}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["analysis_status"] == "Unable to analyze"
        assert data["detection_result"] == "Inconclusive"
        assert "not configured on the server" in data["explanation"]
