import React, { useState } from 'react';
import { ThumbsUp, Check, AlertCircle, Send, Sparkles } from 'lucide-react';
import { apiClient } from '../api/client';

const RATINGS = [
  { value: 'correct', label: 'Correct', color: '#10b981' },
  { value: 'mostly_correct', label: 'Mostly Correct', color: '#34d399' },
  { value: 'partially_correct', label: 'Partially Correct', color: '#f59e0b' },
  { value: 'mostly_incorrect', label: 'Mostly Incorrect', color: '#f97316' },
  { value: 'completely_incorrect', label: 'Completely Incorrect', color: '#ef4444' },
];

export default function FeedbackPanel({ queryId, onFeedbackSubmitted }) {
  const [selectedRating, setSelectedRating] = useState(null);
  const [comment, setComment] = useState('');
  const [correction, setCorrection] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRating) return;

    setSubmitting(true);
    setError(null);
    try {
      await apiClient.submitFeedback(queryId, {
        rating: selectedRating,
        comment_text: comment || null,
        user_correction: correction || null,
      });
      setSubmitted(true);
      if (onFeedbackSubmitted) onFeedbackSubmitted();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="glass-panel" style={{ padding: '20px', marginTop: '20px', textAlign: 'center' }}>
        <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600 }}>
          <Check size={20} /> Thank you! Your feedback has been persistently recorded.
        </div>
        <p style={{ marginTop: '6px', fontSize: '0.85rem' }}>
          If you submitted a correction, the AI Critic has queued a review proposal in the Critic Review tab.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '24px', marginTop: '20px' }}>
      <h3 style={{ fontSize: '1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ThumbsUp size={18} color="#60a5fa" /> Rate Answer & Provide Feedback
      </h3>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Rating selection buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {RATINGS.map((r) => {
            const isSelected = selectedRating === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setSelectedRating(r.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: isSelected ? `2px solid ${r.color}` : '1px solid var(--border-color)',
                  background: isSelected ? `${r.color}20` : 'var(--bg-surface-elevated)',
                  color: isSelected ? '#fff' : 'var(--text-secondary)',
                  fontWeight: isSelected ? 600 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        {/* Correction input */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
            User Correction (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="e.g. In A* search, evaluation function f(n) = g(n) + h(n), where g(n) is path cost."
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
          />
        </div>

        {/* Comment input */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
            Explanation or Comment (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. The generated answer missed the path cost term g(n)."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={!selectedRating || submitting}
          style={{ opacity: !selectedRating || submitting ? 0.6 : 1 }}
        >
          <Send size={15} />
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
}
