import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useLang } from './LanguageContext';

const HISTORY_SIZE = 60;

function Sparkline({ data, color, height = 48, width = 160 }) {
  if (!data || data.length < 2) return <div style={{ width, height, background: 'var(--bg)', borderRadius: 4 }} />;
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => {
    const x = (i / (HISTORY_SIZE - 1)) * width;
    const y = height - (v / max) * height * 0.9;
    return `${x},${y}`;
  }).join(' ');
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`grad-${color.replace(/[^a-z]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${color.replace(/[^a-z]/gi, '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function fmtMem(b) {
  if (!b) return '0 MB';
  const mb = b / 1024 / 1024;
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
}

function MetricCard({ container, hostParam }) {
  const [cpuHistory, setCpuHistory] = useState(Array(HISTORY_SIZE).fill(0));
  const [memHistory, setMemHistory] = useState(Array(HISTORY_SIZE).fill(0));
  const [latest, setLatest] = useState(null);
  const intervalRef = useRef(null);

  const fetchStats = useCallback(async () => {
    try {
      const sep = hostParam.includes('?') ? '&' : '?';
      const url = `/api/containers/${container.id}/stats${hostParam}`;
      const r = await axios.get(url);
      const d = r.data;
      setLatest(d);
      setCpuHistory(prev => [...prev.slice(1), d.cpu]);
      setMemHistory(prev => [...prev.slice(1), d.memPercent]);
    } catch {}
  }, [container.id, hostParam]);

  useEffect(() => {
    fetchStats();
    intervalRef.current = setInterval(fetchStats, 1000);
    return () => clearInterval(intervalRef.current);
  }, [fetchStats]);

  return (
    <div style={s.metCard}>
      <div style={s.metHeader}>
        <div style={s.metDot} />
        <div style={s.metName}>{container.name}</div>
        <div style={s.metStack}>{container.stack || 'standalone'}</div>
      </div>
      <div style={s.metCharts}>
        <div style={s.chartBlock}>
          <div style={s.chartLabelRow}>
            <span style={s.chartLabel}>CPU</span>
            <span style={{...s.chartVal, color:'var(--brand)'}}>{latest ? `${latest.cpu.toFixed(1)}%` : '—'}</span>
          </div>
          <div style={s.chartArea}><Sparkline data={cpuHistory} color="var(--brand)" height={52} width={220} /></div>
          <div style={s.axisLabels}><span>60s</span><span>0s</span></div>
        </div>
        <div style={s.chartBlock}>
          <div style={s.chartLabelRow}>
            <span style={s.chartLabel}>RAM</span>
            <span style={{...s.chartVal, color:'var(--warning)'}}>{latest ? `${fmtMem(latest.memUsage)} (${latest.memPercent.toFixed(1)}%)` : '—'}</span>
          </div>
          <div style={s.chartArea}><Sparkline data={memHistory} color="var(--warning)" height={52} width={220} /></div>
          <div style={s.axisLabels}><span>60s</span><span>0s</span></div>
        </div>
      </div>
    </div>
  );
}

export default function MetricsView({ containers, hostParam = '' }) {
  const { t } = useLang();
  const l = t.metricsView;
  const running = containers.filter(c => c.state === 'running');
  const [search, setSearch] = useState('');
  const filtered = running.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={s.toolbar}>
        <div style={s.searchWrap}>
          <span style={s.searchIcon}>⌕</span>
          <input style={s.search} placeholder={l.search} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={s.badge}>
          <span style={s.badgeDot} />
          {filtered.length} {filtered.length !== 1 ? l.containers : l.container} {filtered.length !== 1 ? l.monitored_plural : l.monitored} · {l.updateRate}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div style={s.empty}>
          <div style={s.emptyIcon}>📊</div>
          <div style={s.emptyText}>{l.noContainers}</div>
          <div style={s.emptySub}>{l.noContainersSub}</div>
        </div>
      ) : (
        <div className="nexus-metrics-grid" style={s.grid}>
          {filtered.map(c => <MetricCard key={c.id} container={c} hostParam={hostParam} />)}
        </div>
      )}
    </div>
  );
}

const s = {
  toolbar: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', flexWrap: 'wrap' },
  searchWrap: { position: 'relative', flex: 1, maxWidth: '360px' },
  searchIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' },
  search: { width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px 8px 34px', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: '0.88em', outline: 'none' },
  badge: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75em', color: 'var(--text-muted)', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '4px 12px' },
  badgeDot: { width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', animation: 'pulse 2s infinite', flexShrink: 0 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))', gap: '12px' },
  metCard: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' },
  metHeader: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderBottom: '1px solid var(--border)' },
  metDot: { width: '7px', height: '7px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 0 3px var(--success-bg)', flexShrink: 0 },
  metName: { fontWeight: 600, fontSize: '0.9em', color: 'var(--text-primary)', flex: 1 },
  metStack: { fontSize: '0.7em', color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '20px', padding: '2px 8px' },
  metCharts: { display: 'flex', gap: '1px', background: 'var(--border)' },
  chartBlock: { flex: 1, background: 'var(--bg-elevated)', padding: '12px 14px 8px' },
  chartLabelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' },
  chartLabel: { fontSize: '0.7em', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-muted)' },
  chartVal: { fontSize: '0.85em', fontWeight: 700, fontFamily: 'var(--font-mono)' },
  chartArea: { borderRadius: '4px', overflow: 'hidden', background: 'var(--bg)' },
  axisLabels: { display: 'flex', justifyContent: 'space-between', fontSize: '0.62em', color: 'var(--text-muted)', marginTop: '4px', padding: '0 2px' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '8px' },
  emptyIcon: { fontSize: '2.5em', marginBottom: '8px' },
  emptyText: { fontWeight: 600, color: 'var(--text-secondary)' },
  emptySub: { fontSize: '0.85em', color: 'var(--text-muted)' },
};
