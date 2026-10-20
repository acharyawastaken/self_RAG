import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FileText, 
  MessageSquare, 
  CheckSquare, 
  Network, 
  BarChart2, 
  Activity, 
  Database,
  Sparkles
} from 'lucide-react';
import { apiClient } from '../api/client';

export default function Sidebar() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    apiClient.getHealth()
      .then(setHealth)
      .catch(() => setHealth({ status: 'offline', ollama_connected: false }));
  }, []);

  const navItems = [
    { to: '/', label: 'Documents', icon: FileText },
    { to: '/ask', label: 'Ask & Answers', icon: MessageSquare },
    { to: '/review', label: 'Critic & Review', icon: CheckSquare },
    { to: '/graph', label: 'Obsidian 3D Graph', icon: Network },
    { to: '/evaluations', label: 'Evaluations', icon: BarChart2 },
  ];

  return (
    <aside className="sidebar">
      {/* App Brand Header */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 0 12px rgba(59, 130, 246, 0.5)'
          }}>
            <Network size={18} />
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '1rem', letterSpacing: '-0.02em', color: '#fff' }}>
              RAG-Graph
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Self-Learning Agent
            </div>
          </div>
        </div>
      </div>

      {/* Nav Menu */}
      <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                border: isActive ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: isActive ? 600 : 500,
                transition: 'all 0.15s ease',
              })}
            >
              <Icon size={18} style={{ color: item.to === '/' ? '#60a5fa' : 'inherit' }} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Service Status */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid var(--border-color)',
        background: 'rgba(0, 0, 0, 0.2)',
        fontSize: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={14} /> Backend API
          </span>
          <span style={{ 
            color: health?.status === 'ok' ? '#34d399' : '#f87171',
            fontWeight: 600
          }}>
            {health?.status === 'ok' ? 'Online' : 'Connecting...'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} /> Ollama LLM
          </span>
          <span style={{ 
            color: health?.ollama_connected ? '#34d399' : '#fbbf24',
            fontWeight: 600
          }}>
            {health?.ollama_connected ? 'Active' : 'Offline / Standby'}
          </span>
        </div>
      </div>
    </aside>
  );
}
