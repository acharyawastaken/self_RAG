from typing import Optional, Dict, Any, List
from backend.app.config import get_settings
from backend.app.services.embeddings import embed_query
from backend.app.services.vector_store import (
    query_chunks_vector_store,
    query_lessons_vector_store,
)

settings = get_settings()


def retrieve_evidence_and_lessons(
    question: str,
    document_id: Optional[str] = None,
    top_k: Optional[int] = None,
) -> Dict[str, Any]:
    k = top_k or settings.top_k
    q_embedding = embed_query(question)

    # 1. Retrieve chunks
    chunk_filter = {"document_id": document_id} if document_id else None
    raw_chunks = query_chunks_vector_store(
        query_embedding=q_embedding,
        top_k=k,
        where=chunk_filter
    )

    chunks = []
    for rank, item in enumerate(raw_chunks, start=1):
        meta = item.get("metadata", {})
        chunks.append({
            "chunk_id": item["chunk_id"],
            "document_id": meta.get("document_id", ""),
            "filename": meta.get("filename", ""),
            "page_start": meta.get("page_start"),
            "section_title": meta.get("section_title", ""),
            "text_content": item["text"],
            "similarity_score": round(item["similarity_score"], 4),
            "rank_position": rank,
            "evidence_role": "primary_chunk",
            "citation_key": f"[C{rank}]"
        })

    # 2. Retrieve verified lessons
    # Only retrieve lessons with status = verified
    raw_lessons = query_lessons_vector_store(
        query_embedding=q_embedding,
        top_k=settings.lesson_top_k,
        where={"status": "verified"}
    )

    lessons = []
    for rank, item in enumerate(raw_lessons, start=1):
        if item["similarity_score"] >= settings.min_lesson_similarity:
            meta = item.get("metadata", {})
            lessons.append({
                "lesson_id": item["lesson_id"],
                "title": meta.get("title", ""),
                "correction_text": item["text"],
                "similarity_score": round(item["similarity_score"], 4),
                "citation_key": f"[L{rank}]"
            })

    # Check evidence quality
    has_weak_evidence = (
        len(chunks) == 0 or
        (chunks and chunks[0]["similarity_score"] < settings.weak_evidence_similarity)
    )

    return {
        "chunks": chunks,
        "lessons": lessons,
        "has_weak_evidence": has_weak_evidence,
    }
