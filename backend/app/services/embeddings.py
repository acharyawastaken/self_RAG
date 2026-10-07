from typing import List
from backend.app.config import get_settings

settings = get_settings()

_model_instance = None


def get_embedding_model():
    global _model_instance
    if _model_instance is None:
        from sentence_transformers import SentenceTransformer
        _model_instance = SentenceTransformer(settings.embedding_model)
    return _model_instance


def embed_texts(texts: List[str]) -> List[List[float]]:
    if not texts:
        return []
    model = get_embedding_model()
    embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return embeddings.tolist()


def embed_query(query: str) -> List[float]:
    model = get_embedding_model()
    text = f"{settings.embedding_query_prefix}{query}" if settings.embedding_query_prefix else query
    embedding = model.encode([text], normalize_embeddings=True, show_progress_bar=False)
    return embedding[0].tolist()
