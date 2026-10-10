import uuid
import json
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.config import get_settings
from backend.app.db import get_db
from backend.app.models import Document, Chunk
from backend.app.enums import DocumentStatus
from backend.app.schemas import DocumentOut, ChunkOut
from backend.app.services.ingestion import (
    validate_file,
    compute_sha256,
    extract_document_sections,
    chunk_sections,
    IngestionError,
)
from backend.app.services.vector_store import (
    add_chunks_to_vector_store,
    delete_chunks_by_document,
)

router = APIRouter(prefix="/documents", tags=["documents"])
settings = get_settings()


def run_obsidian_task(document_id: str, file_path: str):
    try:
        from backend.app.services.obsidian_service import process_document_with_obsidian
        process_document_with_obsidian(document_id, file_path)
    except Exception as e:
        print(f"[Obsidian] Background vault sync exception: {e}")


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read upload stream: {e}")

    try:
        file_ext = validate_file(file.filename, content)
    except IngestionError as e:
        raise HTTPException(status_code=400, detail=str(e))

    content_hash = compute_sha256(content)

    # Check for duplicate document
    existing = db.query(Document).filter(
        Document.content_hash == content_hash,
        Document.ingestion_status == DocumentStatus.INDEXED.value
    ).first()
    if existing:
        count = db.query(Chunk).filter(Chunk.document_id == existing.document_id).count()
        doc_out = DocumentOut.model_validate(existing)
        doc_out.chunks_count = count
        return doc_out

    doc_id = str(uuid.uuid4())
    safe_filename = Path(file.filename).name
    save_path = settings.uploads_dir / f"{doc_id}_{safe_filename}"
    with open(save_path, "wb") as f:
        f.write(content)

    doc_record = Document(
        document_id=doc_id,
        filename=safe_filename,
        file_type=file_ext,
        content_hash=content_hash,
        storage_path=save_path.as_posix(),
        ingestion_status=DocumentStatus.PROCESSING.value,
    )
    db.add(doc_record)
    db.commit()

    # Extract text and metadata
    try:
        sections, page_count = extract_document_sections(file_ext, content)
        doc_record.page_count = page_count

        if not sections or not any(s["text"].strip() for s in sections):
            doc_record.ingestion_status = DocumentStatus.FAILED.value
            doc_record.error_message = "No readable text content extracted from document"
            db.commit()
            raise HTTPException(status_code=422, detail=doc_record.error_message)

        # Token-aware chunking
        raw_chunks = chunk_sections(
            document_id=doc_id,
            sections=sections,
            chunk_size=settings.chunk_size_tokens,
            overlap=settings.chunk_overlap_tokens,
        )

        if not raw_chunks:
            doc_record.ingestion_status = DocumentStatus.FAILED.value
            doc_record.error_message = "Chunking yielded zero chunks"
            db.commit()
            raise HTTPException(status_code=422, detail=doc_record.error_message)

        # Insert chunks to database
        chunk_models = []
        chunk_ids = []
        chunk_texts = []
        chunk_metadatas = []

        for rc in raw_chunks:
            chunk_obj = Chunk(
                chunk_id=rc["chunk_id"],
                document_id=rc["document_id"],
                chunk_index=rc["chunk_index"],
                text_content=rc["text_content"],
                page_start=rc["page_start"],
                page_end=rc["page_end"],
                section_title=rc["section_title"],
                token_count=rc["token_count"],
                metadata_json=rc["metadata_json"],
            )
            chunk_models.append(chunk_obj)
            chunk_ids.append(rc["chunk_id"])
            chunk_texts.append(rc["text_content"])
            chunk_metadatas.append({
                "document_id": doc_id,
                "filename": safe_filename,
                "chunk_index": rc["chunk_index"],
                "section_title": rc["section_title"] or "",
                "page_start": rc["page_start"] or 0,
            })

        db.add_all(chunk_models)

        # Index in ChromaDB
        add_chunks_to_vector_store(
            chunk_ids=chunk_ids,
            texts=chunk_texts,
            metadatas=chunk_metadatas,
        )

        doc_record.ingestion_status = DocumentStatus.INDEXED.value
        doc_record.error_message = None
        db.commit()

        # Generate immediate Obsidian concept graph & wikilinks
        try:
            from backend.app.services.obsidian_service import extract_structural_concept_graph
            extract_structural_concept_graph(doc_id, db)
        except Exception as ge:
            print(f"[Document Ingestion] Obsidian graph notice: {ge}")

        # Trigger background Obsidian vault sync
        if settings.obsidian_enabled:
            background_tasks.add_task(run_obsidian_task, doc_id, save_path.as_posix())

        doc_out = DocumentOut.model_validate(doc_record)
        doc_out.chunks_count = len(chunk_models)
        return doc_out

    except HTTPException:
        raise
    except Exception as e:
        doc_record.ingestion_status = DocumentStatus.FAILED.value
        doc_record.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {e}")


@router.get("", response_model=List[DocumentOut])
def list_documents(db: Session = Depends(get_db)):
    docs = db.query(Document).order_by(Document.created_at.desc()).all()
    out = []
    for d in docs:
        c_count = db.query(Chunk).filter(Chunk.document_id == d.document_id).count()
        item = DocumentOut.model_validate(d)
        item.chunks_count = c_count
        out.append(item)
    return out


@router.get("/{document_id}", response_model=DocumentOut)
def get_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    c_count = db.query(Chunk).filter(Chunk.document_id == doc.document_id).count()
    item = DocumentOut.model_validate(doc)
    item.chunks_count = c_count
    return item


@router.get("/{document_id}/chunks", response_model=List[ChunkOut])
def get_document_chunks(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    chunks = db.query(Chunk).filter(Chunk.document_id == document_id).order_by(Chunk.chunk_index).all()
    return [ChunkOut.model_validate(c) for c in chunks]


@router.delete("/{document_id}")
def delete_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete from vector store
    delete_chunks_by_document(document_id)

    # Delete file from disk if exists
    if doc.storage_path and Path(doc.storage_path).exists():
        try:
            Path(doc.storage_path).unlink()
        except Exception:
            pass

    # SQLite cascade deletion
    db.delete(doc)
    db.commit()
    return {"deleted": True, "document_id": document_id}
