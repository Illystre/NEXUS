import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  Layers, AlignJustify, LayoutGrid, Activity, Clock,
  Image as ImageIcon, Network, HardDrive, Plus, Settings,
  Menu, RefreshCw, LogOut, ChevronDown, Globe,
  Server, Box, CheckCircle2, XCircle, RotateCcw
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import ContainerList from './ContainerList';
import StackView from './StackView';
import MetricsView from './MetricsView';
import TableView from './TableView';
import SettingsView from './SettingsView';
import EventsView from './EventsView';
import AlertPanel from './AlertPanel';
import DeployView from './DeployView';
import ImagesView from './ImagesView';
import NetworksView from './NetworksView';
import VolumesView from './VolumesView';
import { useLang } from './LanguageContext';

/* ── Scoped CSS ──────────────────────────────────────────────────────────── */
const CSS = `
  /* Sidebar */
  .nx-sidebar {
    width: 220px;
    flex-shrink: 0;
    background: var(--bg-subtle);
    border-right: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100vh;
    overflow: hidden;
  }

  .nx-sidebar-top {
    padding: 0 12px;
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  /* Logo area */
  .nx-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 20px 8px 16px;
    border-bottom: 1px solid var(--border-subtle);
    margin-bottom: 8px;
  }

  .nx-logo-text { font-weight: var(--weight-semibold); font-size: 15px; letter-spacing: 0.14em; color: var(--text-primary); }
  .nx-logo-sub  { font-size: var(--text-xs); letter-spacing: 0.1em; color: var(--text-muted); margin-top: 1px; }

  /* Host selector */
  .nx-host-wrap   { margin: 8px 0 4px; }
  .nx-host-label  { font-size: var(--text-xs); font-weight: var(--weight-medium); letter-spacing: 0.1em; color: var(--text-muted); padding: 0 4px 5px; text-transform: uppercase; }

  /* Nav section heading */
  .nx-nav-section {
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    letter-spacing: 0.1em;
    color: var(--text-muted);
    text-transform: uppercase;
    padding: 10px 8px 4px;
  }

  /* Nav item */
  .nx-nav-item {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 8px 10px;
    margin: 1px 0;
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    color: var(--text-secondary);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all var(--transition-fast);
    text-align: left;
    width: 100%;
    position: relative;
  }

  .nx-nav-item:hover {
    background: var(--bg-overlay);
    color: var(--text-primary);
  }

  .nx-nav-item.active {
    background: var(--accent-dim);
    color: var(--accent);
  }

  .nx-nav-item.active .nx-nav-icon {
    color: var(--accent);
  }

  .nx-nav-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    color: var(--text-muted);
    transition: color var(--transition-fast);
  }

  .nx-nav-item:hover .nx-nav-icon {
    color: var(--text-primary);
  }

  .nx-alert-badge {
    margin-left: auto;
    background: var(--color-danger);
    color: white;
    font-size: 10px;
    font-weight: var(--weight-semibold);
    border-radius: 20px;
    padding: 1px 6px;
  }

  /* Sidebar bottom */
  .nx-sidebar-bottom {
    border-top: 1px solid var(--border-subtle);
    padding: 12px 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .nx-host-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 0 4px;
  }

  .nx-host-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .nx-host-key {
    font-size: var(--text-xs);
    color: var(--text-muted);
  }

  .nx-host-val {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    font-family: var(--font-mono);
  }

  /* User row */
  .nx-user-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 4px;
  }

  .nx-user-avatar {
    width: 30px;
    height: 30px;
    background: var(--accent-dim);
    border: 1px solid rgba(0,200,150,0.25);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--accent);
    flex-shrink: 0;
  }

  .nx-user-info { flex: 1; min-width: 0; }
  .nx-user-name {
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .nx-user-role { font-size: var(--text-xs); }

  .nx-logout-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 4px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
    flex-shrink: 0;
  }

  .nx-logout-btn:hover {
    background: var(--bg-overlay);
    color: var(--text-primary);
  }

  /* ── TopBar ── */
  .nx-topbar {
    height: 56px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-subtle);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    position: sticky;
    top: 0;
    z-index: 10;
    backdrop-filter: blur(8px);
    flex-shrink: 0;
    gap: 12px;
  }

  .nx-topbar-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }

  .nx-page-title {
    font-size: var(--text-lg);
    font-weight: var(--weight-medium);
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .nx-host-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: var(--text-xs);
    color: var(--accent);
    background: var(--accent-dim);
    border: 1px solid rgba(0,200,150,0.20);
    border-radius: 20px;
    padding: 3px 10px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .nx-refresh-badge {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: var(--text-xs);
    color: var(--text-muted);
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 20px;
    padding: 3px 10px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .nx-refresh-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--color-success);
    animation: pulse 2s ease-in-out infinite;
    flex-shrink: 0;
  }

  .nx-topbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .nx-metric-pills {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .nx-metric-pill {
    display: flex;
    align-items: center;
    gap: 5px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 20px;
    padding: 4px 10px;
  }

  .nx-metric-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .nx-metric-num { font-size: var(--text-sm); font-weight: var(--weight-semibold); }
  .nx-metric-lbl { font-size: var(--text-xs); color: var(--text-muted); }

  .nx-icon-btn {
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    cursor: pointer;
    padding: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
  }

  .nx-icon-btn:hover {
    background: var(--bg-overlay);
    color: var(--text-primary);
    border-color: var(--border-default);
  }

  .nx-lang-toggle {
    display: flex;
    gap: 2px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: 2px;
  }

  .nx-lang-btn {
    padding: 4px 8px;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: var(--text-sm);
    color: var(--text-muted);
    transition: all var(--transition-fast);
  }

  .nx-lang-btn.active {
    background: var(--bg-overlay);
    color: var(--text-primary);
  }

  .nx-hamburger {
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    cursor: pointer;
    padding: 6px 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .nx-mobile-running {
    display: none;
    align-items: center;
    gap: 5px;
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--color-success);
  }

  @media (max-width: 768px) {
    .nx-mobile-running { display: flex !important; }
  }
`;

