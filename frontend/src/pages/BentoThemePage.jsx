import React, { useState } from 'react';
import Bento4Section, { FlowCard, AnimatedIcon, palettes } from '@/components/ui/bento-monochrome-1';
import DemoDefault, { CursorMarkerHighlight } from '@/components/ui/marker-highlight';
import { useTheme } from '@/context/ThemeContext';
import { Copy, Check, Sparkles, Code, Layout, Palette, Layers, Highlighter } from 'lucide-react';

const ragGraphFlows = [
  {
    id: "01",
    variant: "orbit",
    meta: "Ingestion",
    title: "Document Ingestion & Slicing",
    description:
      "Course materials, lecture notes, and textbooks are processed through semantic chunking with overlapping windows to preserve pedagogical context.",
    statLabel: "Target Latency",
    statValue: "< 350ms",
  },
  {
    id: "02",
    variant: "relay",
    meta: "Retrieval",
    title: "Hybrid Evidence Streaming",
    description:
      "Dual retrieval lanes combine BM25 exact keyword matching with dense embedding vectors in ChromaDB to capture conceptual and terminological nuance.",
    statLabel: "Recall @ 5",
    statValue: "94.2%",
  },
  {
    id: "03",
    variant: "wave",
    meta: "Synthesis",
    title: "Obsidian 3D Graph Grounding",
    description:
      "Answers are mapped to entities and relations extracted in markdown vaults. Graph traversal grounds generative inference in explicit course taxonomies.",
    statLabel: "Linked Entities",
    statValue: "1,240+",
  },
  {
    id: "04",
    variant: "spark",
    meta: "Validation",
    title: "Critic & Human Verification",
    description:
      "Low-rated answers trigger the AI Critic. State machine gates suspect nodes into pending review, requiring human instructor sign-off before adoption.",
    statLabel: "Approval Gate",
    statValue: "100% Audited",
  },
  {
    id: "05",
    variant: "loop",
    meta: "Memory",
    title: "Continuous Self-Correction Loop",
    description:
      "Verified instructor corrections write back into persistent lesson memory. Future prompts automatically inject active corrections to compound accuracy.",
    statLabel: "Hallucination Delta",
    statValue: "-64%",
  },
];

const ragMetrics = [
  { label: "Grounding Fidelity", value: "99.2%" },
  { label: "Active Lessons", value: "48 verified" },
  { label: "Graph Density", value: "3.4 edges/node" },
];

