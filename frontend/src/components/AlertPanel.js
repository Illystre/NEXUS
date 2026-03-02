import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../AuthContext';

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60)  return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.floor(diff/60)}min`;
  if (diff < 86400) return `hace ${Math.floor(diff/3600)}h`;
  return new Date(ts).toLocaleDateString('es-ES');
}

export default function AlertPanel({ onUnreadChange }) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const panelRef = useRef(null);

  // Load existing alerts
  useEffect(() => {
    axios.get('/api/alerts').then(r => {
      setAlerts(r.data);
      onUnreadChange?.(r.data.filter(a => !a.read).length);
    }).catch(() => {});
  }, []);

  // Listen for new alerts via WebSocket
  useEffect(() => {
    const socket = io('', { auth: { token } });
    socket.on('alert:new', (alert) => {
      setAlerts(prev => {
        const updated = [alert, ...prev];
        onUnreadChange?.(updated.filter(a => !a.read).length);
        return updated;
      });
      // Flash notification sound (subtle)
      try { new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAA==').play(); } catch {}
    });
    return () => socket.disconnect();
  }, [token]);

  // Close on click outside
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unread = alerts.filter(a => !a.read).length;

  const markAllRead = async () => {
    await axios.post('/api/alerts/read-all');
    setAlerts(prev => prev.map(a => ({...a, read: true})));
    onUnreadChange?.(0);
  };

  const clearAll = async () => {
    await axios.delete('/api/alerts');
    setAlerts([]);
    onUnreadChange?.(0);
  };

  return (
    <div style={s.wrap} ref={panelRef}>
      {/* Bell button */}
      <button style={s.bell} onClick={() => { setOpen(v => !v); if (!open && unread > 0) markAllRead(); }}>
        🔔
        {unread > 0 && (
          <span style={s.badge}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={s.panel}>
          <div style={s.panelHeader}>
            <span style={s.panelTitle}>Alertas</span>
            <div style={s.panelActions}>
              {alerts.length > 0 && (
                <button style={s.actionBtn} onClick={clearAll}>Limpiar</button>
              )}
            </div>
          </div>

          <div style={s.list}>
            {alerts.length === 0 ? (
              <div style={s.empty}>
                <div style={s.emptyIcon}>✓</div>
                <div style={s.emptyText}>Sin alertas</div>
                <div style={s.emptySub}>Todo funciona correctamente</div>
              </div>
            ) : (
              alerts.map(a => (
                <div key={a.id} style={{...s.alertItem, opacity: a.read ? 0.6 : 1}}>
                  <div style={s.alertDot} />
                  <div style={s.alertBody}>
                    <div style={s.alertName}>{a.name}</div>
                    <div style={s.alertMsg}>
                      <span style={s.stateFrom}>running</span>
                      <span style={s.arrow}> → </span>
                      <span style={s.stateTo}>{a.to}</span>
                    </div>
                    <div style={s.alertTime}>{timeAgo(a.ts)}</div>
                  </div>
                  {!a.read && <div style={s.unreadDot} />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { position:'relative' },
  bell: {
    position:'relative', background:'var(--bg-surface)', border:'1px solid var(--border)',
    borderRadius:'var(--radius)', padding:'6px 10px', cursor:'pointer', fontSize:'0.95em',
    transition:'all 0.15s', color:'var(--text-secondary)',
  },
  badge: {
    position:'absolute', top:'-6px', right:'-6px',
    background:'var(--danger)', color:'white', fontSize:'0.6em', fontWeight:700,
    borderRadius:'20px', padding:'1px 5px', minWidth:'16px', textAlign:'center',
    border:'2px solid var(--bg)',
  },
  panel: {
    position:'absolute', top:'calc(100% + 8px)', right:0,
    width:'300px', background:'var(--bg-surface)', border:'1px solid var(--border-hi)',
    borderRadius:'var(--radius-lg)', boxShadow:'0 12px 40px #00000060',
    zIndex:500, overflow:'hidden',
  },
  panelHeader: {
    display:'flex', justifyContent:'space-between', alignItems:'center',
    padding:'12px 14px', borderBottom:'1px solid var(--border)',
  },
  panelTitle: { fontWeight:600, fontSize:'0.88em' },
  panelActions: { display:'flex', gap:'8px' },
  actionBtn: {
    background:'transparent', border:'none', color:'var(--text-muted)',
    fontSize:'0.75em', cursor:'pointer', padding:'2px 6px', borderRadius:'3px',
  },
  list: { maxHeight:'360px', overflowY:'auto' },
  empty: { display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 16px', gap:'4px' },
  emptyIcon: { fontSize:'1.5em', color:'var(--success)', marginBottom:'4px' },
  emptyText: { fontWeight:600, fontSize:'0.85em', color:'var(--text-secondary)' },
  emptySub: { fontSize:'0.75em', color:'var(--text-muted)' },
  alertItem: {
    display:'flex', alignItems:'flex-start', gap:'10px',
    padding:'10px 14px', borderBottom:'1px solid var(--border)',
    transition:'background 0.15s',
  },
  alertDot: { width:'8px', height:'8px', borderRadius:'50%', background:'var(--danger)', marginTop:'4px', flexShrink:0 },
  alertBody: { flex:1, minWidth:0 },
  alertName: { fontWeight:600, fontSize:'0.82em', color:'var(--text-primary)', marginBottom:'2px' },
  alertMsg: { fontSize:'0.75em', marginBottom:'2px' },
  stateFrom: { color:'var(--success)', fontFamily:'var(--font-mono)' },
  arrow: { color:'var(--text-muted)' },
  stateTo: { color:'var(--danger)', fontFamily:'var(--font-mono)' },
  alertTime: { fontSize:'0.7em', color:'var(--text-muted)' },
  unreadDot: { width:'6px', height:'6px', borderRadius:'50%', background:'var(--brand)', marginTop:'5px', flexShrink:0 },
};
