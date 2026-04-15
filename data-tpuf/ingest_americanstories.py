"""
Chronoscopes — Historical Data Ingestion Pipeline
==================================================
Loads AmericanStories from HuggingFace year-by-year (via tar.gz archives),
caps at 400 articles per year, chunks, embeds with bge-base-en-v1.5,
and upserts into turbopuffer namespace `chronoscapes-historical`.

Setup:
    /Users/sharmila/Week4Project/backend/data/chrono/bin/pip install huggingface_hub sentence-transformers turbopuffer tqdm

Run:
    export TURBOPUFFER_API_KEY=tpur_...
    python3 backend/data/ingest_americanstories.py

Expected output:
    ~9,600 vectors across 4 eras
    ~15–20 min on Colab T4 GPU
"""

# ── stdlib ────────────────────────────────────────────────────────────────────
import hashlib
import json
import os
import random
import re
import tarfile
from typing import Iterator

# ── third-party ───────────────────────────────────────────────────────────────
from sentence_transformers import SentenceTransformer

try:
    from huggingface_hub import hf_hub_download
    import turbopuffer as tpuf
    from tqdm import tqdm
except ImportError as exc:
    raise SystemExit(
        f"Missing dependency: {exc}\n"
        "Run: pip install huggingface_hub sentence-transformers turbopuffer tqdm"
    )

try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))
except ImportError:
    pass

# ══════════════════════════════════════════════════════════════════════════════
#  CONFIGURATION — edit this block only
# ══════════════════════════════════════════════════════════════════════════════

TURBOPUFFER_API_KEY = os.environ.get("TURBOPUFFER_API_KEY", "")
NAMESPACE           = os.environ.get("TURBOPUFFER_NAMESPACE", "chronoscapes-historical")

# Test flag — set to True to run a single-year dry run before full ingest
TEST_MODE = False
TEST_YEAR = "1890"

# 8 years chosen for maximum era contrast and richest newspaper coverage
YEARS: list[str] = (
    [TEST_YEAR] if TEST_MODE else [
        "1890", "1895",   # Gilded Age — industrialisation, Wild West, immigration waves
        "1917", "1918",   # WWI — US entry, Armistice, most sonic war coverage
        "1925", "1929",   # Jazz Age — peak jazz + stock market crash
        "1942", "1945",   # WWII — Pacific theater, V-Day celebrations
    ]
)

ERA_MAPPING: dict[str, str] = {
    "1890": "Gilded_Age", "1895": "Gilded_Age",
    "1917": "WWI",        "1918": "WWI",
    "1925": "Jazz_Age",   "1929": "Jazz_Age",
    "1942": "WWII",       "1945": "WWII",
}

# Hard cap — predictable ingestion time regardless of year size
ARTICLES_PER_YEAR = 100 if TEST_MODE else 400

RANDOM_SEED    = 42     # reproducibility — same cap sample every run
CHUNK_WORDS    = 775    # target chunk size (words)
OVERLAP_WORDS  = 175    # overlap between consecutive chunks
UPSERT_BATCH   = 200    # vectors per turbopuffer write call

# Best quality/speed sentence-transformer for English retrieval (MTEB score ~63)
# Outputs 768-dim vectors. Loaded once, reused for all years + backend queries.
EMBEDDING_MODEL = "BAAI/bge-base-en-v1.5"

# BGE models need this prefix at QUERY time only (not at ingest time)
BGE_QUERY_PREFIX = "Represent this sentence for searching relevant passages: "

# ══════════════════════════════════════════════════════════════════════════════


# ── helpers ───────────────────────────────────────────────────────────────────

def make_id(source_id: str, chunk_index: int, reservoir_idx: int) -> str:
    """Deterministic 16-char string ID — unique per article + chunk + reservoir slot."""
    payload = f"{reservoir_idx}:{chunk_index}:{source_id}"
    return hashlib.md5(payload.encode()).hexdigest()[:16]


def clean_ocr(text: str) -> str:
    """Light OCR cleanup: collapse whitespace, drop non-printable characters."""
    if not text:
        return ""
    text = re.sub(r"\s+", " ", text)            # normalise whitespace
    text = re.sub(r"[^\x20-\x7E\n]", "", text)  # drop non-ASCII control chars
    return text.strip()


def chunk_text(text: str, chunk_words: int, overlap_words: int) -> list[str]:
    """
    Split text into overlapping word-based windows.

    Returns [] for texts too short to be useful (< 40 words).
    """
    words = text.split()
    if len(words) < 40:
        return []

    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = start + chunk_words
        chunks.append(" ".join(words[start:end]))
        if end >= len(words):
            break
        start += chunk_words - overlap_words   # slide forward with overlap
    return chunks


