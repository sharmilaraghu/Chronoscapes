"""
Turbopuffer search service.
Namespace: chronoscopes-v2, 384-dim vectors from sentence-transformers.
"""

from typing import Optional, Literal
from turbopuffer import Turbopuffer
from app.config import settings
from app.lib.logger import get_logger
from app.lib.types import Passage
from app.services.embeddings import embed_query

logger = get_logger("search")

_tp = Turbopuffer(
    api_key=settings.TURBOPUFFER_API_KEY,
    region=settings.TURBOPUFFER_REGION,
)
_ns = _tp.namespace(settings.TURBOPUFFER_NAMESPACE)


def warm_cache() -> None:
    """Fire-and-forget pre-flight to prime turbopuffer NVMe cache."""
    try:
        zero_vec = [0.0] * 384
        _ns.query(
            rank_by=("vector", "ANN", zero_vec),
            top_k=1,
        )
        logger.info("Cache warm-up sent", namespace=settings.TURBOPUFFER_NAMESPACE)
    except Exception as e:
        logger.warning("Cache warm-up failed", error=str(e))


def search_passages(
    query: str,
    era: Optional[str] = None,
    location: Optional[str] = None,
    year: Optional[int] = None,
    limit: int = 8,
) -> list[Passage]:
    """Run ANN search against turbopuffer, return top-k passages."""
    vector = embed_query(query)
    logger.debug("Querying turbopuffer", query=query, era=era, location=location, year=year, limit=limit)

    filters = None
    clauses = []
    if era:
        clauses.append(["era", "Eq", era])
    if year:
        clauses.append(["year", "Eq", year])
    if location:
        clauses.append(["city", "Contains", location])

    if len(clauses) == 1:
        filters = clauses[0]
    elif len(clauses) > 1:
        filters = ["And", clauses]

    results = _ns.query(
        rank_by=("vector", "ANN", vector),
        top_k=limit,
        filters=filters,
        include_attributes=[
            "text", "headline", "newspaper_name", "date",
            "city", "state", "year", "era", "latitude", "longitude", "article_id",
        ],
    )

    passages = []
    for idx, row in enumerate(results.rows or []):
        try:
            text_val = row["text"]
            headline_val = row["headline"]
            date_val = row["date"]
            city_val = row["city"]
            state_val = row["state"]
            year_val = row["year"]
            era_val = row["era"]
            dist_val = row["$dist"]
        except KeyError:
            logger.warning("Row missing expected attribute", row_id=str(row.id), idx=idx)
            continue

        passages.append(Passage(
            id=str(row.id),
            text=str(text_val),
            title=str(headline_val),
            date=str(date_val),
            location=", ".join(filter(None, [str(city_val), str(state_val)])),
            year=int(year_val or 0),
            era=str(era_val or "Gilded_Age"),
            score=float(dist_val) if dist_val is not None else float(idx),
        ))

    logger.info("Search complete", query=query, results=len(passages))
    return passages