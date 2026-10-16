import json
import uuid
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from backend.app.models import (
    Critique,
    Lesson,
    Feedback,
    Query,
    GraphNode,
    GraphEdge,
    FeedbackEvent,
)
from backend.app.enums import (
    CritiqueStatus,
    LessonStatus,
    GraphVerificationStatus,
    NodeType,
    RelationType,
)
from backend.app.services.vector_store import add_lesson_to_vector_store


def verify_and_promote_correction(
    critique_id: str,
    decision: str,
    verification_method: str = "human_approval",
    reviewer_note: Optional[str] = None,
    edited_correction: Optional[str] = None,
    db: Session = None,
) -> Dict[str, Any]:
    critique = db.query(Critique).filter(Critique.critique_id == critique_id).first()
    if not critique:
        raise ValueError(f"Critique {critique_id} not found")

    feedback = db.query(Feedback).filter(Feedback.feedback_id == critique.feedback_id).first()
    query = db.query(Query).filter(Query.query_id == feedback.query_id).first() if feedback else None

    # Handle Rejection
    if decision.lower() == "reject":
        critique.status = CritiqueStatus.REJECTED.value

        # Revert affected edges back using feedback events
        events = db.query(FeedbackEvent).filter(
            FeedbackEvent.critique_id == critique_id,
            FeedbackEvent.event_type == "edge_status_suspected_problem"
        ).all()

        for ev in events:
            if ev.edge_id and ev.event_payload_json:
                payload = json.loads(ev.event_payload_json)
                from_status = payload.get("from_status")
                if from_status:
                    edge = db.query(GraphEdge).filter(GraphEdge.edge_id == ev.edge_id).first()
                    if edge:
                        edge.verification_status = from_status

        reject_event = FeedbackEvent(
            event_id=str(uuid.uuid4()),
            feedback_id=critique.feedback_id,
            critique_id=critique_id,
            event_type="critique_rejected",
            event_payload_json=json.dumps({"reason": reviewer_note or "Rejected by reviewer"}),
        )
        db.add(reject_event)
        db.commit()

        return {
            "status": "rejected",
            "critique_id": critique_id,
            "message": "Critique proposal rejected; affected edge statuses restored."
        }

    # Handle Approval (or Edit + Approval)
    final_correction = (edited_correction or critique.proposed_correction or "").strip()
    if not final_correction:
        raise ValueError("Cannot verify an empty correction text")

    critique.status = CritiqueStatus.VERIFIED.value

    # Parse affected concepts
    try:
        affected_concepts = json.loads(critique.affected_concepts_json or "[]")
    except Exception:
        affected_concepts = []

    lesson_id = str(uuid.uuid4())
    lesson_title = f"Correction: {affected_concepts[0]}" if affected_concepts else f"Correction for {query.question_text[:30]}"

    lesson = Lesson(
        lesson_id=lesson_id,
        critique_id=critique.critique_id,
        title=lesson_title,
        question_pattern=query.question_text if query else "",
        error_summary=critique.explanation,
        correction_text=final_correction,
        verification_method=verification_method,
        verification_reference_json=json.dumps({"reviewer_note": reviewer_note or ""}),
        status=LessonStatus.VERIFIED.value,
        confidence_score=1.0,
    )
    db.add(lesson)

    # 1. Add to Chroma lessons collection
    add_lesson_to_vector_store(
        lesson_id=lesson_id,
        text=final_correction,
        metadata={
            "lesson_id": lesson_id,
            "title": lesson_title,
            "status": LessonStatus.VERIFIED.value,
            "verification_method": verification_method,
        }
    )

    # 2. Add Lesson node to knowledge graph
    lesson_node_id = f"lesson_{lesson_id}"
    lesson_node = GraphNode(
        node_id=lesson_node_id,
        node_type=NodeType.LESSON.value,
        label=lesson_title,
        description=final_correction,
        verification_status=GraphVerificationStatus.VERIFIED.value,
    )
    db.add(lesson_node)

    # 3. Update graph edges and link lesson node to concepts
    matched_nodes = []
    if affected_concepts:
        for c in affected_concepts:
            node = db.query(GraphNode).filter(GraphNode.label.ilike(f"%{c}%")).first()
            if node:
                matched_nodes.append(node)

    for mn in matched_nodes:
        # Create 'corrected_by' edge
        corrected_edge = GraphEdge(
            edge_id=str(uuid.uuid4()),
            source_node_id=lesson_node_id,
            relation_type=RelationType.CORRECTED_BY.value,
            target_node_id=mn.node_id,
            verification_status=GraphVerificationStatus.VERIFIED.value,
            origin_type="feedback_lesson",
            related_lesson_id=lesson_id,
        )
        db.add(corrected_edge)

        # Update edges connected to this concept
        edges = db.query(GraphEdge).filter(
            (GraphEdge.source_node_id == mn.node_id) | (GraphEdge.target_node_id == mn.node_id)
        ).all()
        for e in edges:
            if e.edge_id == corrected_edge.edge_id:
                continue
            prev_status = e.verification_status
            if prev_status == GraphVerificationStatus.VERIFIED.value:
                # Per spec: blue means a verified relationship was updated after feedback
                e.verification_status = GraphVerificationStatus.UPDATED_AFTER_FEEDBACK.value
            else:
                # Per spec: green means verified
                e.verification_status = GraphVerificationStatus.VERIFIED.value
            e.related_lesson_id = lesson_id

    # 4. Log audit event
    approve_event = FeedbackEvent(
        event_id=str(uuid.uuid4()),
        feedback_id=critique.feedback_id,
        critique_id=critique_id,
        lesson_id=lesson_id,
        event_type="lesson_verified_and_promoted",
        event_payload_json=json.dumps({
            "lesson_id": lesson_id,
            "verification_method": verification_method,
            "affected_concepts": affected_concepts,
        })
    )
    db.add(approve_event)

    db.commit()
    db.refresh(lesson)

    return {
        "status": "verified",
        "lesson_id": lesson_id,
        "title": lesson_title,
        "correction_text": final_correction,
        "message": "Lesson successfully verified and promoted to active retrieval memory."
    }
