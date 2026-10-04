from enum import Enum


class DocumentStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    INDEXED = "indexed"
    FAILED = "failed"


class QueryStatus(str, Enum):
    RECEIVED = "received"
    RETRIEVING = "retrieving"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class FeedbackRating(str, Enum):
    CORRECT = "correct"
    MOSTLY_CORRECT = "mostly_correct"
    PARTIALLY_CORRECT = "partially_correct"
    MOSTLY_INCORRECT = "mostly_incorrect"
    COMPLETELY_INCORRECT = "completely_incorrect"


class FailureCategory(str, Enum):
    RETRIEVAL_FAILURE = "retrieval_failure"
    MISSING_EVIDENCE = "missing_evidence"
    FACTUAL_ERROR = "factual_error"
    REASONING_ERROR = "reasoning_error"
    AMBIGUOUS_QUESTION = "ambiguous_question"
    UNSUPPORTED_CLAIM = "unsupported_claim"
    UNCLEAR = "unclear"


class CritiqueStatus(str, Enum):
    PROPOSED = "proposed"
    AWAITING_VERIFICATION = "awaiting_verification"
    VERIFIED = "verified"
    REJECTED = "rejected"


class LessonStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    SUPERSEDED = "superseded"


class GraphVerificationStatus(str, Enum):
    UNEVALUATED = "unevaluated"
    SUSPECTED_PROBLEM = "suspected_problem"
    PENDING_CORRECTION = "pending_correction"
    VERIFIED = "verified"
    UPDATED_AFTER_FEEDBACK = "updated_after_feedback"


class NodeType(str, Enum):
    CONCEPT = "concept"
    DOCUMENT = "document"
    CHUNK = "chunk"
    QUESTION = "question"
    LESSON = "lesson"


class RelationType(str, Enum):
    EXPLAINS = "explains"
    DEPENDS_ON = "depends_on"
    SUPPORTS = "supports"
    CONTRADICTS = "contradicts"
    RELATED_TO = "related_to"
    CORRECTED_BY = "corrected_by"
    DERIVED_FROM = "derived_from"
    CONTAINS = "contains"
