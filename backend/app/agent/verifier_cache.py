"""
Verification Cache for TrustGuard AI.
Deduplicates verification requests across identical claims and external AI responses
using cryptographic SHA-256 hash digests and TTL expiration.
"""

import time
import hashlib
from typing import Dict, Any, Optional
from threading import Lock
from app.token_saver.engine import token_saver_engine

class VerificationCache:
    def __init__(self, default_ttl_sec: int = 3600):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._lock = Lock()
        self.default_ttl = default_ttl_sec

    @staticmethod
    def generate_hash(prefix: str, content: str) -> str:
        """Computes deterministic SHA-256 hash of normalized content."""
        normalized = content.strip().lower()
        digest = hashlib.sha256(f"{prefix}:{normalized}".encode("utf-8")).hexdigest()
        return f"{prefix}_{digest[:16]}"

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._cache.get(key)
            if not entry:
                token_saver_engine.cache_misses += 1
                return None
            
            # Check expiration
            if time.time() > entry["expires_at"]:
                del self._cache[key]
                token_saver_engine.cache_misses += 1
                return None
            
            token_saver_engine.cache_hits += 1
            return entry["value"]

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        duration = ttl if ttl is not None else self.default_ttl
        with self._lock:
            self._cache[key] = {
                "value": value,
                "expires_at": time.time() + duration,
                "created_at": time.time(),
            }

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

    def size(self) -> int:
        with self._lock:
            now = time.time()
            return sum(1 for e in self._cache.values() if e["expires_at"] > now)

# Singleton cache
verifier_cache = VerificationCache()
