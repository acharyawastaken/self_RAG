# Product Requirements Document

## Product Name

Graph Based Self Learning RAG Agent

## Product Summary

The product is a document based question answering agent for university level learning material. It ingests documents, retrieves relevant passages, generates answers, collects human feedback, evaluates mistakes, stores verified corrections, and visualizes related concepts and learning history in a knowledge graph.

## Problem

A conventional document assistant can retrieve and summarize information but usually does not preserve a structured record of user corrections that changes future responses. The project aims to close this gap with a feedback loop and evidence backed memory.

## Target Users

Students who need to study course material.

Instructors who want to inspect answers and feedback.

Project evaluators who need to see measurable improvement over repeated interactions.

## Main Use Cases

1. Upload a textbook, lecture note, or reference document.
2. Ask a question about the uploaded material.
3. Read an answer with supporting sources.
4. Mark an answer as correct, partially correct, or incorrect.
5. Supply a correction or explain the issue.
6. Review the critic diagnosis and its evidence.
7. Approve or reject a proposed correction.
8. Explore graph nodes and relationships affected by feedback.
9. Ask a related question and see whether a verified lesson helps.
10. Compare system performance before and after feedback.

## Product Scope

### Included in the MVP

Document upload for PDF, DOCX, TXT, and Markdown.

Text extraction and chunking.

Embedding generation and vector retrieval.

Question answering through a local model.

Source references in answers.

Structured human feedback.

Critic based error classification.

Verified correction memory.

Basic graph data and Graphify integration where supported.

Basic evaluation report.

### Excluded from the MVP

Automatic model weight training.

Full reinforcement learning from human feedback.

Unreviewed automatic rewriting of trusted textbook facts.

Complex multi user access control.

Support for every possible document type.

A guarantee that every answer is correct.

## Functional Requirements

FR1: The user can upload supported documents.

FR2: The system validates file type and size and reports ingestion failures.

FR3: The system extracts text and preserves source metadata.

FR4: The system creates chunks and embeddings and stores them for retrieval.

FR5: The user can ask questions about the ingested material.

FR6: The answer includes citations to the source document and page or section when available.

FR7: The user can submit a rating and optional correction.

FR8: The feedback collector stores the question, answer, retrieved context identifiers, rating, and correction.

FR9: The critic proposes a failure category and explanation.

FR10: The system records the evidence used to support a proposed correction.

FR11: A proposed correction must pass a verification step before it becomes a trusted lesson.

FR12: The system stores verified lessons for future retrieval.

FR13: The graph backend stores concepts and labelled relationships with provenance and status.

FR14: The graph visualization shows the status of relationships using a consistent legend.

FR15: The system reports evaluation results before and after learning.

## Non Functional Requirements

The system should run locally for a student project where practical.

The interface should explain when an answer lacks sufficient source evidence.

The system should retain source traceability for extracted facts and corrections.

The backend should expose documented API endpoints.

Feedback and graph changes should be auditable.

The design should allow the graph visualization to be replaced without rebuilding the learning logic.

## Success Metrics

Answer accuracy on a fixed evaluation set.

Retrieval recall at k when relevant chunks are labelled.

Percentage of corrections that pass verification.

Rate of repeated errors after a verified lesson is stored.

Source support rate for generated answers.

Median response time.

Number of graph changes with traceable evidence.

## User Journey

The user uploads course material. The system parses and indexes it. The user asks a question and receives a sourced answer. The user rates the answer and can supply a correction. The critic reviews the answer and evidence. The system proposes an update. A verified update is stored as a lesson and reflected in the graph. Future questions can retrieve the lesson. Evaluation reports show whether the change helped.

## Product Principle

A visual change is not proof of learning. The system must preserve evidence, store verified lessons, use them in later retrieval, and measure performance changes.
