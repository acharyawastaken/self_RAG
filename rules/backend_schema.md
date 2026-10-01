# Backend Schema

## Storage Design

Use ChromaDB for vector embeddings and SQLite for structured application data in the first version. The schema can later move to PostgreSQL. The graph may be stored in relational node and edge tables initially or in a dedicated graph database later.

Use stable identifiers across services. Store source provenance for chunks, lessons, and graph relationships.

## Documents

Fields:

document_id: text primary key.

filename: text not null.

file_type: text not null.

content_hash: text not null.

storage_path: text.

ingestion_status: text not null.

page_count: integer.

created_at: timestamp not null.

updated_at: timestamp not null.

error_message: text.

Purpose: records uploaded files and their processing state.

## Chunks

Fields:

chunk_id: text primary key.

document_id: text not null references documents.

chunk_index: integer not null.

text_content: text not null.

page_start: integer.

page_end: integer.

section_title: text.

token_count: integer.

metadata_json: text.

created_at: timestamp not null.

The embedding itself is stored in ChromaDB with chunk_id and metadata. Keep chunk text in relational storage only if required for source display and audit.

## Queries

Fields:

query_id: text primary key.

question_text: text not null.

answer_text: text.

model_name: text.

prompt_version: text.

retrieval_config_json: text.

status: text not null.

created_at: timestamp not null.

completed_at: timestamp.

error_message: text.

## Query Evidence

Fields:

query_id: text not null references queries.

chunk_id: text not null references chunks.

rank_position: integer not null.

similarity_score: real.

evidence_role: text not null.

Primary key: query_id and chunk_id.

Purpose: records which source chunks were retrieved for each answer.

## Feedback

Fields:

feedback_id: text primary key.

query_id: text not null references queries.

rating: text not null.

rating_score: real.

comment_text: text.

user_correction: text.

created_at: timestamp not null.

Allowed rating values: correct, mostly_correct, partially_correct, mostly_incorrect, completely_incorrect.

The numerical score is optional and must be defined by the evaluation policy. Do not treat the score as factual confidence.

## Critiques

Fields:

critique_id: text primary key.

feedback_id: text not null references feedback.

failure_category: text not null.

explanation: text not null.

proposed_correction: text.

affected_concepts_json: text.

evidence_chunk_ids_json: text.

critic_model: text.

status: text not null.

created_at: timestamp not null.

Allowed failure categories: retrieval_failure, missing_evidence, factual_error, reasoning_error, ambiguous_question, unsupported_claim, unclear.

Allowed statuses: proposed, awaiting_verification, verified, rejected.

## Lessons

Fields:

lesson_id: text primary key.

critique_id: text references critiques.

title: text not null.

question_pattern: text.

error_summary: text not null.

correction_text: text not null.

verification_method: text not null.

verification_reference_json: text.

status: text not null.

confidence_score: real.

created_at: timestamp not null.

updated_at: timestamp not null.

Allowed statuses: pending, verified, rejected, superseded.

Only verified lessons should be used as trusted corrective context. Confidence score must have a documented calculation if populated. Otherwise leave it null.

## Graph Nodes

Fields:

node_id: text primary key.

node_type: text not null.

label: text not null.

description: text.

source_document_id: text references documents.

source_chunk_id: text references chunks.

verification_status: text not null.

metadata_json: text.

created_at: timestamp not null.

updated_at: timestamp not null.

Example node types: concept, document, chunk, question, lesson.

## Graph Edges

Fields:

edge_id: text primary key.

source_node_id: text not null references graph_nodes.

relation_type: text not null.

target_node_id: text not null references graph_nodes.

verification_status: text not null.

confidence_score: real.

evidence_json: text.

origin_type: text not null.

related_lesson_id: text references lessons.

created_at: timestamp not null.

updated_at: timestamp not null.

Allowed verification statuses: unevaluated, suspected_problem, pending_correction, verified, updated_after_feedback.

Example relation types: explains, depends_on, supports, contradicts, related_to, corrected_by, derived_from.

## Feedback Events

Fields:

event_id: text primary key.

feedback_id: text references feedback.

critique_id: text references critiques.

lesson_id: text references lessons.

edge_id: text references graph_edges.

event_type: text not null.

event_payload_json: text.

created_at: timestamp not null.

Purpose: append only audit history for feedback, critique, verification, and graph changes.

## Evaluation Runs

Fields:

evaluation_id: text primary key.

dataset_version: text not null.

model_name: text.

embedding_model: text.

prompt_version: text.

retrieval_config_json: text.

metrics_json: text not null.

started_at: timestamp not null.

completed_at: timestamp.

status: text not null.

notes: text.

## Relationships

One document has many chunks.

One query has many evidence chunks through query_evidence.

One query can have multiple feedback records.

One feedback record can have multiple critique attempts.

A critique may create a lesson after verification.

A graph node can have many incoming and outgoing edges.

A graph edge may reference a lesson that caused its status to change.

A feedback event records a change without erasing the earlier state.

## Indexes

Index documents by content_hash and ingestion_status.

Index chunks by document_id and chunk_index.

Index feedback by query_id and created_at.

Index critiques by status and failure_category.

Index lessons by status and updated_at.

Index graph nodes by node_type and label.

Index graph edges by source_node_id, target_node_id, relation_type, and verification_status.

Index evaluation runs by dataset_version and started_at.

## Data Integrity Rules

Use transactions when a verified lesson and its graph updates must be committed together.

Do not delete source evidence when adding a correction.

Do not promote an unverified critic proposal to a verified lesson.

Record who or what verified a correction and which evidence was used.

Treat graph colors as a display of stored status, not as the status itself.

Store original ratings and feedback events so later changes remain auditable.

Keep held out evaluation questions separate from learning examples.

## Graph Color Mapping

Unevaluated maps to grey.

Suspected problem maps to red.

Pending correction maps to yellow.

Verified maps to green.

Updated after feedback maps to blue.

The frontend should show a text status as well as a color.
