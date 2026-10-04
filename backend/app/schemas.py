from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


# --- Document Schemas ---
class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    document_id: str
    filename: str
    file_type: str
    content_hash: str
    ingestion_status: str
    page_count: Optional[int] = None
    chunks_count: Optional[int] = 0
    created_at: datetime
    updated_at: datetime
    error_message: Optional[str] = None


class ChunkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    chunk_id: str
    document_id: str
    chunk_index: int
    text_content: str
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    section_title: Optional[str] = None
    token_count: Optional[int] = None
    created_at: datetime


# --- Query Schemas ---
class QueryCreate(BaseModel):
    question: str = Field(..., min_length=1)
    document_id: Optional[str] = None
    top_k: Optional[int] = None


class EvidenceOut(BaseModel):
    chunk_id: str
    document_id: str
    filename: Optional[str] = None
    page_start: Optional[int] = None
    section_title: Optional[str] = None
    text_content: str
    similarity_score: float
    rank_position: int
    evidence_role: str


class LessonEvidenceOut(BaseModel):
    lesson_id: str
    title: str
    correction_text: str
    similarity_score: float


class QueryOut(BaseModel):
    query_id: str
    question_text: str
    answer_text: Optional[str] = None
    model_name: Optional[str] = None
    prompt_version: Optional[str] = None
    status: str
    is_insufficient_evidence: bool = False
    evidence: List[EvidenceOut] = []
    lessons_used: List[LessonEvidenceOut] = []
    created_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None


# --- Feedback Schemas ---
class FeedbackCreate(BaseModel):
    rating: str  # correct, mostly_correct, partially_correct, mostly_incorrect, completely_incorrect
    rating_score: Optional[float] = None
    comment_text: Optional[str] = None
    user_correction: Optional[str] = None


class FeedbackOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    feedback_id: str
    query_id: str
    rating: str
    rating_score: Optional[float] = None
    comment_text: Optional[str] = None
    user_correction: Optional[str] = None
    created_at: datetime


# --- Critique Schemas ---
class CritiqueOut(BaseModel):
    critique_id: str
    feedback_id: str
    failure_category: str
    explanation: str
    proposed_correction: Optional[str] = None
    affected_concepts: List[str] = []
    evidence_chunk_ids: List[str] = []
    critic_model: Optional[str] = None
    status: str
    created_at: datetime


class VerificationRequest(BaseModel):
    decision: str  # approve, reject, edit
    verification_method: str = "human_approval"
    reviewer_note: Optional[str] = None
    edited_correction: Optional[str] = None


class LessonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    lesson_id: str
    critique_id: Optional[str] = None
    title: str
    question_pattern: Optional[str] = None
    error_summary: str
    correction_text: str
    verification_method: str
    status: str
    confidence_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime


# --- Graph Schemas ---
class GraphNodeOut(BaseModel):
    id: str
    label: str
    type: str
    description: Optional[str] = None
    status: str
    document_id: Optional[str] = None
    chunk_id: Optional[str] = None


class GraphEdgeOut(BaseModel):
    id: str
    source: str
    target: str
    relation: str
    status: str
    origin_type: str
    confidence_score: Optional[float] = None
    evidence: Optional[Dict[str, Any]] = None


class GraphOut(BaseModel):
    nodes: List[GraphNodeOut]
    edges: List[GraphEdgeOut]


# --- Evaluation Schemas ---
class EvaluationRunOut(BaseModel):
    evaluation_id: str
    dataset_version: str
    model_name: Optional[str] = None
    embedding_model: Optional[str] = None
    prompt_version: Optional[str] = None
    retrieval_config: Optional[Dict[str, Any]] = None
    metrics: Dict[str, Any]
    started_at: datetime
    completed_at: Optional[datetime] = None
    status: str
    notes: Optional[str] = None