/* ── OS icon map ─────────────────────────────────────────────────────────── */
const OS_META = {
  windows: { src: null, label: 'Windows' },
  ubuntu:  { src: 'https://cdn.simpleicons.org/ubuntu/E95420', label: 'Ubuntu' },
  debian:  { src: 'https://cdn.simpleicons.org/debian/A81D33', label: 'Debian' },
  fedora:  { src: 'https://cdn.simpleicons.org/fedora/51A2DA', label: 'Fedora' },
  rhel:    { src: 'https://cdn.simpleicons.org/redhat/EE0000', label: 'Red Hat' },
  rocky:   { src: 'https://cdn.simpleicons.org/rockylinux/10B981', label: 'Rocky Linux' },
  alpine:  { src: 'https://cdn.simpleicons.org/alpinelinux/0D597F', label: 'Alpine' },
  linux:   { src: 'https://cdn.simpleicons.org/linux/FCC624', label: 'Linux' },
  local:   { src: null, label: 'Local' },
};

function HostIcon({ os }) {
  const meta = OS_META[os] || OS_META.linux;
  if (os === 'windows') return (
    <svg viewBox="0 0 32 32" width="14" height="14" style={{ flexShrink: 0 }}>
      <path fill="#00ADEF" d="M30,15H17c-0.6,0-1-0.4-1-1V3.3c0-0.5,0.4-0.9,0.8-1l13-2.3c0.3,0,0.6,0,0.8,0.2C30.9,0.4,31,0.7,31,1v13C31,14.6,30.6,15,30,15z"/>
      <path fill="#00ADEF" d="M13,15H1c-0.6,0-1-0.4-1-1V6c0-0.5,0.4-0.9,0.8-1l12-2c0.3,0,0.6,0,0.8,0.2C13.9,3.4,14,3.7,14,4v10C14,14.6,13.6,15,13,15z"/>
      <path fill="#00ADEF" d="M30,32c-0.1,0-0.1,0-0.2,0l-13-2.3c-0.5-0.1-0.8-0.5-0.8-1V18c0-0.6,0.4-1,1-1h13c0.6,0,1,0.4,1,1v13c0,0.3-0.1,0.6-0.4,0.8C30.5,31.9,30.2,32,30,32z"/>
      <path fill="#00ADEF" d="M13,29c-0.1,0-0.1,0-0.2,0l-12-2C0.4,26.9,0,26.5,0,26v-8c0-0.6,0.4-1,1-1h12c0.6,0,1,0.4,1,1v10c0,0.3-0.1,0.6-0.4,0.8C13.5,28.9,13.2,29,13,29z"/>
    </svg>
  );
  if (!meta.src) return <Server size={14} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />;
  return <img src={meta.src} width="14" height="14" style={{ flexShrink: 0, display: 'block' }} alt={meta.label} />;
}

