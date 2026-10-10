from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import get_settings
from backend.app.db import engine, Base
from backend.app.routers import (
    documents,
    queries,
    feedback,
    corrections,
    lessons,
    graph,
    evaluations,
)

settings = get_settings()
settings.ensure_dirs()

# Initialize database schema
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Graph-Based Self-Learning RAG Agent API",
    description="Backend API for document ingestion, graph rag, critic, verification, and evaluation",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(documents.router)
app.include_router(queries.router)
app.include_router(feedback.router)
app.include_router(corrections.router)
app.include_router(lessons.router)
app.include_router(graph.router)
app.include_router(evaluations.router)


@app.get("/health")
def health_check():
    import urllib.request
    ollama_ok = False
    try:
        req = urllib.request.Request(f"{settings.ollama_host}/api/tags")
        with urllib.request.urlopen(req, timeout=2) as resp:
            ollama_ok = (resp.status == 200)
    except Exception:
        ollama_ok = False

    return {
        "status": "ok",
        "database": "sqlite_ready",
        "chroma": "persistent_ready",
        "ollama_connected": ollama_ok,
        "embedding_model": settings.embedding_model,
        "llm_model": settings.llm_model,
    }
