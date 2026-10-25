import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { 
  BarChart2, 
  Play, 
  Loader2, 
  Clock, 
  Target, 
  CheckCircle, 
  BookOpen, 
  RefreshCw 
} from 'lucide-react';
import { apiClient } from '../api/client';

export default function EvaluationsPage() {
  const [evaluations, setEvaluations] = useState([]);
  const [running, setRunning] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadEvaluations = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getEvaluations();
      setEvaluations(data);
    } catch (err) {
      setError('Failed to fetch evaluations: ' + (err.message || 'Server error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvaluations();
  }, []);

  const handleRunEvaluation = async (e) => {
    e.preventDefault();
    setRunning(true);
    setError(null);
    try {
      await apiClient.runEvaluation('ai_intro_v1', notes);
      setNotes('');
      await loadEvaluations();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Evaluation run failed. Ensure documents and Ollama are ready.');
    } finally {
      setRunning(false);
    }
  };

  const latestRun = evaluations[0];
  const chartData = [...evaluations].reverse().map((r, i) => ({
    name: `Run #${i + 1}`,
    Accuracy: ((r.metrics?.mean_accuracy || 0) * 100).toFixed(1),
    Recall: ((r.metrics?.retrieval_recall_at_k || 0) * 100).toFixed(1),
    Citations: ((r.metrics?.source_support_rate || 0) * 100).toFixed(1),
  }));

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1>Evaluation Dashboard</h1>
        <p>Benchmark system performance on a fixed 20-question academic test set. Measure empirical improvement across feedback learning cycles.</p>
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

      {/* Trigger Evaluation Run Card */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.15rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Play size={18} color="#60a5fa" /> Run Fixed Test Set Evaluation
        </h2>
        <form onSubmit={handleRunEvaluation} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Add run notes (e.g. 'Post-feedback loop on A* heuristics', 'Baseline test')..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={running}
            style={{ flex: 1, minWidth: '300px' }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={running}
            style={{ minWidth: '160px' }}
          >
            {running ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Evaluating 20 Qs...
              </>
            ) : (
              <>
                <Play size={15} /> Execute Benchmark
              </>
            )}
          </button>
        </form>
      </div>

      {/* Summary KPI Cards for Latest Run */}
      {latestRun && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Target size={15} color="#34d399" /> Mean Accuracy
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {((latestRun.metrics?.mean_accuracy || 0) * 100).toFixed(1)}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Fact coverage vs ground truth
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <CheckCircle size={15} color="#60a5fa" /> Retrieval Recall@k
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {((latestRun.metrics?.retrieval_recall_at_k || 0) * 100).toFixed(1)}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Evidence coverage in top-k
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <BookOpen size={15} color="#a78bfa" /> Source Support
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {((latestRun.metrics?.source_support_rate || 0) * 100).toFixed(1)}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Answers citing [C] chunks
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Clock size={15} color="#fbbf24" /> Median Latency
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {latestRun.metrics?.median_latency_s || 0}s
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              End-to-end response time
            </div>
          </div>
        </div>
      )}

      {/* Historical Progress Chart */}
      {evaluations.length > 1 && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '1.15rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={18} color="#60a5fa" /> Historical Learning Progression
          </h2>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: 'var(--border-color)',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Legend />
                <Bar dataKey="Accuracy" fill="#34d399" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Recall" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Citations" fill="#a78bfa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Runs Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.15rem', margin: 0 }}>All Benchmark Runs ({evaluations.length})</h2>
          <button onClick={loadEvaluations} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading runs...
          </div>
        ) : evaluations.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No evaluation runs recorded yet. Execute the benchmark above to record baseline performance.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 20px' }}>Run Time</th>
                  <th style={{ padding: '14px 20px' }}>Dataset</th>
                  <th style={{ padding: '14px 20px' }}>Accuracy</th>
                  <th style={{ padding: '14px 20px' }}>Recall@k</th>
                  <th style={{ padding: '14px 20px' }}>Source Support</th>
                  <th style={{ padding: '14px 20px' }}>Latency</th>
                  <th style={{ padding: '14px 20px' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((run) => (
                  <tr key={run.evaluation_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 20px', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {new Date(run.started_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>
                      {run.dataset_version}
                    </td>
                    <td style={{ padding: '14px 20px', color: '#34d399', fontWeight: 600 }}>
                      {((run.metrics?.mean_accuracy || 0) * 100).toFixed(1)}%
                    </td>
                    <td style={{ padding: '14px 20px', color: '#60a5fa', fontWeight: 600 }}>
                      {((run.metrics?.retrieval_recall_at_k || 0) * 100).toFixed(1)}%
                    </td>
                    <td style={{ padding: '14px 20px', color: '#a78bfa' }}>
                      {((run.metrics?.source_support_rate || 0) * 100).toFixed(1)}%
                    </td>
                    <td style={{ padding: '14px 20px', color: '#fbbf24' }}>
                      {run.metrics?.median_latency_s}s
                    </td>
                    <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontStyle: run.notes ? 'normal' : 'italic' }}>
                      {run.notes || 'Baseline'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
