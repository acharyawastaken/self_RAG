"""Obsidian Knowledge Graph Service

Extracts Obsidian-style knowledge graphs from markdown, PDFs, and document texts:
- Detects Obsidian [[wikilinks]], tags (#tag), headings, and conceptual relationships
- Populates SQLite graph tables (graph_nodes, graph_edges) with verification state machine
- Automatically generates and syncs an actual Obsidian vault directory (data/runtime/obsidian_vault/)
  complete with .obsidian configuration so users can open the vault in Obsidian desktop.
"""
from __future__ import annotations

import json
import re
import uuid
from pathlib import Path
from typing import Dict, Any, List, Set, Tuple
from sqlalchemy.orm import Session

from backend.app.config import get_settings
from backend.app.db import SessionLocal
from backend.app.models import GraphNode, GraphEdge, Document, Chunk
from backend.app.enums import GraphVerificationStatus, NodeType, RelationType

settings = get_settings()

WIKILINK_REGEX = re.compile(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]")
TAG_REGEX = re.compile(r"(?:^|\s)#([a-zA-Z0-9_\-]+)")
HEADING_REGEX = re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE)


def parse_obsidian_markdown(text: str) -> Dict[str, Any]:
    """
    Extracts wikilinks, tags, and headings from markdown text.
    """
    wikilinks = []
    for match in WIKILINK_REGEX.finditer(text):
        target = match.group(1).strip()
        alias = match.group(2).strip() if match.group(2) else target
        if target:
            wikilinks.append({"target": target, "alias": alias})

    tags = []
    for match in TAG_REGEX.finditer(text):
        tag = match.group(1).strip()
        if tag and not tag.isdigit():
            tags.append(tag)

    headings = []
    for match in HEADING_REGEX.finditer(text):
        level = len(match.group(1))
        title = match.group(2).strip()
        headings.append({"level": level, "title": title})

    return {
        "wikilinks": wikilinks,
        "tags": list(set(tags)),
        "headings": headings,
    }


GENERIC_LABEL_REGEX = re.compile(
    r"^(page\s*\d+|section\s*\d+|part\s*\d+|chapter\s*\d+|slide\s*\d+|unit\s*\d+|\d+|full text|document content|introduction|overview|untitled)$",
    re.IGNORECASE,
)

STOP_STARTERS = {"and", "or", "the", "this", "that", "they", "we", "you", "it", "if", "when", "please", "for", "with", "from", "in", "on", "at", "by", "to"}


def is_clean_concept_label(text: str) -> bool:
    if not text:
        return False
    text = text.strip(" \t\r\n.,;:!?-–—*#•▸\"'")
    if len(text) < 3 or len(text) > 60:
        return False
    if GENERIC_LABEL_REGEX.match(text):
        return False
    words = text.split()
    if len(words) < 1 or len(words) > 7:
        return False
    if words[0].lower() in STOP_STARTERS:
        return False
    if text.endswith((".", ":", ";", "!", "?")):
        return False
    if any(char in text for char in ["http", "www.", "@", "{", "}", "\\", "/"]):
        return False
    return True


def extract_concepts_from_chunk(text: str, section_title: Optional[str] = None) -> List[str]:
    """
    Extracts high-quality semantic concept titles, project names, skills, and topics.
    Works seamlessly across Markdown, PDFs, resumes, textbooks, and notes.
    """
    candidates: List[str] = []

    # 1. Section title if not generic
    if section_title and is_clean_concept_label(section_title):
        candidates.append(section_title.strip())

    # 2. Markdown headings (# Heading, ## Subheading)
    for line in text.splitlines():
        line_s = line.strip()
        if line_s.startswith("#"):
            h = line_s.lstrip("# \t").strip()
            if is_clean_concept_label(h):
                candidates.append(h)

        # 3. Project or title pattern: 'Name — Tech · Tech' or 'Name - Subtitle'
        elif "—" in line_s or " - " in line_s:
            parts = re.split(r"\s*[—–-]\s*", line_s, maxsplit=1)
            title = parts[0].strip("▸•*# \t")
            if is_clean_concept_label(title):
                candidates.append(title)
                if len(parts) > 1:
                    sub_items = [s.strip() for s in re.split(r"[·,;|]", parts[1]) if s.strip()]
                    for item in sub_items[:3]:
                        if is_clean_concept_label(item):
                            candidates.append(item)

        # 4. Prominent section names in ALL CAPS: 'TECHNICAL SKILLS', 'EDUCATION', 'PROJECTS'
        elif line_s.isupper() and is_clean_concept_label(line_s):
            candidates.append(line_s.title())

        # 5. Bullet item with prefix topic: '▸ ML Pipeline: Built...'
        elif line_s.startswith(("▸", "•", "*", "-")):
            bullet_body = line_s.lstrip("▸•*- \t")
            if ":" in bullet_body:
                prefix = bullet_body.split(":", 1)[0].strip()
                if is_clean_concept_label(prefix):
                    candidates.append(prefix)

    # De-duplicate preserving order
    seen: Set[str] = set()
    result: List[str] = []
    for c in candidates:
        key = c.lower()
        if key not in seen:
            seen.add(key)
            result.append(c[:60])
    return result


