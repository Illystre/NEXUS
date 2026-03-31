import React from 'react';

const CSS = `
  .nx-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    padding: 20px;
    transition: border-color var(--transition-base);
  }

  .nx-card:hover {
    border-color: var(--border-default);
  }

  /* Stat card variant */
  .nx-stat-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    padding: 20px 24px;
    position: relative;
    overflow: hidden;
    transition: border-color var(--transition-base);
  }

  .nx-stat-card:hover {
    border-color: var(--border-default);
  }

  .nx-stat-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: var(--accent);
    opacity: 0.6;
  }

  .nx-stat-value {
    font-size: var(--text-2xl);
    font-weight: var(--weight-semibold);
    color: var(--text-primary);
    line-height: 1;
    margin-bottom: 6px;
  }

  .nx-stat-label {
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
`;

export function Card({ children, className = '', style }) {
  return (
    <>
      <style>{CSS}</style>
      <div className={`nx-card ${className}`} style={style}>
        {children}
      </div>
    </>
  );
}

export function StatCard({ value, label, valueColor, accentColor }) {
  return (
    <>
      <style>{CSS}</style>
      <div
        className="nx-stat-card"
        style={accentColor ? { '--accent': accentColor } : undefined}
      >
        <div className="nx-stat-value" style={valueColor ? { color: valueColor } : undefined}>
          {value}
        </div>
        <div className="nx-stat-label">{label}</div>
      </div>
    </>
  );
}

export default Card;
