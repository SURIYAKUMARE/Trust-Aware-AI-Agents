from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class ImageMetadataDetails(BaseModel):
    format: str
    width: int
    height: int
    aspect_ratio: str
    file_size_bytes: int
    file_size_kb: float
    has_exif: bool = False
    camera_make: Optional[str] = None
    camera_model: Optional[str] = None
    lens_model: Optional[str] = None
    software: Optional[str] = None
    datetime_original: Optional[str] = None
    exposure_time: Optional[str] = None
    f_number: Optional[float] = None
    iso: Optional[int] = None
    gps_coordinates: Optional[Dict[str, float]] = None
    ai_generation_markers: List[str] = Field(default_factory=list)
    png_text_chunks: Dict[str, str] = Field(default_factory=dict)
    c2pa_manifest_detected: bool = False

class DetectorFinding(BaseModel):
    task: str
    model_or_tool: str
    assessment: str
    score: Optional[float] = None  # 0.0 to 1.0 (or None if not analyzed)
    score_display: Optional[str] = None
    evidence_detected: List[str] = Field(default_factory=list)
    limitations: str
    supporting_metrics: Dict[str, Any] = Field(default_factory=dict)

class ImageAnalysisReport(BaseModel):
    analysis_id: str
    filename: str
    timestamp: str
    metadata: ImageMetadataDetails
    ai_generation_assessment: DetectorFinding
    manipulation_assessment: DetectorFinding
    deepfake_assessment: DetectorFinding
    provenance_assessment: DetectorFinding
    reverse_search_assessment: DetectorFinding
    heatmap_data_uri: Optional[str] = None
    heatmap_label: str = "Error Level Analysis (ELA) Heatmap"
    faces_detected: int = 0
    overall_verdict: str
    key_findings: List[str] = Field(default_factory=list)
    disclaimer: str
    latency_ms: float = 0.0

class ImageHealthResponse(BaseModel):
    status: str
    opencv_available: bool
    haar_cascade_available: bool
    scipy_available: bool
    pillow_available: bool
    max_upload_size_mb: int = 20

class AIDetectionResponse(BaseModel):
    analysis_status: str  # "Successfully analyzed" or "Unable to analyze"
    detection_result: str  # "Likely AI-generated", "Likely authentic", or "Inconclusive"
    ai_probability: float  # e.g. 92.0 (converted from type.ai_generated 0-1)
    ai_probability_raw: float  # e.g. 0.92
    explanation: str
    generator_analysis: Dict[str, float] = Field(default_factory=dict)
    filename: str
    file_size_kb: float
    format: str
    thresholds: Dict[str, float] = Field(
        default_factory=lambda: {"ai_threshold": 0.85, "authentic_threshold": 0.50}
    )
    disclaimer: str = (
        "Analysis indicates probabilistic likelihood based on generative model patterns. "
        "A high probability does not constitute absolute proof of artificial generation, "
        "nor does a low score guarantee authenticity."
    )
    latency_ms: float = 0.0
