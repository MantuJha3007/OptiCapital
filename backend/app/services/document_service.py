"""Document Ingestion Service for AEGIS Company Knowledge Base.

Extracts text from PDF, DOCX, TXT, and Markdown documents,
chunks text (800 chars / 120 overlap), extracts page numbers & section headings,
and indexes for semantic RAG retrieval.
"""

import os
import uuid
import re
from datetime import datetime
from pathlib import Path
from typing import Any
import pypdf

from app.core.time import utcnow

BASE_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
POLICIES_DIR = BASE_DATA_DIR / "policies"
COMPANY_DOCS_DIR = BASE_DATA_DIR / "company_documents"

POLICIES_DIR.mkdir(parents=True, exist_ok=True)
COMPANY_DOCS_DIR.mkdir(parents=True, exist_ok=True)


class DocumentChunk:
    def __init__(
        self,
        chunk_id: str,
        document_id: str,
        filename: str,
        document_type: str,
        page: int,
        section: str,
        content: str,
        uploaded_at: str,
    ):
        self.chunk_id = chunk_id
        self.document_id = document_id
        self.filename = filename
        self.document_type = document_type
        self.page = page
        self.section = section
        self.content = content
        self.uploaded_at = uploaded_at

    def to_dict(self) -> dict[str, Any]:
        return {
            "chunk_id": self.chunk_id,
            "document_id": self.document_id,
            "filename": self.filename,
            "document_type": self.document_type,
            "page": self.page,
            "section": self.section,
            "content": self.content,
            "uploaded_at": self.uploaded_at,
        }


# Global in-memory registry of documents and indexed chunks
_DOCUMENTS_META: dict[str, dict[str, Any]] = {}
_ALL_CHUNKS: list[DocumentChunk] = []


def chunk_text(
    text: str,
    chunk_size: int = 800,
    overlap: int = 120,
    document_id: str = "",
    filename: str = "",
    document_type: str = "POLICY",
    page: int = 1,
    default_section: str = "General",
) -> list[DocumentChunk]:
    """Split text into overlapping chunks while tracking sections."""
    chunks: list[DocumentChunk] = []
    text = text.strip()
    if not text:
        return chunks

    current_section = default_section
    # Identify headings if markdown
    lines = text.split("\n")
    cleaned_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("#"):
            current_section = stripped.replace("#", "").strip()
        cleaned_lines.append(line)

    full_text = "\n".join(cleaned_lines)
    start = 0
    step = chunk_size - overlap
    chunk_idx = 0

    while start < len(full_text):
        end = min(start + chunk_size, len(full_text))
        sub = full_text[start:end].strip()
        if sub:
            c_id = f"{document_id}_{page}_{chunk_idx}"
            chunks.append(DocumentChunk(
                chunk_id=c_id,
                document_id=document_id,
                filename=filename,
                document_type=document_type,
                page=page,
                section=current_section,
                content=sub,
                uploaded_at=utcnow().isoformat(),
            ))
            chunk_idx += 1
        if end >= len(full_text):
            break
        start += step

    return chunks


def extract_text_from_pdf(pdf_bytes: bytes) -> list[tuple[int, str]]:
    """Extract (page_num, text) from PDF bytes."""
    import io
    reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
    pages_text = []
    for idx, page in enumerate(reader.pages):
        txt = page.extract_text() or ""
        pages_text.append((idx + 1, txt))
    return pages_text


def extract_text_from_docx(docx_bytes: bytes) -> str:
    """Extract text from docx bytes if python-docx is available."""
    try:
        import io
        import docx
        doc = docx.Document(io.BytesIO(docx_bytes))
        return "\n".join([p.text for p in doc.paragraphs if p.text])
    except Exception:
        return ""


