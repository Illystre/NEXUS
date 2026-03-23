import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import ContainerList from './ContainerList';
import StackView from './StackView';
import MetricsView from './MetricsView';
import TableView from './TableView';
import SettingsView from './SettingsView';
import EventsView from './EventsView';
import AlertPanel from './AlertPanel';
import DeployView from './DeployView';
import ImagesView from './ImagesView';
import NetworksView from './NetworksView';
import VolumesView from './VolumesView';
import { useLang } from './LanguageContext';

// ── OS Icons ──────────────────────────────────────────────────────────────────
const OS_META = {
  windows: { src: null, label: 'Windows' },
  ubuntu:  { src: 'https://cdn.simpleicons.org/ubuntu/E95420', label: 'Ubuntu' },
  debian:  { src: 'https://cdn.simpleicons.org/debian/A81D33', label: 'Debian' },
  fedora:  { src: 'https://cdn.simpleicons.org/fedora/51A2DA', label: 'Fedora' },
  rhel:    { src: 'https://cdn.simpleicons.org/redhat/EE0000', label: 'Red Hat' },
  rocky:   { src: 'https://cdn.simpleicons.org/rockylinux/10B981', label: 'Rocky Linux' },
  alpine:  { src: 'https://cdn.simpleicons.org/alpinelinux/0D597F', label: 'Alpine' },
  linux:   { src: 'https://cdn.simpleicons.org/linux/FCC624', label: 'Linux' },
  local:   { src: null, label: 'Local' },
};
function HostIcon({ os }) {
  const meta = OS_META[os] || OS_META.linux;
  if (os === 'windows') return <svg viewBox="0 0 32 32" width="16" height="16" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}><path fill="#00ADEF" d="M30,15H17c-0.6,0-1-0.4-1-1V3.3c0-0.5,0.4-0.9,0.8-1l13-2.3c0.3,0,0.6,0,0.8,0.2C30.9,0.4,31,0.7,31,1v13C31,14.6,30.6,15,30,15z"/><path fill="#00ADEF" d="M13,15H1c-0.6,0-1-0.4-1-1V6c0-0.5,0.4-0.9,0.8-1l12-2c0.3,0,0.6,0,0.8,0.2C13.9,3.4,14,3.7,14,4v10C14,14.6,13.6,15,13,15z"/><path fill="#00ADEF" d="M30,32c-0.1,0-0.1,0-0.2,0l-13-2.3c-0.5-0.1-0.8-0.5-0.8-1V18c0-0.6,0.4-1,1-1h13c0.6,0,1,0.4,1,1v13c0,0.3-0.1,0.6-0.4,0.8C30.5,31.9,30.2,32,30,32z"/><path fill="#00ADEF" d="M13,29c-0.1,0-0.1,0-0.2,0l-12-2C0.4,26.9,0,26.5,0,26v-8c0-0.6,0.4-1,1-1h12c0.6,0,1,0.4,1,1v10c0,0.3-0.1,0.6-0.4,0.8C13.5,28.9,13.2,29,13,29z"/></svg>;
  if (!meta.src) return (
    <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}>
      <path fill="var(--brand)" d="M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
    </svg>
  );
  return <img src={meta.src} width="16" height="16" style={{flexShrink:0, display:'block'}} alt={meta.label} />;
}


