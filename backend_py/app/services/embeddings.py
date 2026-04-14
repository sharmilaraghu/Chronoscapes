"""
Embed query text using sentence-transformers (all-MiniLM-L6-v2).
384-dim vectors matching turbopuffer stored vectors.

USE_OPENROUTER=true  → OpenRouter API (httpx), ignores HF_TOKEN
USE_OPENROUTER=false → local sentence-transformers model (HF_TOKEN optional for faster downloads)
"""

import httpx
from sentence_transformers import SentenceTransformer
from app.config import settings
from app.lib.logger import get_logger

logger = get_logger("embeddings")

MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"
OPENROUTER_MODEL = "sentence-transformers/all-minilm-l6-v2"
EXPECTED_DIM = 384

_local_model = None


def _get_local_model() -> SentenceTransformer:
    global _local_model
    if _local_model is None:
        logger.info("Loading local embedding model", model=MODEL_ID)
        _local_model = SentenceTransformer(MODEL_ID)
        logger.info("Embedding model ready", model=MODEL_ID)
    return _local_model


def embed_query(text: str) -> list[float]:
    """
    Embed a single query string for turbopuffer ANN search.
    Prepends BGE query prefix before encoding.
    """
    prefixed = f"{settings.EMBEDDING_QUERY_PREFIX}{text}"

    if settings.USE_OPENROUTER and settings.OPENROUTER_API_KEY:
        return _embed_via_openrouter(prefixed)

    model = _get_local_model()
    embedding = model.encode(prefixed, normalize_embeddings=True)
    vector: list[float] = embedding.tolist()

    if len(vector) != EXPECTED_DIM:
        raise ValueError(
            f"Embedding dimension mismatch: expected {EXPECTED_DIM}, got {len(vector)}"
        )
    return vector


def _embed_via_openrouter(text: str) -> list[float]:
    """Call OpenRouter /embeddings endpoint."""
    logger.debug("Embedding via OpenRouter", text_length=len(text))
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
    data = resp.json()
    embedding = data["data"][0]["embedding"]
    if len(embedding) != EXPECTED_DIM:
        raise ValueError(
            f"OpenRouter embedding dimension mismatch: expected {EXPECTED_DIM}, got {len(embedding)}"
        )
    return embedding