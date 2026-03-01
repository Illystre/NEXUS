import React, { useState } from 'react';
import ContainerCard from './ContainerCard';

export default function ContainerList({ containers, onAction }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = containers.filter(c => {
    if (filter === 'running' && c.state !== 'running') return false;
    if (filter === 'stopped' && c.state === 'running') return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div style={s.toolbar}>
        <div style={s.searchWrap}>
          <span style={s.searchIcon}>⌕</span>
          <input
            style={s.search}
            placeholder="Buscar contenedor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={s.filters}>
          {[['all','Todos'],['running','Running'],['stopped','Stopped']].map(([v,l]) => (
            <button key={v} style={{...s.filterBtn, ...(filter===v ? s.filterActive : {})}} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
        <span style={s.count}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
      </div>
      <div style={s.grid}>
        {filtered.map(c => <ContainerCard key={c.id} container={c} onAction={onAction} />)}
        {filtered.length === 0 && <div style={s.empty}>No se encontraron contenedores</div>}
      </div>
    </div>
  );
}

const s = {
  toolbar: { display:'flex', gap:'10px', alignItems:'center', marginBottom:'20px', flexWrap:'wrap' },
  searchWrap: { position:'relative', flex:1, minWidth:'200px' },
  searchIcon: { position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:'1.1em', pointerEvents:'none' },
  search: {
    width:'100%', background:'var(--bg-surface)', border:'1px solid var(--border)',
    borderRadius:'var(--radius)', padding:'8px 12px 8px 34px', color:'var(--text-primary)',
    fontFamily:'var(--font-sans)', fontSize:'0.88em', outline:'none',
  },
  filters: { display:'flex', gap:'4px', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'3px' },
  filterBtn: {
    padding:'5px 14px', background:'transparent', border:'none', borderRadius:'var(--radius-sm)',
    color:'var(--text-muted)', fontFamily:'var(--font-sans)', fontSize:'0.82em',
    fontWeight:500, cursor:'pointer', transition:'all 0.15s',
  },
  filterActive: { background:'var(--bg-elevated)', color:'var(--text-primary)', boxShadow:'0 1px 3px #00000030' },
  count: { fontSize:'0.78em', color:'var(--text-muted)', whiteSpace:'nowrap' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:'12px' },
  empty: { color:'var(--text-muted)', padding:'60px', textAlign:'center', gridColumn:'1/-1', fontSize:'0.9em' },
};
