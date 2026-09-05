"""Tests for Document Service and RAG Vector Retrieval."""

import pytest
from app.services.document_service import (
    chunk_text,
    process_and_index_document,
    get_all_indexed_documents,
    get_all_chunks,
    delete_document,
)
from app.services.rag_service import query_rag, get_policy_evidence_for_risk_state


def test_chunk_text():
    sample_text = (
        "# Risk Limits\n"
        "The equity portfolio shall not exceed 50% under stressed conditions.\n"
        "Cash floor is maintained at 5% at all times to prevent forced fire sales."
    )
    chunks = chunk_text(
        sample_text,
        chunk_size=100,
        overlap=20,
        document_id="doc_1",
        filename="policy.txt",
    )
    assert len(chunks) >= 1
    assert chunks[0].document_id == "doc_1"
    assert "Risk Limits" in chunks[0].section or "General" in chunks[0].section


def test_process_and_query_document():
    doc_content = b"Investment Policy Statement: Maximum single asset limit is 25 percent. Cash floor is 5 percent."
    meta = process_and_index_document(
        filename="test_policy.txt",
        file_bytes=doc_content,
        document_type="POLICY",
    )
    assert meta["document_id"] is not None
    assert meta["chunk_count"] >= 1

    # Query RAG
    results = query_rag("single asset limit cash floor", top_k=2)
    assert len(results) >= 1
    assert "relevance_score" in results[0]
    assert results[0]["relevance_score"] >= 0

    # Clean up test document
    delete_document(meta["document_id"])
