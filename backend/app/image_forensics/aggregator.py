import time
import uuid
from typing import Dict, Any, List

from app.image_forensics.validator import image_validator
from app.image_forensics.metadata import image_metadata_analyzer
from app.image_forensics.ai_detector import ai_image_detector
from app.image_forensics.manipulation import image_manipulation_detector
from app.image_forensics.deepfake import deepfake_detector
from app.image_forensics.provenance import provenance_verifier
from app.image_forensics.reverse_search import reverse_image_search_service
from app.image_forensics.schemas import ImageAnalysisReport

# In-memory storage for analysis reports (cache of recent reports)
REPORT_CACHE: Dict[str, ImageAnalysisReport] = {}

class ImageEvidenceAggregator:
    """Coordinates the full multi-stage forensic analysis pipeline and aggregates
    individual detector signals into a cohesive, evidence-grounded report.
    """

    async def analyze_image(self, file_bytes: bytes, filename: str) -> ImageAnalysisReport:
        t0 = time.perf_counter()
        analysis_id = f"img-{uuid.uuid4().hex[:12]}"
        timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())

        # 1. Validation & Safe Decoding
        pil_image, detected_format = image_validator.validate_and_decode(file_bytes, filename)

        # 2. Metadata & Container Audit
        metadata = image_metadata_analyzer.analyze(pil_image, file_bytes, filename)

        # 3. AI-Generated Image Forensics
        ai_finding = ai_image_detector.analyze(pil_image, metadata)
        from app.config import settings
        from app.image_forensics.sightengine_service import sightengine_service
        if settings.SIGHTENGINE_API_USER and settings.SIGHTENGINE_API_SECRET:
            try:
                sight_res = await sightengine_service.detect_ai_generated(file_bytes, filename)
                if sight_res.analysis_status == "Successfully analyzed":
                    ai_finding.score = sight_res.ai_probability_raw
                    ai_finding.score_display = f"{sight_res.ai_probability}%"
                    ai_finding.assessment = sight_res.detection_result
                    ai_finding.evidence_detected.insert(0, sight_res.explanation)
                    if sight_res.generator_analysis:
                        gen_str = ", ".join([f"{k}: {v}%" for k, v in sight_res.generator_analysis.items()])
                        ai_finding.evidence_detected.append(f"Generator analysis: {gen_str}")
            except Exception as e:
                pass

        # 4. Digital Manipulation & Splicing (ELA + Block Variance)
        manip_finding, heatmap_uri = image_manipulation_detector.analyze(pil_image)

        # 5. Deepfake & Facial Boundary Seam Analysis
        deepfake_finding, face_count = deepfake_detector.analyze(pil_image)

        # 6. Provenance & C2PA Content Credentials
        provenance_finding = provenance_verifier.analyze(metadata)

        # 7. Reverse Visual Search Lookup
        reverse_finding = await reverse_image_search_service.search(file_bytes, filename)

        # 8. Synthesize Overall Verdict
        key_findings: List[str] = []
        
        if ai_finding.score and ai_finding.score >= 0.70:
            overall_verdict = "Evidence indicates AI generation"
            key_findings.append(f"AI Generator Score: {ai_finding.score_display} ({ai_finding.assessment}).")
        elif manip_finding.score and manip_finding.score >= 0.70:
            overall_verdict = "Evidence indicates digital manipulation / splicing"
            key_findings.append(f"Manipulation Score: {manip_finding.score_display} ({manip_finding.assessment}).")
        elif deepfake_finding.score and deepfake_finding.score >= 0.70:
            overall_verdict = "Possible facial manipulation detected"
            key_findings.append(f"Deepfake Analysis: {deepfake_finding.score_display} on {face_count} detected face(s).")
        elif (
            provenance_finding.score and provenance_finding.score >= 0.85
            and (ai_finding.score or 0) <= 0.35
            and (manip_finding.score or 0) <= 0.35
        ):
            overall_verdict = "Authentic optical photograph characteristics verified"
            key_findings.append("Verified physical camera exposure headers; continuous natural sensor noise profile.")
        else:
            overall_verdict = "Inconclusive or mixed forensic signals"
            key_findings.append("Available technical signals do not provide conclusive proof of AI generation or editing.")

        # Add top specific evidence from detectors
        for f in [ai_finding, manip_finding, deepfake_finding, provenance_finding]:
            for ev in f.evidence_detected[:2]:
                if ev not in key_findings:
                    key_findings.append(ev)

        disclaimer = (
            "TrustGuard AI Image Forensics evaluates mathematical frequency distributions, "
            "compression rate differentials (ELA), PRNU sensor residuals, and container metadata. "
            "No single automated algorithm can prove authenticity or artificial synthesis with 100% certainty. "
            "This report is an investigative diagnostic aid and should be evaluated alongside contextual verification."
        )

        elapsed = (time.perf_counter() - t0) * 1000

        report = ImageAnalysisReport(
            analysis_id=analysis_id,
            filename=filename,
            timestamp=timestamp_str,
            metadata=metadata,
            ai_generation_assessment=ai_finding,
            manipulation_assessment=manip_finding,
            deepfake_assessment=deepfake_finding,
            provenance_assessment=provenance_finding,
            reverse_search_assessment=reverse_finding,
            heatmap_data_uri=heatmap_uri,
            heatmap_label="Error Level Analysis (ELA @ 95% Q) Forensic Heatmap",
            faces_detected=face_count,
            overall_verdict=overall_verdict,
            key_findings=key_findings,
            disclaimer=disclaimer,
            latency_ms=round(elapsed, 1),
        )

        REPORT_CACHE[analysis_id] = report
        return report

    def get_report(self, analysis_id: str) -> ImageAnalysisReport | None:
        return REPORT_CACHE.get(analysis_id)

image_evidence_aggregator = ImageEvidenceAggregator()
