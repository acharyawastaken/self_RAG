import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Sparkles, 
  AlertTriangle, 
  BookOpen, 
  Clock, 
  RefreshCw,
  Search
} from 'lucide-react';
import { apiClient } from '../api/client';
import StatusBadge from '../components/StatusBadge';

export default function ReviewPage() {
  const [critiques, setCritiques] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [activeTab, setActiveTab] = useState('proposals'); // 'proposals' | 'lessons'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit modal / inline editing state
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [reviewerNote, setReviewerNote] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [critiqueList, lessonList] = await Promise.all([
        apiClient.listCritiques(),
        apiClient.getLessons('verified'),
      ]);
      setCritiques(critiqueList);
      setLessons(lessonList);
    } catch (err) {
      setError('Failed to load review data: ' + (err.message || 'Server error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDecision = async (critiqueId, decision, customCorrection = null) => {
    try {
      await apiClient.verifyCorrection(critiqueId, {
        decision,
        verification_method: 'human_approval',
        reviewer_note: reviewerNote || (decision === 'approve' ? 'Approved by reviewer' : 'Rejected by reviewer'),
        edited_correction: customCorrection,
      });
      setEditingId(null);
      setEditText('');
      setReviewerNote('');
      await loadData();
    } catch (err) {
      alert('Action failed: ' + (err?.response?.data?.detail || err.message));
    }
  };

  const pendingProposals = critiques.filter((c) => c.status === 'proposed');

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1>Critic & Human Review</h1>
        <p>Review the AI Critic's failure classifications and proposed corrections. Only verified corrections become active memory and update trusted graph relationships.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('proposals')}
          className="btn"
          style={{
            background: activeTab === 'proposals' ? 'var(--bg-surface-elevated)' : 'transparent',
            color: activeTab === 'proposals' ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: activeTab === 'proposals' ? '1px solid var(--border-color)' : '1px solid transparent',
          }}
        >
          <Clock size={16} color="#fbbf24" />
          Pending Proposals ({pendingProposals.length})
        </button>
        <button
          onClick={() => setActiveTab('lessons')}
          className="btn"
          style={{
            background: activeTab === 'lessons' ? 'var(--bg-surface-elevated)' : 'transparent',
            color: activeTab === 'lessons' ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: activeTab === 'lessons' ? '1px solid var(--border-color)' : '1px solid transparent',
          }}
        >
          <Sparkles size={16} color="#34d399" />
          Active Verified Lessons ({lessons.length})
        </button>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#f87171',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
        }}>
          {error}
        </div>
      )}

      {/* Tab 1: Proposals Queue */}
      {activeTab === 'proposals' && (
        <div>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading proposals...
            </div>
          ) : pendingProposals.length === 0 ? (
            <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={40} style={{ margin: '0 auto 12px auto', color: '#10b981', opacity: 0.8 }} />
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Review Queue Clear</div>
              <p style={{ fontSize: '0.85rem' }}>No correction proposals currently awaiting verification. Negative student ratings will automatically populate proposals here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {pendingProposals.map((c) => {
                const isEditing = editingId === c.critique_id;
                return (
                  <div key={c.critique_id} className="glass-panel" style={{ padding: '24px' }}>
                    {/* Top status bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-full)',
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}>
                          {c.failure_category.replace('_', ' ')}
                        </span>
                        <StatusBadge status="pending_correction" />
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(c.created_at).toLocaleString()}
                      </div>
                    </div>

                    {/* Diagnosis explanation */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                        Critic Diagnosis
                      </div>
                      <div style={{ color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                        {c.explanation}
                      </div>
                    </div>

                    {/* Affected Concepts */}
                    {c.affected_concepts?.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '6px' }}>
                          Affected Concepts in Knowledge Graph
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {c.affected_concepts.map((concept, i) => (
                            <span key={i} style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: 'var(--bg-surface-elevated)',
                              border: '1px solid var(--border-color)',
                              fontSize: '0.8rem',
                              color: '#93c5fd'
                            }}>
                              #{concept}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Proposed Correction */}
                    <div style={{
                      padding: '16px',
                      background: 'rgba(59, 130, 246, 0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '20px'
                    }}>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#60a5fa', fontWeight: 700, marginBottom: '6px' }}>
                        Proposed Fact / Lesson
                      </div>
                      {isEditing ? (
                        <textarea
                          rows={3}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          style={{ width: '100%', marginBottom: '10px' }}
                        />
                      ) : (
                        <div style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 500 }}>
                          {c.proposed_correction || 'No specific text correction supplied.'}
                        </div>
                      )}

                      {/* Optional reviewer note input */}
                      {isEditing && (
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                            Reviewer Verification Note:
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Verified against textbook Chapter 3, page 42"
                            value={reviewerNote}
                            onChange={(e) => setReviewerNote(e.target.value)}
                            style={{ fontSize: '0.85rem' }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => setEditingId(null)}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.85rem' }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDecision(c.critique_id, 'approve', editText)}
                            className="btn btn-primary"
                            style={{ fontSize: '0.85rem' }}
                          >
                            <CheckCircle2 size={16} /> Save & Approve
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(c.critique_id);
                              setEditText(c.proposed_correction || '');
                            }}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.85rem' }}
                          >
                            <Edit3 size={15} /> Edit Proposal
                          </button>
                          <button
                            onClick={() => handleDecision(c.critique_id, 'reject')}
                            className="btn btn-danger"
                            style={{ fontSize: '0.85rem' }}
                          >
                            <XCircle size={15} /> Reject
                          </button>
                          <button
                            onClick={() => handleDecision(c.critique_id, 'approve')}
                            className="btn btn-primary"
                            style={{ fontSize: '0.85rem' }}
                          >
                            <CheckCircle2 size={15} /> Approve as Lesson
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Verified Lessons */}
      {activeTab === 'lessons' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.15rem', marginBottom: '16px' }}>
            Active Verified Lessons ({lessons.length})
          </h2>
          {lessons.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
              No verified lessons stored yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {lessons.map((l) => (
                <div key={l.lesson_id} style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-color)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 600, color: '#34d399', fontSize: '1rem' }}>
                      {l.title}
                    </div>
                    <StatusBadge status="verified" />
                  </div>
                  <div style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '0.9rem' }}>
                    {l.correction_text}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '16px' }}>
                    <span>Method: {l.verification_method}</span>
                    <span>Saved: {new Date(l.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
