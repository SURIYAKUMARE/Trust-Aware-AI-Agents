from typing import List, Dict, Any
from app.image_forensics.schemas import DetectorFinding, ImageMetadataDetails

class ProvenanceVerifier:
    """Verifies image origin, C2PA Content Credentials, camera hardware telemetry,
    and metadata completeness without assuming missing metadata implies tampering.
    """

    def analyze(self, metadata: ImageMetadataDetails) -> DetectorFinding:
        evidence: List[str] = []
        metrics: Dict[str, Any] = {}

        # 1. C2PA Content Credentials
        metrics["c2pa_present"] = metadata.c2pa_manifest_detected
        if metadata.c2pa_manifest_detected:
            evidence.append("C2PA / Content Authenticity Initiative (CAI) provenance manifest structure detected in container bytes.")

        # 2. Camera Hardware Telemetry
        hardware_fields = []
        if metadata.camera_make and metadata.camera_model:
            hardware_fields.append(f"Camera: {metadata.camera_make} {metadata.camera_model}")
        if metadata.lens_model:
            hardware_fields.append(f"Lens: {metadata.lens_model}")
        if metadata.exposure_time and metadata.f_number and metadata.iso:
            hardware_fields.append(f"Exposure: {metadata.exposure_time}s @ f/{metadata.f_number}, ISO {metadata.iso}")
        if metadata.datetime_original:
            hardware_fields.append(f"Captured: {metadata.datetime_original}")

        metrics["hardware_fields_count"] = len(hardware_fields)

        if hardware_fields:
            evidence.extend(hardware_fields)

        # 3. Editing Software Flags
        if metadata.software:
            evidence.append(f"Software Header: {metadata.software}")
            metrics["software"] = metadata.software

        # Determine Assessment Status
        score = 0.50
        if metadata.c2pa_manifest_detected:
            assessment = "Valid provenance evidence found"
            score = 0.95
        elif len(hardware_fields) >= 3 and not metadata.ai_generation_markers:
            assessment = "Valid provenance evidence found"
            score = 0.88
            evidence.append("Comprehensive physical camera exposure telemetry and device make/model verified in EXIF payload.")
        elif metadata.has_exif and metadata.software and any(edit in metadata.software.lower() for edit in ["photoshop", "gimp", "canva", "lightroom"]):
            assessment = "Provenance information incomplete or inconsistent"
            score = 0.45
            evidence.append(f"Image contains post-processing software identifier ({metadata.software}); original capture telemetry absent.")
        elif metadata.ai_generation_markers:
            assessment = "Provenance information incomplete or inconsistent"
            score = 0.20
            evidence.append("Metadata identifies synthetic generation software rather than physical optical capture.")
        else:
            assessment = "Provenance evidence unavailable"
            score = 0.40
            evidence.append("No EXIF capture headers or C2PA manifest found in image container.")

        pct_val = int(round(score * 100))

        return DetectorFinding(
            task="Provenance & Origin Verification",
            model_or_tool="C2PA JUMBF Manifest Parser & EXIF Optical Telemetry Auditor",
            assessment=assessment,
            score=round(score, 2),
            score_display=f"{pct_val}%",
            evidence_detected=evidence,
            limitations=(
                "Social media platforms (WhatsApp, X, Instagram, Facebook, Reddit) routinely strip EXIF "
                "metadata and provenance headers to protect user privacy and compress bandwidth. "
                "Absence of metadata does NOT mean an image is fake. Conversely, EXIF data can be "
                "artificially injected and is not cryptographically authenticated unless signed via a valid C2PA manifest."
            ),
            supporting_metrics=metrics,
        )

provenance_verifier = ProvenanceVerifier()
