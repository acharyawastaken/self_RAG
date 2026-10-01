# Implementation Plan

## Project Overview

Build a self learning document assistant that answers questions from university level documents and improves its future responses through human feedback, a critic, verified corrections, and a knowledge graph.

The graph is a visual record of concepts, relationships, and feedback history. The learning process is handled by backend logic rather than by the graph visualization itself.

## Goals

1. Accept PDF, DOCX, TXT, and Markdown documents.
2. Extract text and preserve useful source metadata.
3. Split documents into searchable chunks and create embeddings.
4. Retrieve relevant chunks for each question.
5. Generate answers with source references.
6. Collect human ratings and optional corrections.
7. Use a critic to classify failures and suggest corrections.
8. Verify corrections against source material or trusted evaluation data.
9. Store verified lessons for use in future queries.
10. Update graph status and visualize feedback history.
11. Measure whether the system improves on a fixed evaluation set.

## Recommended Technology

Frontend: React for a richer interactive interface or Streamlit for a faster prototype.

Backend: FastAPI.

Document ingestion: PyMuPDF, python-docx, and standard text parsers.

Embeddings: sentence-transformers.

Vector database: ChromaDB.

Language model: Ollama with a suitable local model.

Feedback and evaluation: custom Python evaluation pipeline.

Persistent learning history: SQLite for the first version, with PostgreSQL as a later option.

Knowledge graph: graph database or structured graph storage.

Visualization: Graphify, provided the selected implementation supports programmatic updates and the required styling.

Experiment tracking: CSV initially, with a dedicated tracking tool if the project grows.

## Delivery Phases

### Phase 1: Define the Evaluation Domain

Use introductory artificial intelligence as the initial domain. Collect lecture notes, permitted textbook extracts, solved examples, quizzes, and answer keys. Create a fixed set of test questions with reference answers.

Deliverable: domain dataset and evaluation set.

### Phase 2: Document Ingestion

Implement file upload, type validation, text extraction, metadata capture, chunking, and embedding generation. Preserve document name, page or section, chunk identifier, and source location wherever available.

Deliverable: searchable document collection.

### Phase 3: Retrieval and Answer Generation

Store embeddings in ChromaDB. Retrieve relevant chunks for each question and pass the context to the model through Ollama. Return an answer with source references and a clear statement when the available evidence is insufficient.

Deliverable: baseline document question answering.

### Phase 4: Feedback Interface

Add feedback options for correct, mostly correct, partially correct, mostly incorrect, and completely incorrect. Allow the user to provide a correction and a short explanation.

Deliverable: feedback records linked to each answer.

### Phase 5: Critic and Verification

Build a critic that classifies the likely failure as retrieval failure, missing context, factual error, reasoning error, or unclear question. Ask the critic to cite relevant chunks. Treat its diagnosis as a proposal rather than ground truth. Verify proposed corrections against trusted source passages, reference answers, automated tests, or a human review.

Deliverable: reviewable correction proposals.

### Phase 6: Learning Memory

Store verified corrections as lessons with the original question, answer, evidence, correction, status, and affected concepts. Retrieve relevant lessons alongside textbook chunks for later questions. Keep lessons separate from the original source documents.

Deliverable: persistent experience memory.

### Phase 7: Knowledge Graph

Create nodes for concepts, documents, chunks, questions, and lessons as needed. Create labelled edges for relationships such as explains, depends on, contradicts, supports, and corrected by. Store verification status and evidence on each relationship. Update the graph only when a relevant relationship has been identified and the proposed change has been reviewed or verified.

Deliverable: graph data that can be visualized and updated through an API.

### Phase 8: Visualization

Connect Graphify to the backend if its interfaces support the required operations. Use a simple legend: grey for extracted but unevaluated, red for suspected error, yellow for proposed correction, green for verified, and blue for updated after feedback. Display evidence and feedback history when a node or edge is selected.

Deliverable: interactive graph view.

### Phase 9: Evaluation

Evaluate a fixed set of questions before and after learning. Track answer accuracy, retrieval recall at k where labels are available, correction retention, source support, and response latency. Keep the evaluation set separate from feedback examples used for learning.

Deliverable: baseline and post feedback comparison.

## Acceptance Criteria

1. Supported files can be uploaded and parsed.
2. Answers include source references to retrieved material.
3. Every answer can receive structured feedback.
4. Feedback creates a persistent record.
5. The critic identifies a likely failure type and supporting evidence.
6. Corrections are not treated as verified without a validation step.
7. Verified lessons can be retrieved in later queries.
8. Graph status changes reflect recorded events and verification state.
9. Evaluation results can be reproduced from a fixed test set.
10. The system can distinguish retrieval problems from answer generation problems.

## Risks and Controls

Incorrect user feedback can damage the knowledge base. Keep original evidence and use verification before changing trusted relationships.

A language model critic can make mistakes. Treat critic output as a hypothesis and compare it with source material or trusted tests.

A graph visualization can become crowded. Start with concepts connected to the current question and allow the user to expand surrounding nodes.

A larger embedding model or more overlap does not itself create learning. Prioritize verified feedback memory and evaluation before retrieval tuning.

Copyrighted documents may have restrictions. Use documents you are permitted to process and avoid redistributing source content without permission.
