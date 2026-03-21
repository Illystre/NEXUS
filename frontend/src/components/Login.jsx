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
          .login-right { width: 100% !important; padding: 32px 24px !important; border-radius: 0 !important; }
          .login-card { max-width: 100% !important; border-radius: 0 !important; min-height: 100vh !important; }
        }
      `}</style>

      {/* Language selector */}
      <div style={s.langToggle}>
        {['en','es'].map(lg => (
          <button key={lg} style={{...s.langBtn, ...(lang===lg?s.langBtnActive:{})}} onClick={() => changeLang(lg)}>
            {lg === 'en' ? '🇬🇧 EN' : '🇪🇸 ES'}
          </button>
        ))}
      </div>

      {/* Card */}
      <div className="login-card" style={s.card}>

        {/* Left panel */}
        <div className="login-left" style={s.leftPanel}>
          <svg viewBox="0 0 192 192" width="52" height="52" style={{borderRadius:10,flexShrink:0,marginBottom:24}}>
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

          <h1 style={s.heroH1}>{l.title || 'Container Platform'}</h1>
          <p style={s.heroP}>{l.tagline}</p>

          <div style={{flex:1}} />

          <div style={s.stats}>
            {[[l.realtime, l.realtimeSub],[l.secure, l.secureSub],[l.fast, l.fastSub]].map(([v, lb]) => (
              <div key={v}>
                <div style={s.statVal}>{v}</div>
                <div style={s.statLbl}>{lb}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — form */}
        <div className="login-right" style={s.rightPanel}>
          <h2 style={s.formTitle}>{l.welcome}</h2>
          <p style={s.formSub}>{l.subtitle}</p>

          <div style={s.field}>
            <label style={s.label}>{l.username}</label>
            <input
              style={s.input} value={user}
              onChange={e => setUser(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="admin" autoFocus
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>{l.password}</label>
            <input
              style={s.input} type="password" value={pass}
              onChange={e => setPass(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="••••••••••"
            />
          </div>

          {error && (
            <div style={s.errorBox}><span>⚠</span>{error}</div>
          )}

          <button
            style={{...s.btn, opacity: loading ? 0.7 : 1}}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <span style={s.btnInner}><div style={s.spinner} />{l.verifying}</span>
              : l.submit
            }
          </button>

          <div style={s.footer}>
            <span style={s.footerText}>NEXUS v1.5.2 · AlVaRiTo1983</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langToggle: {
    position: 'fixed', top: '20px', right: '24px',
    display: 'flex', gap: '4px',
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '3px', zIndex: 10,
  },
  langBtn: {
    padding: '5px 10px', background: 'transparent', border: 'none',
    borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)',
    fontFamily: 'var(--font-sans)', fontSize: '0.78em', fontWeight: 500, cursor: 'pointer',
  },
  langBtnActive: { background: 'var(--bg-elevated)', color: 'var(--text-primary)' },

  card: {
    display: 'flex',
    width: '100%', maxWidth: '900px', minHeight: '480px',
    borderRadius: '16px', overflow: 'hidden',
    border: '1px solid var(--border)',
  },

  leftPanel: {
    flex: 1,
    background: 'var(--bg-surface)',
    padding: '48px 40px',
    display: 'flex', flexDirection: 'column',
    position: 'relative', overflow: 'hidden',
  },

  heroH1: {
    fontSize: '30px', fontWeight: 700, lineHeight: 1.2,
    letterSpacing: '-0.02em', color: 'var(--text-primary)',
    marginBottom: '12px',
  },
  heroP: {
    color: 'var(--text-secondary)', lineHeight: 1.7,
    fontSize: '0.9em', maxWidth: '320px',
  },

  stats: { display: 'flex', gap: '24px' },
  statVal: { fontWeight: 700, fontSize: '0.9em', color: '#00c896', marginBottom: '2px' },
  statLbl: { fontSize: '0.7em', color: 'var(--text-muted)', letterSpacing: '0.04em' },

  rightPanel: {
    width: '380px', flexShrink: 0,
    background: 'var(--bg-elevated)',
    padding: '48px 40px',
    display: 'flex', flexDirection: 'column', justifyContent: 'center',
  },

  formTitle: {
    fontSize: '1.4em', fontWeight: 700,
    marginBottom: '6px', letterSpacing: '-0.01em',
    color: 'var(--text-primary)',
  },
  formSub: {
    color: 'var(--text-secondary)', fontSize: '0.88em', marginBottom: '28px',
  },

  field: { marginBottom: '16px' },
  label: {
    display: 'block', fontSize: '0.78em', fontWeight: 500,
    color: 'var(--text-secondary)', marginBottom: '6px',
  },
  input: {
    width: '100%', background: 'var(--bg-surface)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius)',
    padding: '10px 14px', color: 'var(--text-primary)',
    fontFamily: 'var(--font-sans)', fontSize: '0.95em', outline: 'none',
  },

  errorBox: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
    borderRadius: 'var(--radius)', padding: '10px 14px',
    color: 'var(--danger)', fontSize: '0.85em', marginBottom: '16px',
  },

  btn: {
    width: '100%', padding: '11px',
    background: '#00c896', border: 'none',
    borderRadius: 'var(--radius)',
    color: '#000', fontFamily: 'var(--font-sans)',
    fontSize: '0.95em', fontWeight: 700, cursor: 'pointer',
    marginBottom: '4px',
  },
  btnInner: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  spinner: {
    width: '14px', height: '14px',
    border: '2px solid rgba(0,0,0,0.2)',
    borderTop: '2px solid #000',
    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
  },

  footer: { marginTop: '20px', textAlign: 'center' },
  footerText: { fontSize: '0.7em', color: 'var(--text-muted)', letterSpacing: '0.06em' },
};
