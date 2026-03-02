import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';

const ACCENT_PRESETS = [
  { name:'Azul',    value:'#4f78ff' },
  { name:'Índigo',  value:'#6366f1' },
  { name:'Verde',   value:'#22c55e' },
  { name:'Cian',    value:'#06b6d4' },
  { name:'Naranja', value:'#f97316' },
  { name:'Rosa',    value:'#ec4899' },
];

const REFRESH_OPTIONS = [
  { label:'1 segundo',   value:1000 },
  { label:'3 segundos',  value:3000 },
  { label:'5 segundos',  value:5000 },
  { label:'15 segundos', value:15000 },
  { label:'30 segundos', value:30000 },
  { label:'1 minuto',    value:60000 },
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
      {type==='success'?'✓':'⚠'} {msg}
    </div>
  );
}

function UsersPanel({ showToast }) {
  const { user: currentUser } = useAuth();
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
      showToast('Usuario creado');
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
      showToast('Usuario actualizado');
    } catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
  };

  const remove = async (id, username) => {
    if (!window.confirm(`¿Eliminar usuario "${username}"?`)) return;
    try { await axios.delete(`/api/users/${id}`); await load(); showToast('Usuario eliminado'); }
    catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
  };

  return (
    <>
      <Section title="Usuarios" subtitle="Gestiona quién puede acceder a NEXUS">
        {loading ? <div style={{padding:'20px',textAlign:'center',color:'var(--text-muted)',fontSize:'0.85em'}}>Cargando...</div> : (
          <div>
            {users.map(u => (
              <div key={u.id} style={s.userRow}>
                <div style={s.userAvatar}>{u.username[0].toUpperCase()}</div>
                <div style={s.userInfo}>
                  <div style={s.userName2}>{u.username} {u.username === currentUser && <span style={s.youBadge}>tú</span>}</div>
                  <div style={s.userMeta}>Creado {new Date(u.createdAt).toLocaleDateString('es-ES')}</div>
                </div>
                {editId === u.id ? (
                  <div style={s.editRow}>
                    <select style={s.select} value={editRole || u.role} onChange={e => setEditRole(e.target.value)}>
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <input style={{...s.input, width:'130px'}} type="password" placeholder="Nueva contraseña" value={editPass} onChange={e => setEditPass(e.target.value)} />
                    <button style={s.saveSmallBtn} onClick={() => update(u.id)}>✓</button>
                    <button style={s.cancelBtn} onClick={() => { setEditId(null); setEditRole(''); setEditPass(''); }}>✕</button>
                  </div>
                ) : (
                  <div style={s.userActions}>
                    <span style={{...s.roleBadge, color: u.role==='admin'?'var(--brand-light)':'var(--text-muted)', background: u.role==='admin'?'var(--brand-glow)':'var(--bg-elevated)', border:`1px solid ${u.role==='admin'?'var(--border-focus)':'var(--border)'}`}}>{u.role}</span>
                    <button style={s.editBtn} onClick={() => { setEditId(u.id); setEditRole(u.role); }}>✏</button>
                    {u.username !== currentUser && (
                      <button style={s.deleteBtn} onClick={() => remove(u.id, u.username)}>🗑</button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Crear usuario">
        <Field label="Usuario">
          <input style={{...s.input, width:'180px'}} value={form.username} onChange={e => setForm(p=>({...p,username:e.target.value}))} placeholder="nuevo_usuario" />
        </Field>
        <Field label="Contraseña" hint="Mínimo 6 caracteres">
          <input style={{...s.input, width:'180px'}} type="password" value={form.password} onChange={e => setForm(p=>({...p,password:e.target.value}))} placeholder="••••••••" />
        </Field>
        <Field label="Rol">
          <select style={{...s.input, ...s.select}} value={form.role} onChange={e => setForm(p=>({...p,role:e.target.value}))}>
            <option value="viewer">Viewer — solo lectura</option>
            <option value="admin">Admin — acceso total</option>
          </select>
        </Field>
        <div style={s.fieldActions}>
          <button style={s.saveBtn} onClick={create} disabled={creating || !form.username || !form.password}>
            {creating ? 'Creando...' : '+ Crear usuario'}
          </button>
        </div>
      </Section>

      <Section title="Permisos por rol">
        <div style={s.permTable}>
          {[
            ['Ver contenedores y métricas', true, true],
            ['Ver logs', true, true],
            ['Iniciar / Parar / Reiniciar', true, false],
            ['Terminal integrada', true, false],
            ['Gestionar usuarios', true, false],
            ['Cambiar ajustes', true, false],
            ['Limpiar eventos y alertas', true, false],
          ].map(([perm, admin, viewer]) => (
            <div key={perm} style={s.permRow}>
              <span style={s.permName}>{perm}</span>
              <span style={{...s.permCheck, color: admin?'var(--success)':'var(--danger)'}}>{admin?'✓':'✕'}</span>
              <span style={{...s.permCheck, color: viewer?'var(--success)':'var(--danger)'}}>{viewer?'✓':'✕'}</span>
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

export default function SettingsView({ onSettingsChange }) {
  const { role } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const [tab, setTab]           = useState('apariencia');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass]         = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [telegramTesting, setTelegramTesting] = useState(false);

  useEffect(() => {
    axios.get('/api/settings').then(r => setSettings(r.data)).finally(() => setLoading(false));
  }, []);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const save = async (patch) => {
    setSaving(true);
    try {
      const r = await axios.put('/api/settings', { ...settings, ...patch });
      setSettings(r.data); onSettingsChange?.(r.data);
      showToast('Ajustes guardados');
    } catch { showToast('Error al guardar', 'error'); }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (newPass !== confirmPass) return showToast('Las contraseñas no coinciden', 'error');
    setPassLoading(true);
    try {
      await axios.post('/api/settings/change-password', { currentPassword: currentPass, newPassword: newPass });
      showToast('Contraseña actualizada');
      setCurrentPass(''); setNewPass(''); setConfirmPass('');
    } catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
    finally { setPassLoading(false); }
  };

  const testTelegram = async () => {
    setTelegramTesting(true);
    try {
      await axios.post('/api/settings/test-telegram', { token: settings.telegram?.token, chatId: settings.telegram?.chatId });
      showToast('Mensaje enviado ✓');
    } catch (e) { showToast(e.response?.data?.error || 'Error con Telegram', 'error'); }
    finally { setTelegramTesting(false); }
  };

  const isAdmin = role === 'admin';
  const TABS = isAdmin
    ? ['apariencia', 'perfil', 'usuarios', 'telegram', 'sistema']
    : ['apariencia', 'perfil'];

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'300px',gap:'12px',flexDirection:'column'}}>
      <div style={{width:'22px',height:'22px',border:'2px solid var(--border)',borderTop:'2px solid var(--brand)',borderRadius:'50%',animation:'spin 0.7s linear infinite'}} />
    </div>
  );

  return (
    <div style={s.page}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <div style={s.subTabs}>
        {TABS.map(t => (
          <button key={t} style={{...s.subTab, ...(tab===t?s.subTabActive:{})}} onClick={() => setTab(t)}>
            { {apariencia:'🎨', perfil:'👤', usuarios:'👥', telegram:'📱', sistema:'⚙'}[t] } {t.charAt(0).toUpperCase()+t.slice(1)}
            {tab===t && <span style={s.subTabBar} />}
          </button>
        ))}
      </div>

      <div style={s.content}>
        {tab==='apariencia' && (
          <>
            <Section title="Tema" subtitle="Modo oscuro o claro">
              <Field label="Modo de color">
                <div style={s.themeToggle}>
                  {['dark','light'].map(t => (
                    <button key={t} style={{...s.themeBtn, ...(settings.theme===t?s.themeBtnActive:{})}} onClick={() => save({ theme: t })}>
                      {t==='dark'?'🌙 Oscuro':'☀️ Claro'}
                    </button>
                  ))}
                </div>
              </Field>
            </Section>
            <Section title="Color de acento">
              <Field label="Presets">
                <div style={s.accentGrid}>
                  {ACCENT_PRESETS.map(p => (
                    <button key={p.value} style={{...s.accentDot, background:p.value, outline:settings.accent===p.value?`2px solid ${p.value}`:'none', outlineOffset:'3px'}} onClick={() => save({ accent: p.value })} title={p.name} />
                  ))}
                </div>
              </Field>
              <Field label="Color personalizado">
                <div style={s.colorPickerRow}>
                  <input type="color" value={settings.accent||'#4f78ff'} onChange={e => setSettings(p=>({...p,accent:e.target.value}))} style={s.colorPicker} />
                  <input style={{...s.input,width:'120px',fontFamily:'var(--font-mono)'}} value={settings.accent||'#4f78ff'} onChange={e => setSettings(p=>({...p,accent:e.target.value}))} />
                  <button style={s.saveBtn} onClick={() => save({ accent: settings.accent })} disabled={saving}>Aplicar</button>
                </div>
              </Field>
            </Section>
          </>
        )}

        {tab==='perfil' && (
          <Section title="Cambiar contraseña">
            <Field label="Contraseña actual"><input style={s.input} type="password" value={currentPass} onChange={e=>setCurrentPass(e.target.value)} placeholder="••••••••" /></Field>
            <Field label="Nueva contraseña"><input style={s.input} type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="••••••••" /></Field>
            <Field label="Confirmar"><input style={s.input} type="password" value={confirmPass} onChange={e=>setConfirmPass(e.target.value)} placeholder="••••••••" /></Field>
            <div style={s.fieldActions}>
              <button style={s.saveBtn} onClick={changePassword} disabled={passLoading||!currentPass||!newPass||!confirmPass}>
                {passLoading?'Guardando...':'Cambiar contraseña'}
              </button>
            </div>
          </Section>
        )}

        {tab==='usuarios' && isAdmin && <UsersPanel showToast={showToast} />}

        {tab==='telegram' && isAdmin && (
          <>
            <Section title="Bot de Telegram">
              <Field label="Bot Token" hint={<>Obtén uno con <a href="https://t.me/botfather" target="_blank" rel="noreferrer" style={{color:'var(--brand-light)'}}>@BotFather</a></>}>
                <input style={{...s.input,width:'100%',maxWidth:'360px'}} type="password" value={settings.telegram?.token||''} onChange={e=>setSettings(p=>({...p,telegram:{...p.telegram,token:e.target.value}}))} placeholder="123456:ABC..." />
              </Field>
              <Field label="Chat ID">
                <input style={{...s.input,width:'180px',fontFamily:'var(--font-mono)'}} value={settings.telegram?.chatId||''} onChange={e=>setSettings(p=>({...p,telegram:{...p.telegram,chatId:e.target.value}}))} placeholder="-100123456" />
              </Field>
              <div style={s.fieldActions}>
                <button style={s.saveBtn} onClick={() => save({ telegram: settings.telegram })} disabled={saving}>Guardar</button>
                <button style={{...s.saveBtn,background:'var(--info-bg)',borderColor:'var(--info)',color:'var(--info)'}} onClick={testTelegram} disabled={telegramTesting||!settings.telegram?.token||!settings.telegram?.chatId}>
                  {telegramTesting?'Enviando...':'📱 Probar'}
                </button>
              </div>
            </Section>
          </>
        )}

        {tab==='sistema' && isAdmin && (
          <>
            <Section title="Intervalo de refresco">
              <Field label="Intervalo">
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
            <Section title="Sobre NEXUS">
              <Field label="Versión"><span style={s.mono}>1.0.0</span></Field>
              <Field label="Stack"><span style={s.mono}>Node.js · React 18 · Socket.io</span></Field>
              <Field label="Autor"><span style={{color:'var(--brand-light)'}}>alvaro_lab</span></Field>
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
  // Users panel
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
};
