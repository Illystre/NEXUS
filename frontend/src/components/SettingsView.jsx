import React, { useState, useEffect } from 'react';
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

function HostsPanel({ showToast, onHostsChange }) {
  const { t } = useLang();
  const l = t.settings;
  const [hosts, setHosts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState({ name: '', url: '' });
  const [creating, setCreating] = useState(false);
  const [editId, setEditId]   = useState(null);
  const [editForm, setEditForm] = useState({ name: '', url: '' });
  const [testingId, setTestingId] = useState(null);
  const [testResults, setTestResults] = useState({});

  const load = async () => {
    setLoading(true);
    try { const r = await axios.get('/api/hosts'); setHosts(r.data); onHostsChange?.(r.data); } catch {}
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name || !form.url) return showToast('Name and URL required', 'error');
    setCreating(true);
    try {
      await axios.post('/api/hosts', form);
      setForm({ name: '', url: '' });
      await load();
      showToast(l.saved);
    } catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
    finally { setCreating(false); }
  };

  const update = async (id) => {
    try {
      await axios.put(`/api/hosts/${id}`, editForm);
      setEditId(null);
      await load();
      showToast(l.saved);
    } catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
  };

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

  return (
    <>
      <Section title={l.hostsTitle} subtitle={l.hostsSubtitle}>
        {loading ? (
          <div style={{padding:'20px',textAlign:'center',color:'var(--text-muted)',fontSize:'0.85em'}}>Loading...</div>
        ) : hosts.length === 0 ? (
          <div style={{padding:'20px 18px',color:'var(--text-muted)',fontSize:'0.85em'}}>{l.noHosts}</div>
        ) : (
          hosts.map(h => (
            <div key={h.id} style={s.hostItemRow}>
              <div style={s.hostItemIcon}>🌐</div>
              <div style={s.hostItemInfo}>
                {editId === h.id ? (
                  <div style={s.editRow}>
                    <input style={{...s.input, width:'120px'}} value={editForm.name} onChange={e => setEditForm(p=>({...p,name:e.target.value}))} placeholder="Name" />
                    <input style={{...s.input, width:'200px', fontFamily:'var(--font-mono)', fontSize:'0.8em'}} value={editForm.url} onChange={e => setEditForm(p=>({...p,url:e.target.value}))} placeholder="http://ip:2375" />
                    <button style={s.saveSmallBtn} onClick={() => update(h.id)}>✔</button>
                    <button style={s.cancelBtn} onClick={() => setEditId(null)}>✕</button>
                  </div>
                ) : (
                  <>
                    <div style={s.hostItemName}>{h.name}</div>
                    <div style={s.hostItemUrl}>{h.url}</div>
                    {testResults[h.id] && (
                      <div style={{fontSize:'0.75em', marginTop:'4px', color: testResults[h.id].ok ? 'var(--success)' : 'var(--danger)'}}>
                        {testResults[h.id].msg}
                      </div>
                    )}
                  </>
                )}
              </div>
              {editId !== h.id && (
                <div style={s.userActions}>
                  <button
                    style={{...s.editBtn, color:'var(--brand-light)', borderColor:'var(--border-focus)'}}
                    onClick={() => test(h.id)}
                    disabled={testingId === h.id}
                  >
                    {testingId === h.id ? '...' : l.testBtn}
                  </button>
                  <button style={s.editBtn} onClick={() => { setEditId(h.id); setEditForm({ name: h.name, url: h.url }); }}>✎</button>
                  <button style={s.deleteBtn} onClick={() => remove(h.id, h.name)}>🗒</button>
                </div>
              )}
            </div>
          ))
        )}
      </Section>

      <Section title={l.addHost}>
        <Field label={l.hostName} hint={l.hostNameHint}>
          <input style={{...s.input, width:'180px'}} value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="My server" />
        </Field>
        <Field label={l.hostUrl} hint={<>e.g. <code style={{fontFamily:'var(--font-mono)',color:'var(--brand-light)'}}>http://192.168.1.50:2375</code></>}>
          <input style={{...s.input, width:'240px', fontFamily:'var(--font-mono)', fontSize:'0.85em'}} value={form.url} onChange={e => setForm(p=>({...p,url:e.target.value}))} placeholder="http://ip:2375" />
        </Field>
        <div style={s.fieldActions}>
          <button style={s.saveBtn} onClick={create} disabled={creating || !form.name || !form.url}>
            {creating ? l.adding : l.addHostBtn}
          </button>
        </div>
      </Section>

      <Section title={l.hostConfigTitle} subtitle={l.hostConfigSubtitle}>
        <div style={{padding:'14px 18px'}}>
          <div style={{fontSize:'0.82em',color:'var(--text-secondary)',marginBottom:'10px'}}>
            {l.hostConfigText} <code style={s.code}>docker-compose.yml</code>:
          </div>
          <pre style={s.codeBlock}>{`services:
  dockerproxy:
    image: tecnativa/docker-socket-proxy:latest
    restart: unless-stopped
    ports:
      - "2375:2375"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - CONTAINERS=1
      - IMAGES=1
      - INFO=1
      - NETWORKS=1
      - STATS=1
      - POST=1`}</pre>
          <div style={{fontSize:'0.78em',color:'var(--text-muted)',marginTop:'8px'}}>{l.hostConfigWarning}</div>
        </div>
      </Section>
    </>
  );
}

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

  // Reset to valid tab when lang changes
  useEffect(() => {
    setTab('appearance');
  }, [lang]);

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
              <Field label={l.version}><span style={s.mono}>1.5.0</span></Field>
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