def _extract_location(article: dict, year: str) -> str:
    """
    Extract the city/state location from an article's citation metadata.

    The page-level lccn dict contains a 'title' field holding the full
    newspaper citation string in one of two forms:
      "Newspaper Name. [volume] (City, State Terr.) YYYY-YYYY"
      "Newspaper Name. (City, State) YYYY-YYYY"

    This function extracts the "(City, State)" portion by finding the content
    between the first '(' and the last ')' in the citation string.
    """
    lccn = article.get("lccn") or {}
    citation = lccn.get("title") or ""

    if not citation or "(" not in citation:
        return ""

    # Content between first '(' and last ')'
    open_pos  = citation.index("(")
    close_pos = len(citation) - citation[::-1].index(")") - 1

    loc = citation[open_pos + 1 : close_pos]
    # Strip trailing punctuation and whitespace
    loc = re.sub(r"[);:.\s]+$", "", loc).strip()
    return loc


def _clean_title(article: dict) -> str:
    """Return clean headline/title, collapsed to a single line."""
    raw = str(article.get("headline") or article.get("title") or "")[:200]
    return re.sub(r"\s+", " ", raw).strip()


def stream_year(year: str) -> Iterator[dict]:
    """
    Streams all article sub-records from the faro_{year}.tar.gz archive.

    Each page JSON contains a 'full articles' list and page-level metadata
    (lccn, edition). This function flattens sub-articles and attaches
    page-level lccn as a dict field so _extract_location can parse it.

    Key fields per sub-article:
        article          — full OCR text
        headline         — article headline
        full_article_id  — unique article ID
        id               — fallback ID
        lccn             — page-level dict with citation title (used for location)
        edition          — page-level dict with date
    """
    repo_id = "dell-research-harvard/AmericanStories"
    archive_name = f"faro_{year}.tar.gz"

    local_path = hf_hub_download(
        repo_id=repo_id,
        filename=archive_name,
        repo_type="dataset",
        token=os.environ.get("HF_TOKEN", "") or None,
    )

    with tarfile.open(local_path, "r:gz") as tar:
        for member in tar.getmembers():
            if not member.name.endswith(".json"):
                continue
            f = tar.extractfile(member)
            if f is None:
                continue

            try:
                page = json.load(f)
            except json.JSONDecodeError:
                continue

            # Attach page-level lccn dict to each sub-article
            lccn    = page.get("lccn") or {}
            edition = page.get("edition") or {}

            for sub in page.get("full articles") or []:
                if not isinstance(sub, dict):
                    continue
                # Merge page metadata so _extract_location can reach the citation
                sub["lccn"]    = lccn
                sub["edition"] = edition
                yield sub


# ── per-year processing ───────────────────────────────────────────────────────

def process_year(
    year: str,
    model: SentenceTransformer,
    article_cap: int,
) -> list[dict]:
    """
    Streams one year, caps at article_cap, chunks, embeds, and returns
    a list of turbopuffer row dicts ready for upsert.
    """
    era = ERA_MAPPING[year]
    rng = random.Random(RANDOM_SEED + int(year))
    rows: list[dict] = []

    # Reservoir-sample up to article_cap articles from the stream.
    # We use a simple keep/skip with reservoir logic so we don't need
    # to know the total article count upfront.
    reservoir: list[dict] = []
    seen = 0

    for article in stream_year(year):
        seen += 1
        if len(reservoir) < article_cap:
            reservoir.append(article)
        else:
            # Replace a random slot — uniform random sample from stream
            j = rng.randint(0, seen - 1)
            if j < article_cap:
                reservoir[j] = article

        # Stop streaming after we've seen enough to have a stable sample.
        # 5× the cap is a reasonable early-stop (sample stabilises quickly).
        if seen >= article_cap * 5:
            break

    print(f"  {year} ({era}): streamed {seen} articles, sampled {len(reservoir)}")

    # ── chunk & embed all sampled articles ────────────────────────────────────
    all_chunks:  list[str]  = []
    chunk_meta:  list[dict] = []

    for reservoir_idx, article in enumerate(reservoir):
        raw  = article.get("article") or ""
        text = clean_ocr(raw)
        if not text:
            continue

        title    = _clean_title(article)
        location = _extract_location(article, year)
        date     = str(
            article.get("edition", {}).get("date")
            or article.get("date")
            or year
        )
        src_id = str(
            article.get("full_article_id")
            or article.get("article_identifier")
            or article.get("id")
            or make_id(text, 0)
        )

        for idx, chunk in enumerate(chunk_text(text, CHUNK_WORDS, OVERLAP_WORDS)):
            all_chunks.append(chunk)
            chunk_meta.append({
                "id":          make_id(src_id, idx, reservoir_idx),
                "text":        chunk[:4000],               # truncated for storage
                "snippet":     chunk[:500],                 # ≤4096 bytes — for filtering
                "title":       title,
                "date":        date,
                "location":    location,
                "year":        int(year),
                "era":         era,
                "source":      "AmericanStories",
                "chunk_index": idx,
            })

    if not all_chunks:
        print(f"  {year}: no usable chunks found — check dataset fields")
        return []

    # Batch-embed all chunks for this year in one GPU pass
    print(f"  {year}: embedding {len(all_chunks)} chunks...")
    vectors = model.encode(
        all_chunks,
        batch_size=128,
        show_progress_bar=True,
        normalize_embeddings=True,   # cosine sim = dot product after L2 norm
    ).tolist()

    # Merge vectors into row dicts
    for meta, vector in zip(chunk_meta, vectors):
        rows.append({**meta, "vector": vector})

    return rows


