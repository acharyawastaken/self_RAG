import React, { useState, useEffect } from 'react';
import { 
  Send, 
  HelpCircle, 
  AlertTriangle, 
  BookOpen, 
  Sparkles, 
  CheckCircle2, 
  History, 
  Clock, 
  Filter
} from 'lucide-react';
import { apiClient } from '../api/client';
import EvidencePanel from '../components/EvidencePanel';
import FeedbackPanel from '../components/FeedbackPanel';

export default function AskPage() {
  const [question, setQuestion] = useState('');
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentQuery, setCurrentQuery] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    apiClient.getDocuments().then(setDocuments).catch(() => {});
    apiClient.listQueries(5).then(setHistory).catch(() => {});
  }, []);

  const handleAsk = async (e) => {
    e.preventDefault();
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

  const loadPastQuery = async (queryId) => {
    try {
      setLoading(true);
      const res = await apiClient.getQuery(queryId);
      setCurrentQuery(res);
      setQuestion(res.question_text);
    } catch (err) {
      setError('Failed to load past query');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '980px' }}>
      {/* Page Title */}
      <div style={{ marginBottom: '28px' }}>
        <h1>Ask & Answers</h1>
        <p>Ask questions from your indexed course documents. Answers are strictly grounded in retrieved evidence and prior verified lessons.</p>
      </div>

      {/* Question Form */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
        <form onSubmit={handleAsk}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Your Question:
            </label>
            <textarea
              rows={3}
              placeholder="e.g. What is the evaluation function of A* search and how does consistency affect optimality?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={loading}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '240px' }}>
              <Filter size={15} color="var(--text-muted)" />
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
              >
                <option value="">All Uploaded Documents</option>
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
              style={{ minWidth: '140px' }}
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

      {error && (
        <div style={{
          padding: '14px 18px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)',
          color: '#f87171',
          marginBottom: '24px',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertTriangle size={20} />
          <div>{error}</div>
        </div>
      )}

      {/* Answer Area */}
      {currentQuery && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Insufficient Evidence Warning Banner */}
          {currentQuery.is_insufficient_evidence && (
            <div style={{
              padding: '14px 18px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '0.9rem'
            }}>
              <AlertTriangle size={22} />
              <div>
                <span style={{ fontWeight: 600 }}>Insufficient Context Notice: </span>
                The available evidence in your course documents is weak or missing for this specific topic. The model was instructed not to fabricate ungrounded claims.
              </div>
            </div>
          )}

          {/* Answer Card */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={14} color="#60a5fa" />
                Model: <span style={{ color: 'var(--text-secondary)' }}>{currentQuery.model_name || 'Llama'}</span>
                <span>•</span>
                Prompt: <span style={{ color: 'var(--text-secondary)' }}>{currentQuery.prompt_version}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {new Date(currentQuery.created_at).toLocaleTimeString()}
              </div>
            </div>

            <div style={{
              fontSize: '1.05rem',
              color: 'var(--text-primary)',
              lineHeight: 1.65,
              whiteSpace: 'pre-wrap',
            }}>
              {currentQuery.answer_text}
            </div>

            {/* Evidence & Lessons Panel */}
            <EvidencePanel
              evidence={currentQuery.evidence}
              lessonsUsed={currentQuery.lessons_used}
            />

            {/* Structured Feedback Panel */}
            <FeedbackPanel
              queryId={currentQuery.query_id}
              onFeedbackSubmitted={() => {}}
            />
          </div>
        </div>
      )}

      {/* Recent Queries History */}
      {history.length > 0 && (
        <div className="glass-panel" style={{ marginTop: '36px', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '14px' }}>
            <History size={16} /> Recent Inquiries
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
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface-elevated)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  transition: 'background 0.15s',
                }}
              >
                <span style={{ fontWeight: 500, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '650px' }}>
                  {h.question_text}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
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
