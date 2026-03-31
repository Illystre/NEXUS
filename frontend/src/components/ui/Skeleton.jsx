import React from 'react';

/**
 * Skeleton loader rectangle.
 *
 * @param {string|number} width       - CSS width (default '100%')
 * @param {string|number} height      - CSS height (default 16)
 * @param {string}        borderRadius- CSS border-radius override
 * @param {object}        style       - Additional inline styles
 */
export default function Skeleton({ width = '100%', height = 16, borderRadius, style }) {
  return (
    <div
      className="skeleton"
      style={{
        width,
        height,
        borderRadius: borderRadius || 'var(--radius-sm)',
        ...style,
      }}
    />
  );
}

/**
 * Skeleton row — horizontal group of skeleton blocks.
 */
export function SkeletonRow({ children, gap = 12, style }) {
  return (
    <div style={{ display: 'flex', gap, alignItems: 'center', ...style }}>
      {children}
    </div>
  );
}

/**
 * Skeleton table — multiple rows for table loading states.
 */
export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: 16,
            padding: '12px 16px',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} height={12} width={`${60 + Math.random() * 30}%`} />
          ))}
        </div>
      ))}
    </div>
  );
}
