# UI and UX Specification

## Design Goal

The interface should make the learning loop easy to understand. Users should be able to upload documents, ask questions, rate answers, review the critic's diagnosis, approve corrections, and see how the knowledge graph changes.

## Main Screens

### 1. Document Library

Show uploaded files, file type, ingestion status, number of chunks, and errors.

Primary actions: upload file, remove index, inspect source.

Supported formats: PDF, DOCX, TXT, and Markdown.

### 2. Question and Answer

Provide a question input and answer area.

Show source citations with document name and page or section when available.

Show the retrieved passages in a collapsible evidence panel.

If evidence is weak or missing, say so instead of presenting an unsupported answer as certain.

### 3. Feedback Panel

Provide these options:

Correct.

Mostly correct.

Partially correct.

Mostly incorrect.

Completely incorrect.

Include an optional text area for a correction and an optional explanation of the problem.

Keep the selected rating separate from the correction text.

### 4. Critic Review

Show the suspected failure category, a short explanation, supporting evidence, affected concepts, and proposed correction.

Allow a reviewer to approve, reject, or edit the proposal.

Make it clear that the critic's analysis is a proposal until verified.

### 5. Knowledge Graph

Show concepts as nodes and relationships as labelled edges.

Use a simple status legend.

Grey: extracted and unevaluated.

Red: suspected problem.

Yellow: correction awaiting verification.

Green: verified.

Blue: verified relationship updated after feedback.

Selecting a node or edge should show its definition, source evidence, status, and feedback history.

Provide filters for document, concept, status, and recent feedback.

Start with a two dimensional interactive graph. Add three dimensional navigation only if it improves comprehension.

### 6. Evaluation Dashboard

Show baseline and current results.

Metrics can include answer accuracy, retrieval recall at k when labels exist, source support rate, repeated error rate, and response time.

Show dataset version and model configuration so comparisons are meaningful.

## Interaction Principles

Use plain language for feedback options.

Keep source evidence visible and easy to inspect.

Do not use color as the only way to communicate status. Include labels or icons accessible to color blind users.

Show loading and error states during ingestion, retrieval, and critic analysis.

Do not update trusted graph facts immediately after a negative rating. Show a pending review state first.

Confirm when a correction has been verified and stored.

## Suggested Layout

Left navigation: Documents, Ask, Knowledge Graph, Evaluations.

Main area: current page content.

Right side panel where space allows: source evidence, critic details, or selected graph entity.

## Key States

No documents uploaded.

Ingestion in progress.

Ingestion failed.

Ready for questions.

Answer generated.

Feedback submitted.

Critic running.

Correction awaiting verification.

Correction rejected.

Correction verified.

Graph updated.

Evaluation completed.

## Accessibility and Usability

Support keyboard navigation for core actions.

Use readable text sizes and clear focus states.

Provide text labels alongside graph colors.

Keep error messages specific and actionable.

Allow users to inspect the evidence behind each graph relationship.