export default function BentoThemePage() {
  const { theme, toggleTheme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('demo'); // 'demo' | 'rag' | 'tokens'
  const [copiedSnippet, setCopiedSnippet] = useState(null);

  const palette = palettes[theme] || palettes.dark;

  const handleCopy = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const importCode = `// 1. Import Bento Section Demo
import Bento4Section from "@/components/ui/bento-monochrome-1";

export default function DemoOne() {
  return <Bento4Section />;
}

// 2. Import Primitives for Custom Workflows
import { FlowCard, AnimatedIcon, palettes } from "@/components/ui/bento-monochrome-1";
import { useTheme } from "@/context/ThemeContext";`;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Top Navigation Pill Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '32px',
        paddingBottom: '20px',
        borderBottom: '1px solid var(--border-color)',
      }}>
        <div>
          <div className="bento-capsule" style={{ marginBottom: '8px' }}>
            <span className="bento-capsule-dot" style={{ background: isDark ? '#fff' : '#0f172a' }} />
            Design System Foundation
          </div>
          <h1>Bento Monochrome Theme</h1>
          <p style={{ marginTop: '4px' }}>
            Official UI architecture and component primitives for the frontend team.
          </p>
        </div>

        {/* Tab Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--bg-surface-elevated)',
          padding: '4px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--border-color)',
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('demo')}
            className="btn"
            style={{
              padding: '6px 14px',
              fontSize: '0.8rem',
              background: activeTab === 'demo' ? 'var(--text-primary)' : 'transparent',
              color: activeTab === 'demo' ? 'var(--text-inverted)' : 'var(--text-secondary)',
              border: 'none',
              fontWeight: 600,
            }}
          >
            <Layout size={14} /> Full Demo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rag')}
            className="btn"
            style={{
              padding: '6px 14px',
              fontSize: '0.8rem',
              background: activeTab === 'rag' ? 'var(--text-primary)' : 'transparent',
              color: activeTab === 'rag' ? 'var(--text-inverted)' : 'var(--text-secondary)',
              border: 'none',
              fontWeight: 600,
            }}
          >
            <Sparkles size={14} /> RAG-Graph Workflow
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('marker')}
            className="btn"
            style={{
              padding: '6px 14px',
              fontSize: '0.8rem',
              background: activeTab === 'marker' ? 'var(--text-primary)' : 'transparent',
              color: activeTab === 'marker' ? 'var(--text-inverted)' : 'var(--text-secondary)',
              border: 'none',
              fontWeight: 600,
            }}
          >
            <Highlighter size={14} /> Marker Highlight
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tokens')}
            className="btn"
            style={{
              padding: '6px 14px',
              fontSize: '0.8rem',
              background: activeTab === 'tokens' ? 'var(--text-primary)' : 'transparent',
              color: activeTab === 'tokens' ? 'var(--text-inverted)' : 'var(--text-secondary)',
              border: 'none',
              fontWeight: 600,
            }}
          >
            <Code size={14} /> Tokens & Primitives
          </button>
        </div>
      </div>

      {/* Tab 1: Full Demo */}
      {activeTab === 'demo' && (
        <div style={{ borderRadius: 'var(--radius-bento)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          <Bento4Section />
        </div>
      )}

      {/* Tab 2: RAG-Graph Workflow Bento */}
      {activeTab === 'rag' && (
        <div style={{ borderRadius: 'var(--radius-bento)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          <Bento4Section
            flows={ragGraphFlows}
            metrics={ragMetrics}
            pillTag="RAG-Graph Intelligence"
            pillTitle="Pedagogical Engine"
            eyebrow="Neuro-Symbolic Retrieval"
            title="Self-correcting RAG grounded in multi-agent critique and verified knowledge graphs."
            description="Explore each stage of the dual retrieval, 3D graph projection, instructor review gate, and persistent memory loop."
            footerEyebrow="Self-Learning Architecture"
            footerTitle="Every verified critique permanently eliminates recurring failure modes across future queries."
            actionLabel="Explore 3D Graph"
            demoLinkText="Ask Questions"
            onActionClick={() => window.location.href = '/graph'}
            onDemoClick={() => window.location.href = '/ask'}
          />
        </div>
      )}

      {/* Tab 3: Marker Highlight Suite */}
      {activeTab === 'marker' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Remotion Player Demo */}
          <DemoDefault />

          {/* Interactive Text Cursor Showcase */}
          <div className="bento-card">
            <h3 style={{ marginBottom: '8px' }}>Cursor Marker Highlight in Action</h3>
            <p style={{ marginBottom: '20px' }}>
              Whenever the user moves their cursor over text, the marker pen animation smoothly sweeps from left to right with spring physics.
            </p>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              padding: '24px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-color)',
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                  Standard Yellow Marker (#facc15):
                </span>
                <p style={{ fontSize: '1.25rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                  Our RAG system pairs neural embeddings with an explicit{' '}
                  <CursorMarkerHighlight highlight="3D knowledge graph" markerColor="#facc15" />{' '}
                  to eliminate hallucinations and ground student answers in verifiable lecture notes.
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                  Cyan / Sky Variant (#38bdf8):
                </span>
                <p style={{ fontSize: '1.25rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                  When negative student feedback is submitted, the{' '}
                  <CursorMarkerHighlight highlight="AI Critic Agent" markerColor="#38bdf8" highlightedTextColor="#0f172a" />{' '}
                  analyzes missing grounding and queues an instructor review proposal.
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                  Emerald / Verified Variant (#4ade80):
                </span>
                <p style={{ fontSize: '1.25rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                  Once verified by human course instructors, corrections become{' '}
                  <CursorMarkerHighlight highlight="permanent active lessons" markerColor="#4ade80" highlightedTextColor="#052e16" />{' '}
                  preventing repeated errors across all future student sessions.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Integration Snippet */}
          <div className="bento-card">
            <h3 style={{ marginBottom: '12px' }}>How to Use for Any Text the Cursor Moves On</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-main)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>Option A: React Component</div>
                <pre style={{ fontSize: '0.8rem', color: 'var(--text-primary)', overflowX: 'auto' }}>
                  <code>{`import { CursorMarkerHighlight } from "@/components/ui/marker-highlight";

<CursorMarkerHighlight
  highlight="key concept"
  markerColor="#facc15"
/>`}</code>
                </pre>
              </div>

              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-main)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>Option B: Pure CSS Utility Class</div>
                <pre style={{ fontSize: '0.8rem', color: 'var(--text-primary)', overflowX: 'auto' }}>
                  <code>{`<span className="cursor-marker-highlight">
  Text highlighted on cursor move
</span>`}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Tokens & Primitives Guide */}
      {activeTab === 'tokens' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Quick Import Snippet */}
          <div className="bento-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Code size={18} />
                <h3 style={{ margin: 0 }}>Front End Team Integration</h3>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(importCode, 'import')}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
              >
                {copiedSnippet === 'import' ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                {copiedSnippet === 'import' ? 'Copied!' : 'Copy Snippet'}
              </button>
            </div>
            <pre style={{
              background: 'var(--bg-main)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontSize: '0.85rem',
              overflowX: 'auto',
              color: 'var(--text-primary)',
            }}>
              <code>{importCode}</code>
            </pre>
          </div>

          {/* Animated Icons Showcase */}
          <div className="bento-card">
            <h3 style={{ marginBottom: '8px' }}>Animated Micro-Interaction Icons</h3>
            <p style={{ marginBottom: '20px' }}>
              Built-in pure CSS animated SVG/vector icons with high-performance hardware acceleration.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px',
            }}>
              {[
                { variant: 'orbit', name: 'Orbit', desc: 'Rotating Linear Flare' },
                { variant: 'relay', name: 'Relay', desc: 'Skewed Dashed Beam' },
                { variant: 'wave', name: 'Wave', desc: 'Oscillating Fluid Pill' },
                { variant: 'spark', name: 'Spark', desc: 'Concentric Radar Ripples' },
                { variant: 'loop', name: 'Loop', desc: 'Rotating Crosshairs' },
              ].map((item) => (
                <div
                  key={item.variant}
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '9999px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <AnimatedIcon variant={item.variant} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {item.desc}
                    </div>
                  </div>
                  <code style={{
                    fontSize: '0.7rem',
                    background: 'var(--bg-capsule)',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-xs)',
                    color: 'var(--text-secondary)',
                  }}>
                    variant="{item.variant}"
                  </code>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Card Spotlight Demo */}
          <div className="bento-card">
            <h3 style={{ marginBottom: '8px' }}>Interactive Bento Card with Cursor Spotlight</h3>
            <p style={{ marginBottom: '20px' }}>
              Hover your cursor anywhere across the card below to experience the dynamic radial light tracking.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              <FlowCard
                flow={{
                  id: "01",
                  variant: "orbit",
                  meta: "Interactive",
                  title: "Spotlight Glow Container",
                  description:
                    "MouseMove calculations update --bento3-x and --bento3-y to create an ambient radial gradient overlay that follows the user's cursor.",
                  statLabel: "Reaction Time",
                  statValue: "0ms latency",
                }}
                palette={palette}
                index={0}
                visible={true}
              />
              <FlowCard
                flow={{
                  id: "02",
                  variant: "spark",
                  meta: "Telemetry",
                  title: "Metric Capsule Layout",
                  description:
                    "Pill capsules, high uppercase letter-spacing, and rounded corners align every component with the product design rhythm.",
                  statLabel: "CSS Weight",
                  statValue: "< 4.5 kB",
                }}
                palette={palette}
                index={1}
                visible={true}
              />
            </div>
          </div>

          {/* Design System Token Reference Table */}
          <div className="bento-card">
            <h3 style={{ marginBottom: '16px' }}>Theme Tokens Reference</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', color: 'var(--text-muted)', fontWeight: 600 }}>Token</th>
                    <th style={{ padding: '10px 14px', color: 'var(--text-muted)', fontWeight: 600 }}>Night Mode (Dark)</th>
                    <th style={{ padding: '10px 14px', color: 'var(--text-muted)', fontWeight: 600 }}>Day Mode (Light)</th>
                    <th style={{ padding: '10px 14px', color: 'var(--text-muted)', fontWeight: 600 }}>Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { token: '--bg-main', dark: '#0a0a0c', light: '#f8fafc', purpose: 'Root viewport background' },
                    { token: '--bg-card', dark: 'rgba(20, 20, 24, 0.65)', light: 'rgba(255, 255, 255, 0.85)', purpose: 'Bento card surface' },
                    { token: '--border-color', dark: 'rgba(255, 255, 255, 0.10)', light: 'rgba(15, 23, 42, 0.12)', purpose: 'Subtle container borders' },
                    { token: '--grid-color', dark: 'rgba(255, 255, 255, 0.06)', light: 'rgba(17, 17, 17, 0.08)', purpose: 'Masked blueprint grid line color' },
                    { token: '--focus-glow', dark: 'rgba(255, 255, 255, 0.14)', light: 'rgba(15, 23, 42, 0.12)', purpose: 'Cursor radial focus spotlight' },
                    { token: '--icon-stroke', dark: '#f8fafc', light: '#111827', purpose: 'Animated icon primary stroke' },
                  ].map((row) => (
                    <tr key={row.token} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{row.token}</td>
                      <td style={{ padding: '10px 14px' }}><code>{row.dark}</code></td>
                      <td style={{ padding: '10px 14px' }}><code>{row.light}</code></td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{row.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
