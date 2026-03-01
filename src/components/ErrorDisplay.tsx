import React from 'react';
import './styles/ErrorDisplay.css';

interface ErrorDisplayProps {
  message?: string;
  error?: Error | string | null;
  onRetry?: () => void;
  fullScreen?: boolean;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ 
  message = 'Something went wrong',
  error,
  onRetry,
  fullScreen = false
}) => {
  const errorMessage = error instanceof Error ? error.message : error || message;

  return (
    <div className={`error-container ${fullScreen ? 'full-screen' : ''}`}>
      <div className="error-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fa5252" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3 className="error-title">Error</h3>
      <p className="error-message">{errorMessage}</p>
      {onRetry && (
        <button className="error-retry-btn" onClick={onRetry}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
};

export default ErrorDisplay;