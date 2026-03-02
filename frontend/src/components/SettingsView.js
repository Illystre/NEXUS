import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
  const colors = { success: 'var(--success)', error: 'var(--danger)' };
  return (
    <div style={{...s.toast, borderColor: colors[type], color: colors[type]}}>
      {type === 'success' ? '✓' : '⚠'} {msg}
    </div>
  );
}

export default function SettingsView({ onSettingsChange }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState('apariencia');

  // Password change state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  // Telegram test state
  const [telegramTesting, setTelegramTesting] = useState(false);

  useEffect(() => {
    axios.get('/api/settings')
      .then(r => setSettings(r.data))
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const save = async (patch) => {
    setSaving(true);
    try {
      const updated = { ...settings, ...patch };
      const r = await axios.put('/api/settings', updated);
      setSettings(r.data);
      onSettingsChange?.(r.data);
      showToast('Ajustes guardados correctamente');
    } catch {
      showToast('Error al guardar', 'error');
    } finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (newPass !== confirmPass) return showToast('Las contraseñas no coinciden', 'error');
    if (newPass.length < 6) return showToast('Mínimo 6 caracteres', 'error');
    setPassLoading(true);
    try {
      await axios.post('/api/settings/change-password', { currentPassword: currentPass, newPassword: newPass });
      showToast('Contraseña actualizada');
      setCurrentPass(''); setNewPass(''); setConfirmPass('');
    } catch (e) {
      showToast(e.response?.data?.error || 'Error al cambiar contraseña', 'error');
    } finally { setPassLoading(false); }
  };

  const testTelegram = async () => {
    setTelegramTesting(true);
    try {
      await axios.post('/api/settings/test-telegram', {
        token: settings.telegram?.token,
        chatId: settings.telegram?.chatId,
      });
      showToast('Mensaje de prueba enviado ✓');
    } catch (e) {
      showToast(e.response?.data?.error || 'Error al conectar con Telegram', 'error');
    } finally { setTelegramTesting(false); }
  };

  const TABS = ['apariencia', 'perfil', 'telegram', 'sistema'];

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'300px',gap:'12px',flexDirection:'column'}}>
      <div style={{width:'22px',height:'22px',border:'2px solid var(--border)',borderTop:'2px solid var(--brand)',borderRadius:'50%',animation:'spin 0.7s linear infinite'}} />
      <span style={{color:'var(--text-muted)',fontSize:'0.85em'}}>Cargando ajustes...</span>
    </div>
  );

  return (
    <div style={s.page}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Sub-tabs */}
      <div style={s.subTabs}>
        {TABS.map(t => (
          <button key={t} style={{...s.subTab, ...(tab===t ? s.subTabActive:{})}} onClick={() => setTab(t)}>
            { {apariencia:'🎨', perfil:'👤', telegram:'📱', sistema:'⚙'}[t] } {t.charAt(0).toUpperCase()+t.slice(1)}
            {tab===t && <span style={s.subTabBar} />}
          </button>
        ))}
      </div>

      <div style={s.content}>

        {/* ── APARIENCIA ─────────────────────────────────────────── */}
        {tab === 'apariencia' && (
          <>
            <Section title="Tema" subtitle="Elige entre modo oscuro y claro">
              <Field label="Modo de color">
                <div style={s.themeToggle}>
                  {['dark','light'].map(t => (
                    <button
                      key={t}
                      style={{...s.themeBtn, ...(settings.theme===t ? s.themeBtnActive:{})}}
                      onClick={() => save({ theme: t })}
                    >
                      {t === 'dark' ? '🌙 Oscuro' : '☀️ Claro'}
                    </button>
                  ))}
                </div>
              </Field>
            </Section>

            <Section title="Color de acento" subtitle="Color principal de la interfaz">
              <Field label="Presets">
                <div style={s.accentGrid}>
                  {ACCENT_PRESETS.map(p => (
                    <button
                      key={p.value}
                      style={{...s.accentDot, background: p.value, outline: settings.accent===p.value ? `2px solid ${p.value}` : 'none', outlineOffset:'3px'}}
                      onClick={() => save({ accent: p.value })}
                      title={p.name}
                    />
                  ))}
                </div>
              </Field>
              <Field label="Color personalizado" hint="Introduce cualquier color hex">
                <div style={s.colorPickerRow}>
                  <input
                    type="color"
                    value={settings.accent || '#4f78ff'}
                    onChange={e => setSettings(p => ({...p, accent: e.target.value}))}
                    style={s.colorPicker}
                  />
                  <input
                    style={{...s.input, width:'120px', fontFamily:'var(--font-mono)'}}
                    value={settings.accent || '#4f78ff'}
                    onChange={e => setSettings(p => ({...p, accent: e.target.value}))}
                  />
                  <button style={s.saveBtn} onClick={() => save({ accent: settings.accent })} disabled={saving}>
                    Aplicar
                  </button>
                </div>
              </Field>
            </Section>
          </>
        )}

        {/* ── PERFIL ─────────────────────────────────────────────── */}
        {tab === 'perfil' && (
          <>
            <Section title="Cambiar contraseña" subtitle="Mínimo 6 caracteres">
              <Field label="Contraseña actual">
                <input style={s.input} type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} placeholder="••••••••" />
              </Field>
              <Field label="Nueva contraseña">
                <input style={s.input} type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="••••••••" />
              </Field>
              <Field label="Confirmar contraseña">
                <input style={s.input} type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="••••••••" />
              </Field>
              <div style={s.fieldActions}>
                <button style={s.saveBtn} onClick={changePassword} disabled={passLoading || !currentPass || !newPass || !confirmPass}>
                  {passLoading ? 'Guardando...' : 'Cambiar contraseña'}
                </button>
              </div>
            </Section>

            <Section title="Sesión" subtitle="Información de la sesión actual">
              <Field label="Token JWT" hint="Válido 24 horas desde el login">
                <span style={{fontSize:'0.78em', color:'var(--success)'}}>● Activo</span>
              </Field>
            </Section>
          </>
        )}

        {/* ── TELEGRAM ───────────────────────────────────────────── */}
        {tab === 'telegram' && (
          <>
            <Section title="Bot de Telegram" subtitle="Recibe alertas cuando un contenedor se caiga">
              <Field label="Bot Token" hint={<>Obtén uno con <a href="https://t.me/botfather" target="_blank" rel="noreferrer" style={{color:'var(--brand-light)'}}>@BotFather</a></>}>
                <input
                  style={{...s.input, width:'100%', maxWidth:'380px'}}
                  type="password"
                  value={settings.telegram?.token || ''}
                  onChange={e => setSettings(p => ({...p, telegram:{...p.telegram, token: e.target.value}}))}
                  placeholder="123456789:ABC..."
                />
              </Field>
              <Field label="Chat ID" hint="Tu ID de chat o grupo">
                <input
                  style={{...s.input, width:'180px', fontFamily:'var(--font-mono)'}}
                  value={settings.telegram?.chatId || ''}
                  onChange={e => setSettings(p => ({...p, telegram:{...p.telegram, chatId: e.target.value}}))}
                  placeholder="-100123456789"
                />
              </Field>
              <div style={s.fieldActions}>
                <button style={s.saveBtn} onClick={() => save({ telegram: settings.telegram })} disabled={saving}>
                  Guardar
                </button>
                <button
                  style={{...s.saveBtn, background:'var(--info-bg)', borderColor:'var(--info)', color:'var(--info)'}}
                  onClick={testTelegram}
                  disabled={telegramTesting || !settings.telegram?.token || !settings.telegram?.chatId}
                >
                  {telegramTesting ? 'Enviando...' : '📱 Enviar prueba'}
                </button>
              </div>
            </Section>

            <Section title="Cómo obtener el Chat ID" subtitle="">
              <div style={s.helpBlock}>
                <div style={s.helpStep}><span style={s.helpNum}>1</span>Abre Telegram y busca <strong>@userinfobot</strong></div>
                <div style={s.helpStep}><span style={s.helpNum}>2</span>Envíale cualquier mensaje</div>
                <div style={s.helpStep}><span style={s.helpNum}>3</span>Te responderá con tu Chat ID</div>
                <div style={s.helpStep}><span style={s.helpNum}>4</span>Para grupos, añade el bot al grupo y usa <code style={s.code}>/getid</code></div>
              </div>
            </Section>
          </>
        )}

        {/* ── SISTEMA ────────────────────────────────────────────── */}
        {tab === 'sistema' && (
          <>
            <Section title="Intervalo de refresco" subtitle="Cada cuánto se actualizan los datos">
              <Field label="Intervalo">
                <div style={s.radioGroup}>
                  {REFRESH_OPTIONS.map(o => (
                    <label key={o.value} style={s.radioLabel}>
                      <input
                        type="radio"
                        name="refresh"
                        checked={settings.refreshInterval === o.value}
                        onChange={() => save({ refreshInterval: o.value })}
                        style={s.radio}
                      />
                      <span style={{color: settings.refreshInterval===o.value ? 'var(--text-primary)':'var(--text-secondary)'}}>{o.label}</span>
                    </label>
                  ))}
                </div>
              </Field>
            </Section>

            <Section title="Sobre NEXUS">
              <Field label="Versión"><span style={s.mono}>1.0.0</span></Field>
              <Field label="Backend"><span style={s.mono}>Node.js + Express + Socket.io</span></Field>
              <Field label="Frontend"><span style={s.mono}>React 18</span></Field>
              <Field label="Autor"><span style={{color:'var(--brand-light)'}}>alvaro_lab</span></Field>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { position:'relative' },
  toast: { position:'fixed', top:'20px', right:'20px', background:'var(--bg-elevated)', border:'1px solid', borderRadius:'var(--radius)', padding:'10px 16px', fontSize:'0.85em', fontWeight:500, zIndex:999, boxShadow:'0 4px 20px #00000050' },
  subTabs: { display:'flex', gap:'0', borderBottom:'1px solid var(--border)', marginBottom:'24px', overflowX:'auto' },
  subTab: { position:'relative', display:'flex', alignItems:'center', gap:'6px', padding:'10px 18px', background:'transparent', border:'none', color:'var(--text-muted)', fontFamily:'var(--font-sans)', fontSize:'0.85em', fontWeight:500, cursor:'pointer', whiteSpace:'nowrap', transition:'color 0.15s' },
  subTabActive: { color:'var(--text-primary)' },
  subTabBar: { position:'absolute', bottom:0, left:'12px', right:'12px', height:'2px', background:'var(--brand)', borderRadius:'2px' },
  content: { display:'flex', flexDirection:'column', gap:'16px', maxWidth:'680px' },
  section: { background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' },
  sectionHead: { padding:'14px 18px', borderBottom:'1px solid var(--border)', background:'var(--bg-elevated)' },
  sectionTitle: { fontWeight:600, fontSize:'0.9em', color:'var(--text-primary)', marginBottom:'2px' },
  sectionSub: { fontSize:'0.76em', color:'var(--text-muted)' },
  sectionBody: { padding:'4px 0' },
  field: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'12px 18px', borderTop:'1px solid var(--border)', gap:'16px', flexWrap:'wrap' },
  fieldLeft: { flex:1, minWidth:'140px' },
  fieldLabel: { fontSize:'0.85em', fontWeight:500, color:'var(--text-primary)', marginBottom:'2px' },
  fieldHint: { fontSize:'0.74em', color:'var(--text-muted)' },
  fieldRight: { display:'flex', alignItems:'center', flexShrink:0 },
  fieldActions: { padding:'12px 18px', borderTop:'1px solid var(--border)', display:'flex', gap:'8px' },
  input: { background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'8px 12px', color:'var(--text-primary)', fontFamily:'var(--font-sans)', fontSize:'0.88em', outline:'none', minWidth:'200px' },
  saveBtn: { padding:'8px 16px', background:'var(--brand-glow)', border:'1px solid var(--border-focus)', borderRadius:'var(--radius)', color:'var(--brand-light)', fontFamily:'var(--font-sans)', fontSize:'0.82em', fontWeight:600, cursor:'pointer', transition:'all 0.15s' },
  themeToggle: { display:'flex', gap:'6px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'3px' },
  themeBtn: { padding:'6px 16px', background:'transparent', border:'none', borderRadius:'var(--radius-sm)', color:'var(--text-muted)', fontFamily:'var(--font-sans)', fontSize:'0.82em', cursor:'pointer', transition:'all 0.15s' },
  themeBtnActive: { background:'var(--bg-elevated)', color:'var(--text-primary)', boxShadow:'0 1px 3px #00000030' },
  accentGrid: { display:'flex', gap:'8px', flexWrap:'wrap' },
  accentDot: { width:'24px', height:'24px', borderRadius:'50%', border:'none', cursor:'pointer', transition:'transform 0.15s', flexShrink:0 },
  colorPickerRow: { display:'flex', alignItems:'center', gap:'8px' },
  colorPicker: { width:'36px', height:'36px', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'2px', cursor:'pointer', background:'transparent' },
  radioGroup: { display:'flex', flexDirection:'column', gap:'8px' },
  radioLabel: { display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', fontSize:'0.85em' },
  radio: { accentColor:'var(--brand)', width:'14px', height:'14px' },
  mono: { fontFamily:'var(--font-mono)', fontSize:'0.82em', color:'var(--text-secondary)' },
  helpBlock: { padding:'12px 18px', display:'flex', flexDirection:'column', gap:'10px' },
  helpStep: { display:'flex', alignItems:'center', gap:'10px', fontSize:'0.84em', color:'var(--text-secondary)' },
  helpNum: { width:'22px', height:'22px', background:'var(--brand-glow)', border:'1px solid var(--border-focus)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.75em', fontWeight:700, color:'var(--brand-light)', flexShrink:0 },
  code: { fontFamily:'var(--font-mono)', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'3px', padding:'1px 5px', fontSize:'0.9em' },
};
