import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FileText, 
  MessageSquare, 
  CheckSquare, 
  Network, 
  BarChart2, 
  Activity, 
  Sparkles,
  Layers,
  Sun,
  Moon,
  RefreshCw
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useTheme } from '../context/ThemeContext';

export default function Sidebar() {
  const [health, setHealth] = useState(null);
  const [isWakingOllama, setIsWakingOllama] = useState(false);
  const { theme, toggleTheme, isDark } = useTheme();

  const checkHealth = () => {
    return apiClient.getHealth()
      .then(setHealth)
      .catch(() => setHealth({ status: 'offline', ollama_connected: false }));
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const handleWakeOllama = async () => {
    setIsWakingOllama(true);
    try {
      await apiClient.wakeOllama();
      await checkHealth();
    } catch {
      await checkHealth();
    } finally {
      setIsWakingOllama(false);
    }
  };

  const navItems = [
    { to: '/', label: 'Documents', icon: FileText, tag: '01' },
    { to: '/ask', label: 'Ask & Answers', icon: MessageSquare, tag: '02' },
    { to: '/review', label: 'Critic & Review', icon: CheckSquare, tag: '03' },
    { 
      to: 'http://localhost:8000/graph/view', 
      label: 'Obsidian 3D Graph', 
      icon: Network, 
      tag: '04', 
      isExternal: true 
    },
    { to: '/evaluations', label: 'Evaluations', icon: BarChart2, tag: '05' },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div style={{
        padding: '24px 20px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '9999px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
            }}>
              <Network size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                RAG-Graph
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                Self-Learning
              </div>
            </div>
          </div>

          <span className="bento-capsule" style={{ padding: '3px 8px', fontSize: '9px', letterSpacing: '0.25em' }}>
            <span className="bento-capsule-dot" style={{ background: '#34d399' }} />
            Live
          </span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{
          padding: '0 8px 8px 8px',
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.3em',
          color: 'var(--text-muted)',
          fontWeight: 600,
        }}>
          Workflows
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          if (item.isExternal) {
            return (
              <a
                key={item.label}
                href={item.to}
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-secondary)',
                  background: 'transparent',
                  border: '1px solid transparent',
                  textDecoration: 'none',
                  fontSize: '0.86rem',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.background = 'var(--bg-card-hover)';
                  e.currentTarget.style.border = '1px solid var(--border-color)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.border = '1px solid transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={16} opacity={0.85} />
                  <span>{item.label}</span>
                </div>
                <span style={{
                  fontSize: '9px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.1em',
                }}>
                  {item.tag} ↗
                </span>
              </a>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive ? 'var(--bg-card-hover)' : 'transparent',
                border: isActive ? '1px solid var(--border-focus)' : '1px solid transparent',
                textDecoration: 'none',
                fontSize: '0.86rem',
                fontWeight: isActive ? 600 : 500,
                transition: 'all 0.2s ease',
              })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon size={16} opacity={0.85} />
                <span>{item.label}</span>
              </div>
              <span style={{
                fontSize: '9px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                letterSpacing: '0.1em',
              }}>
                {item.tag}
              </span>
            </NavLink>
          );
        })}
      </nav>

      {/* Theme Toggle & Bottom Service Telemetry */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {/* Bento Theme Switcher Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="bento-theme-toggle"
          style={{ width: '100%', justifyContent: 'space-between' }}
          aria-label="Toggle Night/Day Theme"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isDark ? <Moon size={15} /> : <Sun size={15} />}
            <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              {isDark ? 'Night Mode' : 'Day Mode'}
            </span>
          </div>
          <div className="bento-theme-toggle-dot">
            <span />
          </div>
        </button>

        {/* Backend & Ollama Status */}
        <div style={{
          padding: '10px 12px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-capsule)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.72rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Activity size={12} /> Backend API
            </span>
            <span style={{
              color: health?.status === 'ok' ? '#34d399' : '#f87171',
              fontWeight: 600,
            }}>
              {health?.status === 'ok' ? 'Online' : 'Offline'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Sparkles size={12} /> Ollama LLM
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                color: health?.ollama_connected ? '#34d399' : '#fbbf24',
                fontWeight: 600,
              }}>
                {health?.ollama_connected ? 'Active' : 'Standby'}
              </span>
              <button
                type="button"
                onClick={handleWakeOllama}
                disabled={isWakingOllama}
                title={health?.ollama_connected ? "Refresh Ollama connection" : "Wake & connect Ollama server"}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '3px',
                  borderRadius: 'var(--radius-xs)',
                  color: isWakingOllama ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: isWakingOllama ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isWakingOllama) e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  if (!isWakingOllama) e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                <RefreshCw size={12} className={isWakingOllama ? 'spin' : ''} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
