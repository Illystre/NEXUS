import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../AuthContext';

const STATE = {
  running:    { color:'var(--success)', bg:'var(--success-bg)', border:'var(--success-border)', label:'Running' },
  exited:     { color:'var(--danger)',  bg:'var(--danger-bg)',  border:'var(--danger-border)',  label:'Stopped' },
  paused:     { color:'var(--warning)', bg:'var(--warning-bg)', border:'var(--warning-border)', label:'Paused' },
  restarting: { color:'var(--info)',    bg:'var(--info-bg)',    border:'var(--info-bg)',         label:'Restarting' },
};

function fmtMem(b) {
  if (!b) return '0 MB';
  const mb = b/1024/1024;
  return mb >= 1024 ? `${(mb/1024).toFixed(1)}GB` : `${mb.toFixed(0)}MB`;
}

export default function ContainerCard({ container, onAction }) {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);
  const logsEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (container.state !== 'running') return;
    const fetch = async () => {
      try { const r = await axios.get(`/api/containers/${container.id}/stats`); setStats(r.data); } catch {}
    };
    fetch();
    const i = setInterval(fetch, 3000);
    return () => clearInterval(i);
  }, [container.id, container.state]);

  useEffect(() => {
    if (!showLogs) {
      socketRef.current?.emit('unsubscribe:logs', { containerId: container.id });
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }
    setLogs([]);
    const socket = io('', { auth: { token } });
    socketRef.current = socket;
    socket.emit('subscribe:logs', { containerId: container.id });
    socket.on('log:line', ({ text }) => setLogs(p => [...p.slice(-500), text]));
    return () => { socket.emit('unsubscribe:logs', { containerId: container.id }); socket.disconnect(); };
  }, [showLogs, container.id, token]);

  useEffect(() => { if (showLogs) logsEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [logs, showLogs]);

  const doAction = async (action) => {
    setActionLoading(action);
    await onAction(container.id, action);
    setTimeout(() => setActionLoading(null), 1500);
  };

  const st = STATE[container.state] || { color:'var(--text-muted)', bg:'transparent', border:'var(--border)', label: container.state };
  const isRunning = container.state === 'running';

  return (
    <div style={s.card}>
      <div style={s.cardTop}>
        <div style={s.cardMain}>
          <div style={s.nameRow}>
            <div style={{...s.statusDot, background: st.color, boxShadow: isRunning ? `0 0 0 3px ${st.color}25` : 'none', animation: isRunning ? 'pulse 2.5s infinite' : 'none'}} />
            <div style={s.name}>{container.name}</div>
            <div style={{...s.statePill, color: st.color, background: st.bg, border: `1px solid ${st.border}`}}>
              {st.label}
            </div>
          </div>
          <div style={s.imageName}>{container.image}</div>
        </div>
      </div>

      {isRunning && stats && (
        <div style={s.metricsRow}>
          <MetricBar label="CPU" value={`${stats.cpu.toFixed(1)}%`} pct={Math.min(stats.cpu, 100)} color="var(--brand)" />
          <MetricBar label="RAM" value={fmtMem(stats.memUsage)} pct={stats.memPercent} color="var(--warning)" />
        </div>
      )}

      <div style={s.statusText}>{container.status}</div>

      <div style={s.actions}>
        <div style={s.actionsLeft}>
          {isRunning
            ? <ActionBtn label="Stop" icon="⏹" onClick={() => doAction('stop')} variant="danger" loading={actionLoading==='stop'} />
            : <ActionBtn label="Start" icon="▶" onClick={() => doAction('start')} variant="success" loading={actionLoading==='start'} />
          }
          <ActionBtn label="Restart" icon="↺" onClick={() => doAction('restart')} variant="default" loading={actionLoading==='restart'} />
        </div>
        <button
          style={{...s.logsToggle, color: showLogs ? 'var(--brand)' : 'var(--text-muted)', borderColor: showLogs ? 'var(--border-focus)' : 'var(--border)', background: showLogs ? 'var(--brand-glow)' : 'transparent'}}
          onClick={() => setShowLogs(v => !v)}
        >
          Logs {showLogs ? '↑' : '↓'}
        </button>
      </div>

      {showLogs && (
        <div style={s.logsPanel}>
          <div style={s.logsTopBar}>
            <span style={s.logsTitle}>
              <span style={s.logsIcon}>$</span> logs --follow <strong>{container.name}</strong>
            </span>
            <button style={s.logsClose} onClick={() => setShowLogs(false)}>✕</button>
          </div>
          <div style={s.logsBody}>
            {logs.length === 0 && <span style={{color:'var(--text-muted)',fontStyle:'italic'}}>Esperando logs...</span>}
            {logs.map((l, i) => <div key={i} style={s.logLine}>{l}</div>)}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}

function MetricBar({ label, value, pct, color }) {
  return (
    <div style={s.metric}>
      <div style={s.metricHeader}>
        <span style={s.metricLabel}>{label}</span>
        <span style={{...s.metricValue, color}}>{value}</span>
      </div>
      <div style={s.barTrack}>
        <div style={{...s.barFill, width:`${pct}%`, background: color}} />
      </div>
    </div>
  );
}

function ActionBtn({ label, icon, onClick, variant, loading }) {
  const colors = {
    danger:  { color:'var(--danger)',  bg:'var(--danger-bg)',  border:'var(--danger-border)' },
    success: { color:'var(--success)', bg:'var(--success-bg)', border:'var(--success-border)' },
    default: { color:'var(--text-secondary)', bg:'transparent', border:'var(--border)' },
  };
  const c = colors[variant] || colors.default;
  return (
    <button
      style={{...s.actionBtn, color: c.color, background: c.bg, borderColor: c.border}}
      onClick={onClick} disabled={loading}
    >
      {loading
        ? <div style={{...s.miniSpin, borderTopColor: c.color}} />
        : <><span>{icon}</span><span>{label}</span></>
      }
    </button>
  );
}

const s = {
  card: {
    background:'var(--bg-elevated)', border:'1px solid var(--border)',
    borderRadius:'var(--radius-lg)', overflow:'hidden',
    transition:'border-color 0.2s, box-shadow 0.2s',
  },
  cardTop: { padding:'16px 16px 0' },
  cardMain: {},
  nameRow: { display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' },
  statusDot: { width:'7px', height:'7px', borderRadius:'50%', flexShrink:0, transition:'box-shadow 0.3s' },
  name: { flex:1, fontWeight:600, fontSize:'0.9em', color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  statePill: {
    fontSize:'0.68em', fontWeight:600, padding:'2px 8px',
    borderRadius:'20px', letterSpacing:'0.04em', flexShrink:0,
  },
  imageName: { fontSize:'0.72em', color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:'10px', paddingLeft:'15px' },
  metricsRow: { display:'flex', gap:'1px', background:'var(--border)', borderTop:'1px solid var(--border)' },
  metric: { flex:1, padding:'10px 14px', background:'var(--bg-surface)' },
  metricHeader: { display:'flex', justifyContent:'space-between', marginBottom:'5px' },
  metricLabel: { fontSize:'0.68em', color:'var(--text-muted)', letterSpacing:'0.06em', fontWeight:500 },
  metricValue: { fontSize:'0.78em', fontWeight:600, fontFamily:'var(--font-mono)' },
  barTrack: { height:'3px', background:'var(--border)', borderRadius:'2px', overflow:'hidden' },
  barFill: { height:'100%', borderRadius:'2px', transition:'width 0.5s ease' },
  statusText: { padding:'6px 16px', fontSize:'0.72em', color:'var(--text-muted)', fontFamily:'var(--font-mono)', borderTop:'1px solid var(--border)' },
  actions: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 16px 14px', gap:'8px' },
  actionsLeft: { display:'flex', gap:'6px' },
  actionBtn: {
    display:'flex', alignItems:'center', gap:'5px', padding:'5px 11px',
    border:'1px solid', borderRadius:'var(--radius-sm)', fontFamily:'var(--font-sans)',
    fontSize:'0.78em', fontWeight:500, cursor:'pointer', transition:'all 0.15s',
  },
  logsToggle: {
    padding:'5px 11px', border:'1px solid', borderRadius:'var(--radius-sm)',
    fontFamily:'var(--font-sans)', fontSize:'0.78em', fontWeight:500,
    cursor:'pointer', transition:'all 0.2s',
  },
  miniSpin: {
    width:'11px', height:'11px', border:'2px solid transparent',
    borderRadius:'50%', animation:'spin 0.7s linear infinite',
  },
  logsPanel: { borderTop:'1px solid var(--border)' },
  logsTopBar: {
    display:'flex', justifyContent:'space-between', alignItems:'center',
    padding:'8px 14px', background:'var(--bg)', borderBottom:'1px solid var(--border)',
  },
  logsTitle: { fontSize:'0.75em', color:'var(--text-muted)', fontFamily:'var(--font-mono)' },
  logsIcon: { color:'var(--success)', marginRight:'6px' },
  logsClose: {
    background:'transparent', border:'none', color:'var(--text-muted)',
    cursor:'pointer', fontSize:'0.85em', padding:'2px 6px', borderRadius:'3px',
  },
  logsBody: {
    height:'200px', overflow:'auto', padding:'10px 14px',
    background:'var(--bg)',
  },
  logLine: {
    fontSize:'0.72em', fontFamily:'var(--font-mono)', color:'var(--text-secondary)',
    whiteSpace:'pre-wrap', wordBreak:'break-all', lineHeight:1.6, marginBottom:'1px',
  },
};
