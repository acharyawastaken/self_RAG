import uuid
import json
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.config import get_settings
from backend.app.db import get_db
from backend.app.models import Query, QueryEvidence, Chunk
from backend.app.enums import QueryStatus
from backend.app.schemas import (
    QueryCreate,
    QueryOut,
    EvidenceOut,
    LessonEvidenceOut,
)
from backend.app.services.retrieval import retrieve_evidence_and_lessons
from backend.app.services.llm import generate_completion, LLMServiceError

router = APIRouter(prefix="/queries", tags=["queries"])
settings = get_settings()

PROMPT_FILE = Path(__file__).resolve().parents[1] / "prompts" / "answer_v1.txt"


def build_answer_prompt(
    question: str,
    chunks: List[dict],
    lessons: List[dict]
) -> str:
    template = PROMPT_FILE.read_text(encoding="utf-8")

    if chunks:
        c_lines = []
        for c in chunks:
            c_lines.append(
                f"{c['citation_key']} [Doc: {c['filename']}, Section: {c['section_title']}, Page: {c['page_start']}]:\n{c['text_content']}"
            )
        evidence_block = "\n\n".join(c_lines)
    else:
        evidence_block = "No relevant source chunks found in indexed documents."

    if lessons:
        l_lines = []
        for l in lessons:
            l_lines.append(f"{l['citation_key']} [Lesson Title: {l['title']}]:\n{l['correction_text']}")
        lessons_block = "\n\n".join(l_lines)
    else:
        lessons_block = "No relevant verified feedback lessons found."

    return template.format(
        evidence_block=evidence_block,
        lessons_block=lessons_block,
        question=question
    )


@router.post("", response_model=QueryOut, status_code=status.HTTP_201_CREATED)
def ask_question(
    payload: QueryCreate,
    db: Session = Depends(get_db),
):
    query_id = str(uuid.uuid4())
    q_text = payload.question.strip()
    if not q_text:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    query_record = Query(
        query_id=query_id,
        question_text=q_text,
        status=QueryStatus.RECEIVED.value,
        model_name=settings.llm_model,
        prompt_version=settings.answer_prompt_version,
        retrieval_config_json=json.dumps({
            "top_k": payload.top_k or settings.top_k,
            "document_id": payload.document_id,
            "embedding_model": settings.embedding_model,
        }),
    )
    db.add(query_record)
    db.commit()

    try:
        # Step 6: Retrieve Evidence
        query_record.status = QueryStatus.RETRIEVING.value
        db.commit()

        retrieval_result = retrieve_evidence_and_lessons(
            question=q_text,
            document_id=payload.document_id,
            top_k=payload.top_k or settings.top_k,
        )

        chunks = retrieval_result["chunks"]
        lessons = retrieval_result["lessons"]

        # Step 7: Generate Answer
        query_record.status = QueryStatus.GENERATING.value
        db.commit()

        prompt = build_answer_prompt(q_text, chunks, lessons)

        # Call LLM
        answer = generate_completion(
            prompt=prompt,
            model=settings.llm_model,
            temperature=settings.llm_temperature,
        )

        is_insufficient = (
            "INSUFFICIENT_EVIDENCE" in answer or
            retrieval_result.get("has_weak_evidence", False)
        )

        # Step 8: Store Evidence & Answer
        for c in chunks:
            qe = QueryEvidence(
                query_id=query_id,
                chunk_id=c["chunk_id"],
                rank_position=c["rank_position"],
                similarity_score=c["similarity_score"],
                evidence_role=c["evidence_role"],
            )
            db.add(qe)

        query_record.answer_text = answer
        query_record.status = QueryStatus.COMPLETED.value
        query_record.completed_at = datetime.now(timezone.utc)
        db.commit()

        evidence_out = [
            EvidenceOut(
                chunk_id=c["chunk_id"],
                document_id=c["document_id"],
                filename=c["filename"],
                page_start=c["page_start"],
                section_title=c["section_title"],
                text_content=c["text_content"],
                similarity_score=c["similarity_score"],
                rank_position=c["rank_position"],
                evidence_role=c["evidence_role"],
            ) for c in chunks
        ]

        lessons_out = [
            LessonEvidenceOut(
                lesson_id=l["lesson_id"],
                title=l["title"],
                correction_text=l["correction_text"],
                similarity_score=l["similarity_score"],
            ) for l in lessons
        ]

        return QueryOut(
            query_id=query_id,
            question_text=q_text,
            answer_text=answer,
            model_name=settings.llm_model,
            prompt_version=settings.answer_prompt_version,
            status=QueryStatus.COMPLETED.value,
            is_insufficient_evidence=is_insufficient,
            evidence=evidence_out,
            lessons_used=lessons_out,
            created_at=query_record.created_at,
            completed_at=query_record.completed_at,
        )

    except LLMServiceError as e:
        query_record.status = QueryStatus.FAILED.value
        query_record.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        query_record.status = QueryStatus.FAILED.value
        query_record.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@router.get("/{query_id}", response_model=QueryOut)
def get_query(query_id: str, db: Session = Depends(get_db)):
    q = db.query(Query).filter(Query.query_id == query_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Query not found")

    qes = db.query(QueryEvidence).filter(QueryEvidence.query_id == query_id).order_by(QueryEvidence.rank_position).all()
    evidence_out = []
    for qe in qes:
        chunk = db.query(Chunk).filter(Chunk.chunk_id == qe.chunk_id).first()
        doc_filename = chunk.document.filename if (chunk and chunk.document) else ""
        evidence_out.append(EvidenceOut(
            chunk_id=qe.chunk_id,
            document_id=chunk.document_id if chunk else "",
            filename=doc_filename,
            page_start=chunk.page_start if chunk else None,
            section_title=chunk.section_title if chunk else None,
            text_content=chunk.text_content if chunk else "",
            similarity_score=qe.similarity_score or 0.0,
            rank_position=qe.rank_position,
            evidence_role=qe.evidence_role,
        ))

    is_insufficient = False
    if q.answer_text and "INSUFFICIENT_EVIDENCE" in q.answer_text:
        is_insufficient = True

    return QueryOut(
        query_id=q.query_id,
        question_text=q.question_text,
        answer_text=q.answer_text,
        model_name=q.model_name,
        prompt_version=q.prompt_version,
        status=q.status,
        is_insufficient_evidence=is_insufficient,
        evidence=evidence_out,
        lessons_used=[],
        created_at=q.created_at,
        completed_at=q.completed_at,
        error_message=q.error_message,
    )


@router.get("", response_model=List[QueryOut])
def list_queries(limit: int = 20, db: Session = Depends(get_db)):
    queries = db.query(Query).order_by(Query.created_at.desc()).limit(limit).all()
    out = []
    for q in queries:
        out.append(QueryOut(
            query_id=q.query_id,
            question_text=q.question_text,
            answer_text=q.answer_text,
            model_name=q.model_name,
            prompt_version=q.prompt_version,
            status=q.status,
            evidence=[],
            lessons_used=[],
            created_at=q.created_at,
            completed_at=q.completed_at,
            error_message=q.error_message,
        ))
    return out
