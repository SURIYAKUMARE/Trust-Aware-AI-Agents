import io
import os
import sys
import pytest
from PIL import Image, PngImagePlugin
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.image_forensics.validator import image_validator
from app.image_forensics.metadata import image_metadata_analyzer
from app.image_forensics.ai_detector import ai_image_detector
from app.image_forensics.manipulation import image_manipulation_detector
from app.image_forensics.deepfake import deepfake_detector
from app.image_forensics.provenance import provenance_verifier

client = TestClient(app)

# Helper to create in-memory JPEG image with gradient texture
def create_test_image(width=256, height=256, fmt="JPEG", add_face_like=False):
    import numpy as np
    arr = np.zeros((height, width, 3), dtype=np.uint8)
    for y in range(height):
        for x in range(width):
            arr[y, x] = [(x * 2) % 256, (y * 2) % 256, (x + y) % 256]
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()

# -------------------------------------------------------------
# 1. Health Endpoint
# -------------------------------------------------------------
def test_image_forensics_health():
    res = client.get("/api/image/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["opencv_available"] is True
    assert data["pillow_available"] is True
    assert data["max_upload_size_mb"] == 20

# -------------------------------------------------------------
# 2. Upload and Analyze Normal Image
# -------------------------------------------------------------
def test_analyze_standard_image():
    raw_bytes = create_test_image(300, 300, "JPEG")
    res = client.post(
        "/api/image/analyze",
        files={"file": ("test_photo.jpg", raw_bytes, "image/jpeg")}
    )
    assert res.status_code == 200
    report = res.json()
    assert report["analysis_id"].startswith("img-")
    assert report["metadata"]["width"] == 300
    assert report["metadata"]["height"] == 300
    assert "ai_generation_assessment" in report
    assert "manipulation_assessment" in report
    assert "deepfake_assessment" in report
    assert "provenance_assessment" in report
    assert report["heatmap_data_uri"].startswith("data:image/png;base64,")

# -------------------------------------------------------------
# 3. AI Generated Image with Prompt Metadata
# -------------------------------------------------------------
def test_ai_generated_image_with_metadata():
    img = Image.new("RGB", (256, 256), color=(80, 100, 120))
    png_info = PngImagePlugin.PngInfo()
    png_info.add_text("parameters", "A futuristic city in the style of Midjourney, 8k render, octane render, seed 482910")
    png_info.add_text("Software", "Stable Diffusion WebUI / ComfyUI")
    buf = io.BytesIO()
    img.save(buf, format="PNG", pnginfo=png_info)
    png_bytes = buf.getvalue()

    res = client.post(
        "/api/image/analyze",
        files={"file": ("ai_generated.png", png_bytes, "image/png")}
    )
    assert res.status_code == 200
    report = res.json()
    assert "ai_generation_markers" in report["metadata"]
    assert len(report["metadata"]["ai_generation_markers"]) > 0
    assert report["ai_generation_assessment"]["assessment"] == "Evidence supports AI generation"
    assert report["ai_generation_assessment"]["score"] >= 0.70

# -------------------------------------------------------------
# 4. Image Manipulation / Splicing Detection (ELA)
# -------------------------------------------------------------
def test_manipulation_ela_detection():
    import numpy as np
    arr = np.full((320, 320, 3), 128, dtype=np.uint8)
    # Add a high-frequency spliced square in the center
    arr[100:220, 100:220] = np.random.randint(0, 255, (120, 120, 3), dtype=np.uint8)
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=75)
    spliced_bytes = buf.getvalue()

    res = client.post(
        "/api/image/analyze",
        files={"file": ("spliced_image.jpg", spliced_bytes, "image/jpeg")}
    )
    assert res.status_code == 200
    report = res.json()
    assert report["manipulation_assessment"]["task"] == "Image Manipulation & Splicing Detection"
    assert report["heatmap_data_uri"] is not None

# -------------------------------------------------------------
# 5. Deepfake Assessment on Non-Face Image
# -------------------------------------------------------------
def test_deepfake_no_face_assessment():
    raw_bytes = create_test_image(200, 200, "JPEG")
    res = client.post(
        "/api/image/analyze",
        files={"file": ("landscape.jpg", raw_bytes, "image/jpeg")}
    )
    assert res.status_code == 200
    report = res.json()
    df_finding = report["deepfake_assessment"]
    assert df_finding["assessment"] == "Inconclusive or not analyzed"
    assert "No human faces detected" in df_finding["evidence_detected"][0]

# -------------------------------------------------------------
# 6. Reject Corrupt or Malicious Files
# -------------------------------------------------------------
def test_reject_corrupt_file():
    corrupt_bytes = b"NOT_A_REAL_IMAGE_FILE_DATA_1234567890"
    res = client.post(
        "/api/image/analyze",
        files={"file": ("malicious.jpg", corrupt_bytes, "image/jpeg")}
    )
    assert res.status_code == 400
    assert "Invalid file signature" in res.json()["detail"]

# -------------------------------------------------------------
# 7. Reject Empty File
# -------------------------------------------------------------
def test_reject_empty_file():
    res = client.post(
        "/api/image/analyze",
        files={"file": ("empty.jpg", b"", "image/jpeg")}
    )
    assert res.status_code == 400

# -------------------------------------------------------------
# 8. Retrieve Cached Report by Analysis ID
# -------------------------------------------------------------
def test_get_report_by_id():
    raw_bytes = create_test_image(128, 128, "JPEG")
    post_res = client.post(
        "/api/image/analyze",
        files={"file": ("query.jpg", raw_bytes, "image/jpeg")}
    )
    assert post_res.status_code == 200
    report_id = post_res.json()["analysis_id"]

    get_res = client.get(f"/api/image/report/{report_id}")
    assert get_res.status_code == 200
    assert get_res.json()["analysis_id"] == report_id

    # Nonexistent ID returns 404
    missing_res = client.get("/api/image/report/img-nonexistent999")
    assert missing_res.status_code == 404
