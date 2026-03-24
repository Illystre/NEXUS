import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { useLang } from './LanguageContext';

const ACCENT_PRESETS = [
  { name:'Blue',   value:'#4f78ff' },
  { name:'Indigo', value:'#6366f1' },
  { name:'Green',  value:'#22c55e' },
  { name:'Cyan',   value:'#06b6d4' },
  { name:'Orange', value:'#f97316' },
  { name:'Pink',   value:'#ec4899' },
];

function Section({ title, subtitle, children }) {
  return (
    <div style={s.section}>
      <div style={s.sectionHead}>
        <div style={s.sectionTitle}>{title}</div>
        {subtitle && <div style={s.sectionSub}>{subtitle}</div>}
      </div>
      <div style={s.sectionBody}>{children}</div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={s.field}>
      <div style={s.fieldLeft}>
        <div style={s.fieldLabel}>{label}</div>
        {hint && <div style={s.fieldHint}>{hint}</div>}
      </div>
      <div style={s.fieldRight}>{children}</div>
    </div>
  );
}

function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div style={{...s.toast, borderColor: type==='success'?'var(--success)':'var(--danger)', color: type==='success'?'var(--success)':'var(--danger)'}}>
      {type==='success'?'✔':'⚠'} {msg}
    </div>
  );
}

