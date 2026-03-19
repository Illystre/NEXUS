import React, { useState } from 'react';
import Terminal from './Terminal';
import ContainerDetail from './ContainerDetail';
import { useLang } from './LanguageContext';

const STATE_STYLE = {
  running:    { color:'var(--success)', bg:'var(--success-bg)', border:'var(--success-border)' },
  exited:     { color:'var(--danger)',  bg:'var(--danger-bg)',  border:'var(--danger-border)' },
  paused:     { color:'var(--warning)', bg:'var(--warning-bg)', border:'var(--warning-border)' },
  restarting: { color:'var(--info)',    bg:'var(--info-bg)',    border:'var(--info-bg)' },
};

function fmtMem(b) {
  if (!b) return '—';
  const mb = b / 1024 / 1024;
  return mb >= 1024 ? `${(mb/1024).toFixed(1)}GB` : `${mb.toFixed(0)}MB`;
}

function fmtUptime(status, stopped) {
  if (!status) return '—';
  if (status.startsWith('Up ')) return status.replace('Up ', '');
  if (status.startsWith('Exited')) return stopped;
  return status.split(' ').slice(0,3).join(' ');
}

export default function TableView({ containers, onAction, isViewer }) {
  const { t } = useLang();
  const l = t.tableView;
  const la = t.actions;
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState('all');
  const [sortKey, setSortKey]     = useState('name');
  const [sortDir, setSortDir]     = useState('asc');
  const [terminal, setTerminal]   = useState(null);
  const [detail, setDetail]       = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const doAction = async (id, action) => {
    setActionLoading(id + action);
    await onAction(id, action);
    setTimeout(() => setActionLoading(null), 1500);
  };

  const doDelete = async (id, name) => {
    if (!window.confirm(`Delete container "${name}"?`)) return;
    setActionLoading(id + 'delete');
    await onAction(id, 'delete');
    setTimeout(() => setActionLoading(null), 1500);
  };

  const filtered = containers
    .filter(c => {
      if (filter === 'running' && c.state !== 'running') return false;
      if (filter === 'stopped' && c.state === 'running') return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) &&
          !c.image.toLowerCase().includes(search.toLowerCase()) &&
          !(c.stack || '').toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      let va = a[sortKey] || '', vb = b[sortKey] || '';
      if (sortKey === 'state') { va = a.state; vb = b.state; }
      const cmp = String(va).localeCompare(String(vb));
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const SortIcon = ({ col }) => (
    <span style={{marginLeft:'4px', opacity: sortKey === col ? 1 : 0.3, fontSize:'0.8em'}}>
      {sortKey === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  return (
    <div>
      {terminal && <Terminal container={terminal} onClose={() => setTerminal(null)} />}
      {detail && <ContainerDetail container={detail} onClose={() => setDetail(null)} />}

      <div style={s.toolbar}>
        <div style={s.searchWrap}>
          <span style={s.searchIcon}>⌕</span>
          <input style={s.search} placeholder={l.search} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={s.filters}>
          {[['all', l.all],['running','Running'],['stopped','Stopped']].map(([v,lb]) => (
            <button key={v} style={{...s.filterBtn, ...(filter===v ? s.filterActive:{})}} onClick={() => setFilter(v)}>{lb}</button>
          ))}
        </div>
        <span style={s.count}>{filtered.length} {l.of} {containers.length}</span>
      </div>

      <div className="nexus-table-wrap" style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              <Th label={l.state}   col="state"  onSort={handleSort}><SortIcon col="state" /></Th>
              <Th label={l.name}    col="name"   onSort={handleSort}><SortIcon col="name" /></Th>
              <Th label={l.image}   col="image"  onSort={handleSort}><SortIcon col="image" /></Th>
              <Th label={l.stack}   col="stack"  onSort={handleSort}><SortIcon col="stack" /></Th>
              <Th label={l.uptime}  col="status" onSort={handleSort}><SortIcon col="status" /></Th>
              <Th label={l.ports} />
              <Th label={l.actions} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => {
              const st = STATE_STYLE[c.state] || { color:'var(--text-muted)', bg:'transparent', border:'var(--border)' };
              const isRunning = c.state === 'running';
              const ports = (c.ports || []).filter(p => p.PublicPort);

              return (
                <tr key={c.id} style={{...s.row, background: i % 2 === 0 ? 'var(--bg-elevated)' : 'var(--bg-surface)'}}>
                  <td style={s.td}>
                    <div style={{...s.statePill, color: st.color, background: st.bg, border:`1px solid ${st.border}`}}>
                      <span style={{...s.dot, background: st.color}} />
                      {c.state}
                    </div>
                  </td>
                  <td style={s.td}>
                    <div style={{...s.nameCell, cursor:'pointer', color:'var(--brand-light)'}} onClick={() => setDetail(c)}>{c.name}</div>
                    <div style={s.idCell}>{c.shortId}</div>
                  </td>
                  <td style={s.td}>
                    <span style={s.monoText}>{c.image.split(':')[0]}</span>
                    {c.image.includes(':') && <span style={s.tagText}>:{c.image.split(':')[1]}</span>}
                  </td>
                  <td style={s.td}>
                    {c.stack ? <span style={s.stackBadge}>{c.stack}</span> : <span style={s.nullText}>—</span>}
                  </td>
                  <td style={s.td}>
                    <span style={{...s.uptimeText, color: isRunning ? 'var(--success)' : 'var(--text-muted)'}}>
                      {fmtUptime(c.status, l.stopped)}
                    </span>
                  </td>
                  <td style={s.td}>
                    <div style={s.portsCell}>
                      {ports.length === 0
                        ? <span style={s.nullText}>—</span>
                        : ports.slice(0,3).map((p, i) => (
                          <a key={i} href={`http://localhost:${p.PublicPort}`} target="_blank" rel="noreferrer" style={s.portLink}>{p.PublicPort}</a>
                        ))
                      }
                      {ports.length > 3 && <span style={s.nullText}>+{ports.length-3}</span>}
                    </div>
                  </td>
                  <td style={s.td}>
                    <div style={s.actionsCell}>
                      {!isViewer && (isRunning
                        ? <TBtn label={la.stop}    color="var(--danger)"         loading={actionLoading===c.id+'stop'}    onClick={() => doAction(c.id,'stop')} />
                        : <TBtn label={la.start}   color="var(--success)"        loading={actionLoading===c.id+'start'}   onClick={() => doAction(c.id,'start')} />)
                      }
                      <TBtn label="↺"              color="var(--text-secondary)" loading={actionLoading===c.id+'restart'} onClick={() => doAction(c.id,'restart')} />
                      {isRunning && <TBtn label={`⌨ ${la.terminal}`} color="var(--brand-light)" onClick={() => setTerminal(c)} />}
                      {!isViewer && !isRunning && <TBtn label="🗑" color="var(--danger)" loading={actionLoading===c.id+'delete'} onClick={() => doDelete(c.id, c.name)} />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={s.empty}>{l.noContainers}</div>}
      </div>
    </div>
  );
}

function Th({ label, col, onSort, children }) {
  return (
    <th style={s.th} onClick={col ? () => onSort(col) : undefined}>
      <span style={{cursor: col ? 'pointer' : 'default', userSelect:'none'}}>{label}{children}</span>
    </th>
  );
}

function TBtn({ label, color, onClick, loading }) {
  return (
    <button style={{...s.tBtn, color, borderColor: color + '40'}} onClick={onClick} disabled={loading}>
      {loading ? <span style={{...s.miniSpin, borderTopColor: color}} /> : label}
    </button>
  );
}

const s = {
  toolbar: { display:'flex', gap:'10px', alignItems:'center', marginBottom:'16px', flexWrap:'wrap' },
  searchWrap: { position:'relative', flex:1, minWidth:'220px' },
  searchIcon: { position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' },
  search: { width:'100%', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'8px 12px 8px 34px', color:'var(--text-primary)', fontFamily:'var(--font-sans)', fontSize:'0.88em', outline:'none' },
  filters: { display:'flex', gap:'4px', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'3px' },
  filterBtn: { padding:'5px 14px', background:'transparent', border:'none', borderRadius:'var(--radius-sm)', color:'var(--text-muted)', fontFamily:'var(--font-sans)', fontSize:'0.82em', fontWeight:500, cursor:'pointer', transition:'all 0.15s' },
  filterActive: { background:'var(--bg-elevated)', color:'var(--text-primary)', boxShadow:'0 1px 3px #00000030' },
  count: { fontSize:'0.78em', color:'var(--text-muted)', whiteSpace:'nowrap' },
  tableWrap: { background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' },
  table: { width:'100%', borderCollapse:'collapse' },
  thead: { background:'var(--bg)' },
  th: { padding:'10px 14px', textAlign:'left', fontSize:'0.72em', fontWeight:600, letterSpacing:'0.08em', color:'var(--text-muted)', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' },
  row: { transition:'background 0.1s', borderBottom:'1px solid var(--border)' },
  td: { padding:'10px 14px', verticalAlign:'middle' },
  statePill: { display:'inline-flex', alignItems:'center', gap:'5px', fontSize:'0.72em', fontWeight:600, padding:'3px 8px', borderRadius:'20px', whiteSpace:'nowrap' },
  dot: { width:'5px', height:'5px', borderRadius:'50%', flexShrink:0 },
  nameCell: { fontWeight:500, fontSize:'0.88em', color:'var(--text-primary)' },
  idCell: { fontSize:'0.68em', color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginTop:'1px' },
  monoText: { fontSize:'0.78em', fontFamily:'var(--font-mono)', color:'var(--text-secondary)' },
  tagText: { fontSize:'0.72em', fontFamily:'var(--font-mono)', color:'var(--text-muted)' },
  stackBadge: { fontSize:'0.72em', color:'var(--brand-light)', background:'var(--brand-glow)', border:'1px solid var(--border-focus)', borderRadius:'4px', padding:'2px 7px' },
  uptimeText: { fontSize:'0.78em', fontFamily:'var(--font-mono)' },
  nullText: { color:'var(--text-muted)', fontSize:'0.78em' },
  portsCell: { display:'flex', gap:'4px', flexWrap:'wrap', alignItems:'center' },
  portLink: { fontSize:'0.72em', color:'var(--brand-light)', background:'var(--brand-glow)', border:'1px solid var(--border-focus)', borderRadius:'4px', padding:'2px 6px', fontFamily:'var(--font-mono)', textDecoration:'none' },
  actionsCell: { display:'flex', gap:'5px', alignItems:'center' },
  tBtn: { padding:'4px 9px', background:'transparent', border:'1px solid', borderRadius:'var(--radius-sm)', fontFamily:'var(--font-sans)', fontSize:'0.75em', fontWeight:500, cursor:'pointer', transition:'all 0.15s', whiteSpace:'nowrap', display:'flex', alignItems:'center' },
  miniSpin: { width:'10px', height:'10px', border:'2px solid transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' },
  empty: { color:'var(--text-muted)', padding:'50px', textAlign:'center', fontSize:'0.9em' },
};