def process_and_index_document(
    filename: str,
    file_bytes: bytes,
    document_type: str = "POLICY",
) -> dict[str, Any]:
    """Process uploaded document, save to disk, chunk, and update index."""
    global _ALL_CHUNKS, _DOCUMENTS_META

    doc_id = str(uuid.uuid4())[:8]
    ext = Path(filename).suffix.lower()
    save_path = COMPANY_DOCS_DIR / f"{doc_id}_{filename}"
    with open(save_path, "wb") as f:
        f.write(file_bytes)

    doc_chunks: list[DocumentChunk] = []

    if ext == ".pdf":
        pages = extract_text_from_pdf(file_bytes)
        for page_num, page_text in pages:
            # Look for section header
            first_line = page_text.strip().split("\n")[0] if page_text.strip() else f"Page {page_num}"
            sec_name = first_line[:40] if len(first_line) > 0 else f"Page {page_num}"
            chunks = chunk_text(
                page_text,
                chunk_size=800,
                overlap=120,
                document_id=doc_id,
                filename=filename,
                document_type=document_type,
                page=page_num,
                default_section=sec_name,
            )
            doc_chunks.extend(chunks)

    elif ext == ".docx":
        txt = extract_text_from_docx(file_bytes)
        chunks = chunk_text(
            txt,
            chunk_size=800,
            overlap=120,
            document_id=doc_id,
            filename=filename,
            document_type=document_type,
            page=1,
            default_section=Path(filename).stem.replace("_", " ").title(),
        )
        doc_chunks.extend(chunks)

    else:  # .txt, .md
        try:
            txt = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            txt = file_bytes.decode("latin-1", errors="ignore")

        chunks = chunk_text(
            txt,
            chunk_size=800,
            overlap=120,
            document_id=doc_id,
            filename=filename,
            document_type=document_type,
            page=1,
            default_section=Path(filename).stem.replace("_", " ").title(),
        )
        doc_chunks.extend(chunks)

    # Register document
    doc_meta = {
        "document_id": doc_id,
        "filename": filename,
        "document_type": document_type,
        "uploaded_at": utcnow().isoformat(),
        "chunk_count": len(doc_chunks),
        "file_size_kb": round(len(file_bytes) / 1024, 1),
        "file_path": str(save_path),
    }
    _DOCUMENTS_META[doc_id] = doc_meta
    _ALL_CHUNKS.extend(doc_chunks)

    return doc_meta


def get_all_indexed_documents() -> list[dict[str, Any]]:
    """Return all indexed documents metadata."""
    _init_built_in_policies()
    return list(_DOCUMENTS_META.values())


def get_all_chunks() -> list[DocumentChunk]:
    """Return all active document chunks."""
    _init_built_in_policies()
    return _ALL_CHUNKS


def delete_document(doc_id: str) -> bool:
    """Delete a document and its chunks from memory and disk."""
    global _ALL_CHUNKS, _DOCUMENTS_META
    if doc_id not in _DOCUMENTS_META:
        return False

    meta = _DOCUMENTS_META.pop(doc_id)
    try:
        if os.path.exists(meta.get("file_path", "")):
            os.remove(meta["file_path"])
    except Exception:
        pass

    _ALL_CHUNKS = [c for c in _ALL_CHUNKS if c.document_id != doc_id]
    return True


def _init_built_in_policies():
    """Load baseline markdown policy documents from policies directory if not already indexed."""
    global _DOCUMENTS_META, _ALL_CHUNKS
    if _DOCUMENTS_META:
        return

    # Seed built-in policies
    if POLICIES_DIR.exists():
        for file_path in POLICIES_DIR.glob("*.md"):
            doc_id = file_path.stem
            if doc_id in _DOCUMENTS_META:
                continue
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    text = f.read()

                title = file_path.stem.replace("_", " ").title()
                chunks = chunk_text(
                    text,
                    chunk_size=800,
                    overlap=120,
                    document_id=doc_id,
                    filename=file_path.name,
                    document_type="POLICY",
                    page=1,
                    default_section=title,
                )
                _DOCUMENTS_META[doc_id] = {
                    "document_id": doc_id,
                    "filename": file_path.name,
                    "document_type": "INTERNAL_POLICY",
                    "uploaded_at": utcnow().isoformat(),
                    "chunk_count": len(chunks),
                    "file_size_kb": round(len(text.encode("utf-8")) / 1024, 1),
                    "file_path": str(file_path),
                }
                _ALL_CHUNKS.extend(chunks)
            except Exception:
                continue
