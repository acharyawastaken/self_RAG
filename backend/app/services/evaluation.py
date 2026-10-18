import csv
import json
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List
import numpy as np
from sqlalchemy.orm import Session

from backend.app.config import get_settings
from backend.app.models import EvaluationRun
from backend.app.services.retrieval import retrieve_evidence_and_lessons
from backend.app.services.llm import generate_completion
from backend.app.routers.queries import build_answer_prompt

settings = get_settings()


def run_evaluation_suite(
    db: Session,
    dataset_version: str = "ai_intro_v1",
    model_name: str = None,
    notes: str = None,
) -> Dict[str, Any]:
    dataset_path = settings.eval_dir / f"{dataset_version}.jsonl"
    if not dataset_path.exists():
        raise FileNotFoundError(f"Evaluation dataset {dataset_version}.jsonl not found in {settings.eval_dir}")

    questions = []
    with open(dataset_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                questions.append(json.loads(line))

    if not questions:
        raise ValueError(f"No questions loaded from {dataset_path}")

    eval_id = str(uuid.uuid4())
    started_at = datetime.now(timezone.utc)
    model = model_name or settings.llm_model

    run_record = EvaluationRun(
        evaluation_id=eval_id,
        dataset_version=dataset_version,
        model_name=model,
        embedding_model=settings.embedding_model,
        prompt_version=settings.answer_prompt_version,
        retrieval_config_json=json.dumps({"top_k": settings.top_k}),
        metrics_json="{}",
        started_at=started_at,
        status="running",
        notes=notes,
    )
    db.add(run_record)
    db.commit()

    accuracy_scores = []
    retrieval_recalls = []
    source_supported = []
    latencies = []

    for item in questions:
        q_text = item["question"]
        ref_ans = item.get("reference_answer", "")
        key_facts = item.get("key_facts", [])
        expected_concepts = item.get("expected_concepts", [])

        t0 = time.time()

        # 1. Retrieval
        ret_result = retrieve_evidence_and_lessons(
            question=q_text,
            top_k=settings.top_k,
        )
        chunks = ret_result["chunks"]
        lessons = ret_result["lessons"]

        # Calculate Recall@k on expected concepts
        combined_text = " ".join(c["text_content"].lower() for c in chunks)
        if expected_concepts:
            hits = sum(1 for ec in expected_concepts if ec.lower() in combined_text)
            recall = hits / len(expected_concepts)
        else:
            recall = 1.0
        retrieval_recalls.append(recall)

        # 2. Answer generation
        prompt = build_answer_prompt(q_text, chunks, lessons)
        try:
            answer = generate_completion(
                prompt=prompt,
                model=model,
                temperature=0.0,
            )
        except Exception as e:
            answer = f"Error during generation: {e}"

        latency = time.time() - t0
        latencies.append(latency)

        # 3. Source support check
        has_citations = any(c["citation_key"] in answer for c in chunks) or any(l["citation_key"] in answer for l in lessons)
        source_supported.append(1.0 if has_citations else 0.0)

        # 4. Accuracy / Fact coverage scoring
        ans_lower = answer.lower()
        if key_facts:
            fact_hits = sum(1 for kf in key_facts if any(term in ans_lower for term in kf.lower().split()))
            score = fact_hits / len(key_facts)
        else:
            score = 1.0 if len(answer) > 20 else 0.0
        accuracy_scores.append(score)

    metrics = {
        "total_questions": len(questions),
        "mean_accuracy": round(float(np.mean(accuracy_scores)), 4),
        "retrieval_recall_at_k": round(float(np.mean(retrieval_recalls)), 4),
        "source_support_rate": round(float(np.mean(source_supported)), 4),
        "median_latency_s": round(float(np.median(latencies)), 2),
        "p95_latency_s": round(float(np.percentile(latencies, 95)), 2),
    }

    run_record.metrics_json = json.dumps(metrics)
    run_record.completed_at = datetime.now(timezone.utc)
    run_record.status = "completed"
    db.commit()

    # Append to experiments.csv
    csv_file = settings.experiments_csv
    file_exists = csv_file.exists()
    with open(csv_file, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow([
                "evaluation_id", "timestamp", "dataset_version", "model_name",
                "embedding_model", "mean_accuracy", "retrieval_recall_at_k",
                "source_support_rate", "median_latency_s", "notes"
            ])
        writer.writerow([
            eval_id,
            run_record.completed_at.isoformat(),
            dataset_version,
            model,
            settings.embedding_model,
            metrics["mean_accuracy"],
            metrics["retrieval_recall_at_k"],
            metrics["source_support_rate"],
            metrics["median_latency_s"],
            notes or ""
        ])

    return {
        "evaluation_id": eval_id,
        "dataset_version": dataset_version,
        "model_name": model,
        "metrics": metrics,
        "status": "completed",
    }
