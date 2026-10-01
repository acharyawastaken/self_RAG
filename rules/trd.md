# Technical Requirements Document

## Architecture

The system contains a frontend, FastAPI backend, document ingestion pipeline, embedding and retrieval service, local language model, feedback and critic service, persistent learning store, graph data service, and experiment tracking.

The graph visualization is a client of the graph data service. It is not the source of truth for learning state.

## Technology Stack

Frontend: React or Streamlit.

Backend: FastAPI.

Document ingestion: PyMuPDF, python-docx, and standard text parsers.

Embeddings: sentence-transformers.

Vector database: ChromaDB.

LLM: Ollama with a suitable local model.

Feedback and evaluation: custom Python pipeline.

Persistent learning history: SQLite initially, PostgreSQL as a later option.

Knowledge graph: graph database or structured graph storage.

Visualization: Graphify if the chosen implementation supports the required API and edge styling.

Experiment tracking: CSV initially.

## Services

### Document Service

Accepts files, validates their types and sizes, extracts text, records metadata, and creates chunks. It should report parsing errors and avoid indexing empty documents.

### Embedding and Index Service

Generates embeddings for chunks and writes them to ChromaDB with stable chunk identifiers and metadata. Reindexing should avoid accidental duplication.

### Retrieval Service

Embeds the user question, retrieves relevant chunks, and returns chunk identifiers, source metadata, and similarity scores. Retrieval should support configurable top k and optional metadata filters.

### Answer Service

Builds a prompt from the question, retrieved evidence, and relevant verified lessons. It asks the model to answer from the evidence, cite source identifiers, and state when evidence is insufficient.

### Feedback Service

Stores the user's rating, comment, and correction. Each feedback record is linked to the query and answer.

### Critic Service

Classifies a likely failure as retrieval failure, missing evidence, factual error, reasoning error, ambiguity, or unsupported claim. It returns an explanation, affected concepts, relevant source identifiers, and a proposed correction. The critic must not independently promote a correction to verified status.

### Verification Service

Checks proposed corrections against trusted source passages, reference answers, automated tests, or a human approval step. It records the verification method and result.

### Learning Memory Service

Stores verified lessons and searches them for future questions. Lessons remain separate from source chunks and retain their provenance.

### Graph Service

Stores nodes, edges, labels, statuses, evidence, and feedback history. It exposes a stable API so the visualization can be replaced independently.

### Evaluation Service

Runs a fixed test set and reports answer accuracy, retrieval metrics where labels exist, source support, correction retention, and latency.

## Data Flow

1. Upload file and validate.
2. Extract text and metadata.
3. Split text into chunks.
4. Generate embeddings and index chunks.
5. Extract candidate concepts and relationships.
6. Store graph candidates with source provenance and unverified status.
7. Receive question.
8. Retrieve relevant chunks and verified lessons.
9. Generate answer.
10. Save query, retrieved evidence, model configuration, and answer.
11. Receive human feedback.
12. Run critic and create a correction proposal.
13. Verify the proposal.
14. Store a verified lesson if approved.
15. Update graph status and feedback history.
16. Use the lesson in future retrieval.
17. Evaluate changes on a fixed test set.

## API Requirements

POST /documents: upload a document.

GET /documents: list indexed documents.

GET /documents/{document_id}: show ingestion status and metadata.

POST /queries: ask a question and generate an answer.

GET /queries/{query_id}: retrieve answer and source details.

POST /queries/{query_id}/feedback: submit rating and optional correction.

POST /feedback/{feedback_id}/critique: run critic analysis.

POST /corrections/{correction_id}/verify: record verification outcome.

GET /lessons/search: search verified lessons.

GET /graph: retrieve graph nodes and edges with optional filters.

GET /graph/nodes/{node_id}: retrieve node details and evidence.

GET /evaluations: list evaluation runs.

POST /evaluations/run: run the fixed evaluation set.

## Storage Requirements

Use ChromaDB for chunk embeddings and semantic retrieval.

Use SQLite for the initial relational records. Keep identifiers stable and use transactions for related updates.

Store the original document and extracted text only where permitted and necessary.

Store source metadata with each chunk.

Store feedback events as append only records where practical.

Do not overwrite original source evidence when a correction is added.

## Graph Status Rules

Grey means extracted and not yet evaluated.

Red means a relationship is suspected to be wrong.

Yellow means a correction is proposed and awaiting verification.

Green means a relationship or correction has been verified.

Blue means a verified relationship was updated after feedback.

The graph status describes verification state, not a universal probability of truth. Confidence must be represented separately and should only be calculated from defined evidence.

## Security and Reliability

Validate file extensions and MIME types.

Set upload size limits.

Treat document contents as untrusted input and guard against prompt injection.

Do not execute code found in uploaded documents.

Keep secrets out of source code.

Log failures without exposing sensitive document content unnecessarily.

Provide clear errors for unsupported files, failed parsing, model unavailability, and vector database failures.

## Evaluation

Maintain a versioned evaluation set that is not used as training feedback.

Report accuracy and source support before and after learning.

Use recall at k or mean reciprocal rank when relevant chunk labels exist.

Use precision, recall, and F1 for suitable classification tasks.

Do not use R squared for ordinary question answering accuracy.

Record model name, prompt version, embedding model, chunking settings, and retrieval settings for each evaluation run.
