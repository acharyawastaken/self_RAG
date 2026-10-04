from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    DateTime,
    ForeignKey,
    Index,
    Text,
)
from sqlalchemy.orm import relationship
from backend.app.db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Document(Base):
    __tablename__ = "documents"

    document_id = Column(String, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    content_hash = Column(String, nullable=False, index=True)
    storage_path = Column(String, nullable=True)
    ingestion_status = Column(String, nullable=False, index=True)
    page_count = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)
    error_message = Column(Text, nullable=True)

    chunks = relationship("Chunk", back_populates="document", cascade="all, delete-orphan")


class Chunk(Base):
    __tablename__ = "chunks"

    chunk_id = Column(String, primary_key=True, index=True)
    document_id = Column(String, ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    text_content = Column(Text, nullable=False)
    page_start = Column(Integer, nullable=True)
    page_end = Column(Integer, nullable=True)
    section_title = Column(String, nullable=True)
    token_count = Column(Integer, nullable=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    document = relationship("Document", back_populates="chunks")

    __table_args__ = (
        Index("idx_chunks_doc_index", "document_id", "chunk_index"),
    )


class Query(Base):
    __tablename__ = "queries"

    query_id = Column(String, primary_key=True, index=True)
    question_text = Column(Text, nullable=False)
    answer_text = Column(Text, nullable=True)
    model_name = Column(String, nullable=True)
    prompt_version = Column(String, nullable=True)
    retrieval_config_json = Column(Text, nullable=True)
    status = Column(String, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)

    evidence = relationship("QueryEvidence", back_populates="query", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="query", cascade="all, delete-orphan")


class QueryEvidence(Base):
    __tablename__ = "query_evidence"

    query_id = Column(String, ForeignKey("queries.query_id", ondelete="CASCADE"), primary_key=True)
    chunk_id = Column(String, ForeignKey("chunks.chunk_id", ondelete="CASCADE"), primary_key=True)
    rank_position = Column(Integer, nullable=False)
    similarity_score = Column(Float, nullable=True)
    evidence_role = Column(String, nullable=False)

    query = relationship("Query", back_populates="evidence")
    chunk = relationship("Chunk")


class Feedback(Base):
    __tablename__ = "feedback"

    feedback_id = Column(String, primary_key=True, index=True)
    query_id = Column(String, ForeignKey("queries.query_id", ondelete="CASCADE"), nullable=False)
    rating = Column(String, nullable=False)
    rating_score = Column(Float, nullable=True)
    comment_text = Column(Text, nullable=True)
    user_correction = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    query = relationship("Query", back_populates="feedbacks")
    critiques = relationship("Critique", back_populates="feedback", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_feedback_query_created", "query_id", "created_at"),
    )


class Critique(Base):
    __tablename__ = "critiques"

    critique_id = Column(String, primary_key=True, index=True)
    feedback_id = Column(String, ForeignKey("feedback.feedback_id", ondelete="CASCADE"), nullable=False)
    failure_category = Column(String, nullable=False)
    explanation = Column(Text, nullable=False)
    proposed_correction = Column(Text, nullable=True)
    affected_concepts_json = Column(Text, nullable=True)
    evidence_chunk_ids_json = Column(Text, nullable=True)
    critic_model = Column(String, nullable=True)
    status = Column(String, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    feedback = relationship("Feedback", back_populates="critiques")
    lessons = relationship("Lesson", back_populates="critique")

    __table_args__ = (
        Index("idx_critiques_status_cat", "status", "failure_category"),
    )


class Lesson(Base):
    __tablename__ = "lessons"

    lesson_id = Column(String, primary_key=True, index=True)
    critique_id = Column(String, ForeignKey("critiques.critique_id", ondelete="SET NULL"), nullable=True)
    title = Column(String, nullable=False)
    question_pattern = Column(String, nullable=True)
    error_summary = Column(Text, nullable=False)
    correction_text = Column(Text, nullable=False)
    verification_method = Column(String, nullable=False)
    verification_reference_json = Column(Text, nullable=True)
    status = Column(String, nullable=False)
    confidence_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    critique = relationship("Critique", back_populates="lessons")

    __table_args__ = (
        Index("idx_lessons_status_updated", "status", "updated_at"),
    )


class GraphNode(Base):
    __tablename__ = "graph_nodes"

    node_id = Column(String, primary_key=True, index=True)
    node_type = Column(String, nullable=False)
    label = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    source_document_id = Column(String, ForeignKey("documents.document_id", ondelete="SET NULL"), nullable=True)
    source_chunk_id = Column(String, ForeignKey("chunks.chunk_id", ondelete="SET NULL"), nullable=True)
    verification_status = Column(String, nullable=False)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    __table_args__ = (
        Index("idx_nodes_type_label", "node_type", "label"),
    )


class GraphEdge(Base):
    __tablename__ = "graph_edges"

    edge_id = Column(String, primary_key=True, index=True)
    source_node_id = Column(String, ForeignKey("graph_nodes.node_id", ondelete="CASCADE"), nullable=False)
    relation_type = Column(String, nullable=False)
    target_node_id = Column(String, ForeignKey("graph_nodes.node_id", ondelete="CASCADE"), nullable=False)
    verification_status = Column(String, nullable=False)
    confidence_score = Column(Float, nullable=True)
    evidence_json = Column(Text, nullable=True)
    origin_type = Column(String, nullable=False)
    related_lesson_id = Column(String, ForeignKey("lessons.lesson_id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    __table_args__ = (
        Index("idx_edges_src_tgt_rel_status", "source_node_id", "target_node_id", "relation_type", "verification_status"),
    )


class FeedbackEvent(Base):
    __tablename__ = "feedback_events"

    event_id = Column(String, primary_key=True, index=True)
    feedback_id = Column(String, ForeignKey("feedback.feedback_id", ondelete="SET NULL"), nullable=True)
    critique_id = Column(String, ForeignKey("critiques.critique_id", ondelete="SET NULL"), nullable=True)
    lesson_id = Column(String, ForeignKey("lessons.lesson_id", ondelete="SET NULL"), nullable=True)
    edge_id = Column(String, ForeignKey("graph_edges.edge_id", ondelete="SET NULL"), nullable=True)
    event_type = Column(String, nullable=False)
    event_payload_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)


class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    evaluation_id = Column(String, primary_key=True, index=True)
    dataset_version = Column(String, nullable=False)
    model_name = Column(String, nullable=True)
    embedding_model = Column(String, nullable=True)
    prompt_version = Column(String, nullable=True)
    retrieval_config_json = Column(Text, nullable=True)
    metrics_json = Column(Text, nullable=False)
    started_at = Column(DateTime, default=utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String, nullable=False)
    notes = Column(Text, nullable=True)

    __table_args__ = (
        Index("idx_eval_dataset_started", "dataset_version", "started_at"),
    )
