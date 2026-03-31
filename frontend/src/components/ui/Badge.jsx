import React from 'react';

const CSS = `
  .nx-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border-radius: 20px;
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    text-transform: capitalize;
    white-space: nowrap;
  }

  .nx-badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* Status variants */
  .nx-badge-running {
    background: rgba(0,200,150,0.12);
    color: #00c896;
  }
  .nx-badge-running .nx-badge-dot {
    background: #00c896;
    box-shadow: 0 0 6px rgba(0,200,150,0.5);
    animation: pulse 2s ease-in-out infinite;
  }

  .nx-badge-stopped {
    background: rgba(239,68,68,0.12);
    color: #ef4444;
  }
  .nx-badge-stopped .nx-badge-dot { background: #ef4444; }

  .nx-badge-paused {
    background: rgba(240,165,0,0.12);
    color: #F0A500;
  }
  .nx-badge-paused .nx-badge-dot { background: #F0A500; }

  .nx-badge-exited {
    background: rgba(85,85,106,0.15);
    color: var(--text-secondary);
  }
  .nx-badge-exited .nx-badge-dot { background: var(--text-muted); }

  /* Info variants */
  .nx-badge-info {
    background: rgba(59,130,246,0.12);
    color: #3b82f6;
  }
  .nx-badge-info .nx-badge-dot { background: #3b82f6; }

  .nx-badge-warning {
    background: rgba(240,165,0,0.12);
    color: #F0A500;
  }
  .nx-badge-warning .nx-badge-dot { background: #F0A500; }
`;

export default function Badge({ variant = 'info', children, showDot = true, className = '' }) {
  return (
    <>
      <style>{CSS}</style>
      <span className={`nx-badge nx-badge-${variant} ${className}`}>
        {showDot && <span className="nx-badge-dot" />}
        {children}
      </span>
    </>
  );
}