def extract_structural_concept_graph(document_id: str, db: Session) -> int:
    """
    Extracts Obsidian-style concept nodes, containment hierarchy, and wikilink connections
    from document chunks and headings into SQLite graph_nodes and graph_edges.
    """
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        return 0

    chunks = db.query(Chunk).filter(Chunk.document_id == document_id).order_by(Chunk.chunk_index).all()
    if not chunks:
        return 0

    # 1. Document Root Note Node
    doc_node_id = f"doc_{document_id}"
    doc_node = db.query(GraphNode).filter(GraphNode.node_id == doc_node_id).first()
    if not doc_node:
        doc_node = GraphNode(
            node_id=doc_node_id,
            node_type=NodeType.DOCUMENT.value,
            label=doc.filename,
            description=f"Obsidian Note: {doc.filename}",
            source_document_id=document_id,
            verification_status=GraphVerificationStatus.UNEVALUATED.value,
        )
        db.add(doc_node)
        db.commit()

    created_count = 0
    concept_id_by_label: Dict[str, str] = {}
    prev_concept_id = None
    seen_labels: Set[str] = set()

    # For large documents (e.g. textbooks with hundreds of chunks), sample strategically
    if len(chunks) > 100:
        sampled_chunks = chunks[:25] + chunks[25::15][:60]
    else:
        sampled_chunks = chunks

    for c in sampled_chunks:
        text = c.text_content or ""
        parsed = parse_obsidian_markdown(text)

        # Extract semantic concepts
        extracted_concepts = extract_concepts_from_chunk(text, c.section_title)

        # If no explicit headings/patterns found, extract prominent title line
        if not extracted_concepts:
            for line in text.split("\n"):
                candidate = line.strip("#* \t")
                if is_clean_concept_label(candidate):
                    extracted_concepts.append(candidate)
                    break

        for clean_label in extracted_concepts:
            key = clean_label.lower()
            if key not in seen_labels:
                seen_labels.add(key)
                existing_node = db.query(GraphNode).filter(GraphNode.label.ilike(clean_label)).first()
                if existing_node:
                    concept_id = existing_node.node_id
                    if not existing_node.source_document_id:
                        existing_node.source_document_id = document_id
                else:
                    concept_id = f"concept_{uuid.uuid4().hex[:10]}"
                    new_node = GraphNode(
                        node_id=concept_id,
                        node_type=NodeType.CONCEPT.value,
                        label=clean_label,
                        description=f"Obsidian Concept note from {doc.filename}",
                        source_document_id=document_id,
                        source_chunk_id=c.chunk_id,
                        verification_status=GraphVerificationStatus.UNEVALUATED.value,
                    )
                    db.add(new_node)
                    created_count += 1

                concept_id_by_label[key] = concept_id

                # Edge: Document contains Concept
                edge_exists = db.query(GraphEdge).filter(
                    GraphEdge.source_node_id == doc_node_id,
                    GraphEdge.target_node_id == concept_id,
                ).first()
                if not edge_exists:
                    db.add(GraphEdge(
                        edge_id=f"edge_{uuid.uuid4().hex[:10]}",
                        source_node_id=doc_node_id,
                        relation_type=RelationType.CONTAINS.value,
                        target_node_id=concept_id,
                        verification_status=GraphVerificationStatus.UNEVALUATED.value,
                        origin_type="obsidian_extracted",
                    ))

                # Edge: sequential concept links
                if prev_concept_id and prev_concept_id != concept_id:
                    seq_exists = db.query(GraphEdge).filter(
                        GraphEdge.source_node_id == prev_concept_id,
                        GraphEdge.target_node_id == concept_id,
                    ).first()
                    if not seq_exists:
                        db.add(GraphEdge(
                            edge_id=f"edge_{uuid.uuid4().hex[:10]}",
                            source_node_id=prev_concept_id,
                            relation_type=RelationType.RELATED_TO.value,
                            target_node_id=concept_id,
                            verification_status=GraphVerificationStatus.UNEVALUATED.value,
                            origin_type="obsidian_extracted",
                        ))
                prev_concept_id = concept_id

        # 2. Process Wikilinks [[Target]]
        for wl in parsed["wikilinks"]:
            target_label = wl["target"][:60].strip()
            if not is_clean_concept_label(target_label):
                continue
            t_key = target_label.lower()
            if t_key not in seen_labels:
                seen_labels.add(t_key)
                existing_wl_node = db.query(GraphNode).filter(GraphNode.label.ilike(target_label)).first()
                if existing_wl_node:
                    wl_node_id = existing_wl_node.node_id
                else:
                    wl_node_id = f"concept_{uuid.uuid4().hex[:10]}"
                    db.add(GraphNode(
                        node_id=wl_node_id,
                        node_type=NodeType.CONCEPT.value,
                        label=target_label,
                        description=f"Wikilink target: [[{target_label}]]",
                        source_document_id=document_id,
                        verification_status=GraphVerificationStatus.UNEVALUATED.value,
                    ))
                    created_count += 1
                concept_id_by_label[t_key] = wl_node_id

            target_id = concept_id_by_label.get(t_key)
            if prev_concept_id and target_id and prev_concept_id != target_id:
                wl_edge_exists = db.query(GraphEdge).filter(
                    GraphEdge.source_node_id == prev_concept_id,
                    GraphEdge.target_node_id == target_id,
                ).first()
                if not wl_edge_exists:
                    db.add(GraphEdge(
                        edge_id=f"edge_{uuid.uuid4().hex[:10]}",
                        source_node_id=prev_concept_id,
                        relation_type=RelationType.EXPLAINS.value,
                        target_node_id=target_id,
                        verification_status=GraphVerificationStatus.UNEVALUATED.value,
                        origin_type="obsidian_wikilink",
                    ))

    db.commit()

    # Sync to disk as Obsidian Vault
    try:
        sync_obsidian_vault(db)
    except Exception as e:
        print(f"[Obsidian Vault] Sync notice: {e}")

    return created_count


