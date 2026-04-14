"""
Embed query text using sentence-transformers (all-MiniLM-L6-v2).
384-dim vectors matching turbopuffer stored vectors.
"""

from sentence_transformers import SentenceTransformer
from app.config import settings
from app.lib.logger import get_logger

logger = get_logger("embeddings")

MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"
EXPECTED_DIM = 384

_model = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        logger.info("Loading embedding model", model=MODEL_ID)
        _model = SentenceTransformer(MODEL_ID)
        logger.info("Embedding model ready", model=MODEL_ID)
    return _model


def embed_query(text: str) -> list[float]:
    """
    Embed a single query string for turbopuffer ANN search.
    Prepends BGE query prefix before encoding.
    """
    prefixed = f"{settings.EMBEDDING_QUERY_PREFIX}{text}"
    model = _get_model()
    embedding = model.encode(prefixed, normalize_embeddings=True)
    vector: list[float] = embedding.tolist()

    if len(vector) != EXPECTED_DIM:
        raise ValueError(
            f"Embedding dimension mismatch: expected {EXPECTED_DIM}, got {len(vector)}"
        )
    return vector