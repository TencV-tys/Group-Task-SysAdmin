import React, { useState } from 'react';
import type { FeedbackDetails } from '../services/admin.feedback.service';
import './styles/FeedbackModal.css';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedback: FeedbackDetails | null;
  loading?: boolean;
  onUpdateStatus: (status: string) => Promise<void>;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  feedback,
  loading,
  onUpdateStatus
}) => {
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  if (!isOpen || !feedback) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'feedback-modal-status-open';
      case 'IN_PROGRESS': return 'feedback-modal-status-progress';
      case 'RESOLVED': return 'feedback-modal-status-resolved';
      case 'CLOSED': return 'feedback-modal-status-closed';
      default: return '';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'BUG': return '🐛';
      case 'FEATURE_REQUEST': return '✨';
      case 'GENERAL': return '💬';
      case 'SUGGESTION': return '💡';
      case 'COMPLAINT': return '⚠️';
      case 'QUESTION': return '❓';
      default: return '📝';
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedStatus) return;
    
    setUpdating(true);
    await onUpdateStatus(selectedStatus);
    setUpdating(false);
    setShowStatusForm(false);
    setSelectedStatus('');
  };

  if (loading) {
    return (
      <div className="feedback-modal-overlay" onClick={onClose}>
        <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
          <div className="feedback-modal-loading">
            <div className="feedback-spinner"></div>
            <p>Loading feedback details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-modal-overlay" onClick={onClose}>
      <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
        <div className="feedback-modal-header">
          <div className="feedback-modal-header-left">
            <span className="feedback-modal-type-icon">{getTypeIcon(feedback.type)}</span>
            <h2>Feedback Details</h2>
          </div>
          <button className="feedback-modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="feedback-modal-body">
          {/* User Info */}
          <div className="feedback-modal-user">
            <div className="feedback-modal-avatar">
              {feedback.user.avatarUrl ? (
                <img src={feedback.user.avatarUrl} alt={feedback.user.fullName} />
              ) : (
                <span>{feedback.user.fullName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="feedback-modal-user-info">
              <h3>{feedback.user.fullName}</h3>
              <p>{feedback.user.email}</p>
              <span className="feedback-modal-user-role">{feedback.user.role}</span>
            </div>
          </div>

          {/* Status Badges */}
          <div className="feedback-modal-badges">
            <span className={`feedback-modal-badge ${getStatusColor(feedback.status)}`}>
              {feedback.status}
            </span>
            <span className="feedback-modal-badge feedback-modal-type">
              {feedback.type.replace('_', ' ')}
            </span>
            {feedback.category && (
              <span className="feedback-modal-badge feedback-modal-category">
                {feedback.category}
              </span>
            )}
          </div>

          {/* Message */}
          <div className="feedback-modal-message">
            <h4>Message</h4>
            <p>{feedback.message}</p>
            <span className="feedback-modal-date">Submitted: {formatDate(feedback.createdAt)}</span>
          </div>

          {/* Action Buttons */}
          <div className="feedback-modal-actions">
            <button
              className="feedback-modal-btn feedback-modal-btn-status"
              onClick={() => setShowStatusForm(!showStatusForm)}
              disabled={updating}
            >
              Update Status
            </button>
          </div>

          {/* Status Update Form */}
          {showStatusForm && (
            <div className="feedback-modal-form">
              <select
                className="feedback-modal-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="" disabled>Select new status...</option>
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN PROGRESS</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
              <div className="feedback-modal-form-actions">
                <button
                  className="feedback-modal-btn feedback-modal-btn-cancel"
                  onClick={() => setShowStatusForm(false)}
                >
                  Cancel
                </button>
                <button
                  className="feedback-modal-btn feedback-modal-btn-save"
                  onClick={handleStatusUpdate}
                  disabled={!selectedStatus || updating}
                >
                  Update
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;