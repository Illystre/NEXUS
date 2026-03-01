import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../AuthContext';
import Terminal from './Terminal';
import ContainerDetail from './ContainerDetail';

const STATE = {
  running:    { color:'var(--success)', bg:'var(--success-bg)', border:'var(--success-border)', label:'Running' },
  exited:     { color:'var(--danger)',  bg:'var(--danger-bg)',  border:'var(--danger-border)',  label:'Stopped' },
  paused:     { color:'var(--warning)', bg:'var(--warning-bg)', border:'var(--warning-border)', label:'Paused' },
  restarting: { color:'var(--info)',    bg:'var(--info-bg)',    border:'var(--info-bg)',         label:'Restarting' },
};

function fmtMem(b) {
  if (!b) return '0 MB';
  const mb = b / 1024 / 1024;
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
}

function fmtUptime(status) {
  if (!status) return null;
  if (status.startsWith('Up ')) return status.replace('Up ', '');
  return null;
}

function PortBadge({ port }) {
  const host = port.PublicPort;
  const internal = port.PrivatePort;
  const proto = port.Type || 'tcp';
  if (!host) return <span style={s.portBadge}>{internal}/{proto}</span>;
  return (
    <a href={`http://localhost:${host}`} target="_blank" rel="noreferrer" style={s.portLink} title={`Abrir localhost:${host}`}>
      {host}→{internal}<span style={s.portArrow}>↗</span>
    </a>
  );
}

export default function ContainerCard({ container, onAction }) {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
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

  useEffect(() => { if (showLogs) logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs, showLogs]);

  const doAction = async (action) => {
    setActionLoading(action);
    await onAction(container.id, action);
    setTimeout(() => setActionLoading(null), 1500);
  };

  const st = STATE[container.state] || { color:'var(--text-muted)', bg:'transparent', border:'var(--border)', label: container.state };
  const isRunning = container.state === 'running';
  const uptime = fmtUptime(container.status);
  const ports = (container.ports || []).filter(p => p.PrivatePort);

  return (
    <>
      {showTerminal && <Terminal container={container} onClose={() => setShowTerminal(false)} />}
      {showDetail && <ContainerDetail container={container} onClose={() => setShowDetail(false)} />}

      <div style={s.card}>
        <div style={s.cardTop}>
          <div style={s.nameRow}>
            <div style={{...s.statusDot, background: st.color, boxShadow: isRunning ? `0 0 0 3px ${st.color}25` : 'none'}} />
            <div style={{...s.name, cursor:'pointer', textDecoration:'underline', textDecorationStyle:'dotted', textDecorationColor:'var(--border-hi)'}} onClick={() => setShowDetail(true)}>{container.name}</div>
            <div style={{...s.statePill, color: st.color, background: st.bg, border: `1px solid ${st.border}`}}>
              {st.label}
            </div>
          </div>
          <div style={s.imageName}>{container.image}</div>

          <div style={s.metaRow}>
            {uptime && (
              <div style={s.uptimeBadge}>
                <span style={s.uptimeIcon}>⏱</span>
                {uptime}
              </div>
            )}
            {ports.length > 0 && (
              <div style={s.portsRow}>
                {ports.slice(0, 4).map((p, i) => <PortBadge key={i} port={p} />)}
                {ports.length > 4 && <span style={s.morePorts}>+{ports.length - 4}</span>}
              </div>
            )}
          </div>
        </div>

        {isRunning && stats && (
          <div style={s.metricsRow}>
            <MetricBar label="CPU" value={`${stats.cpu.toFixed(1)}%`} pct={Math.min(stats.cpu, 100)} color="var(--brand)" />
            <MetricBar label="RAM" value={fmtMem(stats.memUsage)} pct={stats.memPercent} color="var(--warning)" />
          </div>
        )}

        <div style={s.actions}>
          <div style={s.actionsLeft}>
            {isRunning
              ? <ActionBtn label="Stop"    icon="⏹" onClick={() => doAction('stop')}    variant="danger"   loading={actionLoading==='stop'} />
              : <ActionBtn label="Start"   icon="▶" onClick={() => doAction('start')}   variant="success"  loading={actionLoading==='start'} />
            }
            <ActionBtn label="Restart" icon="↺" onClick={() => doAction('restart')} variant="default" loading={actionLoading==='restart'} />
            {isRunning && (
              <ActionBtn label="Terminal" icon="⌨" onClick={() => setShowTerminal(true)} variant="brand" />
            )}
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
              <span style={s.logsTitle}><span style={s.logsIcon}>$</span> logs --follow <strong>{container.name}</strong></span>
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
    </>
  );
}

function MetricBar({ label, value, pct, color }) {
  return (
    <div style={s.metric}>
      <div style={s.metricHeader}>
        <span style={s.metricLabel}>{label}</span>
        <span style={{...s.metricValue, color}}>{value}</span>
      </div>
      <div style={s.barTrack}><div style={{...s.barFill, width:`${pct}%`, background: color}} /></div>
    </div>
  );
}

