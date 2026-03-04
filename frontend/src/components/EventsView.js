import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../AuthContext';
import { useLang } from './LanguageContext';

function fmtTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' });
}

function timeAgo(ts, l) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60)   return `${diff}${l.ago_s}`;
  if (diff < 3600) return `${Math.floor(diff/60)}${l.ago_min}`;
  if (diff < 86400) return `${Math.floor(diff/3600)}${l.ago_h}`;
  return `${Math.floor(diff/86400)}d`;
}

export default function EventsView() {
  const { token, role } = useAuth();
  const { t } = useLang();
  const l = t.eventsView;
  const al = t.alertPanel;

  const EVENT_TYPES = [
    { key: '',                 label: l.all },
    { key: 'container',       label: l.containers,  color: 'var(--brand-light)' },
    { key: 'container:crash', label: l.crashes,     color: 'var(--danger)' },
    { key: 'login',           label: l.logins,      color: 'var(--success)' },
    { key: 'user',            label: l.users,       color: 'var(--warning)' },
    { key: 'settings',        label: l.settings,    color: 'var(--info)' },
  ];

  const TYPE_META = {
    'container:start':   { icon:'▶', color:'var(--success)',    label: l.started },
    'container:stop':    { icon:'⏹', color:'var(--danger)',     label: l.stopped },
    'container:restart': { icon:'↺', color:'var(--warning)',    label: l.restarted },
    'container:crash':   { icon:'💥', color:'var(--danger)',    label: l.crashed },
    'login':             { icon:'🔑', color:'var(--success)',   label: l.login },
    'user:created':      { icon:'👤', color:'var(--brand-light)', label: l.userCreated },
    'user:updated':      { icon:'✏', color:'var(--warning)',   label: l.userUpdated },
    'user:deleted':      { icon:'🗑', color:'var(--danger)',    label: l.userDeleted },
    'settings:changed':  { icon:'⚙', color:'var(--info)',      label: l.settingsChanged },
  };

  const [events, setEvents] = useState([]);
  const [total, setTotal]   = useState(0);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const PAGE = 50;
  const [offset, setOffset] = useState(0);

  const fetchEvents = async (f = filter, o = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: PAGE, offset: o });
      if (f) params.set('type', f);
      const r = await axios.get(`/api/events?${params}`);
      setEvents(r.data.events);
      setTotal(r.data.total);
      setOffset(o);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, []);

  useEffect(() => {
    const socket = io('', { auth: { token } });
    socket.on('event:new', (ev) => {
      if (!filter || ev.type.startsWith(filter)) {
        setEvents(prev => [ev, ...prev.slice(0, PAGE - 1)]);
        setTotal(t => t + 1);
      }
    });
    return () => socket.disconnect();
  }, [token, filter]);

  const handleFilter = (f) => { setFilter(f); fetchEvents(f, 0); };

  const clearAll = async () => {
    setClearing(true);
    await axios.delete('/api/events');
    setEvents([]); setTotal(0); setOffset(0);
    setClearing(false);
  };

  return (
    <div>
      <div style={s.toolbar}>
        <div style={s.filters}>
          {EVENT_TYPES.map(tp => (
            <button key={tp.key}
              style={{...s.filterBtn, ...(filter===tp.key ? {...s.filterActive, color: tp.color || 'var(--text-primary)', borderColor: (tp.color || 'var(--border)') + '60'} : {})}}
              onClick={() => handleFilter(tp.key)}
            >
              {tp.label}
            </button>
          ))}
        </div>
        <div style={s.toolbarRight}>
          <span style={s.totalBadge}>{total} {l.events}</span>
          {role === 'admin' && (
            <button style={s.clearBtn} onClick={clearAll} disabled={clearing || events.length === 0}>
              {clearing ? l.clearing : l.clear}
            </button>
          )}
          <button style={s.refreshBtn} onClick={() => fetchEvents(filter, offset)}>↺</button>
        </div>
      </div>

      <div style={s.tableWrap}>
        {loading ? (
          <div style={s.loader}>
            <div style={s.spinner} />
            <span style={{color:'var(--text-muted)',fontSize:'0.85em'}}>{l.loading}</span>
          </div>
        ) : events.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyIcon}>📋</div>
            <div style={s.emptyText}>{l.noEvents}</div>
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th style={s.th}>{l.type}</th>
                <th style={s.th}>{l.actor}</th>
                <th style={s.th}>{l.target}</th>
                <th style={s.th}>{l.detail}</th>
                <th style={s.th}>{l.time}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev, i) => {
                const meta = TYPE_META[ev.type] || { icon:'●', color:'var(--text-muted)', label: ev.type };
                return (
                  <tr key={ev.id} style={{...s.row, background: i%2===0 ? 'var(--bg-elevated)':'var(--bg-surface)'}}>
                    <td style={s.td}><div style={s.typeCell}><span style={s.typeIcon}>{meta.icon}</span><span style={{...s.typeLabel, color: meta.color}}>{meta.label}</span></div></td>
                    <td style={s.td}><span style={s.actor}>{ev.actor}</span></td>
                    <td style={s.td}><span style={s.target}>{ev.target || '—'}</span></td>
                    <td style={s.td}><span style={s.detail}>{ev.detail || '—'}</span></td>
                    <td style={s.td}><span style={s.time} title={fmtTime(ev.ts)}>{timeAgo(ev.ts, al)}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {total > PAGE && (
        <div style={s.pagination}>
          <button style={s.pageBtn} disabled={offset === 0} onClick={() => fetchEvents(filter, offset - PAGE)}>{l.prev}</button>
          <span style={s.pageInfo}>{Math.floor(offset/PAGE)+1} / {Math.ceil(total/PAGE)}</span>
          <button style={s.pageBtn} disabled={offset + PAGE >= total} onClick={() => fetchEvents(filter, offset + PAGE)}>{l.next}</button>
        </div>
      )}
    </div>
  );
}

