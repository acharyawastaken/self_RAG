import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.models import Critique
from backend.app.schemas import VerificationRequest, CritiqueOut
from backend.app.services.verification import verify_and_promote_correction

router = APIRouter(tags=["corrections"])


@router.post("/corrections/{critique_id}/verify")
def verify_correction(
    critique_id: str,
    payload: VerificationRequest,
    db: Session = Depends(get_db),
):
    try:
        result = verify_and_promote_correction(
            critique_id=critique_id,
            decision=payload.decision,
            verification_method=payload.verification_method,
            reviewer_note=payload.reviewer_note,
            edited_correction=payload.edited_correction,
            db=db,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification failed: {e}")


@router.get("/critiques", response_model=List[CritiqueOut])
def list_critiques(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Critique)
    if status:
        query = query.filter(Critique.status == status)
    results = query.order_by(Critique.created_at.desc()).all()

    out = []
    for c in results:
        out.append(CritiqueOut(
            critique_id=c.critique_id,
            feedback_id=c.feedback_id,
            failure_category=c.failure_category,
            explanation=c.explanation,
            proposed_correction=c.proposed_correction,
            affected_concepts=json.loads(c.affected_concepts_json or "[]"),
            evidence_chunk_ids=json.loads(c.evidence_chunk_ids_json or "[]"),
            critic_model=c.critic_model,
            status=c.status,
            created_at=c.created_at,
        ))
    return out
