import React, { useState, useEffect } from 'react';
import axios from 'axios';

function fmt(bytes) {
  if (!bytes) return '—';
  const gb = bytes / 1024 / 1024 / 1024;
  return gb >= 1 ? `${gb.toFixed(2)} GB` : `${(bytes/1024/1024).toFixed(0)} MB`;
}

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={s.section}>
      <button style={s.sectionHeader} onClick={() => setOpen(v => !v)}>
        <span style={s.sectionChevron}>{open ? '⌄' : '›'}</span>
        <span style={s.sectionTitle}>{title}</span>
      </button>
      {open && <div style={s.sectionBody}>{children}</div>}
    </div>
  );
}

function KV({ k, v, mono = false, copyable = false }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(String(v));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div style={s.kv}>
      <div style={s.kvKey}>{k}</div>
      <div style={s.kvVal}>
        <span style={mono ? s.mono : {}}>{v ?? '—'}</span>
        {copyable && v && (
          <button style={s.copyBtn} onClick={copy}>{copied ? '✓' : '⎘'}</button>
        )}
      </div>
    </div>
  );
}

function EnvRow({ env }) {
  const [show, setShow] = useState(false);
  const [k, ...rest] = env.split('=');
  const v = rest.join('=');
  const isSensitive = /pass|secret|key|token|pwd|auth/i.test(k);
  return (
    <div style={s.envRow}>
      <span style={s.envKey}>{k}</span>
      <span style={s.envEq}>=</span>
      <span style={s.envVal}>
        {isSensitive && !show ? '••••••••' : (v || '""')}
      </span>
      {isSensitive && (
        <button style={s.eyeBtn} onClick={() => setShow(v => !v)}>{show ? '○' : '●'}</button>
      )}
    </div>
  );
}

const STATE_STYLE = {
  running:  { color:'var(--success)', bg:'var(--success-bg)', border:'var(--success-border)' },
  exited:   { color:'var(--danger)',  bg:'var(--danger-bg)',  border:'var(--danger-border)' },
  paused:   { color:'var(--warning)', bg:'var(--warning-bg)', border:'var(--warning-border)' },
};

