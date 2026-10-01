# Flow Control

## Main Workflow

### Step 1. Upload

The user selects a PDF, DOCX, TXT, or Markdown file. The backend validates type and size. If validation fails, return a clear error and stop processing.

### Step 2. Extract

Extract text and metadata. For PDFs, preserve page numbers when possible. For DOCX and Markdown, preserve headings and section context when available. If extraction returns no useful text, mark ingestion as failed and explain why.

### Step 3. Chunk and Index

Split text into chunks using a configurable chunk size and overlap. Assign stable identifiers and attach document metadata. Generate embeddings and store them in ChromaDB. Avoid duplicate indexing for the same document version.

### Step 4. Build Graph Candidates

Extract candidate concepts and relationships from chunks. Attach source references. Save them as unevaluated graph records. Do not treat automatically extracted relationships as verified facts.

### Step 5. Receive Question

Validate the question and create a query record.

### Step 6. Retrieve Evidence

Retrieve relevant chunks from ChromaDB. Search verified lessons for related previous corrections. Optionally expand retrieval through related graph nodes. Keep source identifiers for all retrieved evidence.

### Step 7. Generate Answer

Provide the question, source chunks, and relevant verified lessons to the LLM. Request a concise answer grounded in evidence. Ask it to cite source identifiers and state when evidence is insufficient.

### Step 8. Store Answer

Save the answer, retrieved chunk identifiers, model configuration, and timestamp. Return the answer and source references to the interface.

### Step 9. Collect Feedback

The user selects a rating and may provide a correction or explanation. Save feedback as a separate record linked to the answer.

### Step 10. Run Critic

The critic examines the question, answer, retrieved evidence, and feedback. It classifies the likely issue and proposes a correction. If there is not enough evidence, the critic should request review rather than invent a correction.

### Step 11. Identify Affected Graph Records

Map the proposed issue to relevant concepts and relationships. If no reliable mapping exists, create a review item rather than changing an unrelated edge.

### Step 12. Verify Correction

Check the proposal against trusted source material, a reference answer, an automated test, or human approval. Record the method and outcome.

If rejected, preserve the proposal and rejection reason without promoting it to a trusted lesson.

If approved, create a verified lesson and update the relevant graph status.

### Step 13. Update Memory

Store the verified correction with the original question, error type, correction, evidence, and related concepts. Keep the original source chunks unchanged.

### Step 14. Future Retrieval

For later questions, retrieve relevant verified lessons alongside source chunks. Do not retrieve rejected or unverified proposals as trusted facts.

### Step 15. Evaluate

Run the fixed evaluation set before and after the change. Record metrics and configuration. Do not use the held out evaluation set as an automatic source of learning examples.

## State Model

Document states: uploaded, processing, indexed, failed.

Feedback states: received, critic pending, reviewed.

Correction states: proposed, awaiting verification, verified, rejected.

Graph relationship states: unevaluated, suspected problem, pending correction, verified, updated after feedback.

Query states: received, retrieving, generating, completed, failed.

## Failure Handling

If document extraction fails, do not create empty embeddings.

If the embedding service fails, retain the document record and allow indexing to be retried.

If the LLM is unavailable, return a clear service error and do not create a fake answer.

If the critic fails, retain the feedback and mark the critic job for retry.

If verification is inconclusive, keep the correction pending.

If graph update fails, keep the verified correction in persistent storage and retry the graph update.

If evaluation fails, retain partial results and report the failure.

## Core Rule

A negative rating triggers investigation. It does not automatically prove a textbook relationship is false. Only a verified correction can become trusted learning memory.
