import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useLang } from './LanguageContext';

// ── Simple YAML syntax highlighter ───────────────────────────────────────────
function YamlHighlight({ code }) {
  const lines = code.split('\n').map((line, i) => {
    let html = line
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Comments
    if (/^\s*#/.test(html)) {
      return <div key={i} style={{...hl.line, color:'var(--text-muted)'}}>{html}</div>;
    }
    // Keys
    html = html.replace(/^(\s*)([a-zA-Z_][a-zA-Z0-9_-]*)(\s*:)/g,
      (_, sp, key, colon) => `${sp}<span style="color:#7dd3fc">${key}</span>${colon}`);
    // Strings in quotes
    html = html.replace(/"([^"]*)"/g, `<span style="color:#86efac">"$1"</span>`);
    html = html.replace(/'([^']*)'/g, `<span style="color:#86efac">'$1'</span>`);
    // Booleans / null
    html = html.replace(/\b(true|false|null|yes|no)\b/g, `<span style="color:#f9a8d4">$1</span>`);
    // Numbers
    html = html.replace(/:\s*(\d+)/g, (m, n) => m.replace(n, `<span style="color:#fcd34d">${n}</span>`));
    // List dashes
    html = html.replace(/^(\s*)(- )/g, `$1<span style="color:#c084fc">- </span>`);

    return <div key={i} style={hl.line} dangerouslySetInnerHTML={{ __html: html || '\u00a0' }} />;
  });
  return <div style={hl.wrap}>{lines}</div>;
}

const hl = {
  wrap: { fontFamily: 'var(--font-mono)', fontSize: '0.82em', lineHeight: 1.7, padding: '14px', overflowX: 'auto' },
  line: { whiteSpace: 'pre' },
};