export default function ContainerDetail({ container, onClose }) {
  const [inspect, setInspect] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('general');

  useEffect(() => {
    axios.get(`/api/containers/${container.id}/inspect`)
      .then(r => setInspect(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [container.id]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const st = STATE_STYLE[container.state] || { color:'var(--text-muted)', bg:'transparent', border:'var(--border)' };

  const TABS = ['general', 'red', 'volúmenes', 'env', 'inspect'];

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>

        {/* Header */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <div style={{...s.stateDot, background: st.color, boxShadow: `0 0 0 3px ${st.color}25`}} />
            <div>
              <div style={s.title}>{container.name}</div>
              <div style={s.subtitle}>{container.image}</div>
            </div>
            <div style={{...s.statePill, color: st.color, background: st.bg, border:`1px solid ${st.border}`}}>
              {container.state}
            </div>
          </div>
          <div style={s.headerRight}>
            <span style={s.idBadge}>{container.shortId}</span>
            <button style={s.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={s.tabs}>
          {TABS.map(t => (
            <button key={t} style={{...s.tabBtn, ...(tab===t ? s.tabActive:{})}} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {tab===t && <span style={s.tabBar} />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={s.body}>
          {loading ? (
            <div style={s.loader}>
              <div style={s.spinner} />
              <span style={{color:'var(--text-muted)', fontSize:'0.85em'}}>Cargando inspect...</span>
            </div>
          ) : !inspect ? (
            <div style={s.loader}><span style={{color:'var(--danger)'}}>Error cargando datos</span></div>
          ) : (
            <>
              {/* GENERAL */}
              {tab === 'general' && (
                <div>
                  <Section title="Información básica">
                    <KV k="ID completo"    v={inspect.Id}                         mono copyable />
                    <KV k="Nombre"         v={inspect.Name?.replace('/','') }     mono />
                    <KV k="Imagen"         v={inspect.Config?.Image}              mono />
                    <KV k="Image ID"       v={inspect.Image?.substring(7,19)}     mono />
                    <KV k="Creado"         v={new Date(inspect.Created).toLocaleString('es-ES')} />
                    <KV k="Plataforma"     v={inspect.Platform} />
                    <KV k="Restart policy" v={inspect.HostConfig?.RestartPolicy?.Name} />
                    <KV k="Stack"          v={container.stack || '—'} />
                  </Section>
                  <Section title="Estado">
                    <KV k="Estado"    v={inspect.State?.Status} />
                    <KV k="Running"   v={String(inspect.State?.Running)} />
                    <KV k="PID"       v={inspect.State?.Pid} mono />
                    <KV k="Iniciado"  v={inspect.State?.StartedAt ? new Date(inspect.State.StartedAt).toLocaleString('es-ES') : '—'} />
                    <KV k="Exit code" v={inspect.State?.ExitCode} />
                    {inspect.State?.Error && <KV k="Error" v={inspect.State.Error} />}
                  </Section>
                  <Section title="Recursos">
                    <KV k="CPUs"         v={inspect.HostConfig?.NanoCpus ? `${inspect.HostConfig.NanoCpus / 1e9}` : 'Sin límite'} />
                    <KV k="Memoria"      v={inspect.HostConfig?.Memory ? fmt(inspect.HostConfig.Memory) : 'Sin límite'} />
                    <KV k="Swap"         v={inspect.HostConfig?.MemorySwap ? fmt(inspect.HostConfig.MemorySwap) : '—'} />
                    <KV k="Privilegiado" v={String(inspect.HostConfig?.Privileged)} />
                  </Section>
                  {(inspect.Config?.Cmd || inspect.Config?.Entrypoint) && (
                    <Section title="Comando">
                      {inspect.Config.Entrypoint && <KV k="Entrypoint" v={inspect.Config.Entrypoint.join(' ')} mono />}
                      {inspect.Config.Cmd        && <KV k="Cmd"        v={inspect.Config.Cmd.join(' ')}        mono />}
                      {inspect.Config.WorkingDir && <KV k="WorkingDir" v={inspect.Config.WorkingDir}           mono />}
                    </Section>
                  )}
                </div>
              )}

              {/* RED */}
              {tab === 'red' && (
                <div>
                  <Section title="Puertos">
                    {Object.entries(inspect.NetworkSettings?.Ports || {}).length === 0
                      ? <div style={s.empty}>Sin puertos expuestos</div>
                      : Object.entries(inspect.NetworkSettings.Ports).map(([port, bindings]) => (
                        <div key={port} style={s.kv}>
                          <div style={s.kvKey}>{port}</div>
                          <div style={s.kvVal}>
                            {bindings
                              ? bindings.map((b,i) => (
                                <a key={i} href={`http://localhost:${b.HostPort}`} target="_blank" rel="noreferrer" style={s.portLink}>
                                  localhost:{b.HostPort} ↗
                                </a>
                              ))
                              : <span style={{color:'var(--text-muted)'}}>No publicado</span>
                            }
                          </div>
                        </div>
                      ))
                    }
                  </Section>
                  <Section title="Redes">
                    {Object.entries(inspect.NetworkSettings?.Networks || {}).map(([name, net]) => (
                      <div key={name} style={s.netBlock}>
                        <div style={s.netName}>{name}</div>
                        <KV k="IP"         v={net.IPAddress || '—'}   mono />
                        <KV k="Gateway"    v={net.Gateway || '—'}     mono />
                        <KV k="MAC"        v={net.MacAddress || '—'}  mono />
                        <KV k="Network ID" v={net.NetworkID?.substring(0,12)} mono />
                      </div>
                    ))}
                  </Section>
                  <Section title="DNS">
                    <KV k="Hostname"   v={inspect.Config?.Hostname} mono />
                    <KV k="Domainname" v={inspect.Config?.Domainname || '—'} mono />
                    {inspect.HostConfig?.Dns?.length > 0 && <KV k="DNS servers" v={inspect.HostConfig.Dns.join(', ')} mono />}
                  </Section>
                </div>
              )}

              {/* VOLÚMENES */}
              {tab === 'volúmenes' && (
                <div>
                  <Section title="Mounts">
                    {(inspect.Mounts || []).length === 0
                      ? <div style={s.empty}>Sin volúmenes montados</div>
                      : (inspect.Mounts || []).map((m, i) => (
                        <div key={i} style={s.mountBlock}>
                          <div style={s.mountType}>
                            <span style={{...s.typeBadge, color: m.Type==='bind'?'var(--brand-light)':'var(--warning)', background: m.Type==='bind'?'var(--brand-glow)':'var(--warning-bg)'}}>{m.Type}</span>
                            <span style={{color: m.RW ? 'var(--success)':'var(--danger)', fontSize:'0.72em'}}>{m.RW ? 'read/write' : 'read-only'}</span>
                          </div>
                          <KV k="Origen"  v={m.Source}      mono copyable />
                          <KV k="Destino" v={m.Destination} mono copyable />
                          {m.Name && <KV k="Nombre" v={m.Name} mono />}
                        </div>
                      ))
                    }
                  </Section>
                </div>
              )}

              {/* ENV */}
              {tab === 'env' && (
                <div>
                  <Section title={`Variables de entorno (${(inspect.Config?.Env || []).length})`}>
                    {(inspect.Config?.Env || []).length === 0
                      ? <div style={s.empty}>Sin variables de entorno</div>
                      : (inspect.Config.Env || []).map((e, i) => <EnvRow key={i} env={e} />)
                    }
                  </Section>
                  <Section title="Labels" defaultOpen={false}>
                    {Object.entries(inspect.Config?.Labels || {}).length === 0
                      ? <div style={s.empty}>Sin labels</div>
                      : Object.entries(inspect.Config.Labels).map(([k,v]) => <KV key={k} k={k} v={v} mono />)
                    }
                  </Section>
                </div>
              )}

              {/* INSPECT RAW */}
              {tab === 'inspect' && (
                <div>
                  <div style={s.rawHeader}>
                    <span style={{color:'var(--text-muted)',fontSize:'0.8em'}}>docker inspect {container.name}</span>
                    <button style={s.copyAllBtn} onClick={() => navigator.clipboard.writeText(JSON.stringify(inspect, null, 2))}>
                      ⎘ Copiar JSON
                    </button>
                  </div>
                  <pre style={s.raw}>{JSON.stringify(inspect, null, 2)}</pre>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' },
  modal: { width:'780px', maxWidth:'95vw', height:'80vh', maxHeight:'700px', background:'var(--bg)', border:'1px solid var(--border-hi)', borderRadius:'var(--radius-lg)', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 24px 64px #000000b0' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid var(--border)', background:'var(--bg-surface)', flexShrink:0 },
  headerLeft: { display:'flex', alignItems:'center', gap:'12px' },
  stateDot: { width:'9px', height:'9px', borderRadius:'50%', flexShrink:0 },
  title: { fontWeight:700, fontSize:'1em', color:'var(--text-primary)' },
  subtitle: { fontSize:'0.72em', color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginTop:'2px' },
  statePill: { fontSize:'0.7em', fontWeight:600, padding:'3px 10px', borderRadius:'20px' },
  headerRight: { display:'flex', alignItems:'center', gap:'10px' },
  idBadge: { fontSize:'0.72em', fontFamily:'var(--font-mono)', color:'var(--text-muted)', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'4px', padding:'3px 8px' },
  closeBtn: { background:'transparent', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', color:'var(--text-muted)', cursor:'pointer', padding:'5px 10px', fontSize:'0.85em' },
  tabs: { display:'flex', borderBottom:'1px solid var(--border)', background:'var(--bg-surface)', flexShrink:0, padding:'0 16px' },
  tabBtn: { position:'relative', padding:'10px 16px', background:'transparent', border:'none', color:'var(--text-muted)', fontFamily:'var(--font-sans)', fontSize:'0.82em', fontWeight:500, cursor:'pointer', transition:'color 0.15s', textTransform:'capitalize' },
  tabActive: { color:'var(--text-primary)' },
  tabBar: { position:'absolute', bottom:0, left:'12px', right:'12px', height:'2px', background:'var(--brand)', borderRadius:'2px' },
  body: { flex:1, overflow:'auto', padding:'20px' },
  loader: { display:'flex', alignItems:'center', justifyContent:'center', height:'200px', gap:'12px', flexDirection:'column' },
  spinner: { width:'20px', height:'20px', border:'2px solid var(--border)', borderTop:'2px solid var(--brand)', borderRadius:'50%', animation:'spin 0.7s linear infinite' },
  section: { marginBottom:'16px', border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' },
  sectionHeader: { display:'flex', alignItems:'center', gap:'8px', padding:'10px 14px', background:'var(--bg-elevated)', border:'none', width:'100%', textAlign:'left', cursor:'pointer', transition:'background 0.15s' },
  sectionChevron: { color:'var(--text-muted)', fontSize:'0.9em', width:'12px' },
  sectionTitle: { fontSize:'0.8em', fontWeight:600, letterSpacing:'0.06em', color:'var(--text-secondary)' },
  sectionBody: { padding:'4px 0' },
  kv: { display:'flex', alignItems:'flex-start', gap:'12px', padding:'6px 14px', borderTop:'1px solid var(--border)' },
  kvKey: { width:'140px', fontSize:'0.75em', color:'var(--text-muted)', flexShrink:0, paddingTop:'1px' },
  kvVal: { flex:1, fontSize:'0.82em', color:'var(--text-primary)', display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap' },
  mono: { fontFamily:'var(--font-mono)', fontSize:'0.9em', wordBreak:'break-all' },
  copyBtn: { background:'transparent', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:'0.85em', padding:'1px 4px', borderRadius:'3px', flexShrink:0 },
  envRow: { display:'flex', alignItems:'center', gap:'4px', padding:'5px 14px', borderTop:'1px solid var(--border)', fontFamily:'var(--font-mono)', fontSize:'0.78em' },
  envKey: { color:'var(--brand-light)', minWidth:'140px' },
  envEq: { color:'var(--text-muted)' },
  envVal: { color:'var(--text-secondary)', flex:1, wordBreak:'break-all' },
  eyeBtn: { background:'transparent', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:'0.8em', padding:'0 4px', flexShrink:0 },
  netBlock: { padding:'10px 14px', borderTop:'1px solid var(--border)' },
  netName: { fontSize:'0.8em', fontWeight:600, color:'var(--brand-light)', marginBottom:'6px', fontFamily:'var(--font-mono)' },
  mountBlock: { padding:'10px 14px', borderTop:'1px solid var(--border)' },
  mountType: { display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' },
  typeBadge: { fontSize:'0.7em', fontWeight:600, padding:'2px 8px', borderRadius:'4px' },
  portLink: { color:'var(--brand-light)', fontSize:'0.85em', fontFamily:'var(--font-mono)', textDecoration:'none' },
  empty: { padding:'20px 14px', fontSize:'0.82em', color:'var(--text-muted)', fontStyle:'italic' },
  rawHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' },
  copyAllBtn: { background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', color:'var(--text-secondary)', cursor:'pointer', padding:'5px 12px', fontSize:'0.78em', fontFamily:'var(--font-sans)' },
  raw: { background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'14px', fontSize:'0.72em', fontFamily:'var(--font-mono)', color:'var(--text-secondary)', overflow:'auto', whiteSpace:'pre', lineHeight:1.6 },
};
