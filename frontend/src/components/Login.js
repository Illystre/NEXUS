import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useLang } from './LanguageContext';

export default function Login() {
  const { login } = useAuth();
  const { t, lang, changeLang } = useLang();
  const l = t.login;
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user || !pass) return;
    setLoading(true); setError('');
    try { await login(user, pass); }
    catch { setError(l.error); setLoading(false); }
  };

  return (
    <div style={s.page}>
      <style>{`
        @media (max-width: 700px) {
          .login-left { display: none !important; }
          .login-right { padding: 32px 24px !important; }
          .login-wrap { max-width: 100% !important; }
        }
      `}</style>

      <div className="login-left" style={s.leftPanel}>
        <div style={s.brandArea}>
          <div style={s.logo}>
            <div style={s.logoMark}>
              <svg width="28" height="28" viewBox="0 0 200 200" fill="none">
                <rect x="28" y="28" width="62" height="62" rx="10" fill="#00c896"/>
                <rect x="110" y="28" width="62" height="62" rx="10" fill="#00c896" opacity="0.55"/>
                <rect x="28" y="110" width="62" height="62" rx="10" fill="#00c896" opacity="0.3"/>
                <rect x="110" y="110" width="62" height="62" rx="10" fill="none" stroke="#00c896" stroke-width="6"/>
                <path d="M125 125 L125 157 L133 157 L133 136 L149 157 L157 157 L157 125 L149 125 L149 146 L133 125 Z" fill="#00c896"/>
                <line x1="90" y1="57" x2="110" y2="57" stroke="#00c896" stroke-width="5" opacity="0.45" stroke-linecap="round"/>
                <line x1="57" y1="90" x2="57" y2="110" stroke="#00c896" stroke-width="5" opacity="0.45" stroke-linecap="round"/>
                <line x1="90" y1="141" x2="110" y2="141" stroke="#00c896" stroke-width="5" opacity="0.45" stroke-linecap="round"/>
                <line x1="141" y1="90" x2="141" y2="110" stroke="#00c896" stroke-width="5" opacity="0.45" stroke-linecap="round"/>
              </svg>
            </div>
            <div>
              <div style={s.logoName}>NEXUS</div>
              <div style={s.logoTagline}>Container Platform</div>
            </div>
          </div>
          <div style={s.heroText}>
            <h1 style={s.heroH1}>Infrastructure<br />at a glance.</h1>
            <p style={s.heroP}>{l.tagline}</p>
          </div>
          <div style={s.stats}>
            {[[l.realtime, l.realtimeSub],[l.secure, l.secureSub],[l.fast, l.fastSub]].map(([v, lb]) => (
              <div key={v} style={s.statItem}>
                <div style={s.statVal}>{v}</div>
                <div style={s.statLbl}>{lb}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={s.leftBg} />
      </div>

      <div className="login-right" style={s.rightPanel}>
        <div style={s.mobileLogoWrap}>
          <div style={s.mobileLogo}>
            <svg width="22" height="22" viewBox="0 0 200 200" fill="none">
              <rect x="28" y="28" width="62" height="62" rx="10" fill="#00c896"/>
              <rect x="110" y="28" width="62" height="62" rx="10" fill="#00c896" opacity="0.55"/>
              <rect x="28" y="110" width="62" height="62" rx="10" fill="#00c896" opacity="0.3"/>
              <rect x="110" y="110" width="62" height="62" rx="10" fill="none" stroke="#00c896" stroke-width="6"/>
              <path d="M125 125 L125 157 L133 157 L133 136 L149 157 L157 157 L157 125 L149 125 L149 146 L133 125 Z" fill="#00c896"/>
            </svg>
            <span style={s.mobileLogoText}>NEXUS</span>
          </div>
        </div>

        <div style={s.langToggle}>
          {['en','es'].map(lg => (
            <button key={lg} style={{...s.langBtn, ...(lang===lg?s.langBtnActive:{})}} onClick={() => changeLang(lg)}>
              {lg === 'en' ? '🇬🇧 EN' : '🇪🇸 ES'}
            </button>
          ))}
        </div>

        <div className="login-wrap" style={s.formWrap}>
          <div style={s.formHeader}>
            <h2 style={s.formTitle}>{l.welcome}</h2>
            <p style={s.formSub}>{l.subtitle}</p>
          </div>

          <div style={s.field}>
            <label style={s.label}>{l.username}</label>
            <input style={s.input} value={user} onChange={e => setUser(e.target.value)} onKeyDown={e => e.key==='Enter' && handleSubmit()} placeholder="admin" autoFocus />
          </div>

          <div style={s.field}>
            <label style={s.label}>{l.password}</label>
            <input style={s.input} type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key==='Enter' && handleSubmit()} placeholder="••••••••••" />
          </div>

          {error && (
            <div style={s.errorBox}><span>⚠</span>{error}</div>
          )}

          <button style={{...s.btn, opacity: loading ? 0.7 : 1}} onClick={handleSubmit} disabled={loading}>
            {loading ? <span style={s.btnInner}><div style={s.spinner} />{l.verifying}</span> : l.submit}
          </button>

          <div style={s.footer}>
            <span style={s.footerText}>NEXUS v1.4.0 · AlVaRiTo1983</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { display:'flex', height:'100vh', overflow:'hidden' },
  leftPanel: { width:'480px', flexShrink:0, background:'var(--bg-surface)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', justifyContent:'space-between', position:'relative', overflow:'hidden', padding:'48px' },
  leftBg: { position:'absolute', inset:0, pointerEvents:'none', background:'radial-gradient(ellipse at 20% 80%, #00c89615 0%, transparent 60%)' },
  brandArea: { position:'relative', zIndex:1, display:'flex', flexDirection:'column', gap:'48px' },
  logo: { display:'flex', alignItems:'center', gap:'14px' },
  logoMark: { width:'44px', height:'44px', background:'#00c89620', border:'1px solid #00c89640', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center' },
  logoName: { fontSize:'1.3em', fontWeight:700, letterSpacing:'0.12em' },
  logoTagline: { fontSize:'0.72em', color:'var(--text-muted)', letterSpacing:'0.08em', marginTop:'1px' },
  heroH1: { fontSize:'2.4em', fontWeight:700, lineHeight:1.15, marginBottom:'16px', letterSpacing:'-0.02em' },
  heroP: { color:'var(--text-secondary)', lineHeight:1.7, fontSize:'0.95em', maxWidth:'320px' },
  stats: { display:'flex', gap:'32px' },
  statItem: {},
  statVal: { fontWeight:700, fontSize:'0.95em', color:'#00c896', marginBottom:'2px' },
  statLbl: { fontSize:'0.72em', color:'var(--text-muted)', letterSpacing:'0.04em' },
  rightPanel: { flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px', background:'var(--bg)', position:'relative' },
  mobileLogoWrap: { display:'none' },
  mobileLogo: { display:'flex', alignItems:'center', gap:'10px', marginBottom:'32px' },
  mobileLogoText: { fontWeight:700, fontSize:'1.1em', letterSpacing:'0.15em' },
  langToggle: { position:'absolute', top:'20px', right:'20px', display:'flex', gap:'4px', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'3px' },
  langBtn: { padding:'5px 10px', background:'transparent', border:'none', borderRadius:'var(--radius-sm)', color:'var(--text-muted)', fontFamily:'var(--font-sans)', fontSize:'0.78em', fontWeight:500, cursor:'pointer' },
  langBtnActive: { background:'var(--bg-elevated)', color:'var(--text-primary)' },
  formWrap: { width:'100%', maxWidth:'380px' },
  formHeader: { marginBottom:'32px' },
  formTitle: { fontSize:'1.5em', fontWeight:700, marginBottom:'6px', letterSpacing:'-0.01em' },
  formSub: { color:'var(--text-secondary)', fontSize:'0.9em' },
  field: { marginBottom:'18px' },
  label: { display:'block', fontSize:'0.8em', fontWeight:500, color:'var(--text-secondary)', marginBottom:'6px' },
  input: { width:'100%', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'11px 14px', color:'var(--text-primary)', fontFamily:'var(--font-sans)', fontSize:'1em', outline:'none' },
  errorBox: { display:'flex', alignItems:'center', gap:'8px', background:'var(--danger-bg)', border:'1px solid var(--danger-border)', borderRadius:'var(--radius)', padding:'10px 14px', color:'var(--danger)', fontSize:'0.85em', marginBottom:'18px' },
  btn: { width:'100%', padding:'12px', background:'#00c896', border:'none', borderRadius:'var(--radius)', color:'white', fontFamily:'var(--font-sans)', fontSize:'1em', fontWeight:600, cursor:'pointer' },
  btnInner: { display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' },
  spinner: { width:'14px', height:'14px', border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid white', borderRadius:'50%', animation:'spin 0.7s linear infinite' },
  footer: { marginTop:'24px', textAlign:'center' },
  footerText: { fontSize:'0.72em', color:'var(--text-muted)', letterSpacing:'0.06em' },
};
