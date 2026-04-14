"""
Embed query text via OpenRouter API (sentence-transformers/all-MiniLM-L6-v2).
384-dim vectors matching turbopuffer stored vectors.
"""

import httpx
from app.config import settings
from app.lib.logger import get_logger

logger = get_logger("embeddings")

OPENROUTER_MODEL = "sentence-transformers/all-minilm-l6-v2"
EXPECTED_DIM = 384


def embed_query(text: str) -> list[float]:
    """Embed a single query string for turbopuffer ANN search."""
    prefixed = f"{settings.EMBEDDING_QUERY_PREFIX}{text}"
    return _embed_via_openrouter(prefixed)


def _embed_via_openrouter(text: str) -> list[float]:
    with httpx.Client(timeout=30.0) as client:
        resp = client.post(
            "https://openrouter.ai/api/v1/embeddings",
            headers={
                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://chronoscapes.app",
                "X-OpenRouter-Title": "Chronoscapes",
            },
            json={
                "model": OPENROUTER_MODEL,
                "input": text,
                "encoding_format": "float",
            },
        )
    if not resp.is_success:
        raise RuntimeError(f"OpenRouter embedding error {resp.status_code}: {resp.text}")
    embedding: list[float] = resp.json()["data"][0]["embedding"]
    if len(embedding) != EXPECTED_DIM:
        raise ValueError(f"Embedding dimension mismatch: expected {EXPECTED_DIM}, got {len(embedding)}")
    return embedding