def sync_obsidian_vault(db: Session) -> Path:
    """
    Exports the current SQLite knowledge graph as an actual Obsidian vault on disk.
    Creates .obsidian configuration so the folder can be opened directly in Obsidian desktop.
    """
    vault_dir = settings.data_dir / "obsidian_vault"
    vault_dir.mkdir(parents=True, exist_ok=True)
    obsidian_config_dir = vault_dir / ".obsidian"
    obsidian_config_dir.mkdir(exist_ok=True)

    # 1. Write Obsidian graph view settings for 3D/colored display
    graph_config = {
        "collapse-filter": False,
        "search": "",
        "showTags": True,
        "showAttachments": False,
        "hideUnresolved": False,
        "showOrphans": True,
        "colorGroups": [
            {"query": "status: verified", "color": {"a": 1, "rgb": 1095937}},       # Green #10b981
            {"query": "status: suspected_problem", "color": {"a": 1, "rgb": 15680580}}, # Red #ef4444
            {"query": "status: pending_correction", "color": {"a": 1, "rgb": 16096779}},# Yellow #f59e0b
            {"query": "status: updated_after_feedback", "color": {"a": 1, "rgb": 3900150}} # Blue #3b82f6
        ],
        "nodeSizeMultiplier": 1.2,
        "lineSizeMultiplier": 1,
        "linkDistance": 180,
    }
    (obsidian_config_dir / "graph.json").write_text(json.dumps(graph_config, indent=2), encoding="utf-8")

    # 2. Write Markdown note for each node with frontmatter and wikilinks
    nodes = db.query(GraphNode).all()
    node_map = {n.node_id: n for n in nodes}
    edges = db.query(GraphEdge).all()

    # Group outbound links by source
    outbound: Dict[str, List[Tuple[str, str]]] = {}
    for e in edges:
        tgt = node_map.get(e.target_node_id)
        if tgt:
            outbound.setdefault(e.source_node_id, []).append((tgt.label, e.relation_type))

    for node in nodes:
        safe_name = re.sub(r'[\\/*?:"<>|]', "_", node.label).strip() or node.node_id
        note_file = vault_dir / f"{safe_name}.md"

        frontmatter = [
            "---",
            f"id: \"{node.node_id}\"",
            f"type: \"{node.node_type}\"",
            f"status: \"{node.verification_status}\"",
            f"document_id: \"{node.source_document_id or ''}\"",
            "---",
            "",
            f"# {node.label}",
            "",
            node.description or f"Obsidian Knowledge Note for {node.label}.",
            "",
            "## Related Obsidian Links",
        ]

        links = outbound.get(node.node_id, [])
        if links:
            for tgt_label, rel in links:
                frontmatter.append(f"- [[{tgt_label}]] *({rel})*")
        else:
            frontmatter.append("- *No direct outbound links*")

        frontmatter.append("")
        note_file.write_text("\n".join(frontmatter), encoding="utf-8")

    return vault_dir


def process_document_with_obsidian(document_id: str, file_path: str):
    """
    Background worker that extracts the Obsidian knowledge graph and updates the vault.
    """
    db = SessionLocal()
    try:
        extract_structural_concept_graph(document_id, db)
    except Exception as e:
        print(f"[Obsidian Bridge] Error processing {document_id}: {e}")
    finally:
        db.close()


# Backward-compatibility alias
def process_document_with_graphify(document_id: str, file_path: str):
    return process_document_with_obsidian(document_id, file_path)
