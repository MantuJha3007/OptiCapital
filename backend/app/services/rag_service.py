"""RAG Intelligence Layer for AEGIS.

Indexes all company documents (PDFs, policies, guidelines) and retrieves
verifiable fiduciary evidence to ground AI risk explanations.

Strict Invariant:
Numerical truth comes from Python/NumPy/CVXPY.
Knowledge truth comes from verified RAG documents.
Language comes from LLM.
"""

import re
from typing import Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.services.document_service import get_all_chunks, DocumentChunk


def query_rag(query: str, top_k: int = 4) -> list[dict[str, Any]]:
    """Retrieve top-K evidence chunks using TF-IDF cosine similarity search."""
    chunks = get_all_chunks()
    if not chunks:
        return []

    # Filter out empty chunks
    valid_chunks = [c for c in chunks if c.content.strip()]
    if not valid_chunks:
        return []

    corpus = [f"{c.filename} {c.section} {c.content}" for c in valid_chunks]

    try:
        vectorizer = TfidfVectorizer(stop_words="english", max_features=5000)
        tfidf_matrix = vectorizer.fit_transform(corpus)
        query_vec = vectorizer.transform([query])
        similarities = cosine_similarity(query_vec, tfidf_matrix).flatten()

        ranked_indices = similarities.argsort()[::-1]

        results = []
        for idx in ranked_indices:
            score = float(similarities[idx])
            if score < 0.05 and len(results) >= 1:
                break
            chunk = valid_chunks[idx]
            results.append({
                "document": chunk.filename,
                "document_id": chunk.document_id,
                "document_type": chunk.document_type,
                "page": chunk.page,
                "section": chunk.section,
                "relevance_score": round(score, 3),
                "content": chunk.content,
            })
            if len(results) >= top_k:
                break

        return results

    except Exception:
        # Graceful token overlap fallback
        query_words = set(re.findall(r"\w+", query.lower()))
        scored = []
        for c in valid_chunks:
            c_words = set(re.findall(r"\w+", (c.section + " " + c.content).lower()))
            overlap = len(query_words.intersection(c_words))
            if overlap > 0:
                score = overlap / (len(query_words) + 1e-4)
                scored.append((score, c))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [
            {
                "document": c.filename,
                "document_id": c.document_id,
                "document_type": c.document_type,
                "page": c.page,
                "section": c.section,
                "relevance_score": round(s, 3),
                "content": c.content,
            }
            for s, c in scored[:top_k]
        ]


def get_policy_evidence_for_risk_state(
    risk_score: float,
    operating_envelope: str,
    primary_driver: str = "Equity",
) -> list[dict[str, Any]]:
    """Automatically retrieve governing policy evidence for the active risk envelope."""
    query = (
        f"{operating_envelope} operating envelope policy mandate cash floor "
        f"equity limit {primary_driver} correlation risk breach rebalancing"
    )
    return query_rag(query, top_k=3)
