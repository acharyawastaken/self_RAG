from typing import Optional, List, Dict, Any
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import HTMLResponse, FileResponse
from sqlalchemy.orm import Session

from backend.app.config import get_settings
from backend.app.db import get_db
from backend.app.models import GraphNode, GraphEdge, FeedbackEvent, Document
from backend.app.schemas import GraphOut, GraphNodeOut, GraphEdgeOut
from backend.app.services.graph_service import get_cytoscape_graph
from backend.app.services.obsidian_service import (
    process_document_with_obsidian,
    sync_obsidian_vault,
)

router = APIRouter(prefix="/graph", tags=["graph"])
settings = get_settings()


@router.get("", response_model=GraphOut)
def fetch_graph(
    document_id: Optional[str] = None,
    status: Optional[str] = None,
    concept: Optional[str] = None,
    limit: int = 150,
    db: Session = Depends(get_db),
):
    return get_cytoscape_graph(
        db=db,
        document_id=document_id,
        status=status,
        concept=concept,
        limit=limit,
    )


@router.get("/nodes/{node_id}")
def get_node_details(node_id: str, db: Session = Depends(get_db)):
    node = db.query(GraphNode).filter(GraphNode.node_id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Graph node not found")

    incident_edges = db.query(GraphEdge).filter(
        (GraphEdge.source_node_id == node_id) | (GraphEdge.target_node_id == node_id)
    ).all()

    return {
        "node": GraphNodeOut(
            id=node.node_id,
            label=node.label,
            type=node.node_type,
            description=node.description,
            status=node.verification_status,
            document_id=node.source_document_id,
            chunk_id=node.source_chunk_id,
        ),
        "edges_count": len(incident_edges),
        "incident_edges": [
            {
                "edge_id": e.edge_id,
                "source": e.source_node_id,
                "target": e.target_node_id,
                "relation": e.relation_type,
                "status": e.verification_status,
                "origin_type": e.origin_type,
            } for e in incident_edges
        ]
    }


@router.get("/edges/{edge_id}")
def get_edge_details(edge_id: str, db: Session = Depends(get_db)):
    edge = db.query(GraphEdge).filter(GraphEdge.edge_id == edge_id).first()
    if not edge:
        raise HTTPException(status_code=404, detail="Graph edge not found")

    events = db.query(FeedbackEvent).filter(FeedbackEvent.edge_id == edge_id).order_by(FeedbackEvent.created_at.desc()).all()

    return {
        "edge": GraphEdgeOut(
            id=edge.edge_id,
            source=edge.source_node_id,
            target=edge.target_node_id,
            relation=edge.relation_type,
            status=edge.verification_status,
            origin_type=edge.origin_type,
            confidence_score=edge.confidence_score,
        ),
        "history": [
            {
                "event_id": ev.event_id,
                "event_type": ev.event_type,
                "payload": ev.event_payload_json,
                "created_at": ev.created_at,
            } for ev in events
        ]
    }


@router.get("/obsidian/vault")
def get_obsidian_vault_info(db: Session = Depends(get_db)):
    vault_path = sync_obsidian_vault(db)
    notes_count = len(list(vault_path.glob("*.md")))
    return {
        "vault_path": vault_path.as_posix(),
        "notes_count": notes_count,
        "obsidian_compatible": True,
        "message": "Vault is ready and can be opened in Obsidian Desktop via Open folder as vault."
    }


@router.post("/rebuild/{document_id}")
def rebuild_document_graph(
    document_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc.storage_path:
        raise HTTPException(status_code=400, detail="Document source file missing on disk")

    background_tasks.add_task(process_document_with_obsidian, document_id, doc.storage_path)
    return {"message": "Obsidian graph rebuild scheduled in background", "document_id": document_id}


@router.get("/view", response_class=HTMLResponse)
def view_standalone_graph():
    """Standalone 3D Obsidian Knowledge Graph served directly as an HTML REST endpoint."""
    html_content = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>3D Obsidian Knowledge Graph (REST API)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/3d-force-graph@1.73.3/dist/3d-force-graph.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #080c14;
      color: #f8fafc;
      font-family: 'Inter', system-ui, sans-serif;
      overflow: hidden;
      width: 100vw;
      height: 100vh;
    }
    #graph-container {
      width: 100vw;
      height: 100vh;
      position: absolute;
      top: 0;
      left: 0;
    }
    .hud-header {
      position: absolute;
      top: 20px;
      left: 24px;
      z-index: 10;
      background: rgba(11, 15, 23, 0.85);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 14px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .hud-title {
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .hud-tag {
      font-size: 0.65rem;
      background: rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 3px 8px;
      border-radius: 9999px;
      text-transform: uppercase;
      font-family: 'JetBrains Mono', monospace;
      letter-spacing: 0.1em;
    }
    .hud-actions {
      display: flex;
      gap: 8px;
    }
    .btn {
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #f8fafc;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 0.78rem;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .btn:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.3);
    }
    .btn.active {
      background: rgba(255, 255, 255, 0.22);
      border-color: rgba(255, 255, 255, 0.5);
      color: #ffffff;
    }
    .hud-legend {
      position: absolute;
      bottom: 24px;
      left: 24px;
      z-index: 10;
      background: rgba(11, 15, 23, 0.85);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 14px;
      padding: 12px 18px;
      font-size: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 6px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #94a3b8;
    }
    .legend-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .hud-inspector {
      position: absolute;
      top: 20px;
      right: 24px;
      width: 320px;
      max-height: calc(100vh - 48px);
      overflow-y: auto;
      z-index: 10;
      background: rgba(11, 15, 23, 0.94);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 18px;
      padding: 20px;
      display: none;
      flex-direction: column;
      gap: 14px;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6);
    }
    .inspector-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #f8fafc;
      word-break: break-word;
    }
    .inspector-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .close-btn {
      position: absolute;
      top: 16px;
      right: 16px;
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 1.2rem;
    }
    .close-btn:hover { color: #fff; }
  </style>
</head>
<body>
  <div id="graph-container"></div>

  <!-- Top Header HUD -->
  <div class="hud-header">
    <div class="hud-title">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
      Obsidian 3D Knowledge Graph
    </div>
    <span class="hud-tag">REST API View</span>
    <div class="hud-actions">
      <button class="btn" id="btn-orbit">Orbit: OFF</button>
      <button class="btn" id="btn-recenter">Recenter</button>
      <button class="btn" id="btn-refresh">Reload API Data</button>
    </div>
  </div>

  <!-- Legend HUD -->
  <div class="hud-legend">
    <div style="font-weight: 600; color: #f8fafc; margin-bottom: 2px;">Verification Statuses</div>
    <div class="legend-item"><span class="legend-dot" style="background:#10b981;"></span> Verified Note</div>
    <div class="legend-item"><span class="legend-dot" style="background:#3b82f6;"></span> Updated After Feedback</div>
    <div class="legend-item"><span class="legend-dot" style="background:#f59e0b;"></span> Pending Correction</div>
    <div class="legend-item"><span class="legend-dot" style="background:#ef4444;"></span> Suspected Problem</div>
    <div class="legend-item"><span class="legend-dot" style="background:#94a3b8;"></span> Unevaluated</div>
  </div>

  <!-- Inspector Drawer -->
  <div class="hud-inspector" id="inspector">
    <button class="close-btn" id="inspector-close">&times;</button>
    <div style="font-size: 0.72rem; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.1em;" id="inspector-type">Entity Details</div>
    <div class="inspector-title" id="inspector-title">-</div>
    <div><span class="inspector-badge" id="inspector-badge">-</span></div>
    <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">
      <div style="font-size: 0.72rem; color: #94a3b8; margin-bottom: 4px;">Description / Details</div>
      <div style="font-size: 0.85rem; color: #cbd5e1; line-height: 1.5;" id="inspector-desc">-</div>
    </div>
  </div>

  <script>
    const STATUS_COLORS = {
      unevaluated: '#94a3b8',
      suspected_problem: '#ef4444',
      pending_correction: '#f59e0b',
      verified: '#10b981',
      updated_after_feedback: '#3b82f6'
    };

    function createTextSprite(text, color) {
      const canvas = document.createElement('canvas');
      canvas.width = 384;
      canvas.height = 80;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(0, 0, 0, 0)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

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
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture, depthWrite: false, transparent: true });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(38, 8, 1);
      return sprite;
    }

    const container = document.getElementById('graph-container');
    const Graph = ForceGraph3D()(container)
      .backgroundColor('#080c14')
      .showNavInfo(false)
      .nodeId('id')
      .nodeLabel(n => `${n.label} [${(n.status || 'unevaluated').toUpperCase()}]`)
      .nodeThreeObject(node => {
        const group = new THREE.Group();
        const radius = Math.min(14, Math.max(4.5, (node.degree || 1) * 2));
        const sphereGeo = new THREE.SphereGeometry(radius, 24, 24);
        const sphereMat = new THREE.MeshPhongMaterial({
          color: node.color,
          emissive: node.color,
          emissiveIntensity: 0.35,
          shininess: 90,
          transparent: true,
          opacity: 0.92
        });
        group.add(new THREE.Mesh(sphereGeo, sphereMat));

        const labelSprite = createTextSprite(node.label, node.color);
        labelSprite.position.set(0, radius + 8, 0);
        group.add(labelSprite);
        return group;
      })
      .linkSource('source')
      .linkTarget('target')
      .linkLabel(l => l.relation || '')
      .linkColor(l => l.color)
      .linkWidth(1.4)
      .linkDirectionalParticles(2)
      .linkDirectionalParticleWidth(1.8)
      .linkDirectionalParticleSpeed(0.005)
      .linkDirectionalArrowLength(4)
      .linkDirectionalArrowRelPos(1)
      .onNodeClick(node => {
        const distance = 85;
        const distRatio = 1 + distance / Math.hypot(node.x || 1, node.y || 1, node.z || 1);
        Graph.cameraPosition(
          { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
          node,
          1200
        );
        showInspector('node', node);
      })
      .onLinkClick(link => {
        showInspector('link', link);
      })
      .onBackgroundClick(() => {
        document.getElementById('inspector').style.display = 'none';
      });

    // Ambient and directional light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    Graph.scene().add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.65);
    dirLight.position.set(100, 200, 150);
    Graph.scene().add(dirLight);

    async function fetchAndRenderGraph() {
      try {
        const res = await fetch('/graph');
        const data = await res.json();
        
        const degrees = {};
        data.edges.forEach(e => {
          degrees[e.source] = (degrees[e.source] || 0) + 1;
          degrees[e.target] = (degrees[e.target] || 0) + 1;
        });

        const nodes = data.nodes.map(n => ({
          id: n.id,
          label: n.label,
          type: n.type,
          status: n.status || 'unevaluated',
          color: STATUS_COLORS[n.status] || '#94a3b8',
          description: n.description,
          degree: degrees[n.id] || 1
        }));

        const links = data.edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          relation: e.relation,
          status: e.status || 'unevaluated',
          color: STATUS_COLORS[e.status] ? `${STATUS_COLORS[e.status]}88` : 'rgba(148, 163, 184, 0.35)'
        }));

        Graph.graphData({ nodes, links });
      } catch (err) {
        console.error('Error fetching graph via REST API:', err);
      }
    }

    function showInspector(type, data) {
      const inspector = document.getElementById('inspector');
      inspector.style.display = 'flex';
      const badge = document.getElementById('inspector-badge');
      const stColor = STATUS_COLORS[data.status] || '#94a3b8';
      badge.style.background = stColor + '25';
      badge.style.color = stColor;
      badge.style.border = `1px solid ${stColor}`;
      badge.innerText = data.status || 'unevaluated';

      if (type === 'node') {
        document.getElementById('inspector-type').innerText = 'Obsidian Concept Note';
        document.getElementById('inspector-title').innerText = data.label;
        document.getElementById('inspector-desc').innerText = data.description || 'Obsidian knowledge note extracted from ingested documentation.';
      } else {
        document.getElementById('inspector-type').innerText = 'Knowledge Relationship';
        document.getElementById('inspector-title').innerText = (data.relation || 'RELATED_TO').replace(/_/g, ' ');
        const s = typeof data.source === 'object' ? data.source.label : data.source;
        const t = typeof data.target === 'object' ? data.target.label : data.target;
        document.getElementById('inspector-desc').innerText = `Connects Note "${s}" ➔ Note "${t}"`;
      }
    }

    document.getElementById('inspector-close').onclick = () => {
      document.getElementById('inspector').style.display = 'none';
    };

    // Auto rotate controls
    let autoRotate = false;
    let animFrame = null;
    const btnOrbit = document.getElementById('btn-orbit');
    btnOrbit.onclick = () => {
      autoRotate = !autoRotate;
      btnOrbit.innerText = autoRotate ? 'Orbit: ON' : 'Orbit: OFF';
      btnOrbit.classList.toggle('active', autoRotate);
      if (autoRotate) {
        let angle = 0;
        const dist = 380;
        const loop = () => {
          angle += Math.PI / 1200;
          Graph.cameraPosition({ x: dist * Math.sin(angle), z: dist * Math.cos(angle) });
          animFrame = requestAnimationFrame(loop);
        };
        loop();
      } else {
        if (animFrame) cancelAnimationFrame(animFrame);
      }
    };

    document.getElementById('btn-recenter').onclick = () => {
      Graph.cameraPosition({ x: 0, y: 0, z: 380 }, { x: 0, y: 0, z: 0 }, 1000);
    };

    document.getElementById('btn-refresh').onclick = () => {
      fetchAndRenderGraph();
    };

    window.addEventListener('resize', () => {
      Graph.width(window.innerWidth).height(window.innerHeight);
    });

    fetchAndRenderGraph();
  </script>
</body>
</html>
"""
    return HTMLResponse(content=html_content)