const s = {
  toolbar: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', gap:'12px', flexWrap:'wrap' },
  filters: { display:'flex', gap:'4px', flexWrap:'wrap' },
  filterBtn: { padding:'5px 12px', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'20px', color:'var(--text-muted)', fontFamily:'var(--font-sans)', fontSize:'0.78em', fontWeight:500, cursor:'pointer', transition:'all 0.15s' },
  filterActive: { background:'var(--bg-elevated)', fontWeight:600 },
  toolbarRight: { display:'flex', alignItems:'center', gap:'8px' },
  totalBadge: { fontSize:'0.75em', color:'var(--text-muted)', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'20px', padding:'3px 10px' },
  clearBtn: { padding:'5px 12px', background:'var(--danger-bg)', border:'1px solid var(--danger-border)', borderRadius:'var(--radius)', color:'var(--danger)', fontFamily:'var(--font-sans)', fontSize:'0.78em', cursor:'pointer' },
  refreshBtn: { padding:'5px 10px', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', color:'var(--text-secondary)', cursor:'pointer', fontSize:'0.9em' },
  tableWrap: { background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' },
  table: { width:'100%', borderCollapse:'collapse' },
  thead: { background:'var(--bg)' },
  th: { padding:'10px 14px', textAlign:'left', fontSize:'0.72em', fontWeight:600, letterSpacing:'0.08em', color:'var(--text-muted)', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' },
  row: { borderBottom:'1px solid var(--border)', transition:'background 0.1s' },
  td: { padding:'9px 14px', verticalAlign:'middle' },
  typeCell: { display:'flex', alignItems:'center', gap:'6px' },
  typeIcon: { fontSize:'0.9em' },
  typeLabel: { fontSize:'0.78em', fontWeight:600 },
  actor: { fontSize:'0.82em', fontFamily:'var(--font-mono)', color:'var(--brand-light)' },
  target: { fontSize:'0.82em', fontWeight:500, color:'var(--text-primary)' },
  detail: { fontSize:'0.78em', color:'var(--text-secondary)' },
  time: { fontSize:'0.75em', color:'var(--text-muted)', fontFamily:'var(--font-mono)', whiteSpace:'nowrap', cursor:'default' },
  loader: { display:'flex', alignItems:'center', justifyContent:'center', height:'200px', gap:'12px', flexDirection:'column' },
  spinner: { width:'20px', height:'20px', border:'2px solid var(--border)', borderTop:'2px solid var(--brand)', borderRadius:'50%', animation:'spin 0.7s linear infinite' },
  empty: { display:'flex', flexDirection:'column', alignItems:'center', padding:'60px', gap:'8px' },
  emptyIcon: { fontSize:'2em', marginBottom:'4px' },
  emptyText: { color:'var(--text-muted)', fontSize:'0.9em' },
  pagination: { display:'flex', alignItems:'center', justifyContent:'center', gap:'16px', marginTop:'16px' },
  pageBtn: { padding:'6px 14px', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', color:'var(--text-secondary)', fontFamily:'var(--font-sans)', fontSize:'0.82em', cursor:'pointer' },
  pageInfo: { fontSize:'0.82em', color:'var(--text-muted)' },
};
