import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

function formatSize(bytes) {
  if (!bytes) return '—';
  const gb = bytes / 1024 / 1024 / 1024;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(0)} MB`;
}

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleDateString();
}

function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div style={{
      position:'fixed', top:'20px', right:'20px',
      background:'var(--bg-elevated)', border:`1px solid ${type==='success'?'var(--success)':'var(--danger)'}`,
      color: type==='success'?'var(--success)':'var(--danger)',
      borderRadius:'var(--radius)', padding:'10px 16px', fontSize:'0.85em',
      fontWeight:500, zIndex:999, boxShadow:'0 4px 20px #00000050'
    }}>
      {type==='success'?'✔':'⚠'} {msg}
    </div>
  );
}

export default function ImagesView({ hostParam, isViewer }) {
  const [images, setImages]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [toast, setToast]         = useState(null);
  const [deleting, setDeleting]   = useState(null);
  const [selected, setSelected]   = useState(null);
  const [inspect, setInspect]     = useState(null);
  const [inspecting, setInspecting] = useState(false);
  const [pullImage, setPullImage] = useState('');
  const [pulling, setPulling]     = useState(false);
  const [hubQuery, setHubQuery]   = useState('');
  const [hubResults, setHubResults] = useState([]);
  const [hubSearching, setHubSearching] = useState(false);
  const [showPullPanel, setShowPullPanel] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`/api/images${hostParam ? hostParam : ''}`);
      setImages(r.data);
    } catch (e) {
      showToast(e.response?.data?.error || 'Error loading images', 'error');
    } finally {
      setLoading(false);
    }
  }, [hostParam]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (img) => {
    const tag = img.tags?.[0] || img.shortId;
    if (!window.confirm(`Delete image "${tag}"?`)) return;
    setDeleting(img.id);
    try {
      await axios.delete(`/api/images/${encodeURIComponent(img.id)}${hostParam ? hostParam : ''}`);
      showToast('Image deleted');
      setSelected(null);
      setInspect(null);
      await load();
    } catch (e) {
      showToast(e.response?.data?.error || 'Error deleting image', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handleInspect = async (img) => {
    if (selected?.id === img.id && inspect) {
      setSelected(null);
      setInspect(null);
      return;
    }
    setSelected(img);
    setInspect(null);
    setInspecting(true);
    try {
      const r = await axios.get(`/api/images/${encodeURIComponent(img.id)}/inspect${hostParam ? hostParam : ''}`);
      setInspect(r.data);
    } catch (e) {
      showToast(e.response?.data?.error || 'Error inspecting image', 'error');
    } finally {
      setInspecting(false);
    }
  };

  const handlePull = async () => {
    if (!pullImage.trim()) return;
    setPulling(true);
    try {
      await axios.post(`/api/images/pull${hostParam ? hostParam : ''}`, { image: pullImage.trim() });
      showToast(`Image "${pullImage}" pulled successfully`);
      setPullImage('');
      await load();
    } catch (e) {
      showToast(e.response?.data?.error || 'Error pulling image', 'error');
    } finally {
      setPulling(false);
    }
  };

  const handleHubSearch = async () => {
    if (!hubQuery.trim()) return;
    setHubSearching(true);
    setHubResults([]);
    try {
      const r = await axios.get(`/api/images/search?q=${encodeURIComponent(hubQuery)}`);
      setHubResults(r.data);
    } catch (e) {
      showToast('Error searching Docker Hub', 'error');
    } finally {
      setHubSearching(false);
    }
  };

  const filtered = images.filter(img => {
    const q = search.toLowerCase();
    return img.tags?.some(t => t.toLowerCase().includes(q)) || img.shortId.includes(q);
  });

  const totalSize = images.reduce((acc, img) => acc + (img.size || 0), 0);

  return (
    <div style={s.page}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <div style={s.toolbar}>
        <div style={s.stats}>
          <span style={s.statItem}><span style={s.statNum}>{images.length}</span> images</span>
          <span style={s.statDivider}>·</span>
          <span style={s.statItem}><span style={s.statNum}>{formatSize(totalSize)}</span> total</span>
        </div>
        <div style={s.toolbarRight}>
          <input
            style={s.searchInput}
            placeholder="Filter images..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {!isViewer && (
            <button style={s.pullBtn} onClick={() => setShowPullPanel(v => !v)}>
              ⬇ Pull image
            </button>
          )}
          <button style={s.refreshBtn} onClick={load}>↺</button>
        </div>
      </div>

      {showPullPanel && !isViewer && (
        <div style={s.pullPanel}>
          <div style={s.pullSection}>
            <div style={s.pullLabel}>Pull from registry</div>
            <div style={s.pullRow}>
              <input
                style={{...s.searchInput, minWidth:'260px'}}
                placeholder="e.g. nginx:latest, postgres:16"
                value={pullImage}
                onChange={e => setPullImage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePull()}
              />
              <button style={s.pullBtn} onClick={handlePull} disabled={pulling || !pullImage.trim()}>
                {pulling ? 'Pulling...' : 'Pull'}
              </button>
            </div>
          </div>
          <div style={s.pullDivider} />
          <div style={s.pullSection}>
            <div style={s.pullLabel}>Search Docker Hub</div>
            <div style={s.pullRow}>
              <input
                style={{...s.searchInput, minWidth:'200px'}}
                placeholder="Search e.g. nginx, redis..."
                value={hubQuery}
                onChange={e => setHubQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleHubSearch()}
              />
              <button style={s.pullBtn} onClick={handleHubSearch} disabled={hubSearching || !hubQuery.trim()}>
                {hubSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
            {hubResults.length > 0 && (
              <div style={s.hubResults}>
                {hubResults.map(r => (
                  <div key={r.name} style={s.hubRow}>
                    <div style={s.hubInfo}>
                      <span style={s.hubName}>{r.name}</span>
                      {r.official && <span style={s.officialBadge}>Official</span>}
                      <span style={s.hubDesc}>{r.description?.slice(0, 80) || '—'}</span>
                    </div>
                    <div style={s.hubMeta}>
                      <span style={s.hubStat}>★ {r.stars?.toLocaleString()}</span>
                      <button style={s.pullSmallBtn} onClick={() => { setPullImage(r.name + ':latest'); setHubResults([]); }}>
                        ⬇ Pull
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'200px',color:'var(--text-muted)',fontSize:'0.85em'}}>
          Loading images...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'200px',color:'var(--text-muted)',fontSize:'0.85em'}}>
          No images found
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Image</th>
                <th style={s.th}>Tag</th>
                <th style={s.th}>ID</th>
                <th style={s.th}>Size</th>
                <th style={s.th}>Created</th>
                {!isViewer && <th style={s.th}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(img => {
                const [repo, tag] = (img.tags?.[0] || '<none>:<none>').split(':');
                const isSelected = selected?.id === img.id;
                return (
                  <React.Fragment key={img.id}>
                    <tr
                      style={{...s.tr, ...(isSelected ? s.trSelected : {})}}
                      onClick={() => handleInspect(img)}
                    >
                      <td style={s.td}>
                        <span style={s.repoName}>{repo}</span>
                      </td>
                      <td style={s.td}>
                        <span style={s.tagBadge}>{tag || 'latest'}</span>
                      </td>
                      <td style={s.td}>
                        <span style={s.mono}>{img.shortId}</span>
                      </td>
                      <td style={s.td}>{formatSize(img.size)}</td>
                      <td style={s.td}>{formatDate(img.created)}</td>
                      {!isViewer && (
                        <td style={s.td} onClick={e => e.stopPropagation()}>
                          <button
                            style={s.deleteBtn}
                            onClick={() => handleDelete(img)}
                            disabled={deleting === img.id}
                          >
                            {deleting === img.id ? '...' : '🗑'}
                          </button>
                        </td>
                      )}
                    </tr>
                    {isSelected && (
                      <tr>
                        <td colSpan={isViewer ? 5 : 6} style={s.inspectCell}>
                          {inspecting ? (
                            <div style={{padding:'16px',color:'var(--text-muted)',fontSize:'0.82em'}}>Loading details...</div>
                          ) : inspect ? (
                            <div style={s.inspectGrid}>
                              <div style={s.inspectGroup}>
                                <div style={s.inspectLabel}>Architecture</div>
                                <div style={s.inspectValue}>{inspect.Architecture} / {inspect.Os}</div>
                              </div>
                              <div style={s.inspectGroup}>
                                <div style={s.inspectLabel}>Author</div>
                                <div style={s.inspectValue}>{inspect.Author || '—'}</div>
                              </div>
                              <div style={s.inspectGroup}>
                                <div style={s.inspectLabel}>Entrypoint</div>
                                <div style={s.inspectValue}>{inspect.Config?.Entrypoint?.join(' ') || '—'}</div>
                              </div>
                              <div style={s.inspectGroup}>
                                <div style={s.inspectLabel}>CMD</div>
                                <div style={s.inspectValue}>{inspect.Config?.Cmd?.join(' ') || '—'}</div>
                              </div>
                              <div style={s.inspectGroup}>
                                <div style={s.inspectLabel}>Exposed ports</div>
                                <div style={s.inspectValue}>{Object.keys(inspect.Config?.ExposedPorts || {}).join(', ') || '—'}</div>
                              </div>
                              <div style={s.inspectGroup}>
                                <div style={s.inspectLabel}>Layers</div>
                                <div style={s.inspectValue}>{inspect.RootFS?.Layers?.length || 0}</div>
                              </div>
                              {inspect.Config?.Env?.length > 0 && (
                                <div style={{...s.inspectGroup, gridColumn:'1/-1'}}>
                                  <div style={s.inspectLabel}>Environment</div>
                                  <pre style={s.inspectPre}>{inspect.Config.Env.join('\n')}</pre>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const s = {
  page:{display:'flex',flexDirection:'column',gap:'16px'},
  toolbar:{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'10px'},
  stats:{display:'flex',alignItems:'center',gap:'8px'},
  statItem:{fontSize:'0.85em',color:'var(--text-secondary)'},
  statNum:{fontWeight:600,color:'var(--text-primary)'},
  statDivider:{color:'var(--text-muted)'},
  toolbarRight:{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'},
  searchInput:{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'7px 12px',color:'var(--text-primary)',fontFamily:'var(--font-sans)',fontSize:'0.85em',outline:'none',minWidth:'180px'},
  pullBtn:{padding:'7px 14px',background:'var(--brand-glow)',border:'1px solid var(--border-focus)',borderRadius:'var(--radius)',color:'var(--brand-light)',fontFamily:'var(--font-sans)',fontSize:'0.82em',fontWeight:600,cursor:'pointer'},
  refreshBtn:{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'7px 10px',color:'var(--text-secondary)',fontFamily:'var(--font-sans)',fontSize:'0.9em',cursor:'pointer'},
  pullPanel:{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'16px 20px',display:'flex',gap:'24px',flexWrap:'wrap'},
  pullSection:{display:'flex',flexDirection:'column',gap:'10px',flex:1,minWidth:'220px'},
  pullLabel:{fontSize:'0.78em',fontWeight:600,color:'var(--text-muted)',letterSpacing:'0.06em'},
  pullRow:{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'},
  pullDivider:{width:'1px',background:'var(--border)',alignSelf:'stretch'},
  hubResults:{display:'flex',flexDirection:'column',gap:'4px',marginTop:'4px',maxHeight:'260px',overflowY:'auto'},
  hubRow:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 10px',background:'var(--bg-elevated)',borderRadius:'var(--radius)',gap:'12px'},
  hubInfo:{display:'flex',flexDirection:'column',gap:'2px',flex:1,minWidth:0},
  hubName:{fontSize:'0.85em',fontWeight:500,color:'var(--text-primary)'},
  hubDesc:{fontSize:'0.75em',color:'var(--text-muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'},
  hubMeta:{display:'flex',alignItems:'center',gap:'8px',flexShrink:0},
  hubStat:{fontSize:'0.75em',color:'var(--text-muted)'},
  officialBadge:{fontSize:'0.68em',fontWeight:600,padding:'1px 6px',borderRadius:'20px',background:'var(--success-bg)',color:'var(--success)',border:'1px solid var(--success-border)',alignSelf:'flex-start'},
  pullSmallBtn:{padding:'4px 10px',background:'var(--brand-glow)',border:'1px solid var(--border-focus)',borderRadius:'var(--radius)',color:'var(--brand-light)',fontFamily:'var(--font-sans)',fontSize:'0.75em',fontWeight:600,cursor:'pointer'},
  tableWrap:{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden'},
  table:{width:'100%',borderCollapse:'collapse'},
  th:{padding:'10px 14px',textAlign:'left',fontSize:'0.72em',fontWeight:600,letterSpacing:'0.06em',color:'var(--text-muted)',borderBottom:'1px solid var(--border)',background:'var(--bg-elevated)'},
  tr:{cursor:'pointer',transition:'background 0.12s'},
  trSelected:{background:'var(--brand-glow)'},
  td:{padding:'10px 14px',fontSize:'0.85em',borderBottom:'1px solid var(--border)',color:'var(--text-secondary)'},
  repoName:{fontWeight:500,color:'var(--text-primary)',fontFamily:'var(--font-mono)',fontSize:'0.9em'},
  tagBadge:{fontSize:'0.75em',padding:'2px 8px',borderRadius:'20px',background:'var(--bg-elevated)',border:'1px solid var(--border)',color:'var(--text-muted)',fontFamily:'var(--font-mono)'},
  mono:{fontFamily:'var(--font-mono)',fontSize:'0.82em'},
  deleteBtn:{background:'transparent',border:'1px solid var(--danger-border)',borderRadius:'var(--radius-sm)',color:'var(--danger)',cursor:'pointer',padding:'3px 8px',fontSize:'0.8em'},
  inspectCell:{padding:'0',background:'var(--bg-elevated)',borderBottom:'1px solid var(--border)'},
  inspectGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))',gap:'12px',padding:'16px 20px'},
  inspectGroup:{display:'flex',flexDirection:'column',gap:'4px'},
  inspectLabel:{fontSize:'0.7em',fontWeight:600,color:'var(--text-muted)',letterSpacing:'0.06em'},
  inspectValue:{fontSize:'0.82em',color:'var(--text-primary)',fontFamily:'var(--font-mono)'},
  inspectPre:{fontSize:'0.75em',color:'var(--text-secondary)',fontFamily:'var(--font-mono)',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'8px 10px',overflowX:'auto',margin:0,lineHeight:1.6},
};
