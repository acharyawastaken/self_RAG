from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.models import GraphNode, GraphEdge
from backend.app.schemas import GraphNodeOut, GraphEdgeOut, GraphOut


def get_cytoscape_graph(
    db: Session,
    document_id: Optional[str] = None,
    status: Optional[str] = None,
    concept: Optional[str] = None,
    limit: int = 150,
) -> GraphOut:
    if document_id:
        doc_node_id = f"doc_{document_id}"
        # 1. Base nodes directly tagged with document_id or matching doc_node_id
        doc_nodes = db.query(GraphNode).filter(
            or_(
                GraphNode.node_id == doc_node_id,
                GraphNode.source_document_id == document_id,
            )
        ).all()
        node_map = {n.node_id: n for n in doc_nodes}

        # 2. Find all edges connected directly to the doc node (e.g. CONTAINS edges)
        direct_edges = db.query(GraphEdge).filter(
            or_(
                GraphEdge.source_node_id == doc_node_id,
                GraphEdge.target_node_id == doc_node_id,
            )
        ).all()

        neighbor_ids = set()
        for e in direct_edges:
            neighbor_ids.add(e.source_node_id)
            neighbor_ids.add(e.target_node_id)
        neighbor_ids.discard(doc_node_id)

        if neighbor_ids:
            neighbor_nodes = db.query(GraphNode).filter(GraphNode.node_id.in_(neighbor_ids)).all()
            for n in neighbor_nodes:
                node_map[n.node_id] = n

        all_node_ids = set(node_map.keys())

        # 3. Find edges between any of the document's nodes
        edge_query = db.query(GraphEdge)
        if all_node_ids:
            edge_query = edge_query.filter(
                GraphEdge.source_node_id.in_(all_node_ids) | GraphEdge.target_node_id.in_(all_node_ids)
            )
        if status:
            edge_query = edge_query.filter(GraphEdge.verification_status == status)

        edges = edge_query.limit(limit * 2).all()

        # Ensure all edge endpoints exist in node_map
        missing_ids = set()
        for e in edges:
            if e.source_node_id not in node_map:
                missing_ids.add(e.source_node_id)
            if e.target_node_id not in node_map:
                missing_ids.add(e.target_node_id)

        if missing_ids:
            extra_nodes = db.query(GraphNode).filter(GraphNode.node_id.in_(missing_ids)).all()
            for n in extra_nodes:
                node_map[n.node_id] = n

        nodes = list(node_map.values())
    else:
        node_query = db.query(GraphNode)
        if concept:
            node_query = node_query.filter(GraphNode.label.ilike(f"%{concept}%"))

        nodes = node_query.limit(limit).all()
        node_ids = {n.node_id for n in nodes}

        edge_query = db.query(GraphEdge)
        if node_ids:
            edge_query = edge_query.filter(
                GraphEdge.source_node_id.in_(node_ids) | GraphEdge.target_node_id.in_(node_ids)
            )
        if status:
            edge_query = edge_query.filter(GraphEdge.verification_status == status)

        edges = edge_query.limit(limit * 2).all()

        # Ensure edge endpoints are in the node list so Cytoscape does not throw missing endpoint error
        missing_node_ids = set()
        for e in edges:
            if e.source_node_id not in node_ids:
                missing_node_ids.add(e.source_node_id)
            if e.target_node_id not in node_ids:
                missing_node_ids.add(e.target_node_id)

        if missing_node_ids:
            extra_nodes = db.query(GraphNode).filter(GraphNode.node_id.in_(missing_node_ids)).all()
            nodes.extend(extra_nodes)

    node_out = [
        GraphNodeOut(
            id=n.node_id,
            label=n.label,
            type=n.node_type,
            description=n.description,
            status=n.verification_status,
            document_id=n.source_document_id,
            chunk_id=n.source_chunk_id,
        ) for n in nodes
    ]

    edge_out = [
        GraphEdgeOut(
            id=e.edge_id,
            source=e.source_node_id,
            target=e.target_node_id,
            relation=e.relation_type,
            status=e.verification_status,
            origin_type=e.origin_type,
            confidence_score=e.confidence_score,
        ) for e in edges
    ]

    return GraphOut(nodes=node_out, edges=edge_out)
