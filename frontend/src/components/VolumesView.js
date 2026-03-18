import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useLang } from './LanguageContext';

export default function VolumesView({ hostParam, isViewer }) {
  const { t } = useLang();
  const tr = t.volumesView;

  const [volumes, setVolumes]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [inspecting, setInspecting] = useState(null);
  const [deleting, setDeleting]     = useState(null);
  const [form, setForm]             = useState({ name:'', driver:'local' });
  const [creating, setCreating]     = useState(false);
  const [error, setError]           = useState('');

  const load = useCallback(async () => {
    try {
      const r = await axios.get(`/api/volumes${hostParam}`);
      setVolumes(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [hostParam]);

  useEffect(() => { load(); }, [load]);

  const filtered = volumes.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.driver.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!form.name.trim()) { setError(tr.nameRequired); return; }
    setCreating(true); setError('');
    try {
      await axios.post(`/api/volumes${hostParam}`, form);
      setShowCreate(false);
      setForm({ name:'', driver:'local' });
      load();
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setCreating(false); }
  };

  const handleDelete = async (name) => {
    try {
      await axios.delete(`/api/volumes/${encodeURIComponent(name)}${hostParam}`);
      setDeleting(null);
      load();
    } catch (e) { alert(e.response?.data?.error || e.message); }
  };

  const handleInspect = async (name) => {
    try {
      const r = await axios.get(`/api/volumes/${encodeURIComponent(name)}/inspect${hostParam}`);
      setInspecting(r.data);
    } catch (e) { alert(e.response?.data?.error || e.message); }
  };

  const formatDate = (str) => {
    if (!str) return '—';
    try { return new Date(str).toLocaleString(); } catch { return str; }
  };

  if (loading) return <Loader />;

  return (
    <div style={s.wrap}>
      {/* Header */}
      <div style={s.header}>
        <input
          style={s.search}
          placeholder={tr.search}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {!isViewer && (
          <button style={s.createBtn} onClick={() => setShowCreate(true)}>
            + {tr.create}
          </button>
        )}
      </div>

      {/* Table */}
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              {[tr.name, tr.driver, tr.scope, tr.mountpoint, tr.created, ''].map((h, i) => (
                <th key={i} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={s.empty}>{tr.noVolumes}</td></tr>
            ) : filtered.map(vol => (
              <tr key={vol.name} style={s.tr}>
                <td style={s.td}>
                  <div style={s.nameWrap}>
                    <span style={s.volIcon}>⬢</span>
                    <span style={s.volName}>{vol.name}</span>
                  </div>
                </td>
                <td style={s.td}><code style={s.code}>{vol.driver}</code></td>
                <td style={s.td}><span style={s.muted}>{vol.scope || 'local'}</span></td>
                <td style={s.td}>
                  <span style={s.mountpoint} title={vol.mountpoint}>
                    {vol.mountpoint ? vol.mountpoint.length > 40
                      ? '…' + vol.mountpoint.slice(-38)
                      : vol.mountpoint
                    : '—'}
                  </span>
                </td>
                <td style={s.td}><span style={s.muted}>{formatDate(vol.created)}</span></td>
                <td style={s.td}>
                  <div style={s.actions}>
                    <button style={s.actionBtn} onClick={() => handleInspect(vol.name)}>
                      {tr.inspect}
                    </button>
                    {!isViewer && (
                      <button
                        style={{...s.actionBtn, ...s.actionDanger}}
                        onClick={() => setDeleting(vol)}
                      >
                        {tr.delete}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {showCreate && (
        <Modal onClose={() => { setShowCreate(false); setError(''); }}>
          <h3 style={s.modalTitle}>{tr.createTitle}</h3>
          <div style={s.formGrid}>
            <label style={s.label}>{tr.volumeName}</label>
            <input style={s.input} placeholder={tr.volumeNameHint}
              value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />

            <label style={s.label}>{tr.driverLabel}</label>
            <select style={s.input} value={form.driver}
              onChange={e => setForm(f => ({...f, driver: e.target.value}))}>
              <option value="local">local</option>
              <option value="nfs">nfs</option>
              <option value="tmpfs">tmpfs</option>
            </select>
          </div>
          {error && <div style={s.errorMsg}>{error}</div>}
          <div style={s.modalActions}>
            <button style={s.cancelBtn} onClick={() => { setShowCreate(false); setError(''); }}>{tr.cancel}</button>
            <button style={s.createBtn} onClick={handleCreate} disabled={creating}>
              {creating ? tr.creating : tr.createBtn}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleting && (
        <Modal onClose={() => setDeleting(null)}>
          <h3 style={s.modalTitle}>{tr.deleteConfirm}</h3>
          <p style={{color:'var(--text-secondary)',fontSize:'0.9em',margin:'8px 0 20px'}}>
            {tr.deleteMsg(deleting.name)}
          </p>
          <div style={s.modalActions}>
            <button style={s.cancelBtn} onClick={() => setDeleting(null)}>{tr.cancel}</button>
            <button style={{...s.createBtn,...s.actionDanger}}
              onClick={() => handleDelete(deleting.name)}>
              {tr.delete}
            </button>
          </div>
        </Modal>
      )}

      {/* Inspect modal */}
      {inspecting && (
        <Modal onClose={() => setInspecting(null)} wide>
          <h3 style={s.modalTitle}>{tr.inspect} — {inspecting.Name}</h3>
          <pre style={s.pre}>{JSON.stringify(inspecting, null, 2)}</pre>
          <div style={s.modalActions}>
            <button style={s.cancelBtn} onClick={() => setInspecting(null)}>{tr.cancel}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose, wide }) {
  return (
    <div style={m.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{...m.box, ...(wide ? m.wide : {})}}>
        {children}
      </div>
    </div>
  );
}

function Loader() {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'300px'}}>
      <div style={{width:'22px',height:'22px',border:'2px solid var(--border)',borderTop:'2px solid var(--brand)',borderRadius:'50%',animation:'spin 0.7s linear infinite'}} />
    </div>
  );
}

const s = {
  wrap: { display:'flex', flexDirection:'column', gap:'16px' },
  header: { display:'flex', gap:'12px', alignItems:'center' },
  search: { flex:1, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', color:'var(--text-primary)', fontFamily:'var(--font-sans)', fontSize:'0.875em', padding:'8px 12px', outline:'none' },
  createBtn: { background:'var(--brand)', color:'white', border:'none', borderRadius:'var(--radius)', padding:'8px 16px', fontFamily:'var(--font-sans)', fontSize:'0.875em', fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' },
  tableWrap: { background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'auto' },
  table: { width:'100%', borderCollapse:'collapse' },
  th: { padding:'10px 14px', textAlign:'left', fontSize:'0.72em', fontWeight:600, letterSpacing:'0.08em', color:'var(--text-muted)', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' },
  tr: { borderBottom:'1px solid var(--border)', transition:'background 0.1s' },
  td: { padding:'11px 14px', fontSize:'0.875em', verticalAlign:'middle' },
  nameWrap: { display:'flex', alignItems:'center', gap:'8px' },
  volIcon: { color:'var(--brand)', fontSize:'1em', flexShrink:0 },
  volName: { fontWeight:500, color:'var(--text-primary)', wordBreak:'break-all' },
  code: { fontFamily:'var(--font-mono)', fontSize:'0.85em', color:'var(--text-secondary)' },
  muted: { color:'var(--text-muted)', fontSize:'0.875em' },
  mountpoint: { fontFamily:'var(--font-mono)', fontSize:'0.78em', color:'var(--text-muted)' },
  actions: { display:'flex', gap:'6px' },
  actionBtn: { background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', color:'var(--text-secondary)', fontFamily:'var(--font-sans)', fontSize:'0.78em', padding:'4px 10px', cursor:'pointer' },
  actionDanger: { color:'var(--danger)', borderColor:'var(--danger)' },
  empty: { textAlign:'center', color:'var(--text-muted)', padding:'40px', fontSize:'0.875em' },
  formGrid: { display:'flex', flexDirection:'column', gap:'10px', margin:'16px 0' },
  label: { fontSize:'0.8em', color:'var(--text-secondary)', fontWeight:500 },
  input: { background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius)', color:'var(--text-primary)', fontFamily:'var(--font-sans)', fontSize:'0.875em', padding:'8px 10px', outline:'none' },
  errorMsg: { color:'var(--danger)', fontSize:'0.82em', marginBottom:'8px' },
  modalActions: { display:'flex', gap:'8px', justifyContent:'flex-end', marginTop:'16px' },
  cancelBtn: { background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius)', color:'var(--text-secondary)', fontFamily:'var(--font-sans)', fontSize:'0.875em', padding:'8px 14px', cursor:'pointer' },
  modalTitle: { margin:'0 0 4px', fontSize:'1em', fontWeight:600 },
  pre: { background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'12px', fontSize:'0.78em', fontFamily:'var(--font-mono)', color:'var(--text-secondary)', maxHeight:'400px', overflow:'auto', margin:'12px 0 0' },
};

const m = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' },
  box: { background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'24px', width:'100%', maxWidth:'440px', maxHeight:'90vh', overflow:'auto' },
  wide: { maxWidth:'700px' },
};
