import React from 'react';
import './EmptyState.css';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No data found',
  message = 'There are no items to display at this time.',
  icon,
  actionText,
  onAction
}) => {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        {icon || (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#adb5bd" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )}
      </div>
      <h3 className="empty-title">{title}</h3>
      <p className="empty-message">{message}</p>
      {actionText && onAction && (
        <button className="empty-action-btn" onClick={onAction}>
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;