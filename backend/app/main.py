import os

# tqdm progress bars (from HF / sentence-transformers) write to stderr and can raise
# "[Errno 22] Invalid argument" on Windows when there is no console attached.
os.environ.setdefault("TQDM_DISABLE", "1")
os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
# Model is cached locally after first download; skip the network check each load.
os.environ.setdefault("HF_HUB_OFFLINE", "1")

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


@app.on_event("startup")
def preload_embedding_model():
    # Load once at boot so the first query doesn't pay the model-load cost.
    from backend.app.services.embeddings import get_embedding_model
    get_embedding_model()


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


@app.post("/health/ollama/wake")
def wake_ollama():
    """Attempt to verify connection to Ollama, and if not running, trigger ollama serve in background."""
    import shutil
    import subprocess
    import time
    import urllib.request

    def is_ollama_up() -> bool:
        try:
            req = urllib.request.Request(f"{settings.ollama_host}/api/tags")
            with urllib.request.urlopen(req, timeout=2) as resp:
                return resp.status == 200
        except Exception:
            return False

    if is_ollama_up():
        return {
            "status": "ok",
            "ollama_connected": True,
            "message": "Ollama is already online and connected.",
        }

    # If not running, find executable and start background process
    ollama_bin = shutil.which("ollama")
    if not ollama_bin:
        default_local = Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "Ollama" / "ollama.exe"
        if default_local.exists():
            ollama_bin = str(default_local)

    if ollama_bin:
        try:
            # Start detached process
            if os.name == "nt":
                subprocess.Popen(
                    [ollama_bin, "serve"],
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
            else:
                subprocess.Popen(
                    [ollama_bin, "serve"],
                    start_new_session=True,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
        except Exception as e:
            pass

    # Wait up to 4 seconds for Ollama server to wake up
    for _ in range(8):
        time.sleep(0.5)
        if is_ollama_up():
            return {
                "status": "ok",
                "ollama_connected": True,
                "message": "Ollama service started and connected successfully.",
            }

    return {
        "status": "warning",
        "ollama_connected": False,
        "message": "Triggered Ollama startup; please click refresh again in a few moments.",
    }