function UsersPanel({ showToast }) {
  const { user: currentUser } = useAuth();
  const { t } = useLang();
  const l = t.settings;
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]     = useState({ username:'', password:'', role:'viewer' });
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [editPass, setEditPass] = useState('');

  const load = async () => {
    setLoading(true);
    try { const r = await axios.get('/api/users'); setUsers(r.data); } catch {}
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    setCreating(true);
    try {
      await axios.post('/api/users', form);
      setForm({ username:'', password:'', role:'viewer' });
      await load();
      showToast(l.saved);
    } catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
    finally { setCreating(false); }
  };

  const update = async (id) => {
    try {
      const body = {};
      if (editRole) body.role = editRole;
      if (editPass) body.password = editPass;
      await axios.put(`/api/users/${id}`, body);
      setEditId(null); setEditRole(''); setEditPass('');
      await load();
      showToast(l.saved);
    } catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
  };

  const remove = async (id, username) => {
    if (!window.confirm(`Delete user "${username}"?`)) return;
    try { await axios.delete(`/api/users/${id}`); await load(); showToast(l.saved); }
    catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
  };

  return (
    <>
      <Section title={l.usersTitle} subtitle={l.usersSubtitle}>
        {loading ? <div style={{padding:'20px',textAlign:'center',color:'var(--text-muted)',fontSize:'0.85em'}}>Loading...</div> : (
          <div>
            {users.map(u => (
              <div key={u.id} style={s.userRow}>
                <div style={s.userAvatar}>{u.username[0].toUpperCase()}</div>
                <div style={s.userInfo}>
                  <div style={s.userName2}>{u.username} {u.username === currentUser && <span style={s.youBadge}>{l.you}</span>}</div>
                  <div style={s.userMeta}>{l.created} {new Date(u.createdAt).toLocaleDateString()}</div>
                </div>
                {editId === u.id ? (
                  <div style={s.editRow}>
                    <select style={s.select} value={editRole || u.role} onChange={e => setEditRole(e.target.value)}>
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <input style={{...s.input, width:'130px'}} type="password" placeholder={l.newPassword} value={editPass} onChange={e => setEditPass(e.target.value)} />
                    <button style={s.saveSmallBtn} onClick={() => update(u.id)}>✔</button>
                    <button style={s.cancelBtn} onClick={() => { setEditId(null); setEditRole(''); setEditPass(''); }}>✕</button>
                  </div>
                ) : (
                  <div style={s.userActions}>
                    <span style={{...s.roleBadge, color: u.role==='admin'?'var(--brand-light)':'var(--text-muted)', background: u.role==='admin'?'var(--brand-glow)':'var(--bg-elevated)', border:`1px solid ${u.role==='admin'?'var(--border-focus)':'var(--border)'}`}}>{u.role}</span>
                    <button style={s.editBtn} onClick={() => { setEditId(u.id); setEditRole(u.role); }}>✎</button>
                    {u.username !== currentUser && (
                      <button style={s.deleteBtn} onClick={() => remove(u.id, u.username)}>🗒</button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={l.createUser}>
        <Field label={l.username2}>
          <input style={{...s.input, width:'180px'}} value={form.username} onChange={e => setForm(p=>({...p,username:e.target.value}))} placeholder="new_user" />
        </Field>
        <Field label={l.password2} hint={l.passwordHint}>
          <input style={{...s.input, width:'180px'}} type="password" value={form.password} onChange={e => setForm(p=>({...p,password:e.target.value}))} placeholder="••••••••" />
        </Field>
        <Field label={l.role}>
          <select style={{...s.input, ...s.select}} value={form.role} onChange={e => setForm(p=>({...p,role:e.target.value}))}>
            <option value="viewer">{l.viewerRole}</option>
            <option value="admin">{l.adminRole}</option>
          </select>
        </Field>
        <div style={s.fieldActions}>
          <button style={s.saveBtn} onClick={create} disabled={creating || !form.username || !form.password}>
            {creating ? l.creating : l.createBtn}
          </button>
        </div>
      </Section>

      <Section title={l.permissionsTitle}>
        <div style={s.permTable}>
          {l.perms.map(([perm, admin, viewer]) => (
            <div key={perm} style={s.permRow}>
              <span style={s.permName}>{perm}</span>
              <span style={{...s.permCheck, color: admin?'var(--success)':'var(--danger)'}}>{admin?'✔':'✕'}</span>
              <span style={{...s.permCheck, color: viewer?'var(--success)':'var(--danger)'}}>{viewer?'✔':'✕'}</span>
            </div>
          ))}
          <div style={{...s.permRow, background:'var(--bg)', fontWeight:600}}>
            <span style={s.permName}></span>
            <span style={{...s.permCheck, color:'var(--brand-light)', fontSize:'0.78em'}}>Admin</span>
            <span style={{...s.permCheck, color:'var(--text-muted)', fontSize:'0.78em'}}>Viewer</span>
          </div>
        </div>
      </Section>
    </>
  );
}

// ── OS Icons ──────────────────────────────────────────────────────────────────
const OS_OPTIONS = [
  { id:'windows', label:'Windows',     src:null,    hint:'Enable "Expose daemon on tcp://localhost:2375" in Docker Desktop → Settings → General' },
  { id:'ubuntu',  label:'Ubuntu',      src:'https://cdn.simpleicons.org/ubuntu/E95420' },
  { id:'debian',  label:'Debian',      src:'https://cdn.simpleicons.org/debian/A81D33' },
  { id:'fedora',  label:'Fedora',      src:'https://cdn.simpleicons.org/fedora/51A2DA' },
  { id:'rhel',    label:'Red Hat',     src:'https://cdn.simpleicons.org/redhat/EE0000' },
  { id:'rocky',   label:'Rocky Linux', src:'https://cdn.simpleicons.org/rockylinux/10B981' },
  { id:'alpine',  label:'Alpine',      src:'https://cdn.simpleicons.org/alpinelinux/0D597F' },
  { id:'linux',   label:'Other Linux', src:'https://cdn.simpleicons.org/linux/FCC624' },
];

function OsIcon({ os }) {
  const found = OS_OPTIONS.find(o => o.id === os);
  if (os === 'windows') return <svg viewBox="0 0 32 32" width="22" height="22" xmlns="http://www.w3.org/2000/svg" style={{display:"block"}}><path fill="#00ADEF" d="M30,15H17c-0.6,0-1-0.4-1-1V3.3c0-0.5,0.4-0.9,0.8-1l13-2.3c0.3,0,0.6,0,0.8,0.2C30.9,0.4,31,0.7,31,1v13C31,14.6,30.6,15,30,15z"/><path fill="#00ADEF" d="M13,15H1c-0.6,0-1-0.4-1-1V6c0-0.5,0.4-0.9,0.8-1l12-2c0.3,0,0.6,0,0.8,0.2C13.9,3.4,14,3.7,14,4v10C14,14.6,13.6,15,13,15z"/><path fill="#00ADEF" d="M30,32c-0.1,0-0.1,0-0.2,0l-13-2.3c-0.5-0.1-0.8-0.5-0.8-1V18c0-0.6,0.4-1,1-1h13c0.6,0,1,0.4,1,1v13c0,0.3-0.1,0.6-0.4,0.8C30.5,31.9,30.2,32,30,32z"/><path fill="#00ADEF" d="M13,29c-0.1,0-0.1,0-0.2,0l-12-2C0.4,26.9,0,26.5,0,26v-8c0-0.6,0.4-1,1-1h12c0.6,0,1,0.4,1,1v10c0,0.3-0.1,0.6-0.4,0.8C13.5,28.9,13.2,29,13,29z"/></svg>;
  if (!found || !found.src) return <img src="https://cdn.simpleicons.org/linux/FCC624" width="22" height="22" alt="Linux" />;
  return <img src={found.src} width="22" height="22" alt={found.label} style={{display:'block'}} />;
}


// ── HostsPanel ────────────────────────────────────────────────────────────────
function HostsPanel({ showToast, onHostsChange }) {
  const { t } = useLang();
  const l = t.settings;
  const [hosts, setHosts]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [testingId, setTestingId] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardName, setWizardName] = useState('');
  const [wizardOS, setWizardOS]     = useState('ubuntu');
  const [wizardResult, setWizardResult] = useState(null);
  const [wizardCreating, setWizardCreating] = useState(false);
  const load = async () => {
    setLoading(true);
    try { const r = await axios.get('/api/hosts'); setHosts(r.data); onHostsChange?.(r.data); } catch {}
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const remove = async (id, name) => {
    if (!window.confirm(`Delete host "${name}"?`)) return;
    try { await axios.delete(`/api/hosts/${id}`); await load(); showToast(l.saved); }
    catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
  };

  const test = async (id) => {
    setTestingId(id);
    setTestResults(p => ({ ...p, [id]: null }));
    try {
      const r = await axios.post(`/api/hosts/${id}/test`);
      setTestResults(p => ({ ...p, [id]: { ok: true, msg: `✔ Docker ${r.data.version} · ${r.data.containers} containers` } }));
    } catch (e) {
      setTestResults(p => ({ ...p, [id]: { ok: false, msg: e.response?.data?.error || 'No connection' } }));
    }
    finally { setTestingId(null); }
  };

  const generateToken = async () => {
    if (!wizardName.trim()) return;
    setWizardCreating(true);
    try {
      const r = await axios.post('/api/agent-tokens', { name: wizardName.trim(), os: wizardOS });
      setWizardResult(r.data);
      setWizardStep(3);
      await load();
    } catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
    finally { setWizardCreating(false); }
  };

  const getInstallScript = (nexusUrl, token, os) => {
    const isWindows = os === 'windows';
    const composeTail = isWindows
      ? `      - DOCKER_HOST=tcp://host.docker.internal:2375\n    extra_hosts:\n      - "host.docker.internal:host-gateway"`
      : `    volumes:\n      - /var/run/docker.sock:/var/run/docker.sock`;
    return `#!/usr/bin/env bash
set -e

echo "==> [1/4] Creating docker-compose.yml..."
cat > docker-compose.yml << 'COMPOSE'
services:
  nexus-agent:
    image: afraguas1983/nexus-agent:latest
    container_name: nexus-agent
    restart: unless-stopped
    environment:
      - NEXUS_URL=\${NEXUS_URL}
      - NEXUS_AGENT_TOKEN=\${NEXUS_AGENT_TOKEN}
${composeTail}
COMPOSE

echo "==> [2/4] Creating .env..."
cat > .env << 'ENV'
NEXUS_URL=${nexusUrl}
NEXUS_AGENT_TOKEN=${token}
ENV

echo "==> [3/4] Starting NEXUS Agent..."
docker compose up -d

echo "==> [4/4] Showing logs — press Ctrl+C once the agent connects..."
docker compose logs -f nexus-agent
`;
  };

  const nexusUrl = window.location.origin;

  const scriptHref = useMemo(() => {
    if (!wizardResult) return '#';
    const script = getInstallScript(nexusUrl, wizardResult.token, wizardOS);
    return 'data:text/x-sh;charset=utf-8,' + encodeURIComponent(script);
  }, [wizardResult, wizardOS]);

  const closeWizard = () => {
    setWizardStep(0); setWizardName(''); setWizardOS('ubuntu');
    setWizardResult(null);
  };

  const currentOsHint = OS_OPTIONS.find(o => o.id === wizardOS)?.hint;

  return (
    <>
      {wizardStep > 0 && (
        <div style={sw.overlay} onClick={e => e.target === e.currentTarget && closeWizard()}>
          <div style={sw.modal}>

            {wizardStep === 1 && (
              <>
                <div style={sw.modalHead}>
                  <div style={sw.modalTitle}>🖥 Add remote host</div>
                  <div style={sw.modalSub}>Give this host a name to identify it in NEXUS</div>
                </div>
                <div style={sw.modalBody}>
                  <label style={sw.label}>Host name</label>
                  <input style={sw.input} value={wizardName} autoFocus
                    onChange={e => setWizardName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && wizardName.trim() && setWizardStep(2)}
                    placeholder="e.g. My Server, NAS, VPS..." />
                </div>
                <div style={sw.modalFoot}>
                  <button style={sw.cancelBtn} onClick={closeWizard}>Cancel</button>
                  <button style={sw.nextBtn} onClick={() => setWizardStep(2)} disabled={!wizardName.trim()}>Next →</button>
                </div>
              </>
            )}

            {wizardStep === 2 && (
              <>
                <div style={sw.modalHead}>
                  <div style={sw.modalTitle}>🖥 {wizardName}</div>
                  <div style={sw.modalSub}>What OS is running on this remote host?</div>
                </div>
                <div style={sw.modalBody}>
                  <div style={sw.distroGrid}>
                    {OS_OPTIONS.map(os => (
                      <button key={os.id}
                        style={{...sw.distroBtn, ...(wizardOS===os.id ? sw.distroBtnActive : {})}}
                        onClick={() => setWizardOS(os.id)}>
                        {os.id === 'windows' ? <svg viewBox="0 0 32 32" width="22" height="22" xmlns="http://www.w3.org/2000/svg" style={{display:"block"}}><path fill="#00ADEF" d="M30,15H17c-0.6,0-1-0.4-1-1V3.3c0-0.5,0.4-0.9,0.8-1l13-2.3c0.3,0,0.6,0,0.8,0.2C30.9,0.4,31,0.7,31,1v13C31,14.6,30.6,15,30,15z"/><path fill="#00ADEF" d="M13,15H1c-0.6,0-1-0.4-1-1V6c0-0.5,0.4-0.9,0.8-1l12-2c0.3,0,0.6,0,0.8,0.2C13.9,3.4,14,3.7,14,4v10C14,14.6,13.6,15,13,15z"/><path fill="#00ADEF" d="M30,32c-0.1,0-0.1,0-0.2,0l-13-2.3c-0.5-0.1-0.8-0.5-0.8-1V18c0-0.6,0.4-1,1-1h13c0.6,0,1,0.4,1,1v13c0,0.3-0.1,0.6-0.4,0.8C30.5,31.9,30.2,32,30,32z"/><path fill="#00ADEF" d="M13,29c-0.1,0-0.1,0-0.2,0l-12-2C0.4,26.9,0,26.5,0,26v-8c0-0.6,0.4-1,1-1h12c0.6,0,1,0.4,1,1v10c0,0.3-0.1,0.6-0.4,0.8C13.5,28.9,13.2,29,13,29z"/></svg> : <img src={os.src} width="22" height="22" alt={os.label} style={{display:'block'}} />}
                        <span style={sw.distroLabel}>{os.label}</span>
                      </button>
                    ))}
                  </div>
                  {currentOsHint && (
                    <div style={sw.osHintBox}>⚠ {currentOsHint}</div>
                  )}
                </div>
                <div style={sw.modalFoot}>
                  <button style={sw.cancelBtn} onClick={() => setWizardStep(1)}>← Back</button>
                  <button style={sw.nextBtn} onClick={generateToken} disabled={wizardCreating}>
                    {wizardCreating ? 'Generating...' : 'Generate token →'}
                  </button>
                </div>
              </>
            )}

            {wizardStep === 3 && wizardResult && (
              <>
                <div style={sw.modalHead}>
                  <div style={sw.modalTitle}>✅ Token generated for {wizardResult.name}</div>
                  <div style={sw.modalSub}>{l.scriptModalSub}</div>
                </div>
                <div style={sw.modalBody}>
                  <div style={sw.osToggle}>
                    {OS_OPTIONS.map(os => (
                      <button key={os.id}
                        style={{...sw.osToggleBtn, ...(wizardOS===os.id ? sw.osToggleBtnActive : {})}}
                        onClick={() => setWizardOS(os.id)} title={os.label}>
                        {os.id === 'windows'
                          ? <svg viewBox="0 0 32 32" width="16" height="16" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}><path fill="#00ADEF" d="M30,15H17c-0.6,0-1-0.4-1-1V3.3c0-0.5,0.4-0.9,0.8-1l13-2.3c0.3,0,0.6,0,0.8,0.2C30.9,0.4,31,0.7,31,1v13C31,14.6,30.6,15,30,15z"/><path fill="#00ADEF" d="M13,15H1c-0.6,0-1-0.4-1-1V6c0-0.5,0.4-0.9,0.8-1l12-2c0.3,0,0.6,0,0.8,0.2C13.9,3.4,14,3.7,14,4v10C14,14.6,13.6,15,13,15z"/><path fill="#00ADEF" d="M30,32c-0.1,0-0.1,0-0.2,0l-13-2.3c-0.5-0.1-0.8-0.5-0.8-1V18c0-0.6,0.4-1,1-1h13c0.6,0,1,0.4,1,1v13c0,0.3-0.1,0.6-0.4,0.8C30.5,31.9,30.2,32,30,32z"/><path fill="#00ADEF" d="M13,29c-0.1,0-0.1,0-0.2,0l-12-2C0.4,26.9,0,26.5,0,26v-8c0-0.6,0.4-1,1-1h12c0.6,0,1,0.4,1,1v10c0,0.3-0.1,0.6-0.4,0.8C13.5,28.9,13.2,29,13,29z"/></svg>
                          : <img src={os.src} width="16" height="16" alt={os.label} style={{display:'block'}} />
                        }
                      </button>
                    ))}
                  </div>
                  <div style={sw.scriptSteps}>
                    <div style={sw.scriptStepsTitle}>{l.scriptWhatItDoes}</div>
                    <ol style={sw.scriptOl}>
                      <li>{l.scriptStep1}</li>
                      <li>{l.scriptStep2}</li>
                      <li><code style={{fontFamily:'var(--font-mono)',fontSize:'0.9em'}}>docker compose up -d</code></li>
                      <li><code style={{fontFamily:'var(--font-mono)',fontSize:'0.9em'}}>docker compose logs -f nexus-agent</code> {l.scriptStep4suffix}</li>
                    </ol>
                    <div style={sw.scriptRunHint}>{l.scriptRunHint} <code style={{fontFamily:'var(--font-mono)',color:'var(--brand-light)'}}>bash install-nexus-agent.sh</code></div>
                  </div>
                  <div style={sw.tokenWarn}>⚠ {l.scriptTokenWarn}</div>
                </div>
                <div style={sw.modalFoot}>
                  <button style={sw.cancelBtn} onClick={closeWizard}>Close</button>
                  <a href={scriptHref} download="install-nexus-agent.sh"
                    style={{...sw.nextBtn, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'6px'}}>
                    {l.scriptDownloadBtn}
                  </a>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      <Section title={l.hostsTitle} subtitle={l.hostsSubtitle}>
        {loading ? (
          <div style={{padding:'20px',textAlign:'center',color:'var(--text-muted)',fontSize:'0.85em'}}>Loading...</div>
        ) : hosts.length === 0 ? (
          <div style={{padding:'20px 18px',color:'var(--text-muted)',fontSize:'0.85em'}}>{l.noHosts}</div>
        ) : (
          hosts.map(h => (
            <div key={h.id} style={s.hostItemRow}>
              <div style={{...s.hostItemIcon, display:'flex', alignItems:'center'}}>
                {h.type === 'agent' ? <OsIcon os={h.os} /> : '🌐'}
              </div>
              <div style={s.hostItemInfo}>
                <div style={s.hostItemName}>{h.name}</div>
                <div style={s.hostItemUrl}>{h.type === 'agent' ? `NEXUS Agent · ${OS_OPTIONS.find(o=>o.id===h.os)?.label || 'Linux'}` : h.url}</div>
                {testResults[h.id] && (
                  <div style={{fontSize:'0.75em', marginTop:'4px', color: testResults[h.id].ok ? 'var(--success)' : 'var(--danger)'}}>
                    {testResults[h.id].msg}
                  </div>
                )}
              </div>
              <div style={s.userActions}>
                <button style={{...s.editBtn, color:'var(--brand-light)', borderColor:'var(--border-focus)'}}
                  onClick={() => test(h.id)} disabled={testingId === h.id}>
                  {testingId === h.id ? '...' : l.testBtn}
                </button>
                <button style={s.deleteBtn} onClick={() => remove(h.id, h.name)}>🗒</button>
              </div>
            </div>
          ))
        )}
      </Section>

      <Section title={l.addHost}>
        <div style={{padding:'14px 18px'}}>
          <p style={{fontSize:'0.85em',color:'var(--text-secondary)',marginBottom:'12px'}}>
            Add a remote Docker host using <strong>NEXUS Agent</strong> — a lightweight container that runs on the remote machine and connects back to NEXUS. No open ports required.
          </p>
          <button style={s.saveBtn} onClick={() => setWizardStep(1)}>+ Add remote host</button>
        </div>
      </Section>
    </>
  );
}

const sw = {
  overlay:{position:'fixed',inset:0,background:'#00000080',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000},
  modal:{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:'560px',overflow:'hidden',boxShadow:'0 20px 60px #00000060'},
  modalHead:{padding:'20px 24px',borderBottom:'1px solid var(--border)',background:'var(--bg-elevated)'},
  modalTitle:{fontWeight:700,fontSize:'1em',marginBottom:'4px'},
  modalSub:{fontSize:'0.8em',color:'var(--text-muted)'},
  modalBody:{padding:'20px 24px'},
  modalFoot:{padding:'14px 24px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'flex-end',gap:'8px'},
  label:{display:'block',fontSize:'0.78em',fontWeight:500,color:'var(--text-secondary)',marginBottom:'6px'},
  input:{width:'100%',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'10px 14px',color:'var(--text-primary)',fontFamily:'var(--font-sans)',fontSize:'0.9em',outline:'none',boxSizing:'border-box'},
  cancelBtn:{padding:'8px 16px',background:'transparent',border:'1px solid var(--border)',borderRadius:'var(--radius)',color:'var(--text-muted)',fontFamily:'var(--font-sans)',fontSize:'0.85em',cursor:'pointer'},
  nextBtn:{padding:'8px 16px',background:'var(--brand-glow)',border:'1px solid var(--border-focus)',borderRadius:'var(--radius)',color:'var(--brand-light)',fontFamily:'var(--font-sans)',fontSize:'0.85em',fontWeight:600,cursor:'pointer'},
  distroGrid:{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:'8px'},
  distroBtn:{padding:'12px 8px',background:'var(--bg)',border:'2px solid var(--border)',borderRadius:'var(--radius)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:'6px',transition:'all 0.15s'},
  distroBtnActive:{borderColor:'var(--brand)',background:'var(--brand-glow)'},
  distroLabel:{fontSize:'0.7em',fontWeight:500,color:'var(--text-secondary)',textAlign:'center'},
  osHintBox:{fontSize:'0.75em',color:'var(--warning)',marginTop:'10px',padding:'8px 12px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'var(--radius)'},
  osToggle:{display:'flex',gap:'4px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'3px',marginBottom:'12px',flexWrap:'wrap'},
  osToggleBtn:{padding:'6px 8px',background:'transparent',border:'none',borderRadius:'var(--radius-sm)',color:'var(--text-muted)',cursor:'pointer',display:'flex',alignItems:'center'},
  osToggleBtnActive:{background:'var(--bg-elevated)'},
  codeBlock:{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'12px 14px',fontSize:'0.75em',fontFamily:'var(--font-mono)',color:'var(--text-secondary)',overflowX:'auto',lineHeight:1.7,margin:0},
  tokenWarn:{fontSize:'0.75em',color:'var(--warning)',marginTop:'10px'},
  scriptSteps:{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'12px 16px',marginBottom:'10px'},
  scriptStepsTitle:{fontWeight:600,fontSize:'0.82em',marginBottom:'8px',color:'var(--text-secondary)'},
  scriptOl:{margin:'0 0 8px 16px',padding:0,color:'var(--text-secondary)',fontSize:'0.82em',lineHeight:1.9},
  scriptRunHint:{fontSize:'0.78em',color:'var(--text-muted)',marginTop:'4px'},
};

export default function SettingsView({ onSettingsChange, onHostsChange }) {
  const { role } = useAuth();
  const { t, lang, changeLang } = useLang();
  const l = t.settings;

  const REFRESH_OPTIONS = [
    { label: l.seconds(1),  value: 1000 },
    { label: l.seconds(3),  value: 3000 },
    { label: l.seconds(5),  value: 5000 },
    { label: l.seconds(15), value: 15000 },
    { label: l.seconds(30), value: 30000 },
    { label: l.minute,      value: 60000 },
  ];

  const [settings, setSettings] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const [tab, setTab]           = useState('appearance');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass]         = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [telegramTesting, setTelegramTesting] = useState(false);

  useEffect(() => {
    axios.get('/api/settings').then(r => setSettings(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { setTab('appearance'); }, [lang]);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const save = async (patch) => {
    setSaving(true);
    try {
      const r = await axios.put('/api/settings', { ...settings, ...patch });
      setSettings(r.data); onSettingsChange?.(r.data);
      showToast(l.saved);
    } catch { showToast(l.errorSaving, 'error'); }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (newPass !== confirmPass) return showToast('Passwords do not match', 'error');
    setPassLoading(true);
    try {
      await axios.post('/api/settings/change-password', { currentPassword: currentPass, newPassword: newPass });
      showToast(l.saved);
      setCurrentPass(''); setNewPass(''); setConfirmPass('');
    } catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
    finally { setPassLoading(false); }
  };

  const testTelegram = async () => {
    setTelegramTesting(true);
    try {
      await axios.post('/api/settings/test-telegram', { token: settings.telegram?.token, chatId: settings.telegram?.chatId });
      showToast(l.telegramSent);
    } catch (e) { showToast(e.response?.data?.error || 'Telegram error', 'error'); }
    finally { setTelegramTesting(false); }
  };

  const isAdmin = role === 'admin';

  const TABS = isAdmin
    ? [
        { id:'appearance', icon:'🎨', label: l.appearance },
        { id:'profile',    icon:'👤', label: l.profile },
        { id:'users',      icon:'👥', label: l.users },
        { id:'hosts',      icon:'🖧', label: l.hosts },
        { id:'telegram',   icon:'📱', label: l.telegram },
        { id:'system',     icon:'⚙',  label: l.system },
      ]
    : [
        { id:'appearance', icon:'🎨', label: l.appearance },
        { id:'profile',    icon:'👤', label: l.profile },
      ];

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'300px',gap:'12px',flexDirection:'column'}}>
      <div style={{width:'22px',height:'22px',border:'2px solid var(--border)',borderTop:'2px solid var(--brand)',borderRadius:'50%',animation:'spin 0.7s linear infinite'}} />
    </div>
  );

  return (
    <div style={s.page}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <div style={s.subTabs}>
        {TABS.map(tb => (
          <button key={tb.id} style={{...s.subTab, ...(tab===tb.id?s.subTabActive:{})}} onClick={() => setTab(tb.id)}>
            {tb.icon} {tb.label}
            {tab===tb.id && <span style={s.subTabBar} />}
          </button>
        ))}
      </div>
      <div style={s.content}>
        {tab==='appearance' && (
          <>
            <Section title={l.theme} subtitle={l.themeSubtitle}>
              <Field label={l.colorMode}>
                <div style={s.themeToggle}>
                  {['dark','light'].map(tm => (
                    <button key={tm} style={{...s.themeBtn, ...(settings.theme===tm?s.themeBtnActive:{})}} onClick={() => save({ theme: tm })}>
                      {tm==='dark' ? l.dark : l.light}
                    </button>
                  ))}
                </div>
              </Field>
            </Section>
            <Section title={l.accentColor}>
              <Field label={l.presets}>
                <div style={s.accentGrid}>
                  {ACCENT_PRESETS.map(p => (
                    <button key={p.value} style={{...s.accentDot, background:p.value, outline:settings.accent===p.value?`2px solid ${p.value}`:'none', outlineOffset:'3px'}} onClick={() => save({ accent: p.value })} title={p.name} />
                  ))}
                </div>
              </Field>
              <Field label={l.customColor}>
                <div style={s.colorPickerRow}>
                  <input type="color" value={settings.accent||'#4f78ff'} onChange={e => setSettings(p=>({...p,accent:e.target.value}))} style={s.colorPicker} />
                  <input style={{...s.input,width:'120px',fontFamily:'var(--font-mono)'}} value={settings.accent||'#4f78ff'} onChange={e => setSettings(p=>({...p,accent:e.target.value}))} />
                  <button style={s.saveBtn} onClick={() => save({ accent: settings.accent })} disabled={saving}>{l.apply}</button>
                </div>
              </Field>
            </Section>
          </>
        )}
        {tab==='profile' && (
          <Section title={l.changePassword}>
            <Field label={l.currentPassword}><input style={s.input} type="password" value={currentPass} onChange={e=>setCurrentPass(e.target.value)} placeholder="••••••••" /></Field>
            <Field label={l.newPassword}><input style={s.input} type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="••••••••" /></Field>
            <Field label={l.confirm}><input style={s.input} type="password" value={confirmPass} onChange={e=>setConfirmPass(e.target.value)} placeholder="••••••••" /></Field>
            <div style={s.fieldActions}>
              <button style={s.saveBtn} onClick={changePassword} disabled={passLoading||!currentPass||!newPass||!confirmPass}>
                {passLoading ? l.saving : l.changePasswordBtn}
              </button>
            </div>
          </Section>
        )}
        {tab==='users' && isAdmin && <UsersPanel showToast={showToast} />}
        {tab==='hosts' && isAdmin && <HostsPanel showToast={showToast} onHostsChange={onHostsChange} />}
        {tab==='telegram' && isAdmin && (
          <Section title={l.telegramTitle}>
            <Field label={l.telegramToken} hint={<>{l.telegramTokenHint} <a href="https://t.me/botfather" target="_blank" rel="noreferrer" style={{color:'var(--brand-light)'}}>@BotFather</a></>}>
              <input style={{...s.input,width:'100%',maxWidth:'360px'}} type="password" value={settings.telegram?.token||''} onChange={e=>setSettings(p=>({...p,telegram:{...p.telegram,token:e.target.value}}))} placeholder="123456:ABC..." />
            </Field>
            <Field label={l.telegramChatId}>
              <input style={{...s.input,width:'180px',fontFamily:'var(--font-mono)'}} value={settings.telegram?.chatId||''} onChange={e=>setSettings(p=>({...p,telegram:{...p.telegram,chatId:e.target.value}}))} placeholder="-100123456" />
            </Field>
            <div style={s.fieldActions}>
              <button style={s.saveBtn} onClick={() => save({ telegram: settings.telegram })} disabled={saving}>{l.save}</button>
              <button style={{...s.saveBtn,background:'var(--info-bg)',borderColor:'var(--info)',color:'var(--info)'}} onClick={testTelegram} disabled={telegramTesting||!settings.telegram?.token||!settings.telegram?.chatId}>
                {telegramTesting ? l.telegramTesting : l.telegramTest}
              </button>
            </div>
          </Section>
        )}
        {tab==='system' && isAdmin && (
          <>
            <Section title={l.refreshInterval}>
              <Field label={l.interval}>
                <div style={s.radioGroup}>
                  {REFRESH_OPTIONS.map(o => (
                    <label key={o.value} style={s.radioLabel}>
                      <input type="radio" name="refresh" checked={settings.refreshInterval===o.value} onChange={() => save({ refreshInterval: o.value })} style={s.radio} />
                      <span style={{color:settings.refreshInterval===o.value?'var(--text-primary)':'var(--text-secondary)'}}>{o.label}</span>
                    </label>
                  ))}
                </div>
              </Field>
            </Section>
            <Section title={l.aboutTitle}>
              <Field label={l.version}><span style={s.mono}>1.5.4</span></Field>
              <Field label={l.stack}><span style={s.mono}>Node.js · React 18 · Socket.io</span></Field>
              <Field label={l.author}><span style={{color:'var(--brand-light)'}}>alvaro_lab</span></Field>
              <Field label={l.language}>
                <div style={s.themeToggle}>
                  {[{id:'en',flag:'🇬🇧',label:'English'},{id:'es',flag:'🇪🇸',label:'Español'}].map(lg => (
                    <button key={lg.id} style={{...s.themeBtn, ...(lang===lg.id?s.themeBtnActive:{})}} onClick={() => changeLang(lg.id)}>
                      {lg.flag} {lg.label}
                    </button>
                  ))}
                </div>
              </Field>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  page:{position:'relative'},
  toast:{position:'fixed',top:'20px',right:'20px',background:'var(--bg-elevated)',border:'1px solid',borderRadius:'var(--radius)',padding:'10px 16px',fontSize:'0.85em',fontWeight:500,zIndex:999,boxShadow:'0 4px 20px #00000050'},
  subTabs:{display:'flex',gap:'0',borderBottom:'1px solid var(--border)',marginBottom:'24px',overflowX:'auto'},
  subTab:{position:'relative',display:'flex',alignItems:'center',gap:'6px',padding:'10px 18px',background:'transparent',border:'none',color:'var(--text-muted)',fontFamily:'var(--font-sans)',fontSize:'0.85em',fontWeight:500,cursor:'pointer',whiteSpace:'nowrap',transition:'color 0.15s'},
  subTabActive:{color:'var(--text-primary)'},
  subTabBar:{position:'absolute',bottom:0,left:'12px',right:'12px',height:'2px',background:'var(--brand)',borderRadius:'2px'},
  content:{display:'flex',flexDirection:'column',gap:'16px',maxWidth:'680px'},
  section:{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden'},
  sectionHead:{padding:'14px 18px',borderBottom:'1px solid var(--border)',background:'var(--bg-elevated)'},
  sectionTitle:{fontWeight:600,fontSize:'0.9em',marginBottom:'2px'},
  sectionSub:{fontSize:'0.76em',color:'var(--text-muted)'},
  sectionBody:{padding:'4px 0'},
  field:{display:'flex',alignItems:'flex-start',justifyContent:'space-between',padding:'12px 18px',borderTop:'1px solid var(--border)',gap:'16px',flexWrap:'wrap'},
  fieldLeft:{flex:1,minWidth:'140px'},
  fieldLabel:{fontSize:'0.85em',fontWeight:500,marginBottom:'2px'},
  fieldHint:{fontSize:'0.74em',color:'var(--text-muted)'},
  fieldRight:{display:'flex',alignItems:'center',flexShrink:0},
  fieldActions:{padding:'12px 18px',borderTop:'1px solid var(--border)',display:'flex',gap:'8px'},
  input:{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'8px 12px',color:'var(--text-primary)',fontFamily:'var(--font-sans)',fontSize:'0.88em',outline:'none',minWidth:'180px'},
  select:{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'8px 12px',color:'var(--text-primary)',fontFamily:'var(--font-sans)',fontSize:'0.88em',cursor:'pointer'},
  saveBtn:{padding:'8px 16px',background:'var(--brand-glow)',border:'1px solid var(--border-focus)',borderRadius:'var(--radius)',color:'var(--brand-light)',fontFamily:'var(--font-sans)',fontSize:'0.82em',fontWeight:600,cursor:'pointer'},
  saveSmallBtn:{padding:'4px 8px',background:'var(--success-bg)',border:'1px solid var(--success-border)',borderRadius:'var(--radius-sm)',color:'var(--success)',cursor:'pointer',fontSize:'0.85em'},
  cancelBtn:{padding:'4px 8px',background:'transparent',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',color:'var(--text-muted)',cursor:'pointer',fontSize:'0.85em'},
  editBtn:{background:'transparent',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',color:'var(--text-muted)',cursor:'pointer',padding:'3px 7px',fontSize:'0.8em'},
  deleteBtn:{background:'transparent',border:'1px solid var(--danger-border)',borderRadius:'var(--radius-sm)',color:'var(--danger)',cursor:'pointer',padding:'3px 7px',fontSize:'0.8em'},
  themeToggle:{display:'flex',gap:'4px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'3px'},
  themeBtn:{padding:'6px 14px',background:'transparent',border:'none',borderRadius:'var(--radius-sm)',color:'var(--text-muted)',fontFamily:'var(--font-sans)',fontSize:'0.82em',cursor:'pointer',transition:'all 0.15s'},
  themeBtnActive:{background:'var(--bg-elevated)',color:'var(--text-primary)'},
  accentGrid:{display:'flex',gap:'8px',flexWrap:'wrap'},
  accentDot:{width:'24px',height:'24px',borderRadius:'50%',border:'none',cursor:'pointer',transition:'transform 0.15s'},
  colorPickerRow:{display:'flex',alignItems:'center',gap:'8px'},
  colorPicker:{width:'36px',height:'36px',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'2px',cursor:'pointer',background:'transparent'},
  radioGroup:{display:'flex',flexDirection:'column',gap:'8px'},
  radioLabel:{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'0.85em'},
  radio:{accentColor:'var(--brand)',width:'14px',height:'14px'},
  mono:{fontFamily:'var(--font-mono)',fontSize:'0.82em',color:'var(--text-secondary)'},
  code:{fontFamily:'var(--font-mono)',fontSize:'0.85em',color:'var(--brand-light)'},
  codeBlock:{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'12px 14px',fontSize:'0.78em',fontFamily:'var(--font-mono)',color:'var(--text-secondary)',overflowX:'auto',lineHeight:1.6},
  userRow:{display:'flex',alignItems:'center',gap:'12px',padding:'10px 18px',borderTop:'1px solid var(--border)'},
  userAvatar:{width:'32px',height:'32px',background:'var(--brand-glow)',border:'1px solid var(--border-focus)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.85em',fontWeight:700,color:'var(--brand-light)',flexShrink:0},
  userInfo:{flex:1,minWidth:0},
  userName2:{fontSize:'0.88em',fontWeight:500},
  userMeta:{fontSize:'0.72em',color:'var(--text-muted)'},
  youBadge:{fontSize:'0.7em',color:'var(--brand-light)',background:'var(--brand-glow)',border:'1px solid var(--border-focus)',borderRadius:'20px',padding:'1px 6px',marginLeft:'6px'},
  userActions:{display:'flex',alignItems:'center',gap:'6px'},
  roleBadge:{fontSize:'0.72em',fontWeight:600,padding:'2px 8px',borderRadius:'20px'},
  editRow:{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'},
  permTable:{},
  permRow:{display:'flex',alignItems:'center',padding:'8px 18px',borderTop:'1px solid var(--border)'},
  permName:{flex:1,fontSize:'0.82em',color:'var(--text-secondary)'},
  permCheck:{width:'80px',textAlign:'center',fontSize:'0.85em',fontWeight:600},
  hostItemRow:{display:'flex',alignItems:'center',gap:'12px',padding:'10px 18px',borderTop:'1px solid var(--border)'},
  hostItemIcon:{fontSize:'1.1em',flexShrink:0},
  hostItemInfo:{flex:1,minWidth:0},
  hostItemName:{fontSize:'0.88em',fontWeight:500},
  hostItemUrl:{fontSize:'0.75em',color:'var(--text-muted)',fontFamily:'var(--font-mono)'},
};
