from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from backend.app.config import get_settings
from backend.app.services.embeddings import embed_texts

settings = get_settings()
settings.ensure_dirs()

_client_instance = None


def get_chroma_client() -> chromadb.ClientAPI:
    global _client_instance
    if _client_instance is None:
        _client_instance = chromadb.PersistentClient(
            path=settings.chroma_dir.as_posix(),
            settings=ChromaSettings(anonymized_telemetry=False)
        )
    return _client_instance


def get_chunks_collection():
    client = get_chroma_client()
    return client.get_or_create_collection(
        name="chunks",
        metadata={"hnsw:space": "cosine"}
    )


def get_lessons_collection():
    client = get_chroma_client()
    return client.get_or_create_collection(
        name="lessons",
        metadata={"hnsw:space": "cosine"}
    )


def add_chunks_to_vector_store(
    chunk_ids: List[str],
    texts: List[str],
    metadatas: List[Dict[str, Any]],
    embeddings: Optional[List[List[float]]] = None,
) -> None:
    if not chunk_ids:
        return
    if embeddings is None:
        embeddings = embed_texts(texts)

    collection = get_chunks_collection()
    # Upsert to prevent duplicate key errors
    collection.upsert(
        ids=chunk_ids,
        documents=texts,
        metadatas=metadatas,
        embeddings=embeddings
    )


def query_chunks_vector_store(
    query_embedding: List[float],
    top_k: int = 5,
    where: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    collection = get_chunks_collection()
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where=where,
        include=["documents", "metadatas", "distances"]
    )
    items = []
    if results and results["ids"] and results["ids"][0]:
        ids = results["ids"][0]
        docs = results["documents"][0] if results["documents"] else [""] * len(ids)
        metas = results["metadatas"][0] if results["metadatas"] else [{}] * len(ids)
        distances = results["distances"][0] if results["distances"] else [0.0] * len(ids)

        for cid, doc, meta, dist in zip(ids, docs, metas, distances):
            # Chroma cosine distance = 1 - cosine_similarity
            similarity = max(0.0, min(1.0, 1.0 - dist))
            items.append({
                "chunk_id": cid,
                "text": doc,
                "metadata": meta,
                "similarity_score": similarity
            })
    return items


def delete_chunks_by_document(document_id: str) -> None:
    collection = get_chunks_collection()
    try:
        collection.delete(where={"document_id": document_id})
    except Exception:
        pass


def add_lesson_to_vector_store(
    lesson_id: str,
    text: str,
    metadata: Dict[str, Any],
    embedding: Optional[List[float]] = None,
) -> None:
    if embedding is None:
        embedding = embed_texts([text])[0]
    collection = get_lessons_collection()
    collection.upsert(
        ids=[lesson_id],
        documents=[text],
        metadatas=[metadata],
        embeddings=[embedding]
    )


def query_lessons_vector_store(
    query_embedding: List[float],
    top_k: int = 3,
    where: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    collection = get_lessons_collection()
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where=where,
        include=["documents", "metadatas", "distances"]
    )
    items = []
    if results and results["ids"] and results["ids"][0]:
        ids = results["ids"][0]
        docs = results["documents"][0] if results["documents"] else [""] * len(ids)
        metas = results["metadatas"][0] if results["metadatas"] else [{}] * len(ids)
        distances = results["distances"][0] if results["distances"] else [0.0] * len(ids)

        for lid, doc, meta, dist in zip(ids, docs, metas, distances):
            similarity = max(0.0, min(1.0, 1.0 - dist))
            items.append({
                "lesson_id": lid,
                "text": doc,
                "metadata": meta,
                "similarity_score": similarity
            })
    return items


def delete_lesson_from_vector_store(lesson_id: str) -> None:
    collection = get_lessons_collection()
    try:
        collection.delete(ids=[lesson_id])
    except Exception:
        pass
