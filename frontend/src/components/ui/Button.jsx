import React from 'react';

const CSS = `
  .nx-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: none;
    cursor: pointer;
    font-family: var(--font-sans);
    font-weight: var(--weight-medium);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
    white-space: nowrap;
    position: relative;
    text-decoration: none;
  }

  .nx-btn:disabled { opacity: 0.55; cursor: not-allowed; pointer-events: none; }

  /* Sizes */
  .nx-btn-sm { font-size: var(--text-xs);  padding: 5px 12px;  }
  .nx-btn-md { font-size: var(--text-sm);  padding: 8px 16px;  }

  /* Primary */
  .nx-btn-primary {
    background: var(--accent);
    color: #000;
    font-weight: var(--weight-semibold);
  }
  .nx-btn-primary:hover:not(:disabled) {
    filter: brightness(1.1);
    box-shadow: var(--shadow-accent);
  }

  /* Secondary */
  .nx-btn-secondary {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border: 1px solid var(--border-default);
  }
  .nx-btn-secondary:hover:not(:disabled) {
    background: var(--bg-overlay);
    border-color: var(--border-strong);
  }

  /* Ghost */
  .nx-btn-ghost {
    background: transparent;
    color: var(--text-secondary);
    padding: 6px;
  }
  .nx-btn-ghost:hover:not(:disabled) {
    background: var(--bg-overlay);
    color: var(--text-primary);
  }

  /* Danger */
  .nx-btn-danger {
    background: rgba(239,68,68,0.12);
    color: var(--color-danger);
    border: 1px solid rgba(239,68,68,0.20);
  }
  .nx-btn-danger:hover:not(:disabled) {
    background: rgba(239,68,68,0.20);
    border-color: rgba(239,68,68,0.35);
  }

  /* Spinner */
  .nx-btn-spinner {
    width: 12px;
    height: 12px;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }
`;

export default function Button({
  children,
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  style,
  className = '',
  title,
}) {
  return (
    <>
      <style>{CSS}</style>
      <button
        type={type}
        className={`nx-btn nx-btn-${variant} nx-btn-${size} ${className}`}
        disabled={disabled || loading}
        onClick={onClick}
        style={style}
        title={title}
      >
        {loading && <span className="nx-btn-spinner" />}
        {children}
      </button>
    </>
  );
}
