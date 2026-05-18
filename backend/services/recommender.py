"""
Delft Communities — Semantic Recommendation Engine
==================================================

Lightweight, in-process semantic search over the ``delft_communities.json``
file. Designed to run optimally on an Apple Silicon (M2) Mac via Metal
Performance Shaders (MPS), with embedding caching for near-instant repeat
queries.

Pipeline
--------

    JSON -> normalised "search blob" -> SentenceTransformer (MiniLM) ->
        L2-normalised embeddings cached to disk -> cosine similarity ranking

Public interface
----------------

* ``load_index(file_path)`` — loads the JSON, builds (or restores) the
  semantic index, and stores it as a module-level singleton.
* ``search_communities(query, top_n=15)`` — returns the top-N community
  IDs ranked by cosine similarity to ``query``.

Both functions also work via the underlying ``CommunityIndex`` class if
you prefer not to use the singleton.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import pickle
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Union

import numpy as np
import torch


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
CACHE_SCHEMA_VERSION = 1  # bump if the blob/embedding format changes
DEFAULT_TOP_N = 15

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("recommender")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _resolve_device(preferred: Optional[str] = None) -> str:
    """Pick the best torch device available, preferring MPS on Apple Silicon."""
    if preferred:
        preferred = preferred.strip().lower()
        if preferred == "cpu":
            return "cpu"
        if preferred == "cuda" and torch.cuda.is_available():
            return "cuda"
        if preferred == "mps" and torch.backends.mps.is_available() and torch.backends.mps.is_built():
            return "mps"
        log.warning("Requested device '%s' is unavailable; falling back to auto-detection.", preferred)
    if torch.backends.mps.is_available() and torch.backends.mps.is_built():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


def _safe_str(value: Any) -> str:
    """Coerce nullable / non-string fields to a clean string."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (list, tuple)):
        return ", ".join(_safe_str(v) for v in value if v is not None)
    return str(value).strip()


def _build_search_blob(community: Dict[str, Any]) -> str:
    """Compose the text representation used for embedding a community.

    Combines ``name``, ``tags`` and ``description_full``. Null-safe: missing
    or ``None`` fields are silently skipped.
    """
    name = _safe_str(community.get("name"))
    raw_tags = community.get("tags")
    tags_list: List[str] = []
    if isinstance(raw_tags, list):
        tags_list = [_safe_str(t) for t in raw_tags if t]
    elif isinstance(raw_tags, str):
        tags_list = [_safe_str(raw_tags)]
    tags = ", ".join(t for t in tags_list if t)
    description = _safe_str(community.get("description_full"))

    # Light templated structure helps the encoder; empty parts are dropped.
    parts: List[str] = []
    if name:
        parts.append(f"Name: {name}.")
    if tags:
        parts.append(f"Tags: {tags}.")
    if description:
        parts.append(description)
    return " ".join(parts).strip()


def _hash_corpus(records: Sequence[Dict[str, Any]]) -> str:
    """Stable digest of the input records used to invalidate the embedding cache.

    We hash the (id, search_blob) pairs rather than the entire JSON so that
    irrelevant fields (e.g. ``image_url``) don't bust the cache.
    """
    h = hashlib.sha256()
    h.update(f"v{CACHE_SCHEMA_VERSION}|{MODEL_NAME}".encode("utf-8"))
    for r in records:
        rid = r.get("id")
        blob = _build_search_blob(r)
        h.update(f"\x1f{rid}\x1e{blob}".encode("utf-8"))
    return h.hexdigest()


# ---------------------------------------------------------------------------
# Index
# ---------------------------------------------------------------------------


@dataclass
class IndexPayload:
    """Serialised form persisted to the cache file."""

    schema_version: int
    model_name: str
    corpus_hash: str
    ids: List[Any]
    embeddings: np.ndarray  # shape (N, D), already L2-normalised


