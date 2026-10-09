import os
from typing import Dict, Any, List
import httpx
from app.image_forensics.schemas import DetectorFinding

class ReverseImageSearchService:
    """Investigates earlier public web appearances and visual duplicates via configured providers.
    Strictly forbids fabricating search links or pretending search succeeded when unconfigured.
    """

    def __init__(self):
        self.serpapi_key = os.getenv("SERPAPI_KEY", "")
        self.google_lens_key = os.getenv("GOOGLE_LENS_API_KEY", "")

    async def search(self, image_bytes: bytes, filename: str) -> DetectorFinding:
        evidence: List[str] = []
        metrics: Dict[str, Any] = {}

        if not self.serpapi_key and not self.google_lens_key:
            evidence.append("Reverse image search provider is unconfigured on the backend.")
            return DetectorFinding(
                task="Reverse Image & Web Appearance Lookup",
                model_or_tool="External Web Visual Search Indexer",
                assessment="Unavailable (Unconfigured API)",
                score=None,
                score_display="N/A",
                evidence_detected=evidence,
                limitations=(
                    "Live reverse visual search requires an active external provider key (SERPAPI_KEY or GOOGLE_LENS_API_KEY). "
                    "In adherence to TrustGuard AI strict truth standards, search results were not simulated. "
                    "Configure an API key in your backend environment to enable live web duplicate indexing."
                ),
                supporting_metrics={"provider_configured": False},
            )

        # If SerpApi key configured, run query
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    "https://serpapi.com/search",
                    params={"engine": "google_lens", "api_key": self.serpapi_key},
                    files={"image": (filename, image_bytes, "image/jpeg")}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    matches = data.get("visual_matches", [])
                    metrics["visual_matches_count"] = len(matches)
                    for m in matches[:3]:
                        title = m.get("title", "Web match")
                        link = m.get("link", "#")
                        evidence.append(f"Matching appearance on {m.get('source', 'web')}: [{title}]({link})")
                    
                    return DetectorFinding(
                        task="Reverse Image & Web Appearance Lookup",
                        model_or_tool="Google Lens via SerpApi Visual Search Index",
                        assessment="Matches found on public web" if matches else "No prior public appearances indexed",
                        score=0.90 if matches else 0.50,
                        score_display=f"{len(matches)} matches",
                        evidence_detected=evidence,
                        limitations="Indexed results depend on crawl coverage of public search indexes.",
                        supporting_metrics=metrics,
                    )
        except Exception as e:
            evidence.append(f"Search provider request encountered an error: {str(e)}")

        return DetectorFinding(
            task="Reverse Image & Web Appearance Lookup",
            model_or_tool="External Web Visual Search Indexer",
            assessment="Search operation failed",
            score=None,
            score_display="Error",
            evidence_detected=evidence,
            limitations="External search connection timed out or failed.",
            supporting_metrics=metrics,
        )

reverse_image_search_service = ReverseImageSearchService()
