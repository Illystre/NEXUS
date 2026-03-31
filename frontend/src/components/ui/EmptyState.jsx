import React from 'react';
import { Inbox } from 'lucide-react';

const CSS = `
  .nx-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 24px;
    gap: 12px;
    text-align: center;
  }

  .nx-empty-icon {
    color: var(--text-muted);
    margin-bottom: 4px;
  }

  .nx-empty-title {
    font-size: var(--text-base);
    font-weight: var(--weight-medium);
    color: var(--text-primary);
  }

  .nx-empty-desc {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    max-width: 320px;
    line-height: 1.6;
  }

  .nx-empty-action {
    margin-top: 8px;
  }
`;

export default function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <>
      <style>{CSS}</style>
      <div className="nx-empty">
        <div className="nx-empty-icon">
          <Icon size={40} strokeWidth={1.5} />
        </div>
        {title       && <p className="nx-empty-title">{title}</p>}
        {description && <p className="nx-empty-desc">{description}</p>}
        {action && <div className="nx-empty-action">{action}</div>}
      </div>
    </>
  );
}
