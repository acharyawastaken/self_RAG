import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Trash2, 
  Layers, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X,
  FileCheck
} from 'lucide-react';
import { apiClient } from '../api/client';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDocChunks, setSelectedDocChunks] = useState(null);
  const [activeDocName, setActiveDocName] = useState('');

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getDocuments();
      setDocuments(data);
    } catch (err) {
      setError('Failed to fetch documents: ' + (err.message || 'Server error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      await apiClient.uploadDocument(file);
      await loadDocuments();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to upload document');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document and its indexed vectors?')) return;
    try {
      await apiClient.deleteDocument(docId);
      await loadDocuments();
    } catch (err) {
      alert('Delete failed: ' + (err?.response?.data?.detail || err.message));
    }
  };

  const handleInspectChunks = async (doc) => {
    try {
      setActiveDocName(doc.filename);
      const chunks = await apiClient.getDocumentChunks(doc.document_id);
      setSelectedDocChunks(chunks);
    } catch (err) {
      alert('Failed to load chunks: ' + (err?.response?.data?.detail || err.message));
    }
  };

  const handleRebuildGraph = async (docId) => {
    try {
      await apiClient.rebuildGraph(docId);
      alert('Graph extraction rebuild scheduled in the background.');
    } catch (err) {
      alert('Rebuild failed: ' + (err?.response?.data?.detail || err.message));
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1>Document Library</h1>
        <p>Upload lecture notes, textbooks, and course guides. Text is automatically chunked, embedded, and mapped into the knowledge graph.</p>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)',
          color: '#f87171',
          marginBottom: '20px',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Upload Drop Area */}
      <div className="glass-panel" style={{
        padding: '36px 24px',
        textAlign: 'center',
        marginBottom: '32px',
        border: '2px dashed var(--border-color)',
        cursor: 'pointer',
        position: 'relative'
      }}>
        <input
          type="file"
          accept=".pdf,.docx,.txt,.md"
          onChange={handleFileUpload}
          disabled={uploading}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer'
          }}
        />
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(59, 130, 246, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
          color: '#60a5fa'
        }}>
          {uploading ? <Loader2 size={28} className="animate-spin" /> : <UploadCloud size={28} />}
        </div>
        <div style={{ fontWeight: 600, fontSize: '1.05rem', color: '#fff', marginBottom: '6px' }}>
          {uploading ? 'Parsing and Indexing Document...' : 'Click or Drag & Drop Document Here'}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Supported file formats: PDF, DOCX, Markdown (.md), and TXT (Max 25 MB)
        </div>
      </div>

      {/* Documents Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.15rem', margin: 0 }}>Indexed Documents ({documents.length})</h2>
          <button onClick={loadDocuments} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 10px auto' }} />
            Loading library...
          </div>
        ) : documents.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FileText size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
            <div style={{ fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>No documents uploaded yet</div>
            <div style={{ fontSize: '0.85rem' }}>Upload your first course document above to start indexing concepts.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 24px' }}>Document Name</th>
                  <th style={{ padding: '14px 20px' }}>Type</th>
                  <th style={{ padding: '14px 20px' }}>Status</th>
                  <th style={{ padding: '14px 20px' }}>Chunks</th>
                  <th style={{ padding: '14px 20px' }}>Uploaded</th>
                  <th style={{ padding: '14px 24px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.document_id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FileCheck size={18} color="#60a5fa" />
                      {doc.filename}
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.8rem' }}>
                      {doc.file_type.replace('.', '')}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className={`badge ${doc.ingestion_status === 'indexed' ? 'badge-verified' : 'badge-pending'}`}>
                        {doc.ingestion_status === 'indexed' ? <CheckCircle2 size={12} /> : <Loader2 size={12} className="animate-spin" />}
                        {doc.ingestion_status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                      {doc.chunks_count || 0}
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => handleInspectChunks(doc)}
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                          title="Inspect Chunks"
                        >
                          <Layers size={14} /> Chunks
                        </button>
                        <button
                          onClick={() => handleRebuildGraph(doc.document_id)}
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                          title="Rebuild Graph"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.document_id)}
                          className="btn btn-danger"
                          style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                          title="Delete Document"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Chunks Inspection Modal */}
      {selectedDocChunks && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '850px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                Chunks for: <span style={{ color: '#60a5fa' }}>{activeDocName}</span> ({selectedDocChunks.length})
              </div>
              <button onClick={() => setSelectedDocChunks(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {selectedDocChunks.map((c) => (
                <div key={c.chunk_id} style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 600, color: '#60a5fa' }}>
                      Chunk #{c.chunk_index} {c.section_title ? `• ${c.section_title}` : ''} {c.page_start ? `(p. ${c.page_start})` : ''}
                    </span>
                    <span>{c.token_count} tokens</span>
                  </div>
                  <div style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                    {c.text_content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