/* ── Host selector dropdown ─────────────────────────────────────────────── */
function HostSelector({ hosts, selectedHost, onSelect, localLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allOptions = [{ id: 'local', name: localLabel, os: 'local' }, ...hosts];
  const current = allOptions.find(h => h.id === selectedHost) || allOptions[0];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
          background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)',
          padding: '7px 10px', cursor: 'pointer', outline: 'none',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <HostIcon os={current.os || 'local'} />
          {current.name}
        </span>
        <ChevronDown size={12} style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)', zIndex: 200, overflow: 'hidden',
          boxShadow: 'var(--shadow-md)',
        }}>
          {allOptions.map(h => (
            <button key={h.id}
              onClick={() => { onSelect(h.id); setOpen(false); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '7px',
                padding: '8px 10px',
                background: h.id === selectedHost ? 'var(--accent-dim)' : 'transparent',
                border: 'none',
                color: h.id === selectedHost ? 'var(--accent)' : 'var(--text-primary)',
                fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <HostIcon os={h.os || 'local'} />
              {h.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Theme engine ────────────────────────────────────────────────────────── */
function applyTheme(settings) {
  if (!settings) return;
  const root = document.documentElement;

  /* Accent */
  const accent = settings.accent || '#00c896';
  const accentDim  = accent + '1e';  /* ~12% */
  const accentGlow = accent + '33';  /* ~20% */
  root.style.setProperty('--accent',      accent);
  root.style.setProperty('--accent-dim',  `rgba(${hexToRgb(accent)}, 0.12)`);
  root.style.setProperty('--accent-glow', `rgba(${hexToRgb(accent)}, 0.20)`);
  /* Bridge aliases */
  root.style.setProperty('--brand',        accent);
  root.style.setProperty('--brand-glow',   accentGlow);
  root.style.setProperty('--brand-light',  accent);
  root.style.setProperty('--brand-dim',    accentDim);
  root.style.setProperty('--border-focus', accent);

  /* Light theme override */
  if (settings.theme === 'light') {
    root.style.setProperty('--bg-base',      '#f4f4f8');
    root.style.setProperty('--bg-surface',   '#ffffff');
    root.style.setProperty('--bg-elevated',  '#f0f0f5');
    root.style.setProperty('--bg-overlay',   '#e8e8f0');
    root.style.setProperty('--bg-subtle',    '#f8f8fc');
    root.style.setProperty('--border-subtle',  'rgba(0,0,0,0.07)');
    root.style.setProperty('--border-default', 'rgba(0,0,0,0.12)');
    root.style.setProperty('--border-strong',  'rgba(0,0,0,0.20)');
    root.style.setProperty('--text-primary',   '#0f0f1a');
    root.style.setProperty('--text-secondary', '#55556a');
    root.style.setProperty('--text-muted',     '#9090a8');
    /* Bridge */
    root.style.setProperty('--bg',          '#f4f4f8');
    root.style.setProperty('--bg-hover',    '#e8e8f0');
    root.style.setProperty('--border',      'rgba(0,0,0,0.12)');
    root.style.setProperty('--border-hi',   'rgba(0,0,0,0.20)');
  } else {
    root.style.setProperty('--bg-base',      '#0a0a0f');
    root.style.setProperty('--bg-surface',   '#111118');
    root.style.setProperty('--bg-elevated',  '#1a1a24');
    root.style.setProperty('--bg-overlay',   '#22222e');
    root.style.setProperty('--bg-subtle',    '#16161f');
    root.style.setProperty('--border-subtle',  'rgba(255,255,255,0.06)');
    root.style.setProperty('--border-default', 'rgba(255,255,255,0.10)');
    root.style.setProperty('--border-strong',  'rgba(255,255,255,0.18)');
    root.style.setProperty('--text-primary',   '#f0f0f8');
    root.style.setProperty('--text-secondary', '#9090a8');
    root.style.setProperty('--text-muted',     '#55556a');
    /* Bridge */
    root.style.setProperty('--bg',          '#0a0a0f');
    root.style.setProperty('--bg-hover',    '#22222e');
    root.style.setProperty('--border',      'rgba(255,255,255,0.10)');
    root.style.setProperty('--border-hi',   'rgba(255,255,255,0.18)');
  }
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0,2), 16);
  const g = parseInt(h.substring(2,4), 16);
  const b = parseInt(h.substring(4,6), 16);
  return `${r},${g},${b}`;
}

/* ── Stat cards ──────────────────────────────────────────────────────────── */
function StatCards({ total, running, stopped, images, loading }) {
  if (loading) {
    return (
      <div className="stat-cards-grid stagger">
        {[0,1,2,3].map(i => (
          <div key={i} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
            <div className="skeleton" style={{ height: 28, width: '60%', marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 11, width: '40%' }} />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    { label: 'Total Containers', value: total,   color: 'var(--text-primary)' },
    { label: 'Running',          value: running,  color: 'var(--color-success)' },
    { label: 'Stopped',          value: stopped,  color: 'var(--color-danger)' },
    { label: 'Images',           value: images ?? '—', color: 'var(--color-info)' },
  ];

  return (
    <div className="stat-cards-grid stagger">
      {cards.map(card => (
        <div key={card.label} className="stat-card">
          <div className="stat-card-value" style={{ color: card.color }}>{card.value}</div>
          <div className="stat-card-label">{card.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Nav items config ────────────────────────────────────────────────────── */
const NAV_ICONS = {
  stacks:   Layers,
  table:    AlignJustify,
  all:      LayoutGrid,
  metrics:  Activity,
  events:   Clock,
  images:   ImageIcon,
  networks: Network,
  volumes:  HardDrive,
  deploy:   Plus,
  settings: Settings,
};

/* ── Dashboard ───────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { user, role, logout } = useAuth();
  const { t, lang, changeLang } = useLang();
  const n = t.nav;
  const d = t.dashboard;

  const [tab,             setTab]             = useState('stacks');
  const [containers,      setContainers]      = useState([]);
  const [info,            setInfo]            = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [lastRefresh,     setLastRefresh]     = useState(null);
  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [settings,        setSettings]        = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [unreadAlerts,    setUnreadAlerts]    = useState(0);
  const [hosts,           setHosts]           = useState([]);
  const [selectedHost,    setSelectedHost]    = useState('local');

  const isViewer = role === 'viewer';
  const isAdmin  = role === 'admin';

  useEffect(() => {
    axios.get('/api/settings').then(r => {
      setSettings(r.data); applyTheme(r.data);
      if (r.data.refreshInterval) setRefreshInterval(r.data.refreshInterval);
    }).catch(() => {});
    axios.get('/api/hosts').then(r => setHosts(r.data)).catch(() => {});
  }, []);

  const handleSettingsChange = s => {
    setSettings(s); applyTheme(s);
    if (s.refreshInterval) setRefreshInterval(s.refreshInterval);
  };

  const hostParam = selectedHost === 'local' ? '' : `?host=${selectedHost}`;

  const fetchAll = useCallback(async () => {
    try {
      const [cRes, iRes] = await Promise.allSettled([
        axios.get(`/api/containers${hostParam}`),
        axios.get(`/api/info${hostParam}`),
      ]);
      if (cRes.status === 'fulfilled') setContainers(cRes.value.data);
      else if (cRes.reason?.response?.status === 401) { logout(); return; }
      if (iRes.status === 'fulfilled') setInfo(iRes.value.data);
      setLastRefresh(new Date());
    } catch (e) {
      if (e.response?.status === 401) logout();
    } finally {
      setLoading(false);
    }
  }, [logout, hostParam]);

  useEffect(() => {
    setLoading(true);
    fetchAll();
    const i = setInterval(fetchAll, refreshInterval);
    return () => clearInterval(i);
  }, [fetchAll, refreshInterval]);

  const handleAction = async (id, action) => {
    if (isViewer) return;
    if (action === 'delete') {
      await axios.delete(`/api/containers/${id}${hostParam}`);
    } else {
      await axios.post(`/api/containers/${id}/${action}${hostParam}`);
    }
    setTimeout(fetchAll, 800);
  };

  const running = containers.filter(c => c.state === 'running').length;
  const stopped = containers.filter(c => c.state !== 'running').length;
  const stacks  = [...new Set(containers.map(c => c.stack).filter(Boolean))].length;

  const currentHostName = selectedHost === 'local'
    ? d.local
    : hosts.find(h => h.id === selectedHost)?.name || selectedHost;

  const NAV_MAIN = [
    { id:'stacks',   label: n.stacks },
    { id:'table',    label: n.table },
    { id:'all',      label: n.cards },
    { id:'metrics',  label: n.metrics },
    { id:'events',   label: n.events },
    { id:'images',   label: n.images   || 'Images' },
    { id:'networks', label: n.networks || 'Networks' },
    { id:'volumes',  label: n.volumes  || 'Volumes' },
  ];

  const NAV_DEPLOY = isAdmin ? [{ id:'deploy', label: n.deploy }] : [];
  const allNavItems = [...NAV_MAIN, ...NAV_DEPLOY, { id:'settings', label: n.settings }];

  const handleNavClick = id => { setTab(id); setSidebarOpen(false); };

  /* Show stat cards on container views */
  const isContainerView = ['stacks','table','all'].includes(tab);

  const NexusLogo = () => (
    <svg viewBox="0 0 192 192" width="32" height="32" style={{ borderRadius: 8, flexShrink: 0 }}>
      <rect width="192" height="192" rx="40" fill="#0f1f1a"/>
      <rect x="18" y="18"  width="72" height="72" rx="14" fill="#00c896"/>
      <rect x="102" y="18"  width="72" height="72" rx="14" fill="#00c896" opacity="0.55"/>
      <rect x="18"  y="102" width="72" height="72" rx="14" fill="#00c896" opacity="0.3"/>
      <rect x="102" y="102" width="72" height="72" rx="14" fill="none" stroke="#00c896" strokeWidth="5"/>
      <path d="M118 118 L118 156 L128 156 L128 134 L150 156 L160 156 L160 118 L150 118 L150 140 L128 118 Z" fill="#00c896"/>
    </svg>
  );

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', position:'relative', background:'var(--bg-base)' }}>
      <style>{CSS}</style>
      <div className={`sidebar-overlay${sidebarOpen?' visible':''}`} onClick={() => setSidebarOpen(false)} />

      {/* ── Sidebar ── */}
      <aside className={`nexus-sidebar nx-sidebar${sidebarOpen?' open':''}`}>
        <div className="nx-sidebar-top">
          {/* Logo */}
          <div className="nx-logo">
            <NexusLogo />
            <div>
              <div className="nx-logo-text">NEXUS</div>
              <div className="nx-logo-sub">CONTAINER PLATFORM</div>
            </div>
          </div>

          {/* Host selector */}
          {hosts.length > 0 && (
            <div className="nx-host-wrap">
              <div className="nx-host-label">{n.server || 'SERVER'}</div>
              <HostSelector hosts={hosts} selectedHost={selectedHost} onSelect={setSelectedHost} localLabel={d.local} />
            </div>
          )}

          {/* Navigation */}
          <nav>
            <div className="nx-nav-section">{n.views || 'VIEWS'}</div>
            {NAV_MAIN.map(item => {
              const Icon = NAV_ICONS[item.id];
              return (
                <button
                  key={item.id}
                  className={`nx-nav-item${tab===item.id?' active':''}`}
                  onClick={() => handleNavClick(item.id)}
                >
                  {Icon && <Icon size={18} className="nx-nav-icon" />}
                  {item.label}
                </button>
              );
            })}

            {NAV_DEPLOY.length > 0 && (
              <>
                <div className="nx-nav-section">{n.manage || 'MANAGE'}</div>
                {NAV_DEPLOY.map(item => {
                  const Icon = NAV_ICONS[item.id];
                  return (
                    <button
                      key={item.id}
                      className={`nx-nav-item${tab===item.id?' active':''}`}
                      onClick={() => handleNavClick(item.id)}
                    >
                      {Icon && <Icon size={18} className="nx-nav-icon" />}
                      {item.label}
                    </button>
                  );
                })}
              </>
            )}

            <div className="nx-nav-section">{n.account || 'ACCOUNT'}</div>
            <button
              className={`nx-nav-item${tab==='settings'?' active':''}`}
              onClick={() => handleNavClick('settings')}
            >
              <Settings size={18} className="nx-nav-icon" />
              {n.settings}
              {unreadAlerts > 0 && (
                <span className="nx-alert-badge">{unreadAlerts > 9 ? '9+' : unreadAlerts}</span>
              )}
            </button>
          </nav>
        </div>

        {/* Sidebar bottom */}
        <div className="nx-sidebar-bottom">
          {info && (
            <div className="nx-host-info">
              {[
                ['Docker', info.dockerVersion],
                ['CPUs',   info.cpus],
                ['RAM',    `${(info.memory/1024/1024/1024).toFixed(1)} GB`],
              ].map(([label, value]) => (
                <div key={label} className="nx-host-row">
                  <span className="nx-host-key">{label}</span>
                  <span className="nx-host-val">{value}</span>
                </div>
              ))}
            </div>
          )}
          <div className="nx-user-row">
            <div className="nx-user-avatar">{user?.[0]?.toUpperCase()}</div>
            <div className="nx-user-info">
              <div className="nx-user-name">{user}</div>
              <div className="nx-user-role">
                {isViewer
                  ? <span style={{ color:'var(--text-muted)' }}>Viewer</span>
                  : <span style={{ color:'var(--accent)' }}>Administrator</span>
                }
              </div>
            </div>
            <button className="nx-logout-btn" onClick={logout} title="Logout">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="nexus-main" style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

        {/* TopBar */}
        <header className="nx-topbar">
          <div className="nx-topbar-left">
            <button className="hamburger nx-hamburger" onClick={() => setSidebarOpen(v => !v)}>
              <Menu size={18} />
            </button>
            <h1 className="nx-page-title">{allNavItems.find(nv=>nv.id===tab)?.label}</h1>
            {hosts.length > 0 && (
              <span className="nx-host-badge">
                <HostIcon os={selectedHost === 'local' ? 'local' : hosts.find(h=>h.id===selectedHost)?.os} />
                {currentHostName}
              </span>
            )}
            {lastRefresh && !['settings','deploy','images','networks','volumes'].includes(tab) && (
              <span className="nx-refresh-badge">
                <span className="nx-refresh-dot" />
                {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="nx-topbar-right">
            {!['settings','deploy','images','networks','volumes'].includes(tab) && (
              <>
                <div className="metric-pills-desktop nx-metric-pills">
                  {[
                    { dot:'var(--color-success)', num:running, lbl:d.running },
                    { dot:'var(--color-danger)',  num:stopped, lbl:d.stopped },
                    { dot:'var(--accent)',         num:stacks,  lbl:d.stacks },
                  ].map(m => (
                    <div key={m.lbl} className="nx-metric-pill">
                      <span className="nx-metric-dot" style={{ background:m.dot }} />
                      <span className="nx-metric-num">{m.num}</span>
                      <span className="nx-metric-lbl">{m.lbl}</span>
                    </div>
                  ))}
                </div>
                <span className="nx-mobile-running">
                  <span className="nx-metric-dot" style={{ background:'var(--color-success)' }} />
                  {running}
                </span>
              </>
            )}

            <div className="nx-lang-toggle">
              {['en','es'].map(lg => (
                <button
                  key={lg}
                  className={`nx-lang-btn${lang===lg?' active':''}`}
                  onClick={() => changeLang(lg)}
                >
                  {lg === 'en' ? '🇬🇧' : '🇪🇸'}
                </button>
              ))}
            </div>

            <AlertPanel onUnreadChange={setUnreadAlerts} />

            <button className="nx-icon-btn" onClick={fetchAll} title="Refresh">
              <RefreshCw size={15} />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="nexus-content" style={{ flex:1, overflow:'auto', padding:'24px' }}>
          {loading && !['settings','deploy','images','networks','volumes'].includes(tab) ? (
            <>
              <StatCards total={0} running={0} stopped={0} images={null} loading={true} />
              <Loader msg={d.loading} />
            </>
          ) : (
            <div key={tab + selectedHost} className="fade-up">
              {/* Stat cards on container views */}
              {isContainerView && (
                <StatCards
                  total={containers.length}
                  running={running}
                  stopped={stopped}
                  images={info?.images}
                  loading={false}
                />
              )}

              {tab==='stacks'    && <StackView     containers={containers} onAction={handleAction} isViewer={isViewer} />}
              {tab==='table'     && <TableView     containers={containers} onAction={handleAction} isViewer={isViewer} />}
              {tab==='all'       && <ContainerList containers={containers} onAction={handleAction} isViewer={isViewer} />}
              {tab==='metrics'   && <MetricsView   containers={containers} hostParam={hostParam} />}
              {tab==='events'    && <EventsView />}
              {tab==='deploy'    && <DeployView    onContainersRefresh={fetchAll} />}
              {tab==='images'    && <ImagesView    hostParam={hostParam} isViewer={isViewer} />}
              {tab==='networks'  && <NetworksView  hostParam={hostParam} isViewer={isViewer} />}
              {tab==='volumes'   && <VolumesView   hostParam={hostParam} isViewer={isViewer} />}
              {tab==='settings'  && <SettingsView  onSettingsChange={handleSettingsChange} onHostsChange={setHosts} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Loader({ msg }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'200px', flexDirection:'column', gap:'12px' }}>
      <div style={{ width:'22px', height:'22px', border:'2px solid var(--border-subtle)', borderTop:'2px solid var(--accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      <span style={{ color:'var(--text-muted)', fontSize:'var(--text-sm)' }}>{msg}</span>
    </div>
  );
}
