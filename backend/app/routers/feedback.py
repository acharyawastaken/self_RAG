import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.models import Query, Feedback, Critique
from backend.app.enums import FeedbackRating
from backend.app.schemas import FeedbackCreate, FeedbackOut, CritiqueOut
from backend.app.services.critic import evaluate_feedback_with_critic

router = APIRouter(tags=["feedback"])


@router.post("/queries/{query_id}/feedback", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
def submit_feedback(
    query_id: str,
    payload: FeedbackCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    query = db.query(Query).filter(Query.query_id == query_id).first()
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")

    allowed_ratings = [r.value for r in FeedbackRating]
    if payload.rating not in allowed_ratings:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid rating '{payload.rating}'. Allowed: {', '.join(allowed_ratings)}"
        )

    feedback_id = str(uuid.uuid4())
    fb = Feedback(
        feedback_id=feedback_id,
        query_id=query_id,
        rating=payload.rating,
        rating_score=payload.rating_score,
        comment_text=payload.comment_text,
        user_correction=payload.user_correction,
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)

    return FeedbackOut.model_validate(fb)


@router.post("/feedback/{feedback_id}/critique", response_model=CritiqueOut)
def run_critique_endpoint(feedback_id: str, db: Session = Depends(get_db)):
    fb = db.query(Feedback).filter(Feedback.feedback_id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")

    try:
        critique = evaluate_feedback_with_critic(feedback_id, db)
        import json
        return CritiqueOut(
            critique_id=critique.critique_id,
            feedback_id=critique.feedback_id,
            failure_category=critique.failure_category,
            explanation=critique.explanation,
            proposed_correction=critique.proposed_correction,
            affected_concepts=json.loads(critique.affected_concepts_json or "[]"),
            evidence_chunk_ids=json.loads(critique.evidence_chunk_ids_json or "[]"),
            critic_model=critique.critic_model,
            status=critique.status,
            created_at=critique.created_at,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Critic execution failed: {e}")
