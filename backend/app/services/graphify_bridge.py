"""Deprecated Graphify bridge stub.
All knowledge graph extraction and vault synchronization now uses obsidian_service.py.
"""
from backend.app.services.obsidian_service import (
    extract_structural_concept_graph,
    process_document_with_obsidian as process_document_with_graphify,
    sync_obsidian_vault,
)

__all__ = [
    "extract_structural_concept_graph",
    "process_document_with_graphify",
    "sync_obsidian_vault",
]