class CommunityIndex:
    """In-memory semantic index over a list of community dicts."""

    def __init__(self, device: Optional[str] = None) -> None:
        self.device: str = _resolve_device(device)
        self.model: Optional[Any] = None
        self.ids: List[Any] = []
        self.communities: List[Dict[str, Any]] = []
        self.embeddings: Optional[np.ndarray] = None
        self._source_path: Optional[Path] = None

    # -- Public API ---------------------------------------------------------

    def load(self, file_path: Union[str, os.PathLike]) -> "CommunityIndex":
        """Load communities from ``file_path`` and (re)build the semantic index."""
        path = Path(file_path).expanduser().resolve()
        if not path.is_file():
            raise FileNotFoundError(f"Communities file not found: {path}")

        with path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)

        if not isinstance(data, list):
            raise ValueError(
                f"Expected a JSON array of community objects, got {type(data).__name__}."
            )

        # Keep only well-formed records that have an id.
        cleaned: List[Dict[str, Any]] = []
        for record in data:
            if not isinstance(record, dict):
                continue
            if record.get("id") is None:
                continue
            cleaned.append(record)

        self._source_path = path
        self.communities = cleaned
        self.ids = [r["id"] for r in cleaned]

        if not cleaned:
            log.warning("No usable community records found in %s.", path)
            self.embeddings = np.zeros((0, 384), dtype=np.float32)
            return self

        cache_path = self._cache_path(path)
        corpus_hash = _hash_corpus(cleaned)

        cached = self._try_load_cache(cache_path, corpus_hash)
        if cached is not None:
            log.info(
                "Loaded cached embeddings (%d vectors, dim=%d) from %s",
                cached.shape[0], cached.shape[1], cache_path.name,
            )
            self.embeddings = cached
            self._ensure_model_loaded()  # query-side encoding still needs it
            return self

        log.info(
            "Building embeddings for %d communities on device=%s ...",
            len(cleaned), self.device,
        )
        self._ensure_model_loaded()
        blobs = [_build_search_blob(r) for r in cleaned]
        t0 = time.perf_counter()
        embeddings = self.model.encode(  # type: ignore[union-attr]
            blobs,
            batch_size=64,
            show_progress_bar=True,
            convert_to_numpy=True,
            normalize_embeddings=True,
            device=self.device,
        ).astype(np.float32, copy=False)
        log.info(
            "Encoded %d communities in %.2fs (%.1f docs/s).",
            len(blobs), time.perf_counter() - t0,
            len(blobs) / max(time.perf_counter() - t0, 1e-9),
        )

        self.embeddings = embeddings
        self._save_cache(cache_path, corpus_hash, embeddings)
        return self

    def search(self, query: str, top_n: int = DEFAULT_TOP_N) -> List[Any]:
        """Return the ``top_n`` community IDs most similar to ``query``."""
        if not query or not query.strip():
            raise ValueError("Query must be a non-empty string.")
        if self.embeddings is None or len(self.embeddings) == 0:
            return []
        self._ensure_model_loaded()
        assert self.model is not None

        query_vec = self.model.encode(
            [query.strip()],
            convert_to_numpy=True,
            normalize_embeddings=True,
            device=self.device,
        ).astype(np.float32, copy=False)

        # Embeddings are already L2-normalised, so cosine similarity is the dot product.
        sims = (query_vec @ self.embeddings.T)[0]

        n = min(top_n, sims.shape[0])
        # argpartition for O(N) top-K, then sort just that slice.
        partition = np.argpartition(-sims, n - 1)[:n]
        ordered = partition[np.argsort(-sims[partition])]
        return [self.ids[i] for i in ordered]

    def search_with_scores(self, query: str, top_n: int = DEFAULT_TOP_N) -> List[Dict[str, Any]]:
        """Same as :meth:`search` but returns ``[{"id", "score", "name"}, ...]``."""
        if not query or not query.strip():
            raise ValueError("Query must be a non-empty string.")
        if self.embeddings is None or len(self.embeddings) == 0:
            return []
        self._ensure_model_loaded()
        assert self.model is not None

        query_vec = self.model.encode(
            [query.strip()],
            convert_to_numpy=True,
            normalize_embeddings=True,
            device=self.device,
        ).astype(np.float32, copy=False)

        sims = (query_vec @ self.embeddings.T)[0]
        n = min(top_n, sims.shape[0])
        partition = np.argpartition(-sims, n - 1)[:n]
        ordered = partition[np.argsort(-sims[partition])]
        return [
            {
                "id": self.ids[i],
                "score": float(sims[i]),
                "name": self.communities[i].get("name"),
            }
            for i in ordered
        ]

    # -- Internals ----------------------------------------------------------

    def _ensure_model_loaded(self) -> None:
        if self.model is None:
            log.info("Loading SentenceTransformer model: %s (device=%s)", MODEL_NAME, self.device)
            try:
                from sentence_transformers import SentenceTransformer

                self.model = SentenceTransformer(MODEL_NAME, device=self.device)
            except Exception as exc:
                if self.device != "cpu":
                    log.warning(
                        "Failed to load model on device=%s (%s); retrying on cpu.",
                        self.device,
                        exc,
                    )
                    self.device = "cpu"
                    from sentence_transformers import SentenceTransformer

                    self.model = SentenceTransformer(MODEL_NAME, device=self.device)
                else:
                    raise

    @staticmethod
    def _cache_path(source: Path) -> Path:
        return source.with_suffix(source.suffix + ".embcache.pkl")

    @staticmethod
    def _try_load_cache(cache_path: Path, corpus_hash: str) -> Optional[np.ndarray]:
        if not cache_path.is_file():
            return None
        try:
            with cache_path.open("rb") as fh:
                payload: IndexPayload = pickle.load(fh)
        except Exception as exc:
            log.warning("Failed to read embedding cache (%s); rebuilding.", exc)
            return None

        if not isinstance(payload, IndexPayload):
            log.warning("Embedding cache has unexpected type; rebuilding.")
            return None
        if payload.schema_version != CACHE_SCHEMA_VERSION:
            log.info("Embedding cache schema bumped; rebuilding.")
            return None
        if payload.model_name != MODEL_NAME:
            log.info("Embedding cache model mismatch; rebuilding.")
            return None
        if payload.corpus_hash != corpus_hash:
            log.info("Communities corpus changed; rebuilding embeddings.")
            return None
        return payload.embeddings

    def _save_cache(self, cache_path: Path, corpus_hash: str, embeddings: np.ndarray) -> None:
        payload = IndexPayload(
            schema_version=CACHE_SCHEMA_VERSION,
            model_name=MODEL_NAME,
            corpus_hash=corpus_hash,
            ids=list(self.ids),
            embeddings=embeddings,
        )
        try:
            with cache_path.open("wb") as fh:
                pickle.dump(payload, fh, protocol=pickle.HIGHEST_PROTOCOL)  # type: ignore[arg-type]
            log.info("Saved embedding cache to %s (%.1f KB).", cache_path.name, cache_path.stat().st_size / 1024)
        except Exception as exc:
            log.warning("Could not write embedding cache: %s", exc)


