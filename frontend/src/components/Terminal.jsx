import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../AuthContext';

export default function Terminal({ container, onClose }) {
  const { token } = useAuth();
  const [lines, setLines] = useState([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState('connecting');
  const [history, setHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const socketRef = useRef(null);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  const addLine = useCallback((text, type = 'output') => {
    setLines(prev => [...prev.slice(-800), { text, type, id: Date.now() + Math.random() }]);
  }, []);

  useEffect(() => {
    const socket = io('', { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('connecting');
      socket.emit('exec:start', { containerId: container.id });
    });

    socket.on('exec:ready', () => {
      setConnected(true);
      setStatus('connected');
      addLine(`Conectado a ${container.name}`, 'info');
      addLine(`Escribe 'exit' para cerrar la sesión`, 'info');
      addLine('', 'spacer');
      setTimeout(() => inputRef.current?.focus(), 100);
    });

    socket.on('exec:output', ({ data }) => {
      // Split by newlines and add each line
      const parts = data.split(/\r?\n/);
      parts.forEach((p, i) => {
        if (i === parts.length - 1 && p === '') return;
        addLine(p, 'output');
      });
    });

    socket.on('exec:exit', () => {
      setConnected(false);
      setStatus('disconnected');
      addLine('', 'spacer');
      addLine('Sesión terminada.', 'info');
    });

    socket.on('exec:error', ({ error }) => {
      setStatus('error');
      addLine(`Error: ${error}`, 'error');
    });

    socket.on('disconnect', () => {
      setConnected(false);
      setStatus('disconnected');
    });

    return () => {
      socket.emit('exec:stop', { containerId: container.id });
      socket.disconnect();
    };
  }, [container.id, container.name, token, addLine]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const sendCommand = () => {
    if (!input.trim() || !connected) return;
    const cmd = input.trim();
    addLine(`$ ${cmd}`, 'command');
    socketRef.current?.emit('exec:input', { containerId: container.id, data: cmd + '\n' });
    setHistory(prev => [cmd, ...prev.slice(0, 49)]);
    setHistIdx(-1);
    setInput('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') { sendCommand(); return; }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(idx);
      setInput(history[idx] || '');
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const idx = Math.max(histIdx - 1, -1);
      setHistIdx(idx);
      setInput(idx === -1 ? '' : history[idx] || '');
    }
    if (e.key === 'c' && e.ctrlKey) {
      socketRef.current?.emit('exec:input', { containerId: container.id, data: '\x03' });
      setInput('');
    }
  };

  const statusInfo = {
    connecting:   { color: 'var(--warning)', label: 'Conectando...' },
    connected:    { color: 'var(--success)', label: 'Conectado' },
    disconnected: { color: 'var(--text-muted)', label: 'Desconectado' },
    error:        { color: 'var(--danger)', label: 'Error' },
  }[status];

  const lineColor = { output: 'var(--text-secondary)', command: 'var(--success)', info: 'var(--brand-light)', error: 'var(--danger)', spacer: 'transparent' };

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.termIcon}>⌨</div>
            <div>
              <div style={s.title}>Terminal — <span style={{color:'var(--brand-light)'}}>{container.name}</span></div>
              <div style={s.subtitle}>{container.image}</div>
            </div>
          </div>
          <div style={s.headerRight}>
            <div style={s.statusBadge}>
              <div style={{...s.statusDot, background: statusInfo.color}} />
              <span style={{color: statusInfo.color, fontSize:'0.78em'}}>{statusInfo.label}</span>
            </div>
            <button style={s.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Terminal body */}
        <div style={s.body} onClick={() => inputRef.current?.focus()}>
          <div style={s.output}>
            {lines.map(line => (
              <div key={line.id} style={{...s.line, color: lineColor[line.type] || 'var(--text-secondary)'}}>
                {line.text || '\u00a0'}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={s.inputRow}>
            <span style={s.prompt}>
              {connected ? <span style={{color:'var(--success)'}}>❯</span> : <span style={{color:'var(--text-muted)'}}>○</span>}
            </span>
            <input
              ref={inputRef}
              style={s.input}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={!connected}
              placeholder={connected ? 'Escribe un comando...' : 'Esperando conexión...'}
              spellCheck={false}
              autoComplete="off"
            />
            <button style={{...s.sendBtn, opacity: connected ? 1 : 0.4}} onClick={sendCommand} disabled={!connected}>
              ↵
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <span style={s.hint}>↑↓ historial de comandos</span>
          <span style={s.hint}>Ctrl+C interrupción</span>
          <span style={s.hint}>Esc / clic fuera para cerrar</span>
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)',
    display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000,
  },
  modal: {
    width:'800px', maxWidth:'95vw', height:'560px',
    background:'var(--bg)', border:'1px solid var(--border-hi)',
    borderRadius:'var(--radius-lg)', display:'flex', flexDirection:'column',
    overflow:'hidden', boxShadow:'0 24px 64px #000000a0',
  },
  header: {
    display:'flex', justifyContent:'space-between', alignItems:'center',
    padding:'14px 18px', borderBottom:'1px solid var(--border)',
    background:'var(--bg-surface)', flexShrink:0,
  },
  headerLeft: { display:'flex', alignItems:'center', gap:'12px' },
  termIcon: { fontSize:'1.3em', color:'var(--brand-light)' },
  title: { fontSize:'0.9em', fontWeight:600, color:'var(--text-primary)' },
  subtitle: { fontSize:'0.72em', color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginTop:'1px' },
  headerRight: { display:'flex', alignItems:'center', gap:'12px' },
  statusBadge: { display:'flex', alignItems:'center', gap:'6px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'20px', padding:'4px 10px' },
  statusDot: { width:'6px', height:'6px', borderRadius:'50%' },
  closeBtn: {
    background:'transparent', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)',
    color:'var(--text-muted)', cursor:'pointer', padding:'5px 10px', fontSize:'0.85em',
    transition:'all 0.15s',
  },
  body: {
    flex:1, display:'flex', flexDirection:'column', overflow:'hidden',
    background:'var(--bg)', cursor:'text',
  },
  output: {
    flex:1, overflow:'auto', padding:'14px 18px 8px',
    fontFamily:'var(--font-mono)',
  },
  line: {
    fontSize:'0.82em', lineHeight:1.65, whiteSpace:'pre-wrap',
    wordBreak:'break-all', minHeight:'1.65em',
  },
  inputRow: {
    display:'flex', alignItems:'center', gap:'8px',
    padding:'10px 18px', borderTop:'1px solid var(--border)',
    background:'var(--bg-surface)', flexShrink:0,
  },
  prompt: { fontSize:'1.1em', flexShrink:0 },
  input: {
    flex:1, background:'transparent', border:'none', outline:'none',
    color:'var(--success)', fontFamily:'var(--font-mono)', fontSize:'0.88em',
    caretColor:'var(--success)',
  },
  sendBtn: {
    background:'var(--bg-elevated)', border:'1px solid var(--border)',
    borderRadius:'var(--radius-sm)', color:'var(--text-secondary)',
    cursor:'pointer', padding:'4px 10px', fontSize:'0.9em', transition:'all 0.15s',
  },
  footer: {
    display:'flex', gap:'20px', padding:'7px 18px',
    background:'var(--bg-surface)', borderTop:'1px solid var(--border)',
    flexShrink:0,
  },
  hint: { fontSize:'0.68em', color:'var(--text-muted)', letterSpacing:'0.04em' },
};