// ── Custom Host Selector ──────────────────────────────────────────────────────
function HostSelector({ hosts, selectedHost, onSelect, localLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allOptions = [
    { id: 'local', name: localLabel, os: 'local' },
    ...hosts,
  ];
  const current = allOptions.find(h => h.id === selectedHost) || allOptions[0];

  return (
    <div ref={ref} style={{position:'relative'}}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width:'100%', display:'flex', alignItems:'center', gap:'8px',
          background:'var(--bg-elevated)', border:'1px solid var(--border)',
          borderRadius:'var(--radius)', color:'var(--text-primary)',
          fontFamily:'var(--font-sans)', fontSize:'0.85em',
          padding:'7px 10px', cursor:'pointer', outline:'none',
          justifyContent:'space-between',
        }}
      >
        <span style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <HostIcon os={current.os || 'local'} />
          {current.name}
        </span>
        <span style={{fontSize:'0.7em',color:'var(--text-muted)'}}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 4px)', left:0, right:0,
          background:'var(--bg-elevated)', border:'1px solid var(--border)',
          borderRadius:'var(--radius)', zIndex:200, overflow:'hidden',
          boxShadow:'0 8px 24px #00000040',
        }}>
          {allOptions.map(h => (
            <button key={h.id}
              onClick={() => { onSelect(h.id); setOpen(false); }}
              style={{
                width:'100%', display:'flex', alignItems:'center', gap:'8px',
                padding:'8px 10px', background: h.id === selectedHost ? 'var(--brand-glow)' : 'transparent',
                border:'none', color: h.id === selectedHost ? 'var(--brand-light)' : 'var(--text-primary)',
                fontFamily:'var(--font-sans)', fontSize:'0.85em', cursor:'pointer',
                textAlign:'left',
              }}
            >
              <HostIcon os={h.os || 'local'} />
              {h.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}



function applyTheme(settings) {
  if (!settings) return;
  const root = document.documentElement;
  const accent = settings.accent || '#4f78ff';
  root.style.setProperty('--brand', accent);
  root.style.setProperty('--brand-glow', accent + '20');
  root.style.setProperty('--border-focus', accent + '80');
  root.style.setProperty('--brand-light', accent);
  if (settings.theme === 'light') {
    root.style.setProperty('--bg',           '#f8fafc');
    root.style.setProperty('--bg-surface',   '#ffffff');
    root.style.setProperty('--bg-elevated',  '#f1f5f9');
    root.style.setProperty('--border',       '#e2e8f0');
    root.style.setProperty('--border-hi',    '#cbd5e1');
    root.style.setProperty('--text-primary',    '#0f172a');
    root.style.setProperty('--text-secondary',  '#475569');
    root.style.setProperty('--text-muted',      '#94a3b8');
  } else {
    root.style.setProperty('--bg',           '#0f1117');
    root.style.setProperty('--bg-surface',   '#161b27');
    root.style.setProperty('--bg-elevated',  '#1c2333');
    root.style.setProperty('--border',       '#252d3d');
    root.style.setProperty('--border-hi',    '#2e3a52');
    root.style.setProperty('--text-primary',    '#f1f5f9');
    root.style.setProperty('--text-secondary',  '#8b9ab4');
    root.style.setProperty('--text-muted',      '#4a5568');
  }
}

export default function Dashboard() {
  const { user, role, logout } = useAuth();
  const { t, lang, changeLang } = useLang();
  const n = t.nav;
  const d = t.dashboard;

  const [tab, setTab]               = useState('stacks');
  const [containers, setContainers] = useState([]);
  const [info, setInfo]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settings, setSettings]     = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [hosts, setHosts]           = useState([]);
  const [selectedHost, setSelectedHost] = useState('local');

  const isViewer = role === 'viewer';
  const isAdmin  = role === 'admin';

  useEffect(() => {
    axios.get('/api/settings').then(r => {
      setSettings(r.data); applyTheme(r.data);
      if (r.data.refreshInterval) setRefreshInterval(r.data.refreshInterval);
    }).catch(() => {});
    axios.get('/api/hosts').then(r => setHosts(r.data)).catch(() => {});
  }, []);

  const handleSettingsChange = (s) => {
    setSettings(s); applyTheme(s);
    if (s.refreshInterval) setRefreshInterval(s.refreshInterval);
  };

  const hostParam = selectedHost === 'local' ? '' : `?host=${selectedHost}`;

  const fetchAll = useCallback(async () => {
    try {
      const [cRes, iRes] = await Promise.allSettled([
        axios.get(`/api/containers${hostParam}`),
        axios.get(`/api/info${hostParam}`)
      ]);
      if (cRes.status === 'fulfilled') setContainers(cRes.value.data);
      else if (cRes.reason?.response?.status === 401) { logout(); return; }
      if (iRes.status === 'fulfilled') setInfo(iRes.value.data);
      setLastRefresh(new Date());
    } catch(e) { if (e.response?.status === 401) logout(); }
    finally { setLoading(false); }
  }, [logout, hostParam]);

  useEffect(() => {
    setLoading(true);
    fetchAll();
    const i = setInterval(fetchAll, refreshInterval);
    return () => clearInterval(i);
  }, [fetchAll, refreshInterval]);

  const handleAction = async (id, action) => {
    if (isViewer) return;
    if (action === 'delete') {
      await axios.delete(`/api/containers/${id}${hostParam}`);
    } else {
      await axios.post(`/api/containers/${id}/${action}${hostParam}`);
    }
    setTimeout(fetchAll, 800);
  };

  const running = containers.filter(c => c.state === 'running').length;
  const stopped = containers.filter(c => c.state !== 'running').length;
  const stacks  = [...new Set(containers.map(c => c.stack).filter(Boolean))].length;

  const currentHostName = selectedHost === 'local'
    ? d.local
    : hosts.find(h => h.id === selectedHost)?.name || selectedHost;

  const NAV_MAIN = [
    { id:'stacks',   icon:'⊞', label: n.stacks },
    { id:'table',    icon:'≡', label: n.table },
    { id:'all',      icon:'▦', label: n.cards },
    { id:'metrics',  icon:'◈', label: n.metrics },
    { id:'events',   icon:'▤', label: n.events },
    { id:'images',   icon:'◫', label: n.images || 'Images' },
    { id:'networks', icon:'⬡', label: n.networks || 'Networks' },
    { id:'volumes',  icon:'⬢', label: n.volumes || 'Volumes' },
  ];

  const NAV_DEPLOY = isAdmin ? [
    { id:'deploy', icon:'⊕', label: n.deploy },
  ] : [];

  const handleNavClick = (id) => { setTab(id); setSidebarOpen(false); };

  const allNavItems = [...NAV_MAIN, ...NAV_DEPLOY, { id:'settings', label: n.settings }];

  return (
    <div style={s.shell}>
      <div className={`sidebar-overlay${sidebarOpen?' visible':''}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`nexus-sidebar${sidebarOpen?' open':''}`} style={s.sidebar}>
        <div style={s.sidebarTop}>
          <div style={s.logo}>
            <svg viewBox="0 0 192 192" width="36" height="36" style={{borderRadius:8,flexShrink:0}}>
              <rect width="192" height="192" rx="40" fill="#0f1f1a"/>
              <rect x="18" y="18" width="72" height="72" rx="14" fill="#00c896"/>
              <rect x="102" y="18" width="72" height="72" rx="14" fill="#00c896" opacity="0.55"/>
              <rect x="18" y="102" width="72" height="72" rx="14" fill="#00c896" opacity="0.3"/>
              <rect x="102" y="102" width="72" height="72" rx="14" fill="none" stroke="#00c896" strokeWidth="5"/>
              <path d="M118 118 L118 156 L128 156 L128 134 L150 156 L160 156 L160 118 L150 118 L150 140 L128 118 Z" fill="#00c896"/>
              <line x1="90" y1="54" x2="102" y2="54" stroke="#00c896" strokeWidth="5" opacity="0.45" strokeLinecap="round"/>
              <line x1="54" y1="90" x2="54" y2="102" stroke="#00c896" strokeWidth="5" opacity="0.45" strokeLinecap="round"/>
              <line x1="90" y1="138" x2="102" y2="138" stroke="#00c896" strokeWidth="5" opacity="0.45" strokeLinecap="round"/>
              <line x1="138" y1="90" x2="138" y2="102" stroke="#00c896" strokeWidth="5" opacity="0.45" strokeLinecap="round"/>
            </svg>
            <div>
              <div style={s.logoText}>NEXUS</div>
              <div style={s.logoSubtitle}>CONTAINER PLATFORM</div>
            </div>
          </div>

          {hosts.length > 0 && (
            <div style={s.hostSelectorWrap}>
              <div style={s.hostSelectorLabel}>SERVIDOR</div>
              <HostSelector
                hosts={hosts}
                selectedHost={selectedHost}
                onSelect={setSelectedHost}
                localLabel={d.local}
              />
            </div>
          )}

          <nav style={s.nav}>
            <div style={s.navSection}>VISTAS</div>
            {NAV_MAIN.map(item => (
              <button key={item.id} style={{...s.navItem, ...(tab===item.id?s.navItemActive:{})}} onClick={() => handleNavClick(item.id)}>
                <span style={s.navIcon}>{item.icon}</span>
                {item.label}
                {tab===item.id && <span style={s.navActiveBar} />}
              </button>
            ))}

            {NAV_DEPLOY.length > 0 && (
              <>
                <div style={s.navSection}>GESTIONAR</div>
                {NAV_DEPLOY.map(item => (
                  <button key={item.id} style={{...s.navItem, ...(tab===item.id?s.navItemActive:{})}} onClick={() => handleNavClick(item.id)}>
                    <span style={s.navIcon}>{item.icon}</span>
                    {item.label}
                    {tab===item.id && <span style={s.navActiveBar} />}
                  </button>
                ))}
              </>
            )}

            <div style={s.navSection}>CUENTA</div>
            <button style={{...s.navItem, ...(tab==='settings'?s.navItemActive:{})}} onClick={() => handleNavClick('settings')}>
              <span style={s.navIcon}>⚙</span>
              {n.settings}
              {unreadAlerts > 0 && <span style={s.alertBadge}>{unreadAlerts > 9 ? '9+' : unreadAlerts}</span>}
              {tab==='settings' && <span style={s.navActiveBar} />}
            </button>
          </nav>
        </div>

        <div style={s.sidebarBottom}>
          {info && (
            <div style={s.hostInfo}>
              {[['Docker',info.dockerVersion],['CPUs',info.cpus],['RAM',`${(info.memory/1024/1024/1024).toFixed(1)} GB`]].map(([l,v]) => (
                <div key={l} style={s.hostRow}><span style={s.hostLabel}>{l}</span><span style={s.hostVal}>{v}</span></div>
              ))}
            </div>
          )}
          <div style={s.userRow}>
            <div style={s.userAvatar}>{user?.[0]?.toUpperCase()}</div>
            <div style={s.userInfo}>
              <div style={s.userName}>{user}</div>
              <div style={s.userRole}>
                {isViewer ? <span style={{color:'var(--text-muted)'}}>Viewer</span> : <span style={{color:'var(--brand-light)'}}>Administrator</span>}
              </div>
            </div>
            <button style={s.logoutBtn} onClick={logout} title="Logout">⎋</button>
          </div>
        </div>
      </aside>

      <div className="nexus-main" style={s.main}>
        <header style={s.topbar}>
          <div style={s.topbarLeft}>
            <button className="hamburger" style={s.hamburger} onClick={() => setSidebarOpen(v => !v)}>☰</button>
            <h1 style={s.pageTitle}>{allNavItems.find(nv=>nv.id===tab)?.label}</h1>
            {hosts.length > 0 && (
              <span style={s.hostBadge}>
                <HostIcon os={selectedHost === 'local' ? 'local' : hosts.find(h => h.id === selectedHost)?.os} />
                {currentHostName}
              </span>
            )}
            {lastRefresh && tab !== 'settings' && tab !== 'deploy' && tab !== 'images' && tab !== 'networks' && tab !== 'volumes' && (
              <span style={s.refreshBadge}><span style={s.refreshDot} />{lastRefresh.toLocaleTimeString()}</span>
            )}
          </div>
          <div style={s.topbarRight}>
            {tab !== 'settings' && tab !== 'deploy' && tab !== 'images' && tab !== 'networks' && tab !== 'volumes' && (
              <>
                <div className="metric-pills-desktop" style={s.metricPills}>
                  {[{dot:'var(--success)',num:running,lbl:d.running},{dot:'var(--danger)',num:stopped,lbl:d.stopped},{dot:'var(--brand)',num:stacks,lbl:d.stacks}].map(m => (
                    <div key={m.lbl} style={s.metricPill}>
                      <span style={{...s.dot, background:m.dot}} />
                      <span style={s.metricNum}>{m.num}</span>
                      <span style={s.metricLbl}>{m.lbl}</span>
                    </div>
                  ))}
                </div>
                <span style={s.mobileRunning}><span style={{...s.dot,background:'var(--success)'}} />{running}</span>
              </>
            )}
            <div style={s.langToggle}>
              {['en','es'].map(lg => (
                <button key={lg} style={{...s.langBtn, ...(lang===lg?s.langBtnActive:{})}} onClick={() => changeLang(lg)}>
                  {lg === 'en' ? '🇬🇧' : '🇪🇸'}
                </button>
              ))}
            </div>
            <AlertPanel onUnreadChange={setUnreadAlerts} />
            <button style={s.refreshBtn} onClick={fetchAll}>↺</button>
          </div>
        </header>

        <div className="nexus-content" style={s.content}>
          {loading && tab !== 'settings' && tab !== 'deploy' && tab !== 'images' && tab !== 'networks' && tab !== 'volumes' ? <Loader msg={d.loading} /> : (
            <div key={tab + selectedHost} className="fade-up">
              {tab==='stacks'    && <StackView     containers={containers} onAction={handleAction} isViewer={isViewer} />}
              {tab==='table'     && <TableView     containers={containers} onAction={handleAction} isViewer={isViewer} />}
              {tab==='all'       && <ContainerList containers={containers} onAction={handleAction} isViewer={isViewer} />}
              {tab==='metrics'   && <MetricsView   containers={containers} hostParam={hostParam} />}
              {tab==='events'    && <EventsView />}
              {tab==='deploy'    && <DeployView    onContainersRefresh={fetchAll} />}
              {tab==='images'    && <ImagesView    hostParam={hostParam} isViewer={isViewer} />}
              {tab==='networks'  && <NetworksView  hostParam={hostParam} isViewer={isViewer} />}
              {tab==='volumes'   && <VolumesView   hostParam={hostParam} isViewer={isViewer} />}
              {tab==='settings'  && <SettingsView  onSettingsChange={handleSettingsChange} onHostsChange={setHosts} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Loader({ msg }) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'300px',flexDirection:'column',gap:'12px'}}>
      <div style={{width:'22px',height:'22px',border:'2px solid var(--border)',borderTop:'2px solid var(--brand)',borderRadius:'50%',animation:'spin 0.7s linear infinite'}} />
      <span style={{color:'var(--text-muted)',fontSize:'0.85em'}}>{msg}</span>
    </div>
  );
}

const s = {
  shell:{display:'flex',height:'100vh',overflow:'hidden',position:'relative'},
  sidebar:{width:'220px',flexShrink:0,background:'var(--bg-surface)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',justifyContent:'space-between',height:'100vh'},
  sidebarTop:{padding:'20px 16px',flex:1,overflowY:'auto'},
  logo:{display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px',padding:'0 4px'},
  logoMark:{width:'32px',height:'32px',background:'#00c89620',border:'1px solid #00c89640',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0},
  logoText:{fontWeight:700,fontSize:'1em',letterSpacing:'0.15em'},
  logoSubtitle:{fontSize:'0.6em',letterSpacing:'0.12em',color:'var(--text-muted)',marginTop:'1px'},
  hostSelectorWrap:{marginBottom:'16px'},
  hostSelectorLabel:{fontSize:'0.68em',fontWeight:600,letterSpacing:'0.12em',color:'var(--text-muted)',padding:'0 4px 6px'},
  hostSelect:{width:'100%',background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'var(--radius)',color:'var(--text-primary)',fontFamily:'var(--font-sans)',fontSize:'0.85em',padding:'7px 10px',cursor:'pointer',outline:'none'},
  nav:{display:'flex',flexDirection:'column',gap:'2px'},
  navSection:{fontSize:'0.68em',fontWeight:600,letterSpacing:'0.12em',color:'var(--text-muted)',padding:'8px 8px 6px'},
  navItem:{display:'flex',alignItems:'center',gap:'9px',padding:'10px 10px',background:'transparent',border:'none',borderRadius:'var(--radius)',color:'var(--text-secondary)',fontFamily:'var(--font-sans)',fontSize:'0.9em',cursor:'pointer',transition:'all 0.15s',textAlign:'left',width:'100%',position:'relative'},
  navItemActive:{background:'var(--bg-elevated)',color:'var(--text-primary)',fontWeight:500},
  navIcon:{width:'16px',textAlign:'center'},
  navActiveBar:{position:'absolute',left:0,top:'20%',bottom:'20%',width:'3px',background:'var(--brand)',borderRadius:'0 2px 2px 0'},
  alertBadge:{marginLeft:'auto',background:'var(--danger)',color:'white',fontSize:'0.65em',fontWeight:700,borderRadius:'20px',padding:'1px 6px'},
  sidebarBottom:{borderTop:'1px solid var(--border)',padding:'12px 16px',display:'flex',flexDirection:'column',gap:'12px'},
  hostInfo:{display:'flex',flexDirection:'column',gap:'4px'},
  hostRow:{display:'flex',justifyContent:'space-between'},
  hostLabel:{fontSize:'0.72em',color:'var(--text-muted)'},
  hostVal:{fontSize:'0.72em',color:'var(--text-secondary)',fontFamily:'var(--font-mono)'},
  userRow:{display:'flex',alignItems:'center',gap:'10px'},
  userAvatar:{width:'32px',height:'32px',background:'var(--brand-glow)',border:'1px solid var(--border-focus)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.85em',fontWeight:700,color:'var(--brand-light)',flexShrink:0},
  userInfo:{flex:1,minWidth:0},
  userName:{fontSize:'0.85em',fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'},
  userRole:{fontSize:'0.7em'},
  logoutBtn:{background:'transparent',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:'1.1em',padding:'4px',flexShrink:0},
  main:{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0},
  topbar:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',borderBottom:'1px solid var(--border)',background:'var(--bg)',flexShrink:0,gap:'8px'},
  topbarLeft:{display:'flex',alignItems:'center',gap:'10px',flex:1,minWidth:0},
  hamburger:{background:'transparent',border:'1px solid var(--border)',borderRadius:'var(--radius)',color:'var(--text-secondary)',fontSize:'1em',cursor:'pointer',padding:'6px 10px',flexShrink:0},
  pageTitle:{fontSize:'1em',fontWeight:600,letterSpacing:'-0.01em',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'},
  hostBadge:{display:'flex',alignItems:'center',gap:'4px',fontSize:'0.72em',color:'var(--brand-light)',background:'var(--brand-glow)',border:'1px solid var(--border-focus)',borderRadius:'20px',padding:'3px 8px',flexShrink:0,whiteSpace:'nowrap'},
  refreshBadge:{display:'flex',alignItems:'center',gap:'5px',fontSize:'0.72em',color:'var(--text-muted)',background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'20px',padding:'3px 8px',flexShrink:0},
  refreshDot:{width:'5px',height:'5px',borderRadius:'50%',background:'var(--success)',animation:'pulse 2s infinite'},
  topbarRight:{display:'flex',alignItems:'center',gap:'8px',flexShrink:0},
  metricPills:{display:'flex',gap:'8px',alignItems:'center'},
  metricPill:{display:'flex',alignItems:'center',gap:'6px',background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'20px',padding:'4px 12px'},
  dot:{width:'6px',height:'6px',borderRadius:'50%',flexShrink:0},
  metricNum:{fontSize:'0.85em',fontWeight:600},
  metricLbl:{fontSize:'0.75em',color:'var(--text-muted)'},
  mobileRunning:{display:'flex',alignItems:'center',gap:'5px',fontSize:'0.85em',fontWeight:600,color:'var(--success)'},
  langToggle:{display:'flex',gap:'2px',background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'2px'},
  langBtn:{padding:'4px 7px',background:'transparent',border:'none',borderRadius:'var(--radius-sm)',cursor:'pointer',fontSize:'0.85em'},
  langBtnActive:{background:'var(--bg-elevated)'},
  refreshBtn:{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'6px 10px',color:'var(--text-secondary)',fontFamily:'var(--font-sans)',fontSize:'0.9em',cursor:'pointer'},
  content:{flex:1,overflow:'auto',padding:'20px 24px'},
};
