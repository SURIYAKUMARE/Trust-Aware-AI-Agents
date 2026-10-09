import re
import time
import urllib.parse
from typing import List, Dict, Any, Optional, Set
import httpx
from bs4 import BeautifulSoup
from pydantic import BaseModel, Field

from app.config import settings
import logging

logger = logging.getLogger("trustguard.search")

class SearchResult(BaseModel):
    title: str
    snippet: str
    url: str
    domain: str
    published_date: Optional[str] = None
    authority_score: float = 0.70
    provider: str = "web"
    is_primary_source: bool = False
    content: Optional[str] = None

class SearchResponse(BaseModel):
    query: str
    success: bool
    provider_used: str
    results: List[SearchResult] = Field(default_factory=list)
    total_results: int = 0
    independent_sources_count: int = 0
    latency_ms: float = 0.0
    error: Optional[str] = None

class RealTimeSearchEngine:
    """Production-grade multi-provider search engine.
    Retrieves verifiable live evidence from official, institutional, and open web sources.
    Strictly forbids fabricating URLs, snippets, or dates.
    """

    def __init__(self):
        self.headers = {
            "User-Agent": "TrustGuard-AI/2.0 (VerificationEngine; https://trustguard.ai)",
            "Accept": "text/html,application/json,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }

    def _extract_domain(self, url: str) -> str:
        try:
            parsed = urllib.parse.urlparse(url)
            domain = parsed.netloc.lower()
            if domain.startswith("www."):
                domain = domain[4:]
            return domain
        except Exception:
            return ""

    def _calculate_authority(self, domain: str, url: str) -> tuple[float, bool]:
        """Calculates domain authority and flags whether it qualifies as a primary institutional source."""
        d = domain.lower()
        if any(d.endswith(suffix) for suffix in [".gov", ".mil", ".gov.in", ".gov.uk", ".nic.in"]):
            return 0.98, True
        if any(d.endswith(suffix) for suffix in [".edu", ".ac.in", ".ac.uk", ".edu.au"]):
            return 0.95, True
        if any(trusted in d for trusted in ["who.int", "un.org", "nasa.gov", "nih.gov", "cdc.gov", "fide.com", "worldbank.org", "imf.org"]):
            return 0.97, True
        if any(enc in d for enc in ["wikipedia.org", "britannica.com", "scholar.google.com"]):
            return 0.92, False
        if any(news in d for news in ["reuters.com", "apnews.com", "bbc.com", "bbc.co.uk", "thehindu.com", "hindustantimes.com", "indianexpress.com", "nytimes.com", "nature.com", "sciencedirect.com"]):
            return 0.88, False
        if any(platform in d for platform in ["github.com", "python.org", "docs.oracle.com", "developer.mozilla.org"]):
            return 0.90, True
        if any(forum in d for forum in ["reddit.com", "quora.com", "medium.com", "twitter.com", "x.com", "facebook.com", "tiktok.com"]):
            return 0.35, False
        return 0.70, False

    def _count_independent_sources(self, results: List[SearchResult]) -> int:
        """Groups results by domain so multiple articles from the same domain count as ONE independent source."""
        seen_domains: Set[str] = set()
        for r in results:
            if r.domain:
                seen_domains.add(r.domain)
        return len(seen_domains)

    async def search(self, query: str, max_results: int = 5) -> SearchResponse:
        """Execute multi-provider search with automatic fallback and authority ranking."""
        t0 = time.perf_counter()
        clean_q = query.strip()
        if not clean_q:
            return SearchResponse(
                query=query,
                success=False,
                provider_used="none",
                error="Empty search query",
                latency_ms=0.0,
            )

        collected_results: List[SearchResult] = []
        providers_tried: List[str] = []

        # 1. Try Tavily API if configured
        if settings.TAVILY_API_KEY:
            providers_tried.append("tavily")
            try:
                tav_results = await self._search_tavily(clean_q, max_results)
                if tav_results:
                    collected_results.extend(tav_results)
            except Exception as e:
                logger.warning(f"Tavily search error: {e}")

        # 2. Try Brave Search API if configured
        if settings.BRAVE_API_KEY and len(collected_results) < max_results:
            providers_tried.append("brave")
            try:
                brave_results = await self._search_brave(clean_q, max_results)
                if brave_results:
                    collected_results.extend(brave_results)
            except Exception as e:
                logger.warning(f"Brave search error: {e}")

        # 3. Try Wikipedia Search & Summary API (Free, high-authority encyclopedia & entities)
        if len(collected_results) < max_results:
            providers_tried.append("wikipedia")
            try:
                wiki_results = await self._search_wikipedia(clean_q, max_results=3)
                if wiki_results:
                    collected_results.extend(wiki_results)
            except Exception as e:
                logger.warning(f"Wikipedia search error: {e}")

        # 4. Try DuckDuckGo Instant Answer API
        if len(collected_results) < max_results:
            providers_tried.append("duckduckgo_instant")
            try:
                ddg_results = await self._search_duckduckgo_instant(clean_q)
                if ddg_results:
                    collected_results.extend(ddg_results)
            except Exception as e:
                logger.warning(f"DuckDuckGo instant search error: {e}")

        # Deduplicate results by URL and title
        seen_urls = set()
        unique_results: List[SearchResult] = []
        for r in collected_results:
            normalized_url = r.url.rstrip("/")
            if normalized_url and normalized_url not in seen_urls:
                seen_urls.add(normalized_url)
                unique_results.append(r)

        # Sort by authority score descending
        unique_results.sort(key=lambda x: x.authority_score, reverse=True)
        final_results = unique_results[:max_results]

        latency = (time.perf_counter() - t0) * 1000
        provider_label = "+".join(providers_tried) if providers_tried else "none"

        if not final_results:
            return SearchResponse(
                query=query,
                success=False,
                provider_used=provider_label,
                results=[],
                total_results=0,
                independent_sources_count=0,
                latency_ms=round(latency, 1),
                error="Live search completed but no relevant authoritative evidence was retrieved.",
            )

        independent_count = self._count_independent_sources(final_results)

        return SearchResponse(
            query=query,
            success=True,
            provider_used=provider_label,
            results=final_results,
            total_results=len(final_results),
            independent_sources_count=independent_count,
            latency_ms=round(latency, 1),
        )

    async def _search_wikipedia(self, query: str, max_results: int = 3) -> List[SearchResult]:
        """Search Wikipedia API for entities, official officeholders, historical facts, and definitions."""
        results: List[SearchResult] = []
        async with httpx.AsyncClient(timeout=6.0, headers=self.headers) as client:
            search_url = (
                f"https://en.wikipedia.org/w/api.php?action=query&list=search"
                f"&srsearch={urllib.parse.quote(query)}&utf8=&format=json"
            )
            resp = await client.get(search_url)
            if resp.status_code != 200:
                return results

            data = resp.json()
            search_items = data.get("query", {}).get("search", [])

            for item in search_items[:max_results]:
                title = item.get("title", "")
                snippet_raw = item.get("snippet", "")
                # Clean html tags from snippet
                snippet = re.sub(r"<[^>]+>", "", snippet_raw).strip()
                page_url = f"https://en.wikipedia.org/wiki/{urllib.parse.quote(title.replace(' ', '_'))}"

                # Fetch rich summary extract from REST API
                summary_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(title.replace(' ', '_'))}"
                extract_text = snippet
                pub_date = None

                try:
                    s_resp = await client.get(summary_url)
                    if s_resp.status_code == 200:
                        s_data = s_resp.json()
                        extract_text = s_data.get("extract", snippet) or snippet
                        pub_date = s_data.get("timestamp", None)
                        if pub_date:
                            pub_date = pub_date[:10]  # Format as YYYY-MM-DD
                except Exception:
                    pass

                authority, is_primary = self._calculate_authority("wikipedia.org", page_url)

                results.append(SearchResult(
                    title=f"{title} (Wikipedia)",
                    snippet=extract_text[:350],
                    url=page_url,
                    domain="wikipedia.org",
                    published_date=pub_date,
                    authority_score=authority,
                    provider="wikipedia",
                    is_primary_source=is_primary,
                    content=extract_text,
                ))

        return results

    async def _search_duckduckgo_instant(self, query: str) -> List[SearchResult]:
        """Query DuckDuckGo Instant Answer API."""
        results: List[SearchResult] = []
        async with httpx.AsyncClient(timeout=5.0, headers=self.headers) as client:
            url = f"https://api.duckduckgo.com/?q={urllib.parse.quote(query)}&format=json&no_html=1"
            resp = await client.get(url)
            if resp.status_code != 200:
                return results

            data = resp.json()
            abstract = data.get("AbstractText", "")
            abstract_url = data.get("AbstractURL", "")
            source = data.get("AbstractSource", "DuckDuckGo Instant Answer")

            if abstract and abstract_url:
                domain = self._extract_domain(abstract_url)
                authority, is_primary = self._calculate_authority(domain, abstract_url)
                results.append(SearchResult(
                    title=f"{data.get('Heading', query)} ({source})",
                    snippet=abstract[:350],
                    url=abstract_url,
                    domain=domain,
                    authority_score=authority,
                    provider="duckduckgo",
                    is_primary_source=is_primary,
                    content=abstract,
                ))

            # Also inspect RelatedTopics
            for topic in data.get("RelatedTopics", [])[:2]:
                if isinstance(topic, dict) and "Text" in topic and "FirstURL" in topic:
                    t_url = topic["FirstURL"]
                    t_domain = self._extract_domain(t_url)
                    authority, is_primary = self._calculate_authority(t_domain, t_url)
                    results.append(SearchResult(
                        title=f"{topic['Text'][:50]}... ({t_domain})",
                        snippet=topic["Text"][:300],
                        url=t_url,
                        domain=t_domain,
                        authority_score=authority,
                        provider="duckduckgo",
                        is_primary_source=is_primary,
                    ))

        return results

    async def _search_tavily(self, query: str, max_results: int = 4) -> List[SearchResult]:
        results: List[SearchResult] = []
        url = "https://api.tavily.com/search"
        payload = {
            "api_key": settings.TAVILY_API_KEY,
            "query": query,
            "search_depth": "advanced",
            "include_answer": False,
            "max_results": max_results,
        }
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                return results
            data = resp.json()
            for r in data.get("results", []):
                t_url = r.get("url", "")
                domain = self._extract_domain(t_url)
                authority, is_primary = self._calculate_authority(domain, t_url)
                results.append(SearchResult(
                    title=r.get("title", ""),
                    snippet=r.get("content", "")[:350],
                    url=t_url,
                    domain=domain,
                    published_date=r.get("published_date", None),
                    authority_score=authority,
                    provider="tavily",
                    is_primary_source=is_primary,
                    content=r.get("content", ""),
                ))
        return results

    async def _search_brave(self, query: str, max_results: int = 4) -> List[SearchResult]:
        results: List[SearchResult] = []
        url = f"https://api.search.brave.com/res/v1/web/search?q={urllib.parse.quote(query)}&count={max_results}"
        headers = {
            "Accept": "application/json",
            "X-Subscription-Token": settings.BRAVE_API_KEY,
        }
        async with httpx.AsyncClient(timeout=8.0, headers=headers) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return results
            data = resp.json()
            for r in data.get("web", {}).get("results", []):
                t_url = r.get("url", "")
                domain = self._extract_domain(t_url)
                authority, is_primary = self._calculate_authority(domain, t_url)
                results.append(SearchResult(
                    title=r.get("title", ""),
                    snippet=r.get("description", "")[:350],
                    url=t_url,
                    domain=domain,
                    authority_score=authority,
                    provider="brave",
                    is_primary_source=is_primary,
                ))
        return results

    async def fetch_page_content(self, url: str, timeout_sec: float = 6.0) -> Dict[str, Any]:
        """Fetch and extract readable text content and metadata from a specific URL."""
        domain = self._extract_domain(url)
        try:
            async with httpx.AsyncClient(timeout=timeout_sec, headers=self.headers, follow_redirects=True) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    return {"success": False, "url": url, "error": f"HTTP {resp.status_code}"}

                soup = BeautifulSoup(resp.text, "html.parser")

                # Remove script and style elements
                for script in soup(["script", "style", "nav", "footer", "header", "noscript"]):
                    script.extract()

                title = soup.title.string.strip() if soup.title and soup.title.string else ""
                
                # Extract date if available
                pub_date = None
                date_meta = soup.find("meta", property=re.compile(r"published_time|date", re.I)) or soup.find("meta", attrs={"name": re.compile(r"date|pubdate", re.I)})
                if date_meta and date_meta.get("content"):
                    pub_date = date_meta["content"][:10]

                # Extract text from paragraphs
                paragraphs = [p.get_text().strip() for p in soup.find_all("p") if len(p.get_text().strip()) > 20]
                body_text = "\n\n".join(paragraphs[:15])

                authority, is_primary = self._calculate_authority(domain, url)

                return {
                    "success": True,
                    "url": url,
                    "domain": domain,
                    "title": title,
                    "published_date": pub_date,
                    "authority_score": authority,
                    "is_primary": is_primary,
                    "text": body_text[:3000],
                }
        except Exception as e:
            return {"success": False, "url": url, "error": str(e)}

search_engine = RealTimeSearchEngine()
