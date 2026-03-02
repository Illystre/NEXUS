import React, { useState } from 'react';
import ContainerCard from './ContainerCard';

export default function StackView({ containers, onAction, isViewer }) {
  const [collapsed, setCollapsed] = useState({});
  const [search, setSearch] = useState('');

  const stacks = {};
  containers.forEach(c => {
    const key = c.stack || '__standalone__';
    if (!stacks[key]) stacks[key] = [];
    stacks[key].push(c);
  });

  const entries = Object.entries(stacks)
    .filter(([k, ctrs]) => !search || ctrs.some(c => c.name.toLowerCase().includes(search.toLowerCase())) || k.toLowerCase().includes(search.toLowerCase()))
    .sort(([a],[b]) => a === '__standalone__' ? 1 : b === '__standalone__' ? -1 : a.localeCompare(b));

  const toggle = k => setCollapsed(p => ({...p, [k]: !p[k]}));

  return (
    <div>
      <div style={s.toolbar}>
        <div style={s.searchWrap}>
          <span style={s.searchIcon}>⌕</span>
          <input style={s.search} placeholder="Buscar stack o contenedor..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span style={s.summary}>{entries.length} stack{entries.length !== 1 ? 's' : ''} · {containers.length} contenedores</span>
      </div>

      <div style={s.stacks}>
        {entries.map(([key, ctrs]) => {
          const running = ctrs.filter(c => c.state === 'running').length;
          const isStandalone = key === '__standalone__';
          const isCollapsed = collapsed[key];
          const health = running === ctrs.length ? 'healthy' : running === 0 ? 'down' : 'degraded';
          const healthColors = { healthy: 'var(--success)', down: 'var(--danger)', degraded: 'var(--warning)' };
          const healthLabels = { healthy: 'Healthy', down: 'Down', degraded: 'Degraded' };

          return (
            <div key={key} style={s.stack}>
              <div style={s.stackHeader} onClick={() => toggle(key)}>
                <div style={s.stackLeft}>
                  <span style={s.chevron}>{isCollapsed ? '›' : '⌄'}</span>
                  <div style={{...s.stackIcon, background: isStandalone ? 'var(--bg-elevated)' : 'var(--brand-glow)', borderColor: isStandalone ? 'var(--border)' : 'var(--border-focus)'}}>
                    {isStandalone ? '◇' : '⬡'}
                  </div>
                  <div>
                    <div style={s.stackName}>{isStandalone ? 'Standalone' : key}</div>
                    <div style={s.stackMeta}>{ctrs.length} contenedor{ctrs.length !== 1 ? 'es' : ''}</div>
                  </div>
                </div>
                <div style={s.stackRight}>
                  <div style={{...s.healthBadge, color: healthColors[health], background: `${healthColors[health]}10`, border: `1px solid ${healthColors[health]}30`}}>
                    <span style={{...s.healthDot, background: healthColors[health]}} />
                    {healthLabels[health]}
                  </div>
                  <div style={s.countBadge}>{running}/{ctrs.length}</div>
                </div>
              </div>

              {!isCollapsed && (
                <div style={s.stackBody}>
                  <div className="nexus-stack-grid" style={s.grid}>
                    {ctrs.map(c => <ContainerCard key={c.id} container={c} onAction={onAction} isViewer={isViewer} />)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s = {
  toolbar: { display:'flex', gap:'12px', alignItems:'center', marginBottom:'20px' },
  searchWrap: { position:'relative', flex:1, maxWidth:'360px' },
  searchIcon: { position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' },
  search: {
    width:'100%', background:'var(--bg-surface)', border:'1px solid var(--border)',
    borderRadius:'var(--radius)', padding:'8px 12px 8px 34px', color:'var(--text-primary)',
    fontFamily:'var(--font-sans)', fontSize:'0.88em', outline:'none',
  },
  summary: { fontSize:'0.78em', color:'var(--text-muted)', marginLeft:'auto' },
  stacks: { display:'flex', flexDirection:'column', gap:'12px' },
  stack: {
    background:'var(--bg-surface)', border:'1px solid var(--border)',
    borderRadius:'var(--radius-lg)', overflow:'hidden',
  },
  stackHeader: {
    display:'flex', justifyContent:'space-between', alignItems:'center',
    padding:'14px 18px', cursor:'pointer', transition:'background 0.15s',
    userSelect:'none',
  },
  stackLeft: { display:'flex', alignItems:'center', gap:'12px' },
  chevron: { color:'var(--text-muted)', fontSize:'1.1em', width:'14px', transition:'transform 0.2s' },
  stackIcon: {
    width:'30px', height:'30px', border:'1px solid', borderRadius:'7px',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:'0.85em', color:'var(--brand-light)', flexShrink:0,
  },
  stackName: { fontWeight:600, fontSize:'0.9em', color:'var(--text-primary)', marginBottom:'1px' },
  stackMeta: { fontSize:'0.72em', color:'var(--text-muted)' },
  stackRight: { display:'flex', alignItems:'center', gap:'10px' },
  healthBadge: {
    display:'flex', alignItems:'center', gap:'5px',
    fontSize:'0.75em', fontWeight:600, padding:'3px 10px',
    borderRadius:'20px', letterSpacing:'0.02em',
  },
  healthDot: { width:'5px', height:'5px', borderRadius:'50%' },
  countBadge: {
    fontSize:'0.75em', color:'var(--text-secondary)',
    background:'var(--bg-elevated)', border:'1px solid var(--border)',
    borderRadius:'20px', padding:'3px 10px', fontFamily:'var(--font-mono)',
  },
  stackBody: { borderTop:'1px solid var(--border)', padding:'16px' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'10px' },
};
