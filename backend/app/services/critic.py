import json
import uuid
from pathlib import Path
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from tenacity import retry, stop_after_attempt, wait_fixed
from sqlalchemy.orm import Session
from rapidfuzz import process, fuzz

from backend.app.config import get_settings
from backend.app.models import Feedback, Critique, GraphNode, GraphEdge, FeedbackEvent, Query, QueryEvidence, Chunk
from backend.app.enums import FailureCategory, CritiqueStatus, GraphVerificationStatus, FeedbackRating
from backend.app.services.llm import generate_completion

settings = get_settings()
CRITIC_PROMPT_FILE = Path(__file__).resolve().parents[1] / "prompts" / "critic_v1.txt"


class CriticProposal(BaseModel):
    failure_category: str = Field(default=FailureCategory.UNCLEAR.value)
    explanation: str
    proposed_correction: Optional[str] = None
    affected_concepts: List[str] = []
    evidence_chunk_ids: List[str] = []
    needs_human_review: bool = True


@retry(stop=stop_after_attempt(2), wait=wait_fixed(1), reraise=False)
def run_llm_critic(prompt: str) -> str:
    return generate_completion(
        prompt=prompt,
        model=settings.llm_model,
        temperature=0.1,
        json_mode=True
    )


def map_concepts_to_graph(
    db: Session,
    concepts: List[str],
    critique_id: str,
    feedback_id: str,
    is_negative: bool,
) -> List[str]:
    matched_node_ids = []
    all_nodes = db.query(GraphNode).all()
    if not all_nodes or not concepts:
        return []

    node_labels = {n.node_id: n.label for n in all_nodes}

    for concept in concepts:
        best_match = process.extractOne(
            concept,
            node_labels,
            scorer=fuzz.token_sort_ratio,
            score_cutoff=settings.concept_match_threshold,
        )
        if best_match:
            match_label, score, node_id = best_match
            matched_node_ids.append(node_id)

            if is_negative:
                # Mark connected edges as suspected_problem
                connected_edges = db.query(GraphEdge).filter(
                    (GraphEdge.source_node_id == node_id) | (GraphEdge.target_node_id == node_id)
                ).all()

                for edge in connected_edges:
                    if edge.verification_status != GraphVerificationStatus.SUSPECTED_PROBLEM.value:
                        prev_status = edge.verification_status
                        edge.verification_status = GraphVerificationStatus.SUSPECTED_PROBLEM.value

                        # Log feedback event
                        event = FeedbackEvent(
                            event_id=str(uuid.uuid4()),
                            feedback_id=feedback_id,
                            critique_id=critique_id,
                            edge_id=edge.edge_id,
                            event_type="edge_status_suspected_problem",
                            event_payload_json=json.dumps({
                                "from_status": prev_status,
                                "to_status": GraphVerificationStatus.SUSPECTED_PROBLEM.value,
                                "matched_concept": concept,
                                "score": score,
                            })
                        )
                        db.add(event)

    return matched_node_ids


def evaluate_feedback_with_critic(feedback_id: str, db: Session) -> Critique:
    feedback = db.query(Feedback).filter(Feedback.feedback_id == feedback_id).first()
    if not feedback:
        raise ValueError(f"Feedback with id {feedback_id} not found")

    query = db.query(Query).filter(Query.query_id == feedback.query_id).first()
    if not query:
        raise ValueError(f"Query for feedback {feedback_id} not found")

    # Load evidence chunks
    qes = db.query(QueryEvidence).filter(QueryEvidence.query_id == query.query_id).all()
    evidence_snippets = []
    for qe in qes:
        chunk = db.query(Chunk).filter(Chunk.chunk_id == qe.chunk_id).first()
        if chunk:
            evidence_snippets.append(f"[{chunk.chunk_id}]: {chunk.text_content}")

    template = CRITIC_PROMPT_FILE.read_text(encoding="utf-8")
    prompt = template.format(
        question=query.question_text,
        answer=query.answer_text or "No answer generated.",
        evidence="\n\n".join(evidence_snippets) if evidence_snippets else "No evidence retrieved.",
        rating=feedback.rating,
        comment=feedback.comment_text or "None",
        user_correction=feedback.user_correction or "None",
    )

    try:
        raw_json = run_llm_critic(prompt)
        parsed = json.loads(raw_json)
        proposal = CriticProposal(**parsed)
    except Exception as e:
        proposal = CriticProposal(
            failure_category=FailureCategory.UNCLEAR.value,
            explanation=f"Critic LLM evaluation encountered an error or invalid format: {str(e)}",
            proposed_correction=feedback.user_correction or "",
            affected_concepts=[],
            evidence_chunk_ids=[],
            needs_human_review=True,
        )

    # Validate failure category against enum
    allowed_categories = [c.value for c in FailureCategory]
    cat = proposal.failure_category
    if cat not in allowed_categories:
        cat = FailureCategory.UNCLEAR.value

    critique_id = str(uuid.uuid4())
    critique = Critique(
        critique_id=critique_id,
        feedback_id=feedback.feedback_id,
        failure_category=cat,
        explanation=proposal.explanation,
        proposed_correction=proposal.proposed_correction,
        affected_concepts_json=json.dumps(proposal.affected_concepts),
        evidence_chunk_ids_json=json.dumps(proposal.evidence_chunk_ids),
        critic_model=settings.llm_model,
        status=CritiqueStatus.PROPOSED.value,
    )
    db.add(critique)

    is_negative = feedback.rating in [
        FeedbackRating.PARTIALLY_CORRECT.value,
        FeedbackRating.MOSTLY_INCORRECT.value,
        FeedbackRating.COMPLETELY_INCORRECT.value,
    ]

    map_concepts_to_graph(
        db=db,
        concepts=proposal.affected_concepts,
        critique_id=critique_id,
        feedback_id=feedback_id,
        is_negative=is_negative,
    )

    db.commit()
    db.refresh(critique)
    return critique
