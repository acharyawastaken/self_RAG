import pytest
from backend.app.services.ingestion import (
    validate_file,
    compute_sha256,
    extract_document_sections,
    chunk_sections,
    IngestionError,
)


def test_compute_sha256():
    data = b"Hello RAG Graph"
    h = compute_sha256(data)
    assert len(h) == 64
    assert h == compute_sha256(data)


def test_validate_file_extensions():
    # Unsupported extension
    with pytest.raises(IngestionError, match="Unsupported file extension"):
        validate_file("file.exe", b"test")

    # Empty file
    with pytest.raises(IngestionError, match="Uploaded file is empty"):
        validate_file("empty.txt", b"")

    # Valid txt
    ext = validate_file("notes.txt", b"Some lecture notes")
    assert ext == ".txt"

    # Valid md
    ext = validate_file("README.md", b"# Header\nSome content")
    assert ext == ".md"


def test_validate_pdf_magic_bytes():
    # Invalid pdf header
    with pytest.raises(IngestionError, match="Invalid PDF file"):
        validate_file("test.pdf", b"not a real pdf content")

    # Valid pdf header
    ext = validate_file("test.pdf", b"%PDF-1.4\nfake content")
    assert ext == ".pdf"


def test_extract_markdown_sections():
    md_content = b"# Intro to Search\nUninformed search explores state space.\n\n## Breadth First Search\nBFS uses a queue."
    sections, page_count = extract_document_sections(".md", md_content)
    assert len(sections) >= 2
    assert any("Breadth First Search" in s["section_title"] for s in sections)
    assert any("BFS uses a queue" in s["text"] for s in sections)


def test_extract_txt_sections():
    txt_content = b"Paragraph one.\n\nParagraph two with more details."
    sections, page_count = extract_document_sections(".txt", txt_content)
    assert len(sections) == 2
    assert "Paragraph one." in sections[0]["text"]
    assert "Paragraph two" in sections[1]["text"]


def test_chunk_sections():
    sections = [
        {"text": "Short section text", "page": 1, "section_title": "Overview"},
        {"text": "Another section text with details about algorithms.", "page": 2, "section_title": "Details"},
    ]
    chunks = chunk_sections("doc123", sections, chunk_size=50, overlap=10)
    assert len(chunks) == 2
    assert chunks[0]["chunk_id"] == "doc123:0"
    assert chunks[0]["document_id"] == "doc123"
    assert chunks[0]["page_start"] == 1
    assert chunks[1]["chunk_id"] == "doc123:1"
    assert chunks[1]["page_start"] == 2
