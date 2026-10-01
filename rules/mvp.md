# Minimum Viable Product

## Objective

Deliver a working prototype that answers questions from uploaded course documents and demonstrates a measurable feedback driven improvement loop.

## MVP Features

1. Upload PDF, DOCX, TXT, and Markdown files.
2. Extract text and metadata.
3. Chunk the text and generate embeddings.
4. Store chunks in ChromaDB.
5. Ask questions and generate answers through Ollama.
6. Display source document and page or section references.
7. Collect ratings and optional corrections.
8. Run a critic that classifies likely errors.
9. Store correction proposals and verification outcomes.
10. Retrieve verified lessons for future questions.
11. Store graph nodes and edges with status and evidence.
12. Display a graph or graph export through Graphify if supported.
13. Run a fixed evaluation set before and after feedback.

## Keep the First Version Small

Use SQLite for feedback, lessons, and graph metadata.

Use ChromaDB only for semantic retrieval.

Use a single subject area, preferably introductory artificial intelligence.

Use a small, carefully checked set of documents and questions.

Use a simple review step before corrections become trusted.

Use Streamlit for the first interface if delivery speed matters. React can replace it later.

## MVP User Flow

1. Upload one or more documents.
2. Wait for parsing and indexing to finish.
3. Ask a question.
4. Read the answer and source references.
5. Select a feedback rating.
6. Optionally enter a corrected answer or explanation.
7. Review the critic's diagnosis.
8. Approve or reject the proposed lesson.
9. View the affected graph nodes and relationships.
10. Ask a related question to test whether the lesson is used.

## MVP Data Records

Document: file metadata and ingestion status.

Chunk: extracted text and source location.

Query: question, answer, and retrieved chunk identifiers.

Feedback: rating, comment, and optional correction.

Critique: failure category, explanation, evidence, and proposed change.

Lesson: verified correction and retrieval terms.

Graph node: concept or evidence entity.

Graph edge: source node, relation, target node, status, and provenance.

Evaluation run: dataset version, metric values, and model configuration.

## Definition of Done

The prototype can ingest supported files and answer questions using their content.

Answers show source references.

Feedback is stored after the session ends.

The critic produces an explainable diagnosis linked to evidence.

A proposed correction is not trusted until verified.

A verified lesson can be retrieved during a later query.

The graph reflects the recorded status and can be refreshed without manual editing.

The system produces a before and after evaluation report.

## Demo Scenario

Upload course notes about search algorithms. Ask a question about the A star evaluation function. If the answer omits path cost, submit incorrect feedback and provide a correction. The critic identifies the missing term and links the diagnosis to the source. After verification, the system stores the lesson and updates the relevant graph relationship. Ask a related question and confirm that the verified lesson is retrieved. Compare the result with the baseline evaluation.

## Not Required for MVP

Fine tuning model weights.

Full RLHF training.

Automatic acceptance of every user correction.

A production scale graph database.

Advanced user management.

A fully three dimensional graph if a clear two dimensional graph communicates the changes.
