import numpy as np
from typing import List
import logging

logger = logging.getLogger(__name__)

class MiniLMEmbedder:
    """Embedder using all-MiniLM-L6-v2 via ONNX (ChromaDB) with vector fallback."""
    def __init__(self):
        self._fn = None
        try:
            import chromadb.utils.embedding_functions as ef
            self._fn = ef.DefaultEmbeddingFunction()
        except Exception as e:
            logger.warning(f"Could not load Chroma DefaultEmbeddingFunction: {e}")

    def embed_texts(self, texts: List[str]) -> np.ndarray:
        if self._fn and len(texts) > 0:
            try:
                embeddings = self._fn(texts)
                arr = np.array(embeddings, dtype=np.float32)
                # Normalize
                norms = np.linalg.norm(arr, axis=1, keepdims=True)
                norms[norms == 0] = 1e-8
                return arr / norms
            except Exception as e:
                logger.warning(f"ONNX embedding error: {e}. Using deterministic fallback.")
        
        # Fallback: bag-of-words / character n-gram embedding
        return self._fallback_embed(texts)

    def _fallback_embed(self, texts: List[str], dim: int = 384) -> np.ndarray:
        vectors = []
        for text in texts:
            words = text.lower().split()
            vec = np.zeros(dim, dtype=np.float32)
            for w in words:
                idx = hash(w) % dim
                vec[idx] += 1.0
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec /= norm
            vectors.append(vec)
        return np.array(vectors, dtype=np.float32)

embedder = MiniLMEmbedder()
