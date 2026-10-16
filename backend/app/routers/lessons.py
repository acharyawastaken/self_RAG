from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.models import Lesson
from backend.app.schemas import LessonOut
from backend.app.services.vector_store import query_lessons_vector_store
from backend.app.services.embeddings import embed_query

router = APIRouter(prefix="/lessons", tags=["lessons"])


@router.get("", response_model=List[LessonOut])
def list_lessons(
    status: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(Lesson)
    if status:
        q = q.filter(Lesson.status == status)
    results = q.order_by(Lesson.created_at.desc()).limit(limit).all()
    return [LessonOut.model_validate(l) for l in results]


@router.get("/search", response_model=List[LessonOut])
def search_lessons(
    q: str = Query(..., min_length=1),
    top_k: int = 5,
    db: Session = Depends(get_db),
):
    q_emb = embed_query(q)
    results = query_lessons_vector_store(
        query_embedding=q_emb,
        top_k=top_k,
        where={"status": "verified"}
    )
    lesson_ids = [r["lesson_id"] for r in results]
    if not lesson_ids:
        return []

    lessons = db.query(Lesson).filter(Lesson.lesson_id.in_(lesson_ids)).all()
    # Preserve score ordering
    id_map = {l.lesson_id: l for l in lessons}
    ordered = [id_map[lid] for lid in lesson_ids if lid in id_map]
    return [LessonOut.model_validate(l) for l in ordered]
