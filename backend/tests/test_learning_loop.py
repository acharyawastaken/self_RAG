import json
import uuid
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.llm import set_mock_llm_response, clear_mock_llm_response
from backend.app.db import SessionLocal
from backend.app.models import Lesson, GraphNode, GraphEdge
from backend.app.enums import GraphVerificationStatus

client = TestClient(app)


@pytest.fixture(autouse=True)
def cleanup():
    yield
    clear_mock_llm_response()


def test_complete_learning_loop():
    uid = uuid.uuid4().hex[:6]
    # 1. Setup mock LLM responses
    def mock_llm(prompt: str, json_mode: bool = False):
        if json_mode:
            return json.dumps({
                "failure_category": "missing_evidence",
                "explanation": "Answer omitted the path cost term g(n) in A* evaluation.",
                "proposed_correction": "In A* search, the evaluation function is f(n) = g(n) + h(n), where g(n) is the exact path cost.",
                "affected_concepts": [f"A* {uid}", "path cost"],
                "evidence_chunk_ids": [],
                "needs_human_review": True
            })
        return f"A* {uid} search evaluates nodes using the evaluation function f(n) = g(n) + h(n) [C1]."

    set_mock_llm_response(mock_llm)

    # 2. Upload sample markdown document
    doc_content = f"# A Star Search\nA* {uid} search combines path cost g(n) and heuristic estimate h(n).".encode()
    upload_resp = client.post(
        "/documents",
        files={"file": (f"a_star_notes_{uid}.md", doc_content, "text/markdown")}
    )
    assert upload_resp.status_code == 201
    doc_data = upload_resp.json()
    doc_id = doc_data["document_id"]
    assert doc_data["ingestion_status"] == "indexed"

    # Pre-populate graph concept nodes to verify edge updates
    db = SessionLocal()
    node1 = GraphNode(
        node_id=f"concept_astar_{uid}",
        node_type="concept",
        label=f"A* {uid}",
        verification_status=GraphVerificationStatus.UNEVALUATED.value
    )
    node2 = GraphNode(
        node_id=f"concept_pathcost_{uid}",
        node_type="concept",
        label=f"path cost {uid}",
        verification_status=GraphVerificationStatus.UNEVALUATED.value
    )
    edge1 = GraphEdge(
        edge_id=f"edge_astar_cost_{uid}",
        source_node_id=node1.node_id,
        relation_type="depends_on",
        target_node_id=node2.node_id,
        verification_status=GraphVerificationStatus.UNEVALUATED.value,
        origin_type="obsidian_extracted"
    )
    db.add_all([node1, node2, edge1])
    db.commit()
    db.close()

    # 3. Ask question
    query_resp = client.post("/queries", json={"question": f"What is the formula for A* {uid} search?"})
    assert query_resp.status_code == 201
    query_data = query_resp.json()
    q_id = query_data["query_id"]
    assert f"A* {uid}" in query_data["answer_text"]

    # 4. Submit negative feedback
    feedback_resp = client.post(
        f"/queries/{q_id}/feedback",
        json={
            "rating": "mostly_incorrect",
            "comment_text": "You omitted path cost g(n)",
            "user_correction": f"A* {uid} requires f(n) = g(n) + h(n)"
        }
    )
    assert feedback_resp.status_code == 201
    fb_data = feedback_resp.json()
    fb_id = fb_data["feedback_id"]

    # 5. Run Critic
    critique_resp = client.post(f"/feedback/{fb_id}/critique")
    assert critique_resp.status_code == 200
    critique_data = critique_resp.json()
    c_id = critique_data["critique_id"]
    assert critique_data["status"] == "proposed"
    assert critique_data["failure_category"] == "missing_evidence"

    # Verify that unverified proposals are NOT in active retrieval memory
    lessons_resp = client.get("/lessons?status=verified")
    assert not any(l["critique_id"] == c_id for l in lessons_resp.json())

    # 6. Verify correction (Approval step)
    verify_resp = client.post(
        f"/corrections/{c_id}/verify",
        json={
            "decision": "approve",
            "verification_method": "human_approval",
            "reviewer_note": "Accurate formula verified against textbook."
        }
    )
    assert verify_resp.status_code == 200
    assert verify_resp.json()["status"] == "verified"
    lesson_id = verify_resp.json()["lesson_id"]

    # 7. Check that verified lesson now exists in lessons search
    verified_lessons = client.get("/lessons?status=verified").json()
    assert any(l["lesson_id"] == lesson_id for l in verified_lessons)

    # 8. Check that graph status updated to verified (green)
    graph_resp = client.get("/graph").json()
    edges = graph_resp["edges"]
    assert any(e["status"] in ["verified", "updated_after_feedback"] for e in edges)

    # 9. Ask a related query to confirm lesson is retrieved
    followup_resp = client.post(
        "/queries",
        json={"question": f"Explain A* {uid} search evaluation and g(n)"}
    )
    assert followup_resp.status_code == 201
    assert len(followup_resp.json()["lessons_used"]) >= 1


def test_rejection_restores_edge_status():
    uid = uuid.uuid4().hex[:6]
    def mock_llm_bfs(prompt: str, json_mode: bool = False):
        if json_mode:
            return json.dumps({
                "failure_category": "factual_error",
                "explanation": "Testing rejection",
                "proposed_correction": "Incorrect claim",
                "affected_concepts": [f"BFS {uid}"],
                "evidence_chunk_ids": [],
                "needs_human_review": True
            })
        return f"BFS {uid} explores nodes level by level using a queue."

    set_mock_llm_response(mock_llm_bfs)

    db = SessionLocal()
    node = GraphNode(
        node_id=f"concept_bfs_{uid}",
        node_type="concept",
        label=f"BFS {uid}",
        verification_status=GraphVerificationStatus.UNEVALUATED.value
    )
    node_tgt = GraphNode(
        node_id=f"concept_queue_{uid}",
        node_type="concept",
        label=f"FIFO queue {uid}",
        verification_status=GraphVerificationStatus.UNEVALUATED.value
    )
    edge = GraphEdge(
        edge_id=f"edge_bfs_queue_{uid}",
        source_node_id=node.node_id,
        relation_type="depends_on",
        target_node_id=node_tgt.node_id,
        verification_status=GraphVerificationStatus.UNEVALUATED.value,
        origin_type="obsidian_extracted"
    )
    edge_id = edge.edge_id
    db.add_all([node, node_tgt, edge])
    db.commit()
    db.close()

    # Create query, feedback, and critique
    q_resp = client.post("/queries", json={"question": f"What does BFS {uid} use?"})
    assert q_resp.status_code == 201
    q_id = q_resp.json()["query_id"]

    fb_resp = client.post(
        f"/queries/{q_id}/feedback",
        json={"rating": "completely_incorrect", "user_correction": "BFS uses LIFO stack"}
    )
    assert fb_resp.status_code == 201
    fb_id = fb_resp.json()["feedback_id"]

    c_resp = client.post(f"/feedback/{fb_id}/critique")
    assert c_resp.status_code == 200
    c_id = c_resp.json()["critique_id"]

    # Reject the critique proposal
    rej_resp = client.post(
        f"/corrections/{c_id}/verify",
        json={"decision": "reject", "reviewer_note": "Incorrect user feedback; BFS uses FIFO, not LIFO."}
    )
    assert rej_resp.status_code == 200
    assert rej_resp.json()["status"] == "rejected"

    # Verify edge status restored to unevaluated (grey)
    edge_detail = client.get(f"/graph/edges/{edge_id}").json()
    assert edge_detail["edge"]["status"] == GraphVerificationStatus.UNEVALUATED.value
