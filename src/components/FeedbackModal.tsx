// components/FeedbackModal.tsx - WITH DELETE BUTTON (only for CLOSED status)

import React, { useState } from 'react';
import type { FeedbackDetails } from '../services/admin.feedback.service';
import { AdminFeedbackService } from '../services/admin.feedback.service';
import './styles/FeedbackModal.css';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedback: FeedbackDetails | null;
  loading?: boolean;
  onUpdateStatus: (status: string) => Promise<void>;
  nextStatusOptions?: string[];
  onDelete?: (feedbackId: string) => Promise<void>; // Add delete callback
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  feedback,
  loading,
  onUpdateStatus,
  nextStatusOptions = [],
  onDelete
}) => {
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  React.useEffect(() => {
    setShowStatusForm(false);
    setSelectedStatus('');
    setShowDeleteConfirm(false);
  }, [feedback?.id]);

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

  const getStatusDisplay = (status: string) => {
    return status.replace('_', ' ');
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

  const handleDelete = async () => {
    if (!feedback) return;
    
    setDeleting(true);
    try {
      if (onDelete) {
        await onDelete(feedback.id);
      } else {
        const result = await AdminFeedbackService.deleteFeedback(feedback.id);
        if (result.success && onClose) {
          onClose();
        }
      }
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setDeleting(false);
    }
  };

  // Filter out the current status from options
  const availableOptions = nextStatusOptions.filter(
    status => status !== feedback.status
  );

  const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.style.display = 'none';
    const parent = e.currentTarget.parentElement;
    if (parent) {
      const span = document.createElement('span');
      span.textContent = feedback.user.fullName.charAt(0).toUpperCase();
      parent.appendChild(span);
    }
  };

  // Check if delete button should be shown (only when status is CLOSED)
  const canDelete = feedback.status === 'CLOSED';

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
                <img 
                  src={feedback.user.avatarUrl} 
                  alt={feedback.user.fullName}
                  onError={handleAvatarError}
                />
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
              {getStatusDisplay(feedback.status)}
            </span>
            <span className="feedback-modal-badge feedback-modal-type">
              {getStatusDisplay(feedback.type)}
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
            {feedback.updatedAt !== feedback.createdAt && (
              <span className="feedback-modal-date">Updated: {formatDate(feedback.updatedAt)}</span>
            )}
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
            
            {/* ✅ DELETE BUTTON - ONLY SHOW WHEN STATUS IS CLOSED */}
            {canDelete && (
              <button
                className="feedback-modal-btn feedback-modal-btn-delete"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>

          {/* Status Update Form */}
          {showStatusForm && (
            <div className="feedback-modal-form">
              <p className="feedback-modal-form-hint">
                Current status: <strong>{getStatusDisplay(feedback.status)}</strong>
              </p>
              <select
                className="feedback-modal-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="" disabled>Select new status...</option>
                {availableOptions.map((status) => (
                  <option key={status} value={status}>
                    {getStatusDisplay(status)}
                  </option>
                ))}
              </select>
              {availableOptions.length === 0 && (
                <p className="feedback-modal-form-warning">
                  No valid status transitions available
                </p>
              )}
              <div className="feedback-modal-form-actions">
                <button
                  className="feedback-modal-btn-cancel"
                  onClick={() => setShowStatusForm(false)}
                >
                  Cancel
                </button>
                <button
                  className="feedback-modal-btn-save"
                  onClick={handleStatusUpdate}
                  disabled={!selectedStatus || updating}
                >
                  {updating ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          )}

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className="feedback-modal-delete-confirm">
              <p>Are you sure you want to delete this feedback?</p>
              <div className="delete-preview">
                <strong>"{feedback.message.substring(0, 100)}..."</strong>
              </div>
              <p className="delete-warning">⚠️ This action cannot be undone!</p>
              <div className="delete-confirm-actions">
                <button
                  className="feedback-modal-btn-cancel"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="feedback-modal-btn-delete-confirm"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          )}

          {/* Update History Note */}
          {feedback.updatedAt !== feedback.createdAt && (
            <div className="feedback-modal-history-note">
              <small>Last updated: {formatDate(feedback.updatedAt)}</small>
            </div>
          )}
        </div>
      </div>
    </div>
  );  
};

export default FeedbackModal;