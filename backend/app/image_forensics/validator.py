import io
from typing import Tuple
from PIL import Image
from fastapi import HTTPException

MAX_UPLOAD_SIZE = 20 * 1024 * 1024  # 20 MB
MIN_DIMENSION = 32
MAX_DIMENSION = 8192

class ImageUploadValidator:
    """Validates image uploads, MIME types, magic byte signatures, and dimensions."""

    SUPPORTED_MIME_TYPES = {
        "image/jpeg": ["jpg", "jpeg"],
        "image/png": ["png"],
        "image/webp": ["webp"],
    }

    MAGIC_SIGNATURES = [
        (b"\xFF\xD8\xFF", "JPEG"),
        (b"\x89PNG\r\n\x1a\n", "PNG"),
        (b"RIFF", "WEBP"),  # Needs secondary WEBP check at offset 8
    ]

    def validate_and_decode(self, file_bytes: bytes, filename: str) -> Tuple[Image.Image, str]:
        # 1. Size Check
        size = len(file_bytes)
        if size == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        if size > MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File exceeds maximum upload size of {MAX_UPLOAD_SIZE // (1024*1024)}MB."
            )

        # 2. Magic byte signature check
        detected_format = self._verify_magic_bytes(file_bytes)
        if not detected_format:
            raise HTTPException(
                status_code=400,
                detail="Invalid file signature. Only standard JPG, JPEG, PNG, and WEBP images are supported."
            )

        # 3. Decode image with PIL
        try:
            image = Image.open(io.BytesIO(file_bytes))
            image.verify()  # Verifies structural integrity without decompressing full raster
            # Reopen after verify() because verify() alters state
            image = Image.open(io.BytesIO(file_bytes))
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Corrupt or malformed image data: {str(e)}"
            )

        # 4. Dimension checks
        w, h = image.size
        if w < MIN_DIMENSION or h < MIN_DIMENSION:
            raise HTTPException(
                status_code=400,
                detail=f"Image dimensions too small ({w}x{h}). Minimum supported is {MIN_DIMENSION}x{MIN_DIMENSION}."
            )
        if w > MAX_DIMENSION or h > MAX_DIMENSION:
            raise HTTPException(
                status_code=400,
                detail=f"Image dimensions too large ({w}x{h}). Maximum supported is {MAX_DIMENSION}x{MAX_DIMENSION}."
            )

        return image, detected_format

    def _verify_magic_bytes(self, data: bytes) -> str | None:
        if data.startswith(b"\xFF\xD8\xFF"):
            return "JPEG"
        if data.startswith(b"\x89PNG\r\n\x1a\n"):
            return "PNG"
        if data.startswith(b"RIFF") and len(data) >= 12 and data[8:12] == b"WEBP":
            return "WEBP"
        return None

image_validator = ImageUploadValidator()
