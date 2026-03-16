// components/AuditModal.tsx
import React from 'react';
import type{ AuditLog } from '../services/admin.audit.service';
import LoadingScreen from './LoadingScreen';
import './styles/AuditModal.css';

interface AuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: AuditLog | null;
  loading: boolean;
}

const AuditModal: React.FC<AuditModalProps> = ({ isOpen, onClose, log, loading }) => {
  if (!isOpen) return null;

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionIcon = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('create')) return '➕';
    if (actionLower.includes('delete')) return '🗑️';
    if (actionLower.includes('update') || actionLower.includes('edit')) return '✏️';
    if (actionLower.includes('login')) return '🔑';
    if (actionLower.includes('export')) return '📥';
    if (actionLower.includes('view')) return '👁️';
    if (actionLower.includes('setting')) return '⚙️';
    if (actionLower.includes('ban') || actionLower.includes('suspend')) return '🚫';
    if (actionLower.includes('approve') || actionLower.includes('verify')) return '✅';
    if (actionLower.includes('reject')) return '❌';
    return '📝';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <span className="modal-header-icon">📋</span>
            Audit Log Details
          </h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {loading ? (
          <div className="modal-loading">
            <LoadingScreen message="Loading log details..." />
          </div>
        ) : log ? (
          <div className="modal-body">
            {/* Basic Information */}
            <div className="modal-section">
              <h3>Basic Information</h3>
              <div className="modal-info-grid">
                <div className="modal-info-item">
                  <span className="modal-info-label">Log ID:</span>
                  <span className="modal-info-value">{log.id}</span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-info-label">Action:</span>
                  <span className="modal-info-value">
                    <span className="modal-action-icon">{getActionIcon(log.action)}</span>
                    {log.action}
                  </span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-info-label">Timestamp:</span>
                  <span className="modal-info-value">{formatDateTime(log.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Admin Information */}
            <div className="modal-section">
              <h3>Admin Information</h3>
              <div className="modal-info-grid">
                <div className="modal-info-item">
                  <span className="modal-info-label">Admin ID:</span>
                  <span className="modal-info-value">{log.adminId}</span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-info-label">Name:</span>
                  <span className="modal-info-value">{log.admin?.fullName || 'N/A'}</span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-info-label">Email:</span>
                  <span className="modal-info-value">{log.admin?.email || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Target User Information */}
            {log.targetUser && (
              <div className="modal-section">
                <h3>Target User</h3>
                <div className="modal-info-grid">
                  <div className="modal-info-item">
                    <span className="modal-info-label">User ID:</span>
                    <span className="modal-info-value">{log.targetUserId}</span>
                  </div>
                  <div className="modal-info-item">
                    <span className="modal-info-label">Name:</span>
                    <span className="modal-info-value">{log.targetUser.fullName}</span>
                  </div>
                  <div className="modal-info-item">
                    <span className="modal-info-label">Email:</span>
                    <span className="modal-info-value">{log.targetUser.email}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Request Information */}
            <div className="modal-section">
              <h3>Request Information</h3>
              <div className="modal-info-grid">
                <div className="modal-info-item">
                  <span className="modal-info-label">IP Address:</span>
                  <span className="modal-info-value">{log.ipAddress || 'N/A'}</span>
                </div>
                <div className="modal-info-item full-width">
                  <span className="modal-info-label">User Agent:</span>
                  <span className="modal-info-value user-agent">{log.userAgent || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Additional Details */}
            {log.details && Object.keys(log.details).length > 0 && (
              <div className="modal-section">
                <h3>Additional Details</h3>
                <pre className="modal-details-json">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="modal-error">
            <p>Failed to load log details</p>
          </div>
        )}

        <div className="modal-footer">
          <button className="modal-close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditModal;