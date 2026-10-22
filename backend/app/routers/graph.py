from typing import Optional, List, Dict, Any
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import HTMLResponse, FileResponse
from sqlalchemy.orm import Session

from backend.app.config import get_settings
from backend.app.db import get_db
from backend.app.models import GraphNode, GraphEdge, FeedbackEvent, Document
from backend.app.schemas import GraphOut, GraphNodeOut, GraphEdgeOut
from backend.app.services.graph_service import get_cytoscape_graph
from backend.app.services.obsidian_service import (
    process_document_with_obsidian,
    sync_obsidian_vault,
)

router = APIRouter(prefix="/graph", tags=["graph"])
settings = get_settings()


@router.get("", response_model=GraphOut)
def fetch_graph(
    document_id: Optional[str] = None,
    status: Optional[str] = None,
    concept: Optional[str] = None,
    limit: int = 150,
    db: Session = Depends(get_db),
):
    return get_cytoscape_graph(
        db=db,
        document_id=document_id,
        status=status,
        concept=concept,
        limit=limit,
    )


@router.get("/nodes/{node_id}")
def get_node_details(node_id: str, db: Session = Depends(get_db)):
    node = db.query(GraphNode).filter(GraphNode.node_id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Graph node not found")

    incident_edges = db.query(GraphEdge).filter(
        (GraphEdge.source_node_id == node_id) | (GraphEdge.target_node_id == node_id)
    ).all()

    return {
        "node": GraphNodeOut(
            id=node.node_id,
            label=node.label,
            type=node.node_type,
            description=node.description,
            status=node.verification_status,
            document_id=node.source_document_id,
            chunk_id=node.source_chunk_id,
        ),
        "edges_count": len(incident_edges),
        "incident_edges": [
            {
                "edge_id": e.edge_id,
                "source": e.source_node_id,
                "target": e.target_node_id,
                "relation": e.relation_type,
                "status": e.verification_status,
                "origin_type": e.origin_type,
            } for e in incident_edges
        ]
    }


@router.get("/edges/{edge_id}")
def get_edge_details(edge_id: str, db: Session = Depends(get_db)):
    edge = db.query(GraphEdge).filter(GraphEdge.edge_id == edge_id).first()
    if not edge:
        raise HTTPException(status_code=404, detail="Graph edge not found")

    events = db.query(FeedbackEvent).filter(FeedbackEvent.edge_id == edge_id).order_by(FeedbackEvent.created_at.desc()).all()

    return {
        "edge": GraphEdgeOut(
            id=edge.edge_id,
            source=edge.source_node_id,
            target=edge.target_node_id,
            relation=edge.relation_type,
            status=edge.verification_status,
            origin_type=edge.origin_type,
            confidence_score=edge.confidence_score,
        ),
        "history": [
            {
                "event_id": ev.event_id,
                "event_type": ev.event_type,
                "payload": ev.event_payload_json,
                "created_at": ev.created_at,
            } for ev in events
        ]
    }


@router.get("/obsidian/vault")
def get_obsidian_vault_info(db: Session = Depends(get_db)):
    vault_path = sync_obsidian_vault(db)
    notes_count = len(list(vault_path.glob("*.md")))
    return {
        "vault_path": vault_path.as_posix(),
        "notes_count": notes_count,
        "obsidian_compatible": True,
        "message": "Vault is ready and can be opened in Obsidian Desktop via Open folder as vault."
    }


@router.post("/rebuild/{document_id}")
def rebuild_document_graph(
    document_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc.storage_path:
        raise HTTPException(status_code=400, detail="Document source file missing on disk")

    background_tasks.add_task(process_document_with_obsidian, document_id, doc.storage_path)
    return {"message": "Obsidian graph rebuild scheduled in background", "document_id": document_id}