# ---------------------------------------------------------------------------
# Module-level singleton & functional interface
# ---------------------------------------------------------------------------


_active_index: Optional[CommunityIndex] = None


def load_index(file_path: Union[str, os.PathLike], device: Optional[str] = None) -> CommunityIndex:
    """Load the JSON file at ``file_path`` and prepare the semantic index.

    Subsequent calls to :func:`search_communities` will use this index.
    The same :class:`CommunityIndex` instance is returned for direct use.
    """
    global _active_index
    _active_index = CommunityIndex(device=device).load(file_path)
    return _active_index


def search_communities(query: str, top_n: int = DEFAULT_TOP_N) -> List[Any]:
    """Return the IDs of the top-N communities most relevant to ``query``.

    The index returned by :func:`load_index` is used implicitly. IDs are
    returned in their original type as stored in the JSON (integers in the
    current ``delft_communities.json`` schema).
    """
    if _active_index is None:
        raise RuntimeError(
            "Index not loaded. Call load_index(file_path) before searching."
        )
    return _active_index.search(query, top_n=top_n)


# ---------------------------------------------------------------------------
# CLI / example usage
# ---------------------------------------------------------------------------


def _format_scores(rows: Iterable[Dict[str, Any]]) -> str:
    lines = []
    for i, row in enumerate(rows, start=1):
        lines.append(
            f"  {i:>2}. [id={row['id']}] {row['name']}  (score={row['score']:.4f})"
        )
    return "\n".join(lines)


def _demo() -> None:
    """Tiny demo invoked when running this file directly."""
    default_db_path = Path(__file__).resolve().parents[1] / "data" / "delft_communities.json"
    db_path = os.environ.get("COMMUNITIES_DB", str(default_db_path))

    log.info("Loading semantic index from %s ...", db_path)
    index = load_index(db_path)
    log.info(
        "Index ready: %d communities, embedding dim=%d, device=%s.",
        len(index.communities),
        0 if index.embeddings is None else int(index.embeddings.shape[1]),
        index.device,
    )

    # sample_queries = [
    #     "I am a college student who loves jazz and music",
    #     "Looking for a relaxed yoga and mindfulness group for adults",
    #     "Theatre and acting workshops for beginners in Delft",
    #     "Sports club for rowing or rugby for TU Delft students",
    #     "Creative writing community in English",
    #     "I am a metalhead interested in local bands and concerts",
    # ]

    while True:
        query = input("\nEnter a search query (or 'exit' to quit): ").strip()
        if query.lower() in {"exit", "quit"}:
            print("Goodbye!")
            break
        results = index.search_with_scores(query, top_n=227)
        if not results:
            print("  (no matches)")
            continue
        print(_format_scores(results))


if __name__ == "__main__":
    _demo()
