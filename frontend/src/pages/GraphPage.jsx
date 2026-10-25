import React, { useState, useEffect, useRef, useMemo } from 'react';
import ForceGraph3D from '3d-force-graph';
import * as THREE from 'three';
import { 
  Network, 
  Filter, 
  Search, 
  RefreshCw, 
  RotateCw,
  Compass,
  Sliders,
  Maximize2,
  Minimize2,
  FolderOpen,
  Info, 
  X,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';

import { apiClient } from '../api/client';
import StatusBadge from '../components/StatusBadge';

const STATUS_COLORS = {
  unevaluated: '#94a3b8',
  suspected_problem: '#ef4444',
  pending_correction: '#f59e0b',
  verified: '#10b981',
  updated_after_feedback: '#3b82f6',
};

// Canvas text sprite generator for Obsidian-style floating 3D labels
function createTextSprite(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0, 0, 0, 0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Background pill for label contrast
  ctx.fillStyle = 'rgba(11, 15, 23, 0.75)';
  const radius = 16;
  const x = 16, y = 14, w = canvas.width - 32, h = canvas.height - 28;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = color || 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = 'bold 22px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const display = text.length > 24 ? text.substring(0, 22) + '...' : text;
  ctx.fillText(display, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMaterial = new THREE.SpriteMaterial({ 
    map: texture, 
    depthWrite: false,
    transparent: true,
  });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(38, 8, 1);
  return sprite;
}

export default function GraphPage() {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState(null);
  
  // Obsidian 3D dynamic controls
  const [autoRotate, setAutoRotate] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [linkDistance, setLinkDistance] = useState(120);
  const [chargeStrength, setChargeStrength] = useState(-180);
  const [vaultInfo, setVaultInfo] = useState(null);

  const containerRef = useRef(null);
  const fgRef = useRef(null);
  const animFrameRef = useRef(null);

  // Load graph data
  const loadGraph = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getGraph({
        document_id: selectedDocId || undefined,
        status: statusFilter || undefined,
        concept: searchTerm || undefined,
      });
      setGraphData(data);
    } catch (err) {
      console.error('Failed to load graph:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiClient.getDocuments().then(setDocuments).catch(() => {});
    apiClient.getObsidianVaultInfo().then(setVaultInfo).catch(() => {});
  }, []);

  useEffect(() => {
    loadGraph();
  }, [selectedDocId, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadGraph();
  };

  // Compute node degree for Obsidian-style dynamic node sizing
  const nodeDegrees = useMemo(() => {
    const degrees = {};
    graphData.edges.forEach((e) => {
      degrees[e.source] = (degrees[e.source] || 0) + 1;
      degrees[e.target] = (degrees[e.target] || 0) + 1;
    });
    return degrees;
  }, [graphData]);

  // Format nodes and links for 3d-force-graph
  const formattedData = useMemo(() => {
    const nodes = graphData.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      type: n.type,
      status: n.status || 'unevaluated',
      color: STATUS_COLORS[n.status] || '#94a3b8',
      document_id: n.document_id,
      chunk_id: n.chunk_id,
      description: n.description,
      degree: nodeDegrees[n.id] || 1,
    }));

    const links = graphData.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      relation: e.relation,
      status: e.status || 'unevaluated',
      origin_type: e.origin_type,
      color: STATUS_COLORS[e.status] ? `${STATUS_COLORS[e.status]}88` : 'rgba(148, 163, 184, 0.35)',
    }));

    return { nodes, links };
  }, [graphData, nodeDegrees]);

  // Initialize and update 3D Force Graph
  useEffect(() => {
    if (!containerRef.current) return;

    if (!fgRef.current) {
      const fg = ForceGraph3D()(containerRef.current)
        .backgroundColor('#080c14')
        .showNavInfo(false)
        .nodeId('id')
        .nodeLabel((n) => `${n.label} [${n.status.toUpperCase()}]`)
        .nodeThreeObject((node) => {
          const group = new THREE.Group();
          
          // Dynamic radius: degree scales from 4 to 12
          const radius = Math.min(14, Math.max(4.5, (node.degree || 1) * 2));
          const sphereGeo = new THREE.SphereGeometry(radius, 24, 24);
          
          const sphereMat = new THREE.MeshPhongMaterial({
            color: node.color,
            emissive: node.color,
            emissiveIntensity: 0.35,
            shininess: 90,
            transparent: true,
            opacity: 0.92,
          });
          const sphere = new THREE.Mesh(sphereGeo, sphereMat);
          group.add(sphere);

          // Obsidian 3D floating text label
          const labelSprite = createTextSprite(node.label, node.color);
          labelSprite.position.set(0, radius + 8, 0);
          group.add(labelSprite);

          return group;
        })
        .linkSource('source')
        .linkTarget('target')
        .linkLabel((l) => (l.relation ? l.relation.replace('_', ' ') : ''))
        .linkColor((l) => l.color)
        .linkWidth(1.4)
        .linkDirectionalParticles(2)
        .linkDirectionalParticleWidth(1.8)
        .linkDirectionalParticleSpeed(0.005)
        .linkDirectionalArrowLength(4)
        .linkDirectionalArrowRelPos(1)
        .onNodeClick((node) => {
          // Smoothly fly camera to node in 3D space
          const distance = 85;
          const distRatio = 1 + distance / Math.hypot(node.x || 1, node.y || 1, node.z || 1);
          fg.cameraPosition(
            { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
            node,
            1200
          );
          setSelectedEntity({ type: 'node', data: node });
        })
        .onLinkClick((link) => {
          setSelectedEntity({ type: 'edge', data: link });
        })
        .onBackgroundClick(() => {
          setSelectedEntity(null);
        });

      // Lighting for 3D realism
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
      fg.scene().add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
      dirLight.position.set(100, 200, 150);
      fg.scene().add(dirLight);

      fgRef.current = fg;
    }

    // Pass data
    fgRef.current.graphData(formattedData);

    // Physics parameters
    fgRef.current.d3Force('link').distance(linkDistance);
    fgRef.current.d3Force('charge').strength(chargeStrength);

    // Resize handler
    const handleResize = () => {
      if (containerRef.current && fgRef.current) {
        fgRef.current.width(containerRef.current.clientWidth);
        fgRef.current.height(containerRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [formattedData, linkDistance, chargeStrength]);

  // Dynamic 3D Auto-Rotation (Orbit Mode)
  useEffect(() => {
    if (!fgRef.current) return;

    if (autoRotate) {
      let angle = 0;
      const distance = 380;
      const rotateLoop = () => {
        angle += Math.PI / 1200;
        fgRef.current.cameraPosition({
          x: distance * Math.sin(angle),
          z: distance * Math.cos(angle),
        });
        animFrameRef.current = requestAnimationFrame(rotateLoop);
      };
      rotateLoop();
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [autoRotate]);

  // Center / reset camera view
  const handleResetCamera = () => {
    if (fgRef.current) {
      fgRef.current.cameraPosition({ x: 0, y: 0, z: 380 }, { x: 0, y: 0, z: 0 }, 1000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Compass className="icon-pulse" size={28} style={{ color: 'var(--text-primary)' }} />
            Obsidian 3D Knowledge Graph
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Interactive rotatable 3D force-directed knowledge graph with real-time feedback verification badges.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {vaultInfo && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-capsule)',
              border: '1px solid var(--border-color)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
            }}>
              <FolderOpen size={14} />
              <span>Obsidian Vault: <strong style={{ color: 'var(--text-primary)' }}>{vaultInfo.notes_count} Notes</strong></span>
            </div>
          )}

          <a
            href="http://localhost:8000/graph/view"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            title="Open standalone 3D Obsidian graph via REST API endpoint in a separate window/tab"
          >
            <ExternalLink size={16} />
            <span>Open in Tab (REST API)</span>
          </a>

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className="btn btn-secondary"
            style={{
              background: autoRotate ? 'var(--bg-card-hover)' : undefined,
              borderColor: autoRotate ? 'var(--border-focus)' : undefined,
              color: autoRotate ? 'var(--text-primary)' : undefined,
            }}
            title="Auto-rotate graph in 3D orbit"
          >
            <RotateCw size={16} className={autoRotate ? 'spin' : ''} />
            <span>{autoRotate ? 'Orbit: ON' : 'Orbit: OFF'}</span>
          </button>


          <button
            onClick={handleResetCamera}
            className="btn btn-secondary"
            title="Recenter 3D Camera"
          >
            <Maximize2 size={16} />
            <span>Center View</span>
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="btn btn-secondary"
            title="Adjust 3D Physics"
          >
            <Sliders size={16} />
            <span>Physics</span>
          </button>

          <button
            onClick={loadGraph}
            className="btn btn-secondary"
            disabled={loading}
            title="Refresh graph"
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel" style={{ padding: '14px 20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Document Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} style={{ color: 'var(--text-muted)' }} />
          <select
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            style={{
              background: 'var(--bg-surface-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '6px 12px',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer',
              minWidth: '180px',
            }}
          >
            <option value="">All Documents (Full Vault)</option>
            {documents.map((d) => (
              <option key={d.document_id} value={d.document_id}>
                {d.filename}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter Badges */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setStatusFilter('')}
            style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: statusFilter === '' ? 'var(--text-primary)' : 'rgba(255, 255, 255, 0.05)',
              color: statusFilter === '' ? 'var(--bg-main)' : 'var(--text-muted)',
              border: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            All
          </button>
          {Object.entries(STATUS_COLORS).map(([st, color]) => (
            <button
              key={st}
              onClick={() => setStatusFilter(statusFilter === st ? '' : st)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: statusFilter === st ? `${color}25` : 'rgba(255, 255, 255, 0.05)',
                color: statusFilter === st ? color : 'var(--text-muted)',
                border: statusFilter === st ? `1px solid ${color}` : '1px solid transparent',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search concepts..."
              style={{
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 12px 6px 32px',
                fontSize: '0.85rem',
                outline: 'none',
                width: '180px',
              }}
            />
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
          </div>
        </form>
      </div>

      {/* Main 3D Canvas Area */}
      <div style={{ height: '80vh', minHeight: '80vh', flexShrink: 0, position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        {/* 3D Force Graph WebGL Container */}
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {/* Loading overlay */}
        {loading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(8, 12, 20, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            zIndex: 10,
          }}>
            <RefreshCw className="spin" size={32} style={{ color: 'var(--text-primary)' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Simulating 3D Obsidian Physics...
            </span>
          </div>
        )}

        {/* Controls Overlay Legend & Instructions */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          background: 'rgba(11, 15, 23, 0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          fontSize: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none',
          boxShadow: 'var(--shadow-glass)',
        }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} style={{ color: 'var(--text-primary)' }} />
            3D Navigation
          </div>
          <div style={{ color: 'var(--text-muted)' }}>• <strong>Left Click + Drag:</strong> Rotate 3D Orbit</div>
          <div style={{ color: 'var(--text-muted)' }}>• <strong>Right Click + Drag:</strong> Pan 3D Camera</div>
          <div style={{ color: 'var(--text-muted)' }}>• <strong>Scroll Wheel:</strong> Zoom In / Out</div>
          <div style={{ color: 'var(--text-muted)' }}>• <strong>Click Node:</strong> Focus & Inspect Note</div>
        </div>

        {/* Floating Physics Controls Panel */}
        {showSettings && (
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'rgba(11, 15, 23, 0.92)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            width: '240px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            fontSize: '0.8rem',
            boxShadow: 'var(--shadow-card)',
            zIndex: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: '#f8fafc' }}>Obsidian Physics</span>
              <X size={14} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setShowSettings(false)} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Link Distance</span>
                <span style={{ color: 'var(--text-primary)' }}>{linkDistance}</span>
              </div>
              <input
                type="range"
                min="50"
                max="300"
                value={linkDistance}
                onChange={(e) => setLinkDistance(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Node Repulsion</span>
                <span style={{ color: 'var(--text-primary)' }}>{chargeStrength}</span>
              </div>
              <input
                type="range"
                min="-500"
                max="-50"
                value={chargeStrength}
                onChange={(e) => setChargeStrength(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--text-primary)' }}
              />
            </div>
          </div>
        )}

        {/* Selected Entity Drawer */}
        {selectedEntity && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            bottom: '20px',
            width: '340px',
            background: 'rgba(17, 24, 39, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflowY: 'auto',
            zIndex: 30,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {selectedEntity.type === 'node' ? 'Obsidian Concept Note' : 'Knowledge Relationship'}
              </span>
              <button
                onClick={() => setSelectedEntity(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {selectedEntity.type === 'node' ? (
              <>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    {selectedEntity.data.label}
                  </h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <StatusBadge status={selectedEntity.data.status} />
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: 'var(--text-secondary)',
                    }}>
                      Degree: {selectedEntity.data.degree}
                    </span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Note Description</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {selectedEntity.data.description || 'Obsidian note node extracted from document content.'}
                  </div>
                </div>

                {selectedEntity.data.chunk_id && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Source Chunk ID</div>
                    <code style={{ fontSize: '0.75rem', color: '#60a5fa', wordBreak: 'break-all' }}>
                      {selectedEntity.data.chunk_id}
                    </code>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    {selectedEntity.data.relation.replace(/_/g, ' ').toUpperCase()}
                  </h3>
                  <StatusBadge status={selectedEntity.data.status} />
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Link Endpoints</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    <div>From: <strong>{selectedEntity.data.source.label || selectedEntity.data.source}</strong></div>
                    <div style={{ marginTop: '4px' }}>To: <strong>{selectedEntity.data.target.label || selectedEntity.data.target}</strong></div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Origin Type</div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {selectedEntity.data.origin_type || 'obsidian_extracted'}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
