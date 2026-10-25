"""Application settings loaded from environment variables / .env.

Every tunable that affects answers or evaluation (models, chunking, retrieval)
lives here so it can be recorded with each query and evaluation run (trd.md).
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    # --- Storage -----------------------------------------------------------
    data_dir: Path = PROJECT_ROOT / "data" / "runtime"

    # --- Models ------------------------------------------------------------
    ollama_host: str = "http://localhost:11434"
    llm_model: str = "llama3:latest"
    llm_timeout_s: float = 90.0
    llm_temperature: float = 0.1
    # bge-small handles 512 word-pieces; 300 token chunks ensure complete representation.
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    embedding_query_prefix: str = "Represent this sentence for searching relevant passages: "

    # --- Chunking ----------------------------------------------------------
    chunk_size_tokens: int = 300
    chunk_overlap_tokens: int = 45

    # --- Retrieval ---------------------------------------------------------
    top_k: int = 3
    lesson_top_k: int = 2
    min_lesson_similarity: float = 0.60
    weak_evidence_similarity: float = 0.40

    # --- Upload limits -----------------------------------------------------
    max_upload_mb: int = 25

    # --- Prompts -----------------------------------------------------------
    answer_prompt_version: str = "answer_v1"
    critic_prompt_version: str = "critic_v1"
    judge_prompt_version: str = "judge_v1"

    # --- Obsidian Knowledge Graph ------------------------------------------
    obsidian_enabled: bool = True
    graphify_enabled: bool = True  # Backwards compatibility
    concept_match_threshold: int = 85

    # --- CORS --------------------------------------------------------------
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # Derived paths ----------------------------------------------------------
    @property
    def sqlite_path(self) -> Path:
        return self.data_dir / "app.sqlite3"

    @property
    def chroma_dir(self) -> Path:
        return self.data_dir / "chroma"

    @property
    def uploads_dir(self) -> Path:
        return self.data_dir / "uploads"

    @property
    def obsidian_vault_dir(self) -> Path:
        return self.data_dir / "obsidian_vault"

    @property
    def graphify_dir(self) -> Path:
        return self.obsidian_vault_dir

    @property
    def experiments_csv(self) -> Path:
        return self.data_dir / "experiments.csv"

    @property
    def eval_dir(self) -> Path:
        return PROJECT_ROOT / "data" / "eval"

    def ensure_dirs(self) -> None:
        for p in (self.data_dir, self.uploads_dir, self.obsidian_vault_dir, self.chroma_dir):
            p.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    return Settings()
