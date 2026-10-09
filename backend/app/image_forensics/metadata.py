import io
from typing import Dict, Any, List, Optional
from PIL import Image, ExifTags
from app.image_forensics.schemas import ImageMetadataDetails

AI_SOFTWARE_SIGNATURES = [
    "stable diffusion",
    "midjourney",
    "dall-e",
    "dalle",
    "adobe firefly",
    "novelai",
    "civitai",
    "automatic1111",
    "comfyui",
    "fooocus",
    "invokeai",
    "bing image creator",
    "imagen",
    "flux.1",
    "flux",
    "leonardo.ai",
]

class ImageMetadataAnalyzer:
    """Extracts EXIF metadata, camera hardware information, PNG prompt chunks,
    C2PA provenance markers, and AI generation signatures.
    """

    def analyze(self, image: Image.Image, file_bytes: bytes, filename: str) -> ImageMetadataDetails:
        w, h = image.size
        size_bytes = len(file_bytes)
        gcd_val = self._gcd(w, h)
        aspect = f"{w // gcd_val}:{h // gcd_val}" if gcd_val > 0 else f"{w}:{h}"

        # 1. EXIF Extraction
        exif_raw = {}
        try:
            exif = image.getexif()
            if exif:
                for k, v in exif.items():
                    tag = ExifTags.TAGS.get(k, str(k))
                    exif_raw[tag] = v
        except Exception:
            pass

        has_exif = len(exif_raw) > 0
        camera_make = str(exif_raw.get("Make")) if exif_raw.get("Make") else None
        camera_model = str(exif_raw.get("Model")) if exif_raw.get("Model") else None
        lens_model = str(exif_raw.get("LensModel")) if exif_raw.get("LensModel") else None
        software = str(exif_raw.get("Software")) if exif_raw.get("Software") else None
        dt_original = str(exif_raw.get("DateTimeOriginal") or exif_raw.get("DateTime") or "") or None

        # Exposure, F-number, ISO
        exp_time = str(exif_raw.get("ExposureTime")) if exif_raw.get("ExposureTime") else None
        f_num = float(exif_raw["FNumber"]) if isinstance(exif_raw.get("FNumber"), (int, float)) else None
        iso_val = int(exif_raw["ISOSpeedRatings"]) if isinstance(exif_raw.get("ISOSpeedRatings"), int) else None

        # 2. PNG text chunks (where A1111, ComfyUI, etc. embed prompts)
        png_chunks = {}
        if hasattr(image, "text") and isinstance(image.text, dict):
            for k, v in image.text.items():
                if isinstance(v, str):
                    png_chunks[str(k)] = v[:500]  # Truncate for report summary

        # 3. AI Generation Markers check
        ai_markers: List[str] = []
        combined_text = (
            f"{software or ''} "
            + " ".join([f"{k}:{v}" for k, v in png_chunks.items()])
        ).lower()

        for sig in AI_SOFTWARE_SIGNATURES:
            if sig in combined_text:
                ai_markers.append(f"AI software signature found: '{sig.title()}'")

        if any(chunk_key.lower() in ["parameters", "prompt", "workflow"] for chunk_key in png_chunks.keys()):
            ai_markers.append("Embedded generative AI workflow metadata detected in PNG chunks")

        # 4. C2PA Content Credentials marker check
        c2pa_detected = False
        lower_bytes = file_bytes[:16384].lower() + file_bytes[-16384:].lower()
        if b"c2pa" in lower_bytes or b"jumbf" in lower_bytes or b"contentcredentials" in lower_bytes:
            c2pa_detected = True

        return ImageMetadataDetails(
            format=image.format or "UNKNOWN",
            width=w,
            height=h,
            aspect_ratio=aspect,
            file_size_bytes=size_bytes,
            file_size_kb=round(size_bytes / 1024, 1),
            has_exif=has_exif,
            camera_make=camera_make,
            camera_model=camera_model,
            lens_model=lens_model,
            software=software,
            datetime_original=dt_original,
            exposure_time=exp_time,
            f_number=f_num,
            iso=iso_val,
            gps_coordinates=None,
            ai_generation_markers=ai_markers,
            png_text_chunks=png_chunks,
            c2pa_manifest_detected=c2pa_detected,
        )

    def _gcd(self, a: int, b: int) -> int:
        while b:
            a, b = b, a % b
        return a

image_metadata_analyzer = ImageMetadataAnalyzer()
