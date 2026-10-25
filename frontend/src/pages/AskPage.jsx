import React, { useState, useEffect } from 'react';
import { 
  Send, 
  HelpCircle, 
  AlertTriangle, 
  Sparkles, 
  History, 
  Filter,
  Copy,
  Check,
  Bot,
  User,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { apiClient } from '../api/client';
import EvidencePanel from '../components/EvidencePanel';
import FeedbackPanel from '../components/FeedbackPanel';
import { CursorMarkerHighlight } from '@/components/ui/marker-highlight';

const SUGGESTED_PROMPTS = [
  {
    category: "Search & Optimization",
    prefix: "Explain how ",
    highlight: "heuristic consistency",
    suffix: " guarantees optimality in A* graph search.",
    markerColor: "rgba(255, 255, 255, 0.95)",
  },
  {
    category: "Hybrid Retrieval",
    prefix: "How does ",
    highlight: "hybrid evidence retrieval",
    suffix: " fuse BM25 keyword search with ChromaDB vectors?",
    markerColor: "rgba(255, 255, 255, 0.95)",
  },
  {
    category: "Knowledge Graphs",
    prefix: "What role does ",
    highlight: "neuro-symbolic graph grounding",
    suffix: " play in eliminating LLM hallucinations?",
    markerColor: "rgba(255, 255, 255, 0.95)",
  },
];

/**
 * Intelligent parser that detects citations [C1], [C2], [L1], and bold terms
 * and turns them into interactive cursor marker highlights that sweep across on hover.
 */
function FormattedGroundedAnswer({ text }) {
  if (!text) return null;

  // Split text by citations and bold markdown
  const parts = text.split(/(\[C\d+\]|\[L\d+\]|\*\*.*?\*\*)/g);

  return (
    <div style={{ lineHeight: 1.7, fontSize: '1.02rem', color: 'var(--text-primary)' }}>
      {parts.map((part, index) => {
        if (!part) return null;

        // Chunk citation [C1], [C2]...
        if (/^\[C\d+\]$/.test(part)) {
          return (
            <CursorMarkerHighlight
              key={index}
              highlight={part}
              markerColor="rgba(255, 255, 255, 0.92)"
              highlightedTextColor="#000000"
              style={{ fontWeight: 600, margin: '0 2px' }}
            />
          );
        }

        // Lesson citation [L1], [L2]...
        if (/^\[L\d+\]$/.test(part)) {
          return (
            <CursorMarkerHighlight
              key={index}
              highlight={part}
              markerColor="rgba(255, 255, 255, 0.92)"
              highlightedTextColor="#000000"
              style={{ fontWeight: 600, margin: '0 2px' }}
            />
          );
        }

        // Bold concepts **term**
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          const innerTerm = part.slice(2, -2);
          return (
            <CursorMarkerHighlight
              key={index}
              highlight={innerTerm}
              markerColor="rgba(255, 255, 255, 0.92)"
              highlightedTextColor="#000000"
              style={{ fontWeight: 600 }}
            />
          );
        }

        return <span key={index}>{part}</span>;
      })}
    </div>
  );
}

