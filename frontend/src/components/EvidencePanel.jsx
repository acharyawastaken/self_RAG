import React, { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen, ExternalLink, Sparkles } from 'lucide-react';

export default function EvidencePanel({ evidence = [], lessonsUsed = [] }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!evidence.length && !lessonsUsed.length) {
    return null;
  }

  return (
    <div className="glass-panel" style={{ marginTop: '20px', overflow: 'hidden' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: 'none',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.9rem',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={16} color="#60a5fa" />
          Retrieved Evidence & Verified Lessons ({evidence.length + lessonsUsed.length})
        </span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isOpen && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Lessons section */}
          {lessonsUsed.length > 0 && (
            <div>
              <div style={{ 
                fontSize: '0.75rem', 
                textTransform: 'uppercase', 
                color: '#34d399', 
                fontWeight: 700, 
                letterSpacing: '0.05em', 
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Sparkles size={14} /> Active Verified Lessons
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {lessonsUsed.map((l, idx) => (
                  <div key={l.lesson_id} style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    fontSize: '0.85rem'
                  }}>
                    <div style={{ fontWeight: 600, color: '#34d399', marginBottom: '4px' }}>
                      [L{idx + 1}] {l.title}
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      {l.correction_text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chunks section */}
          {evidence.length > 0 && (
            <div>
              <div style={{ 
                fontSize: '0.75rem', 
                textTransform: 'uppercase', 
                color: 'var(--text-muted)', 
                fontWeight: 700, 
                letterSpacing: '0.05em', 
                marginBottom: '8px' 
              }}>
                Retrieved Document Chunks
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {evidence.map((c) => (
                  <div key={c.chunk_id} style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.85rem'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      marginBottom: '6px',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)'
                    }}>
                      <span style={{ fontWeight: 600, color: '#60a5fa' }}>
                        [C{c.rank_position}] {c.filename} {c.section_title ? `• ${c.section_title}` : ''} {c.page_start ? `(p. ${c.page_start})` : ''}
                      </span>
                      <span>Similarity: {(c.similarity_score * 100).toFixed(1)}%</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {c.text_content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
