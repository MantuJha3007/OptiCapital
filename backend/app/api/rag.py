"""RAG Policy & Company Knowledge Base Intelligence API."""

from typing import Any
from pydantic import BaseModel
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app.services.rag_service import query_rag
from app.services.document_service import (
    process_and_index_document,
    get_all_indexed_documents,
    delete_document,
    get_all_chunks,
)

router = APIRouter()


class RAGQueryRequest(BaseModel):
    query: str
    top_k: int = 4


@router.post("/rag/query")
@router.post("/rag/search")
def post_rag_query(payload: RAGQueryRequest) -> dict[str, Any]:
    """Retrieve policy, regulatory, and company knowledge documents matching query."""
    hits = query_rag(payload.query, top_k=payload.top_k)
    return {
        "query": payload.query,
        "count": len(hits),
        "results": hits,
    }


@router.get("/documents")
def list_documents() -> dict[str, Any]:
    """List all indexed company and policy documents with chunk statistics."""
    docs = get_all_indexed_documents()
    chunks = get_all_chunks()
    return {
        "total_documents": len(docs),
        "total_chunks": len(chunks),
        "documents": docs,
    }


@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form("COMPANY_POLICY"),
) -> dict[str, Any]:
    """Upload PDF, DOCX, TXT, or MD document into Company Knowledge Base."""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        meta = process_and_index_document(
            filename=file.filename or "uploaded_document.pdf",
            file_bytes=content,
            document_type=document_type,
        )
        return {
            "status": "SUCCESS",
            "message": f"Successfully indexed {file.filename} into {meta['chunk_count']} chunks.",
            "document": meta,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")


@router.delete("/documents/{doc_id}")
def delete_doc(doc_id: str) -> dict[str, Any]:
    """Remove a document and its chunks from the Knowledge Base."""
    success = delete_document(doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {
        "status": "DELETED",
        "document_id": doc_id,
        "message": "Document removed from Knowledge Base.",
    }