export default function AskPage() {
  const [question, setQuestion] = useState('');
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentQuery, setCurrentQuery] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiClient.getDocuments().then(setDocuments).catch(() => {});
    apiClient.listQueries(5).then(setHistory).catch(() => {});
  }, []);

  const handleAsk = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    setCurrentQuery(null);

    try {
      const res = await apiClient.askQuestion(
        question.trim(),
        selectedDocId || null
      );
      setCurrentQuery(res);
      apiClient.listQueries(5).then(setHistory).catch(() => {});
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to generate answer. Ensure Ollama is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggested = (promptObj) => {
    const fullText = `${promptObj.prefix}${promptObj.highlight}${promptObj.suffix}`;
    setQuestion(fullText);
  };

  const loadPastQuery = async (queryId) => {
    try {
      setLoading(true);
      const res = await apiClient.getQuery(queryId);
      setCurrentQuery(res);
      setQuestion(res.question_text);
    } catch {
      setError('Failed to load past query');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAnswer = () => {
    if (!currentQuery?.answer_text) return;
    navigator.clipboard?.writeText(currentQuery.answer_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Page Title & Context Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span className="bento-capsule">
            <span className="bento-capsule-dot" style={{ background: 'var(--text-primary)' }} />
            Grounded Q&A Engine
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            Multi-Lane RAG
          </span>
        </div>
        <h1>
          Ask & Inquire with{' '}
          <CursorMarkerHighlight highlight="Verified Grounding" markerColor="rgba(255, 255, 255, 0.95)" highlightedTextColor="#000000" />
        </h1>
        <p style={{ marginTop: '6px' }}>
          Ask questions from your indexed course documents. Answers are strictly synthesized against{' '}
          <CursorMarkerHighlight highlight="retrieved evidence" markerColor="rgba(255, 255, 255, 0.95)" highlightedTextColor="#000000" />{' '}
          and prior{' '}
          <CursorMarkerHighlight highlight="verified lessons" markerColor="rgba(255, 255, 255, 0.95)" highlightedTextColor="#000000" />.
        </p>
      </div>

      {/* Suggested Starter Prompts (shown when idle or prompt empty) */}
      {!currentQuery && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.78rem',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            color: 'var(--text-muted)',
            fontWeight: 600,
          }}>
            <Lightbulb size={14} color="var(--text-primary)" /> Suggested Queries (Hover to Highlight)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {SUGGESTED_PROMPTS.map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectSuggested(item)}
                className="bento-card"
                style={{
                  padding: '16px 18px',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'all 0.25s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)' }}>
                    {item.category}
                  </span>
                  <ArrowRight size={13} color="var(--text-muted)" />
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                  {item.prefix}
                  <CursorMarkerHighlight
                    highlight={item.highlight}
                    markerColor="rgba(255, 255, 255, 0.92)"
                    highlightedTextColor="#000000"
                  />
                  {item.suffix}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Question Composer Card */}
      <div className="bento-card" style={{ padding: '24px' }}>
        <form onSubmit={handleAsk}>
          <div style={{ marginBottom: '14px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Your Question:
              </label>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                Grounding guaranteed by ChromaDB + BM25
              </span>
            </div>
            <textarea
              rows={3}
              placeholder="e.g. What is the evaluation function of A* search and how does consistency affect optimality?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={loading}
              style={{
                resize: 'vertical',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '240px' }}>
              <Filter size={15} color="var(--text-muted)" />
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                style={{
                  padding: '8px 14px',
                  fontSize: '0.84rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-surface-elevated)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="">All Uploaded Course Documents</option>
                {documents.map((d) => (
                  <option key={d.document_id} value={d.document_id}>
                    {d.filename}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !question.trim()}
              style={{ minWidth: '150px' }}
            >
              {loading ? (
                <>Retrieving & Thinking...</>
              ) : (
                <>
                  <Send size={15} /> Ask Question
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error Notice */}
      {error && (
        <div style={{
          padding: '14px 18px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertTriangle size={20} style={{ opacity: 0.8 }} />
          <div>{error}</div>
        </div>
      )}

      {/* Thinking / Streaming Loading State */}
      {loading && (
        <div className="bento-card" style={{ padding: '32px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '9999px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-surface-elevated)',
            marginBottom: '16px'
          }}>
            <Sparkles size={22} className="animate-spin" color="var(--text-primary)" />
          </div>
          <div style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '6px' }}>
            Synthesizing Grounded Answer
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Querying dual retrieval lanes (BM25 + ChromaDB) and scanning{' '}
            <CursorMarkerHighlight highlight="verified pedagogical memory" markerColor="rgba(255, 255, 255, 0.95)" highlightedTextColor="#000000" />...
          </div>
        </div>
      )}

      {/* Answer & Conversation Turn Area */}
      {currentQuery && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* User Question Echo Bubble */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '16px 20px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '9999px',
              background: 'var(--bg-capsule)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
              shrink: 0,
            }}>
              <User size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Your Question
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {currentQuery.question_text}
              </div>
            </div>
          </div>

          {/* Insufficient Evidence Warning Banner */}
          {currentQuery.is_insufficient_evidence && (
            <div style={{
              padding: '14px 18px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '0.88rem'
            }}>
              <AlertTriangle size={20} style={{ opacity: 0.8 }} />
              <div>
                <span style={{ fontWeight: 600 }}>Insufficient Context Notice: </span>
                Retrieved chunks exhibit weak relevance. The model has avoided hallucinating and strictly notes the absence of direct documentation.
              </div>
            </div>
          )}

          {/* Assistant Answer Bento Card */}
          <div className="bento-card" style={{ padding: '28px' }}>
            {/* Header Telemetry Pill Bar */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              paddingBottom: '16px',
              borderBottom: '1px solid var(--border-color)',
              marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '9999px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-surface-elevated)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-primary)',
                }}>
                  <Bot size={15} />
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Grounded Synthesis
                </div>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Model: <span style={{ color: 'var(--text-secondary)' }}>{currentQuery.model_name || 'Llama'}</span>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleCopyAnswer}
                  className="btn btn-secondary"
                  style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied' : 'Copy Text'}
                </button>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {new Date(currentQuery.created_at).toLocaleTimeString()}
                </span>
              </div>
            </div>

            {/* Answer Content with Intelligent Cursor Marker Highlighting */}
            <div style={{ marginBottom: '24px' }}>
              <FormattedGroundedAnswer text={currentQuery.answer_text} />
            </div>

            {/* Evidence & Lessons Panel */}
            <EvidencePanel
              evidence={currentQuery.evidence}
              lessonsUsed={currentQuery.lessons_used}
            />

            {/* Structured Feedback & Critic Panel */}
            <FeedbackPanel
              queryId={currentQuery.query_id}
              onFeedbackSubmitted={() => {}}
            />
          </div>
        </div>
      )}

      {/* Recent Queries History */}
      {history.length > 0 && (
        <div className="bento-card" style={{ padding: '20px 24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: '14px',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
          }}>
            <History size={15} /> Recent Inquiries
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {history.map((h) => (
              <div
                key={h.query_id}
                onClick={() => loadPastQuery(h.query_id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  fontSize: '0.86rem',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-focus)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <HelpCircle size={15} color="var(--text-muted)" shrink={0} />
                  <span style={{
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '650px',
                  }}>
                    {h.question_text}
                  </span>
                </div>
                <span style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.74rem',
                  fontFamily: 'var(--font-mono)',
                  shrink: 0,
                }}>
                  {new Date(h.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
