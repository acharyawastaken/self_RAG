import json
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.models import EvaluationRun
from backend.app.schemas import EvaluationRunOut
from backend.app.services.evaluation import run_evaluation_suite

router = APIRouter(prefix="/evaluations", tags=["evaluations"])


class RunEvalRequest(BaseModel):
    dataset_version: str = "ai_intro_v1"
    model_name: Optional[str] = None
    notes: Optional[str] = None


@router.post("/run")
def trigger_evaluation(
    payload: RunEvalRequest,
    db: Session = Depends(get_db),
):
    try:
        result = run_evaluation_suite(
            db=db,
            dataset_version=payload.dataset_version,
            model_name=payload.model_name,
            notes=payload.notes,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation execution failed: {e}")


@router.get("", response_model=List[EvaluationRunOut])
def list_evaluations(db: Session = Depends(get_db)):
    runs = db.query(EvaluationRun).order_by(EvaluationRun.started_at.desc()).all()
    out = []
    for r in runs:
        metrics = {}
        try:
            metrics = json.loads(r.metrics_json or "{}")
        except Exception:
            pass

        ret_config = {}
        try:
            ret_config = json.loads(r.retrieval_config_json or "{}")
        except Exception:
            pass

        out.append(EvaluationRunOut(
            evaluation_id=r.evaluation_id,
            dataset_version=r.dataset_version,
            model_name=r.model_name,
            embedding_model=r.embedding_model,
            prompt_version=r.prompt_version,
            retrieval_config=ret_config,
            metrics=metrics,
            started_at=r.started_at,
            completed_at=r.completed_at,
            status=r.status,
            notes=r.notes,
        ))
    return out


@router.get("/{evaluation_id}", response_model=EvaluationRunOut)
def get_evaluation(evaluation_id: str, db: Session = Depends(get_db)):
    r = db.query(EvaluationRun).filter(EvaluationRun.evaluation_id == evaluation_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Evaluation run not found")

    metrics = {}
    try:
        metrics = json.loads(r.metrics_json or "{}")
    except Exception:
        pass

    ret_config = {}
    try:
        ret_config = json.loads(r.retrieval_config_json or "{}")
    except Exception:
        pass

    return EvaluationRunOut(
        evaluation_id=r.evaluation_id,
        dataset_version=r.dataset_version,
        model_name=r.model_name,
        embedding_model=r.embedding_model,
        prompt_version=r.prompt_version,
        retrieval_config=ret_config,
        metrics=metrics,
        started_at=r.started_at,
        completed_at=r.completed_at,
        status=r.status,
        notes=r.notes,
    )
