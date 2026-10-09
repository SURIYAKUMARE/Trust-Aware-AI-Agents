"""
Real-Time Web Search Engine for TrustGuard AI.
Multi-provider architecture supporting:
- Tavily Search API
- Brave Search API
- Bing Web Search API
- Wikipedia Search & Entity Knowledge API
- DuckDuckGo Instant Answer API
- Direct Web Page Fetcher & Evidence Extractor
"""

from .engine import search_engine, SearchResult, SearchResponse

__all__ = ["search_engine", "SearchResult", "SearchResponse"]