// ── Container Create Form ─────────────────────────────────────────────────────
function ContainerForm({ onSuccess, onCancel }) {
  const { t } = useLang();
  const l = t.deploy;

  const [step, setStep]       = useState(0);
  const [deploying, setDeploying] = useState(false);
  const [error, setError]     = useState('');
  const [pulling, setPulling] = useState(false);

  const [form, setForm] = useState({
    name: '', image: '', tag: 'latest',
    ports: [{ host: '', container: '' }],
    envVars: [{ key: '', value: '' }],
    volumes: [{ host: '', container: '', readonly: false }],
    restart: 'unless-stopped',
    network: 'bridge',
    cmd: '',
  });

  const set = (field, val) => setForm(p => ({ ...p, [field]: val }));

  const addPort   = () => set('ports',   [...form.ports,   { host: '', container: '' }]);
  const addEnv    = () => set('envVars', [...form.envVars, { key: '', value: '' }]);
  const addVol    = () => set('volumes', [...form.volumes, { host: '', container: '', readonly: false }]);

  const updatePort = (i, f, v) => { const a = [...form.ports];   a[i][f] = v; set('ports', a); };
  const updateEnv  = (i, f, v) => { const a = [...form.envVars]; a[i][f] = v; set('envVars', a); };
  const updateVol  = (i, f, v) => { const a = [...form.volumes]; a[i][f] = v; set('volumes', a); };
  const removePort = (i) => set('ports',   form.ports.filter((_,x)=>x!==i));
  const removeEnv  = (i) => set('envVars', form.envVars.filter((_,x)=>x!==i));
  const removeVol  = (i) => set('volumes', form.volumes.filter((_,x)=>x!==i));

  const STEPS = [l.stepImage, l.stepConfig, l.stepStorage, l.stepNetwork, l.stepReview];

  const deploy = async () => {
    setDeploying(true); setError('');
    try {
      await axios.post('/api/containers/create', {
        ...form,
        image: `${form.image}:${form.tag}`,
      });
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.error || 'Error');
      setDeploying(false);
    }
  };

  return (
    <div style={cf.wrap}>
      {/* Steps */}
      <div style={cf.steps}>
        {STEPS.map((s, i) => (
          <div key={i} style={cf.stepItem} onClick={() => i < step && setStep(i)}>
            <div style={{...cf.stepDot, background: i <= step ? 'var(--brand)' : 'var(--bg-elevated)', border: `2px solid ${i <= step ? 'var(--brand)' : 'var(--border)'}`, color: i <= step ? 'white' : 'var(--text-muted)', cursor: i < step ? 'pointer' : 'default'}}>
              {i < step ? '✓' : i + 1}
            </div>
            <span style={{...cf.stepLabel, color: i === step ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: i === step ? 600 : 400}}>{s}</span>
            {i < STEPS.length - 1 && <div style={{...cf.stepLine, background: i < step ? 'var(--brand)' : 'var(--border)'}} />}
          </div>
        ))}
      </div>

      {/* Step 0 — Image */}
      {step === 0 && (
        <div style={cf.body}>
          <div style={cf.fieldGroup}>
            <label style={cf.label}>{l.image} *</label>
            <input style={cf.input} value={form.image} onChange={e => set('image', e.target.value)} placeholder="nginx, postgres, redis..." autoFocus />
            <div style={cf.hint}>{l.imageHint}</div>
          </div>
          <div style={cf.fieldGroup}>
            <label style={cf.label}>{l.tag}</label>
            <input style={cf.input} value={form.tag} onChange={e => set('tag', e.target.value)} placeholder="latest" />
          </div>
          <div style={cf.fieldGroup}>
            <label style={cf.label}>{l.containerName}</label>
            <input style={cf.input} value={form.name} onChange={e => set('name', e.target.value)} placeholder={l.containerNameHint} />
          </div>
        </div>
      )}

      {/* Step 1 — Config */}
      {step === 1 && (
        <div style={cf.body}>
          <div style={cf.sectionTitle}>{l.ports}</div>
          {form.ports.map((p, i) => (
            <div key={i} style={cf.row}>
              <input style={{...cf.input, flex:1}} value={p.host} onChange={e => updatePort(i,'host',e.target.value)} placeholder={l.hostPort} />
              <span style={cf.arrow}>→</span>
              <input style={{...cf.input, flex:1}} value={p.container} onChange={e => updatePort(i,'container',e.target.value)} placeholder={l.containerPort} />
              <button style={cf.removeBtn} onClick={() => removePort(i)}>✕</button>
            </div>
          ))}
          <button style={cf.addBtn} onClick={addPort}>+ {l.addPort}</button>

          <div style={{...cf.sectionTitle, marginTop:'20px'}}>{l.envVars}</div>
          {form.envVars.map((e, i) => (
            <div key={i} style={cf.row}>
              <input style={{...cf.input, flex:1}} value={e.key} onChange={ev => updateEnv(i,'key',ev.target.value)} placeholder="KEY" />
              <span style={cf.arrow}>=</span>
              <input style={{...cf.input, flex:2}} value={e.value} onChange={ev => updateEnv(i,'value',ev.target.value)} placeholder="value" />
              <button style={cf.removeBtn} onClick={() => removeEnv(i)}>✕</button>
            </div>
          ))}
          <button style={cf.addBtn} onClick={addEnv}>+ {l.addEnv}</button>

          <div style={{...cf.sectionTitle, marginTop:'20px'}}>{l.command}</div>
          <input style={cf.input} value={form.cmd} onChange={e => set('cmd', e.target.value)} placeholder={l.commandHint} />
        </div>
      )}

      {/* Step 2 — Storage */}
      {step === 2 && (
        <div style={cf.body}>
          <div style={cf.sectionTitle}>{l.volumes}</div>
          <div style={cf.hint}>{l.volumesHint}</div>
          {form.volumes.map((v, i) => (
            <div key={i} style={cf.row}>
              <input style={{...cf.input, flex:2}} value={v.host} onChange={e => updateVol(i,'host',e.target.value)} placeholder="/host/path" />
              <span style={cf.arrow}>:</span>
              <input style={{...cf.input, flex:2}} value={v.container} onChange={e => updateVol(i,'container',e.target.value)} placeholder="/container/path" />
              <label style={cf.checkLabel}>
                <input type="checkbox" checked={v.readonly} onChange={e => updateVol(i,'readonly',e.target.checked)} />
                <span style={{fontSize:'0.75em', color:'var(--text-muted)'}}>ro</span>
              </label>
              <button style={cf.removeBtn} onClick={() => removeVol(i)}>✕</button>
            </div>
          ))}
          <button style={cf.addBtn} onClick={addVol}>+ {l.addVolume}</button>

          <div style={{...cf.sectionTitle, marginTop:'20px'}}>{l.restart}</div>
          <div style={cf.radioGroup}>
            {['unless-stopped','always','on-failure','no'].map(r => (
              <label key={r} style={cf.radioLabel}>
                <input type="radio" name="restart" checked={form.restart === r} onChange={() => set('restart', r)} />
                <span style={{fontSize:'0.85em', color: form.restart===r ? 'var(--text-primary)' : 'var(--text-secondary)'}}>{r}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Step 3 — Network */}
      {step === 3 && (
        <div style={cf.body}>
          <div style={cf.sectionTitle}>{l.network}</div>
          <div style={cf.radioGroup}>
            {['bridge','host','none'].map(n => (
              <label key={n} style={cf.radioLabel}>
                <input type="radio" name="network" checked={form.network === n} onChange={() => set('network', n)} />
                <span style={{fontSize:'0.85em', color: form.network===n ? 'var(--text-primary)' : 'var(--text-secondary)'}}>{n}</span>
              </label>
            ))}
          </div>
          <div style={cf.fieldGroup}>
            <label style={cf.label}>{l.customNetwork}</label>
            <input style={cf.input} value={['bridge','host','none'].includes(form.network) ? '' : form.network}
              onChange={e => set('network', e.target.value)} placeholder={l.customNetworkHint} />
          </div>
        </div>
      )}

      {/* Step 4 — Review */}
      {step === 4 && (
        <div style={cf.body}>
          <div style={cf.reviewGrid}>
            {[
              [l.image,       `${form.image}:${form.tag}`],
              [l.containerName, form.name || '(auto)'],
              [l.restart,     form.restart],
              [l.network,     form.network],
            ].map(([k,v]) => (
              <div key={k} style={cf.reviewRow}>
                <span style={cf.reviewKey}>{k}</span>
                <span style={cf.reviewVal}>{v}</span>
              </div>
            ))}
            {form.ports.filter(p=>p.host).length > 0 && (
              <div style={cf.reviewRow}>
                <span style={cf.reviewKey}>{l.ports}</span>
                <span style={cf.reviewVal}>{form.ports.filter(p=>p.host).map(p=>`${p.host}:${p.container}`).join(', ')}</span>
              </div>
            )}
            {form.envVars.filter(e=>e.key).length > 0 && (
              <div style={cf.reviewRow}>
                <span style={cf.reviewKey}>{l.envVars}</span>
                <span style={cf.reviewVal}>{form.envVars.filter(e=>e.key).map(e=>e.key).join(', ')}</span>
              </div>
            )}
            {form.volumes.filter(v=>v.host).length > 0 && (
              <div style={cf.reviewRow}>
                <span style={cf.reviewKey}>{l.volumes}</span>
                <span style={cf.reviewVal}>{form.volumes.filter(v=>v.host).map(v=>`${v.host}:${v.container}`).join(', ')}</span>
              </div>
            )}
          </div>
          {error && <div style={cf.error}>⚠ {error}</div>}
        </div>
      )}

      {/* Actions */}
      <div style={cf.actions}>
        <button style={cf.cancelBtn} onClick={onCancel}>{l.cancel}</button>
        <div style={{display:'flex', gap:'8px'}}>
          {step > 0 && <button style={cf.secondaryBtn} onClick={() => setStep(s => s-1)}>← {l.back}</button>}
          {step < STEPS.length - 1
            ? <button style={{...cf.primaryBtn, opacity: step===0 && !form.image ? 0.5 : 1}} disabled={step===0 && !form.image} onClick={() => setStep(s => s+1)}>{l.next} →</button>
            : <button style={{...cf.primaryBtn, opacity: deploying ? 0.7 : 1}} disabled={deploying} onClick={deploy}>
                {deploying ? <span style={{display:'flex',alignItems:'center',gap:'6px'}}><Spinner />{l.deploying}</span> : `🚀 ${l.deploy}`}
              </button>
          }
        </div>
      </div>
    </div>
  );
}

// ── Stack Editor ──────────────────────────────────────────────────────────────
function StackEditor({ stack, onSuccess, onCancel }) {
  const { t } = useLang();
  const l = t.deploy;

  const isEdit = !!stack;
  const [name, setName]       = useState(stack?.name || '');
  const [content, setContent] = useState(stack?.composeContent || COMPOSE_TEMPLATE);
  const [preview, setPreview] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [error, setError]     = useState('');
  const textareaRef           = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = content.substring(0, start) + '  ' + content.substring(end);
      setContent(newVal);
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 2; }, 0);
    }
  };

  const deploy = async () => {
    if (!name.trim()) return setError(l.nameRequired);
    setDeploying(true); setError('');
    try {
      if (isEdit) {
        await axios.put(`/api/stacks/${name}`, { content });
      } else {
        await axios.post('/api/stacks/deploy', { name, content });
      }
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.error || 'Error');
      setDeploying(false);
    }
  };

  return (
    <div style={se.wrap}>
      {!isEdit && (
        <div style={se.nameRow}>
          <label style={se.label}>{l.stackName} *</label>
          <input style={se.nameInput} value={name} onChange={e => setName(e.target.value.replace(/[^a-zA-Z0-9_-]/g,''))} placeholder={l.stackNameHint} autoFocus />
          <span style={se.nameHint}>{l.stackNameRule}</span>
        </div>
      )}

      <div style={se.editorHeader}>
        <span style={se.editorTitle}>docker-compose.yml</span>
        <div style={se.editorTabs}>
          <button style={{...se.editorTab, ...(preview ? {} : se.editorTabActive)}} onClick={() => setPreview(false)}>{l.editor}</button>
          <button style={{...se.editorTab, ...(preview ? se.editorTabActive : {})}} onClick={() => setPreview(true)}>{l.preview}</button>
        </div>
      </div>

      <div style={se.editorWrap}>
        {preview ? (
          <YamlHighlight code={content} />
        ) : (
          <div style={se.textareaWrap}>
            <div style={se.lineNumbers}>
              {content.split('\n').map((_, i) => (
                <div key={i} style={se.lineNum}>{i + 1}</div>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              style={se.textarea}
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
            />
          </div>
        )}
      </div>

      {error && <div style={se.error}>⚠ {error}</div>}

      <div style={se.actions}>
        <button style={se.cancelBtn} onClick={onCancel}>{l.cancel}</button>
        <button style={{...se.deployBtn, opacity: deploying ? 0.7 : 1}} disabled={deploying} onClick={deploy}>
          {deploying
            ? <span style={{display:'flex',alignItems:'center',gap:'6px'}}><Spinner />{l.deploying}</span>
            : `🚀 ${isEdit ? l.update : l.deploy}`
          }
        </button>
      </div>
    </div>
  );
}

// ── Stacks List ───────────────────────────────────────────────────────────────
function StacksList({ onEdit, onRefresh }) {
  const { t } = useLang();
  const l = t.deploy;
  const [stacks, setStacks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  const load = async () => {
    setLoading(true);
    try { const r = await axios.get('/api/stacks'); setStacks(r.data); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const doAction = async (name, action) => {
    setActionId(name + action);
    try {
      if (action === 'delete') {
        if (!window.confirm(`Delete stack "${name}"?`)) return;
        await axios.delete(`/api/stacks/${name}`);
      } else {
        await axios.post(`/api/stacks/${name}/${action}`);
      }
      await load();
      onRefresh();
    } catch (e) { alert(e.response?.data?.error || 'Error'); }
    finally { setActionId(null); }
  };

  if (loading) return <div style={{padding:'40px',textAlign:'center',color:'var(--text-muted)'}}><Spinner /></div>;

  if (stacks.length === 0) return (
    <div style={sl.empty}>
      <div style={sl.emptyIcon}>📦</div>
      <div style={sl.emptyText}>{l.noStacks}</div>
      <div style={sl.emptySub}>{l.noStacksSub}</div>
    </div>
  );

  return (
    <div style={sl.list}>
      {stacks.map(stack => {
        const health = stack.running === stack.total ? 'healthy' : stack.running === 0 ? 'down' : 'degraded';
        const hColor = { healthy:'var(--success)', down:'var(--danger)', degraded:'var(--warning)' }[health];
        return (
          <div key={stack.name} style={sl.card}>
            <div style={sl.cardHeader}>
              <div style={sl.cardLeft}>
                <div style={sl.cardIcon}>⬡</div>
                <div>
                  <div style={sl.cardName}>{stack.name}</div>
                  <div style={sl.cardMeta}>{stack.total} {l.containers} · {stack.running} running</div>
                </div>
              </div>
              <div style={sl.cardRight}>
                <div style={{...sl.healthBadge, color:hColor, background:`${hColor}10`, border:`1px solid ${hColor}30`}}>
                  <span style={{width:'5px',height:'5px',borderRadius:'50%',background:hColor,flexShrink:0,display:'inline-block'}} />
                  {health}
                </div>
              </div>
            </div>
            <div style={sl.cardContainers}>
              {stack.containers.map(c => (
                <div key={c.id} style={sl.containerPill}>
                  <span style={{...sl.stateDot, background: c.state==='running'?'var(--success)':'var(--danger)'}} />
                  <span style={sl.containerName}>{c.service || c.name}</span>
                </div>
              ))}
            </div>
            <div style={sl.cardActions}>
              {stack.hasComposeFile && (
                <>
                  <StackBtn label={`▶ ${l.start}`}  color="var(--success)"    loading={actionId===stack.name+'start'}   onClick={() => doAction(stack.name,'start')} />
                  <StackBtn label={`⏹ ${l.stop}`}   color="var(--danger)"     loading={actionId===stack.name+'stop'}    onClick={() => doAction(stack.name,'stop')} />
                  <StackBtn label={`↺ ${l.restart}`} color="var(--warning)"   loading={actionId===stack.name+'restart'} onClick={() => doAction(stack.name,'restart')} />
                  <StackBtn label={`✏ ${l.edit}`}    color="var(--brand-light)" onClick={() => onEdit(stack)} />
                </>
              )}
              <StackBtn label={`🗑 ${l.delete}`} color="var(--danger)" loading={actionId===stack.name+'delete'} onClick={() => doAction(stack.name,'delete')} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StackBtn({ label, color, onClick, loading }) {
  return (
    <button style={{...sl.actionBtn, color, borderColor: color+'40'}} onClick={onClick} disabled={loading}>
      {loading ? <Spinner size={10} /> : label}
    </button>
  );
}

// ── Main DeployView ───────────────────────────────────────────────────────────
export default function DeployView({ onContainersRefresh }) {
  const { t } = useLang();
  const l = t.deploy;
  const [tab, setTab]         = useState('stacks');
  const [mode, setMode]       = useState(null); // null | 'newContainer' | 'newStack' | 'editStack'
  const [editStack, setEditStack] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSuccess = () => {
    setMode(null);
    setEditStack(null);
    setSuccessMsg(l.successMsg);
    onContainersRefresh?.();
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleEdit = (stack) => {
    setEditStack(stack);
    setMode('editStack');
  };

  return (
    <div>
      {successMsg && (
        <div style={dv.successBanner}>✓ {successMsg}</div>
      )}

      {mode === 'newContainer' && (
        <div style={dv.modal}>
          <div style={dv.modalInner}>
            <div style={dv.modalHeader}>
              <h2 style={dv.modalTitle}>🐳 {l.newContainer}</h2>
              <button style={dv.closeBtn} onClick={() => setMode(null)}>✕</button>
            </div>
            <ContainerForm onSuccess={handleSuccess} onCancel={() => setMode(null)} />
          </div>
        </div>
      )}

      {(mode === 'newStack' || mode === 'editStack') && (
        <div style={dv.modal}>
          <div style={{...dv.modalInner, maxWidth:'860px'}}>
            <div style={dv.modalHeader}>
              <h2 style={dv.modalTitle}>📄 {mode === 'editStack' ? `${l.editStack}: ${editStack?.name}` : l.newStack}</h2>
              <button style={dv.closeBtn} onClick={() => { setMode(null); setEditStack(null); }}>✕</button>
            </div>
            <StackEditor stack={mode === 'editStack' ? editStack : null} onSuccess={handleSuccess} onCancel={() => { setMode(null); setEditStack(null); }} />
          </div>
        </div>
      )}

      <div style={dv.header}>
        <div style={dv.tabBar}>
          <button style={{...dv.tabBtn, ...(tab==='stacks'?dv.tabActive:{})}} onClick={() => setTab('stacks')}>
            ⬡ {l.stacks}
          </button>
        </div>
        <div style={dv.headerActions}>
          <button style={dv.newStackBtn} onClick={() => setMode('newStack')}>
            📄 {l.newStack}
          </button>
          <button style={dv.newContainerBtn} onClick={() => setMode('newContainer')}>
            🐳 {l.newContainer}
          </button>
        </div>
      </div>

      <StacksList onEdit={handleEdit} onRefresh={onContainersRefresh} />
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ size = 12 }) {
  return <div style={{width:size,height:size,border:`2px solid transparent`,borderTop:`2px solid currentColor`,borderRadius:'50%',animation:'spin 0.7s linear infinite',flexShrink:0}} />;
}

// ── Default compose template ──────────────────────────────────────────────────
const COMPOSE_TEMPLATE = `services:
  app:
    image: nginx:latest
    container_name: my-app
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - ./data:/usr/share/nginx/html
    environment:
      - ENV_VAR=value
`;

// ── Styles ────────────────────────────────────────────────────────────────────
const dv = {
  successBanner:{background:'var(--success-bg)',border:'1px solid var(--success-border)',borderRadius:'var(--radius)',padding:'10px 16px',color:'var(--success)',fontSize:'0.88em',fontWeight:500,marginBottom:'16px'},
  header:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px',flexWrap:'wrap',gap:'10px'},
  tabBar:{display:'flex',gap:'4px'},
  tabBtn:{padding:'7px 16px',background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',color:'var(--text-muted)',fontFamily:'var(--font-sans)',fontSize:'0.85em',fontWeight:500,cursor:'pointer'},
  tabActive:{background:'var(--bg-elevated)',color:'var(--text-primary)',borderColor:'var(--border-hi)'},
  headerActions:{display:'flex',gap:'8px'},
  newContainerBtn:{padding:'8px 16px',background:'var(--brand)',border:'none',borderRadius:'var(--radius)',color:'white',fontFamily:'var(--font-sans)',fontSize:'0.85em',fontWeight:600,cursor:'pointer'},
  newStackBtn:{padding:'8px 16px',background:'var(--brand-glow)',border:'1px solid var(--border-focus)',borderRadius:'var(--radius)',color:'var(--brand-light)',fontFamily:'var(--font-sans)',fontSize:'0.85em',fontWeight:600,cursor:'pointer'},
  modal:{position:'fixed',inset:0,background:'#00000080',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:'20px'},
  modalInner:{background:'var(--bg-surface)',border:'1px solid var(--border-hi)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:'640px',maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden'},
  modalHeader:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 20px',borderBottom:'1px solid var(--border)',flexShrink:0},
  modalTitle:{fontSize:'1em',fontWeight:700,margin:0},
  closeBtn:{background:'transparent',border:'none',color:'var(--text-muted)',fontSize:'1.1em',cursor:'pointer',padding:'4px 8px'},
};

const cf = {
  wrap:{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'},
  steps:{display:'flex',alignItems:'center',padding:'20px 24px',gap:'0',borderBottom:'1px solid var(--border)',overflowX:'auto',flexShrink:0},
  stepItem:{display:'flex',alignItems:'center',gap:'8px',flexShrink:0},
  stepDot:{width:'26px',height:'26px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.75em',fontWeight:700,flexShrink:0,transition:'all 0.2s'},
  stepLabel:{fontSize:'0.78em',whiteSpace:'nowrap'},
  stepLine:{height:'2px',width:'24px',flexShrink:0},
  body:{padding:'24px',overflowY:'auto',flex:1},
  fieldGroup:{marginBottom:'16px'},
  label:{display:'block',fontSize:'0.8em',fontWeight:500,color:'var(--text-secondary)',marginBottom:'6px'},
  input:{width:'100%',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'9px 12px',color:'var(--text-primary)',fontFamily:'var(--font-sans)',fontSize:'0.88em',outline:'none',boxSizing:'border-box'},
  hint:{fontSize:'0.72em',color:'var(--text-muted)',marginTop:'4px'},
  sectionTitle:{fontSize:'0.78em',fontWeight:600,letterSpacing:'0.08em',color:'var(--text-muted)',marginBottom:'8px'},
  row:{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'},
  arrow:{color:'var(--text-muted)',fontSize:'0.9em',flexShrink:0},
  removeBtn:{background:'transparent',border:'1px solid var(--danger-border)',borderRadius:'var(--radius-sm)',color:'var(--danger)',cursor:'pointer',padding:'4px 8px',fontSize:'0.8em',flexShrink:0},
  addBtn:{background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'var(--radius)',color:'var(--text-secondary)',fontFamily:'var(--font-sans)',fontSize:'0.78em',cursor:'pointer',padding:'5px 12px'},
  checkLabel:{display:'flex',alignItems:'center',gap:'4px',cursor:'pointer',flexShrink:0},
  radioGroup:{display:'flex',flexDirection:'column',gap:'8px',marginBottom:'16px'},
  radioLabel:{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer'},
  reviewGrid:{background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'var(--radius)',overflow:'hidden'},
  reviewRow:{display:'flex',padding:'10px 14px',borderBottom:'1px solid var(--border)'},
  reviewKey:{fontSize:'0.82em',fontWeight:500,color:'var(--text-muted)',width:'120px',flexShrink:0},
  reviewVal:{fontSize:'0.82em',color:'var(--text-primary)',fontFamily:'var(--font-mono)'},
  error:{background:'var(--danger-bg)',border:'1px solid var(--danger-border)',borderRadius:'var(--radius)',padding:'10px 14px',color:'var(--danger)',fontSize:'0.82em',marginTop:'12px'},
  actions:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 24px',borderTop:'1px solid var(--border)',flexShrink:0},
  cancelBtn:{padding:'8px 16px',background:'transparent',border:'1px solid var(--border)',borderRadius:'var(--radius)',color:'var(--text-secondary)',fontFamily:'var(--font-sans)',fontSize:'0.85em',cursor:'pointer'},
  secondaryBtn:{padding:'8px 16px',background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'var(--radius)',color:'var(--text-primary)',fontFamily:'var(--font-sans)',fontSize:'0.85em',cursor:'pointer'},
  primaryBtn:{padding:'8px 20px',background:'var(--brand)',border:'none',borderRadius:'var(--radius)',color:'white',fontFamily:'var(--font-sans)',fontSize:'0.85em',fontWeight:600,cursor:'pointer'},
};

const se = {
  wrap:{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'},
  nameRow:{display:'flex',alignItems:'center',gap:'12px',padding:'16px 20px',borderBottom:'1px solid var(--border)',flexShrink:0,flexWrap:'wrap'},
  label:{fontSize:'0.82em',fontWeight:500,color:'var(--text-secondary)',whiteSpace:'nowrap'},
  nameInput:{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'7px 12px',color:'var(--text-primary)',fontFamily:'var(--font-sans)',fontSize:'0.88em',outline:'none',width:'200px'},
  nameHint:{fontSize:'0.72em',color:'var(--text-muted)'},
  editorHeader:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 20px',background:'var(--bg-elevated)',borderBottom:'1px solid var(--border)',flexShrink:0},
  editorTitle:{fontSize:'0.82em',fontFamily:'var(--font-mono)',color:'var(--text-muted)'},
  editorTabs:{display:'flex',gap:'4px',background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'2px'},
  editorTab:{padding:'4px 12px',background:'transparent',border:'none',borderRadius:'var(--radius-sm)',color:'var(--text-muted)',fontFamily:'var(--font-sans)',fontSize:'0.78em',cursor:'pointer'},
  editorTabActive:{background:'var(--bg-elevated)',color:'var(--text-primary)'},
  editorWrap:{flex:1,overflow:'auto',background:'var(--bg)',minHeight:'320px',maxHeight:'440px'},
  textareaWrap:{display:'flex',height:'100%',minHeight:'320px'},
  lineNumbers:{background:'var(--bg-elevated)',borderRight:'1px solid var(--border)',padding:'14px 10px',textAlign:'right',userSelect:'none',flexShrink:0},
  lineNum:{fontFamily:'var(--font-mono)',fontSize:'0.78em',color:'var(--text-muted)',lineHeight:1.7},
  textarea:{flex:1,background:'transparent',border:'none',outline:'none',padding:'14px',fontFamily:'var(--font-mono)',fontSize:'0.82em',color:'var(--text-primary)',lineHeight:1.7,resize:'none',minHeight:'320px'},
  error:{background:'var(--danger-bg)',border:'1px solid var(--danger-border)',borderRadius:'var(--radius)',padding:'10px 14px',color:'var(--danger)',fontSize:'0.82em',margin:'12px 20px'},
  actions:{display:'flex',justifyContent:'flex-end',gap:'8px',padding:'14px 20px',borderTop:'1px solid var(--border)',flexShrink:0},
  cancelBtn:{padding:'8px 16px',background:'transparent',border:'1px solid var(--border)',borderRadius:'var(--radius)',color:'var(--text-secondary)',fontFamily:'var(--font-sans)',fontSize:'0.85em',cursor:'pointer'},
  deployBtn:{padding:'8px 20px',background:'var(--brand)',border:'none',borderRadius:'var(--radius)',color:'white',fontFamily:'var(--font-sans)',fontSize:'0.85em',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'},
};

const sl = {
  list:{display:'flex',flexDirection:'column',gap:'12px'},
  card:{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden'},
  cardHeader:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 18px',borderBottom:'1px solid var(--border)'},
  cardLeft:{display:'flex',alignItems:'center',gap:'12px'},
  cardIcon:{width:'30px',height:'30px',background:'var(--brand-glow)',border:'1px solid var(--border-focus)',borderRadius:'7px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.85em',color:'var(--brand-light)',flexShrink:0},
  cardName:{fontWeight:600,fontSize:'0.92em',marginBottom:'2px'},
  cardMeta:{fontSize:'0.72em',color:'var(--text-muted)'},
  cardRight:{display:'flex',alignItems:'center',gap:'8px'},
  healthBadge:{display:'flex',alignItems:'center',gap:'5px',fontSize:'0.72em',fontWeight:600,padding:'3px 10px',borderRadius:'20px'},
  cardContainers:{display:'flex',gap:'6px',flexWrap:'wrap',padding:'10px 18px',borderBottom:'1px solid var(--border)'},
  containerPill:{display:'flex',alignItems:'center',gap:'5px',background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'20px',padding:'2px 10px'},
  stateDot:{width:'5px',height:'5px',borderRadius:'50%',flexShrink:0},
  containerName:{fontSize:'0.75em',color:'var(--text-secondary)'},
  cardActions:{display:'flex',gap:'6px',padding:'10px 18px',flexWrap:'wrap'},
  actionBtn:{padding:'4px 10px',background:'transparent',border:'1px solid',borderRadius:'var(--radius-sm)',fontFamily:'var(--font-sans)',fontSize:'0.75em',fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',gap:'4px'},
  empty:{display:'flex',flexDirection:'column',alignItems:'center',padding:'60px',gap:'8px'},
  emptyIcon:{fontSize:'2.5em',marginBottom:'8px'},
  emptyText:{fontWeight:600,color:'var(--text-secondary)',fontSize:'0.95em'},
  emptySub:{fontSize:'0.82em',color:'var(--text-muted)'},
};