# ── turbopuffer upsert ────────────────────────────────────────────────────────

def upsert_rows(ns: tpuf.Namespace, rows: list[dict], batch_size: int) -> None:
    """Upserts in batches. turbopuffer WAL handles ~1 write/sec per namespace."""
    for i in tqdm(range(0, len(rows), batch_size), desc="  upserting", unit="batch"):
        batch = rows[i : i + batch_size]
        ns.write(
            upsert_rows=batch,
            distance_metric="cosine_distance",
        )


# ── main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    if not TURBOPUFFER_API_KEY:
        raise SystemExit(
            "❌  Set TURBOPUFFER_API_KEY in your environment or .env file before running this script."
        )

    tpuf.api_key = TURBOPUFFER_API_KEY
    ns = tpuf.Namespace(NAMESPACE)
    print(f"turbopuffer namespace : {NAMESPACE}")

    print(f"\nLoading embedding model : {EMBEDDING_MODEL}")
    print("  (first run downloads ~440 MB; subsequent runs use local cache)")
    model = SentenceTransformer(EMBEDDING_MODEL)
    dim = model.get_sentence_embedding_dimension()
    print(f"  Vector dimension      : {dim}")

    print(
        f"\nProcessing {len(YEARS)} years  |  cap {ARTICLES_PER_YEAR} articles/year"
        f"  |  ~{len(YEARS) * ARTICLES_PER_YEAR * 3:,} vectors expected\n"
    )

    grand_total = 0
    era_counts: dict[str, int] = {}

    for year in YEARS:
        print(f"─── {year} {'─'*50}")
        rows = process_year(year, model, ARTICLES_PER_YEAR)
        if not rows:
            continue

        upsert_rows(ns, rows, UPSERT_BATCH)
        grand_total += len(rows)
        era = ERA_MAPPING[year]
        era_counts[era] = era_counts.get(era, 0) + len(rows)
        print(f"  ✓ {len(rows):,} vectors upserted\n")

    # ── summary ───────────────────────────────────────────────────────────────
    print("══════════════════════════════════════════════════════════════")
    print(f"✓  Ingestion complete — {grand_total:,} total vectors")
    print(f"   Namespace : {NAMESPACE}")
    for era, count in sorted(era_counts.items()):
        print(f"   {era:<12} : {count:,}")
    print("══════════════════════════════════════════════════════════════\n")

    # ── test query ────────────────────────────────────────────────────────────
    print("─── Test Query ──────────────────────────────────────────────")
    test_phrase = "street music crowds dancing at night"
    test_era    = ERA_MAPPING[YEARS[0]]

    # BGE query prefix required at search time only
    query_text  = BGE_QUERY_PREFIX + test_phrase
    query_vec   = model.encode(query_text, normalize_embeddings=True).tolist()

    results = ns.query(
        rank_by=("vector", "ANN", query_vec),
        top_k=5,
        filters=("era", "Eq", test_era),
        include_attributes=["title", "date", "location", "year", "era", "text"],
    )
    result_list = results.rows

    print(f"Query  : \"{test_phrase}\"")
    print(f"Filter : era = {test_era}")
    print(f"Top {len(result_list)} results:\n")

    for i, r in enumerate(result_list, 1):
        a = r.attributes
        print(f"  [{i}] {a.get('date')}  {a.get('location')}")
        print(f"       {(a.get('title') or '(no title)')[:80]}")
        snippet = (a.get("text") or "")[:200].replace("\n", " ")
        print(f"       \"{snippet}...\"")
        print()


if __name__ == "__main__":
    main()
