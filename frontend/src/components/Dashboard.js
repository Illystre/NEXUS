import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import ContainerList from './ContainerList';
import StackView from './StackView';
import MetricsView from './MetricsView';
import TableView from './TableView';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('stacks');
  const [containers, setContainers] = useState([]);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [cRes, iRes] = await Promise.all([axios.get('/api/containers'), axios.get('/api/info')]);
      setContainers(cRes.data);
      setInfo(iRes.data);
      setLastRefresh(new Date());
    } catch(e) { if (e.response?.status === 401) logout(); }
    finally { setLoading(false); }
  }, [logout]);

  useEffect(() => { fetchAll(); const i = setInterval(fetchAll, 5000); return () => clearInterval(i); }, [fetchAll]);

  const handleAction = async (id, action) => {
    await axios.post(`/api/containers/${id}/${action}`);
    setTimeout(fetchAll, 800);
  };

  const running = containers.filter(c => c.state === 'running').length;
  const stopped = containers.filter(c => c.state !== 'running').length;
  const stacks  = [...new Set(containers.map(c => c.stack).filter(Boolean))].length;

  const NAV = [
    { id:'stacks',  icon:'⊞', label:'Stacks' },
    { id:'table',   icon:'≡', label:'Tabla compacta' },
    { id:'all',     icon:'▦', label:'Tarjetas' },
    { id:'metrics', icon:'◈', label:'Métricas' },
  ];

  return (
    <div style={s.shell}>
      <aside style={s.sidebar}>
        <div style={s.sidebarTop}>
          <div style={s.logo}>
            <div style={s.logoMark}>
              <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
                <rect x="2" y="2" width="11" height="11" rx="2" fill="#4f78ff"/>
                <rect x="15" y="2" width="11" height="11" rx="2" fill="#4f78ff" opacity="0.5"/>
                <rect x="2" y="15" width="11" height="11" rx="2" fill="#4f78ff" opacity="0.5"/>
                <rect x="15" y="15" width="11" height="11" rx="2" fill="#4f78ff" opacity="0.25"/>
              </svg>
            </div>
            <span style={s.logoText}>NEXUS</span>
          </div>
          <nav style={s.nav}>
            <div style={s.navSection}>VISTAS</div>
            {NAV.map(n => (
              <button key={n.id} style={{...s.navItem, ...(tab===n.id ? s.navItemActive:{})}} onClick={() => setTab(n.id)}>
                <span style={s.navIcon}>{n.icon}</span>
                <span>{n.label}</span>
                {tab===n.id && <span style={s.navActiveBar} />}
              </button>
            ))}
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
              <div style={s.userRole}>Administrator</div>
            </div>
            <button style={s.logoutBtn} onClick={logout} title="Cerrar sesión">⎋</button>
          </div>
        </div>
      </aside>

      <div style={s.main}>
        <header style={s.topbar}>
          <div style={s.topbarLeft}>
            <h1 style={s.pageTitle}>{NAV.find(n=>n.id===tab)?.label}</h1>
            {lastRefresh && (
              <span style={s.refreshBadge}><span style={s.refreshDot} />{lastRefresh.toLocaleTimeString('es-ES')}</span>
            )}
          </div>
          <div style={s.topbarRight}>
            {[{dot:'var(--success)',num:running,lbl:'running'},{dot:'var(--danger)',num:stopped,lbl:'stopped'},{dot:'var(--brand)',num:stacks,lbl:'stacks'}].map(m => (
              <div key={m.lbl} style={s.metricPill}>
                <span style={{...s.dot, background:m.dot}} />
                <span style={s.metricNum}>{m.num}</span>
                <span style={s.metricLbl}>{m.lbl}</span>
              </div>
            ))}
            <button style={s.refreshBtn} onClick={fetchAll}>↺ Refresh</button>
          </div>
        </header>

        <div style={s.content}>
          {loading ? <Loader /> : (
            <div key={tab} className="fade-up">
              {tab==='stacks'  && <StackView   containers={containers} onAction={handleAction} />}
              {tab==='table'   && <TableView   containers={containers} onAction={handleAction} />}
              {tab==='all'     && <ContainerList containers={containers} onAction={handleAction} />}
              {tab==='metrics' && <MetricsView containers={containers} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Loader() {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'400px',flexDirection:'column',gap:'12px'}}>
      <div style={{width:'22px',height:'22px',border:'2px solid var(--border)',borderTop:'2px solid var(--brand)',borderRadius:'50%',animation:'spin 0.7s linear infinite'}} />
      <span style={{color:'var(--text-muted)',fontSize:'0.85em'}}>Cargando...</span>
    </div>
  );
}

const s = {
  shell:{display:'flex',height:'100vh',overflow:'hidden'},
  sidebar:{width:'220px',flexShrink:0,background:'var(--bg-surface)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',justifyContent:'space-between'},
  sidebarTop:{padding:'20px 16px',flex:1},
  logo:{display:'flex',alignItems:'center',gap:'10px',marginBottom:'28px',padding:'0 4px'},
  logoMark:{width:'32px',height:'32px',background:'var(--brand-glow)',border:'1px solid var(--border-focus)',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0},
  logoText:{fontWeight:700,fontSize:'1em',letterSpacing:'0.15em'},
  nav:{display:'flex',flexDirection:'column',gap:'2px'},
  navSection:{fontSize:'0.68em',fontWeight:600,letterSpacing:'0.12em',color:'var(--text-muted)',padding:'8px 8px 6px'},
  navItem:{display:'flex',alignItems:'center',gap:'9px',padding:'8px 10px',background:'transparent',border:'none',borderRadius:'var(--radius)',color:'var(--text-secondary)',fontFamily:'var(--font-sans)',fontSize:'0.88em',cursor:'pointer',transition:'all 0.15s',textAlign:'left',width:'100%',position:'relative'},
  navItemActive:{background:'var(--bg-elevated)',color:'var(--text-primary)',fontWeight:500},
  navIcon:{width:'16px',textAlign:'center'},
  navActiveBar:{position:'absolute',left:0,top:'20%',bottom:'20%',width:'3px',background:'var(--brand)',borderRadius:'0 2px 2px 0'},
  sidebarBottom:{borderTop:'1px solid var(--border)',padding:'12px 16px',display:'flex',flexDirection:'column',gap:'12px'},
  hostInfo:{display:'flex',flexDirection:'column',gap:'4px'},
  hostRow:{display:'flex',justifyContent:'space-between'},
  hostLabel:{fontSize:'0.72em',color:'var(--text-muted)'},
  hostVal:{fontSize:'0.72em',color:'var(--text-secondary)',fontFamily:'var(--font-mono)'},
  userRow:{display:'flex',alignItems:'center',gap:'10px'},
  userAvatar:{width:'30px',height:'30px',background:'var(--brand-glow)',border:'1px solid var(--border-focus)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.8em',fontWeight:700,color:'var(--brand-light)',flexShrink:0},
  userInfo:{flex:1,minWidth:0},
  userName:{fontSize:'0.85em',fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'},
  userRole:{fontSize:'0.7em',color:'var(--text-muted)'},
  logoutBtn:{background:'transparent',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:'1em',padding:'4px',borderRadius:'4px',flexShrink:0},
  main:{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'},
  topbar:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 24px',borderBottom:'1px solid var(--border)',background:'var(--bg)',flexShrink:0},
  topbarLeft:{display:'flex',alignItems:'center',gap:'14px'},
  pageTitle:{fontSize:'1.1em',fontWeight:600,letterSpacing:'-0.01em'},
  refreshBadge:{display:'flex',alignItems:'center',gap:'5px',fontSize:'0.75em',color:'var(--text-muted)',background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'20px',padding:'3px 10px'},
  refreshDot:{width:'5px',height:'5px',borderRadius:'50%',background:'var(--success)',animation:'pulse 2s infinite'},
  topbarRight:{display:'flex',alignItems:'center',gap:'10px'},
  metricPill:{display:'flex',alignItems:'center',gap:'6px',background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'20px',padding:'4px 12px'},
  dot:{width:'6px',height:'6px',borderRadius:'50%',flexShrink:0},
  metricNum:{fontSize:'0.85em',fontWeight:600},
  metricLbl:{fontSize:'0.75em',color:'var(--text-muted)'},
  refreshBtn:{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'6px 14px',color:'var(--text-secondary)',fontFamily:'var(--font-sans)',fontSize:'0.82em',cursor:'pointer'},
  content:{flex:1,overflow:'auto',padding:'24px'},
};