function ActionBtn({ label, icon, onClick, variant, loading }) {
  const colors = {
    danger:  { color:'var(--danger)',      bg:'var(--danger-bg)',   border:'var(--danger-border)' },
    success: { color:'var(--success)',     bg:'var(--success-bg)',  border:'var(--success-border)' },
    brand:   { color:'var(--brand-light)', bg:'var(--brand-glow)',  border:'var(--border-focus)' },
    default: { color:'var(--text-secondary)', bg:'transparent',     border:'var(--border)' },
  };
  const c = colors[variant] || colors.default;
  return (
    <button style={{...s.actionBtn, color: c.color, background: c.bg, borderColor: c.border}} onClick={onClick} disabled={loading}>
      {loading ? <div style={{...s.miniSpin, borderTopColor: c.color}} /> : <><span>{icon}</span><span>{label}</span></>}
    </button>
  );
}

const s = {
  card: { background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' },
  cardTop: { padding:'14px 16px 0' },
  nameRow: { display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' },
  statusDot: { width:'7px', height:'7px', borderRadius:'50%', flexShrink:0 },
  name: { flex:1, fontWeight:600, fontSize:'0.9em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  statePill: { fontSize:'0.68em', fontWeight:600, padding:'2px 8px', borderRadius:'20px', letterSpacing:'0.04em', flexShrink:0 },
  imageName: { fontSize:'0.72em', color:'var(--text-muted)', fontFamily:'var(--font-mono)', paddingLeft:'15px', marginBottom:'8px' },
  metaRow: { display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', paddingLeft:'15px', paddingBottom:'10px', minHeight:'22px' },
  uptimeBadge: { display:'flex', alignItems:'center', gap:'4px', fontSize:'0.72em', color:'var(--text-muted)', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'20px', padding:'2px 8px' },
  uptimeIcon: { fontSize:'0.85em' },
  portsRow: { display:'flex', gap:'4px', flexWrap:'wrap' },
  portBadge: { fontSize:'0.7em', color:'var(--text-muted)', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'4px', padding:'2px 6px', fontFamily:'var(--font-mono)' },
  portLink: { display:'inline-flex', alignItems:'center', gap:'3px', fontSize:'0.7em', color:'var(--brand-light)', background:'var(--brand-glow)', border:'1px solid var(--border-focus)', borderRadius:'4px', padding:'2px 6px', fontFamily:'var(--font-mono)', textDecoration:'none' },
  portArrow: { fontSize:'0.8em' },
  morePorts: { fontSize:'0.7em', color:'var(--text-muted)', padding:'2px 4px' },
  metricsRow: { display:'flex', gap:'1px', background:'var(--border)', borderTop:'1px solid var(--border)' },
  metric: { flex:1, padding:'10px 14px', background:'var(--bg-surface)' },
  metricHeader: { display:'flex', justifyContent:'space-between', marginBottom:'5px' },
  metricLabel: { fontSize:'0.68em', color:'var(--text-muted)', letterSpacing:'0.06em', fontWeight:500 },
  metricValue: { fontSize:'0.78em', fontWeight:600, fontFamily:'var(--font-mono)' },
  barTrack: { height:'3px', background:'var(--border)', borderRadius:'2px', overflow:'hidden' },
  barFill: { height:'100%', borderRadius:'2px', transition:'width 0.5s ease' },
  actions: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 16px 12px', gap:'8px' },
  actionsLeft: { display:'flex', gap:'5px', flexWrap:'wrap' },
  actionBtn: { display:'flex', alignItems:'center', gap:'4px', padding:'5px 10px', border:'1px solid', borderRadius:'var(--radius-sm)', fontFamily:'var(--font-sans)', fontSize:'0.75em', fontWeight:500, cursor:'pointer', transition:'all 0.15s' },
  logsToggle: { padding:'5px 11px', border:'1px solid', borderRadius:'var(--radius-sm)', fontFamily:'var(--font-sans)', fontSize:'0.78em', fontWeight:500, cursor:'pointer', transition:'all 0.2s', flexShrink:0 },
  miniSpin: { width:'11px', height:'11px', border:'2px solid transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' },
  logsPanel: { borderTop:'1px solid var(--border)' },
  logsTopBar: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 14px', background:'var(--bg)', borderBottom:'1px solid var(--border)' },
  logsTitle: { fontSize:'0.75em', color:'var(--text-muted)', fontFamily:'var(--font-mono)' },
  logsIcon: { color:'var(--success)', marginRight:'6px' },
  logsClose: { background:'transparent', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:'0.85em', padding:'2px 6px', borderRadius:'3px' },
  logsBody: { height:'200px', overflow:'auto', padding:'10px 14px', background:'var(--bg)' },
  logLine: { fontSize:'0.72em', fontFamily:'var(--font-mono)', color:'var(--text-secondary)', whiteSpace:'pre-wrap', wordBreak:'break-all', lineHeight:1.6, marginBottom:'1px' },
};
