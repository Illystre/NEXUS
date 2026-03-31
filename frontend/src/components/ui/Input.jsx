import React from 'react';

const CSS = `
  .nx-input-wrap { display: flex; flex-direction: column; gap: 6px; }

  .nx-input-label {
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .nx-input {
    width: 100%;
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: 10px 14px;
    font-size: var(--text-base);
    font-family: var(--font-sans);
    color: var(--text-primary);
    outline: none;
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    box-sizing: border-box;
  }

  .nx-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-dim);
  }

  .nx-input::placeholder { color: var(--text-disabled); }

  .nx-input.error {
    border-color: var(--color-danger);
  }
  .nx-input.error:focus {
    box-shadow: 0 0 0 3px rgba(239,68,68,0.12);
  }

  .nx-input-error {
    font-size: var(--text-xs);
    color: var(--color-danger);
  }
`;

export default function Input({
  label,
  error,
  className = '',
  style,
  ...props
}) {
  return (
    <>
      <style>{CSS}</style>
      <div className="nx-input-wrap" style={style}>
        {label && <label className="nx-input-label">{label}</label>}
        <input
          className={`nx-input${error ? ' error' : ''} ${className}`}
          {...props}
        />
        {error && <span className="nx-input-error">{error}</span>}
      </div>
    </>
  );
}
