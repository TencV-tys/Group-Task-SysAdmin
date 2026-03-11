// components/GroupModal.tsx
import React from 'react';
import type { Group } from '../services/admin.groups.service';
import LoadingScreen from './LoadingScreen';
import './styles/GroupModal.css';

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group | null;
  loading: boolean;
  onDelete: (groupId: string, hardDelete?: boolean) => void;
}

const GroupModal: React.FC<GroupModalProps> = ({ 
  isOpen, 
  onClose, 
  group, 
  loading,
  onDelete 
}) => {
  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content group-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <span className="modal-header-icon">👥</span>
            Group Details
          </h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {loading ? (
          <div className="modal-loading">
            <LoadingScreen message="Loading group details..." />
          </div>
        ) : group ? (
          <div className="modal-body">
            {/* Group Header */}
            <div className="group-header">
              {group.avatarUrl ? (
                <img src={group.avatarUrl} alt={group.name} className="group-avatar-large" />
              ) : (
                <div className="group-avatar-placeholder-large">
                  {group.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="group-title-info">
                <h3>{group.name}</h3>
                <p className="group-id">ID: {group.id}</p>
                <p className="group-invite">Invite Code: {group.inviteCode}</p>
              </div>
            </div>

            {/* Basic Information */}
            <div className="modal-section">
              <h3>Basic Information</h3>
              <div className="modal-info-grid">
                <div className="modal-info-item">
                  <span className="modal-info-label">Description:</span>
                  <span className="modal-info-value">{group.description || 'No description'}</span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-info-label">Created:</span>
                  <span className="modal-info-value">{formatDate(group.createdAt)}</span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-info-label">Last Updated:</span>
                  <span className="modal-info-value">{formatDate(group.updatedAt)}</span>
                </div>
              </div>
            </div>

            {/* Creator Information */}
            {group.creator && (
              <div className="modal-section">
                <h3>Creator</h3>
                <div className="creator-info">
                  <div className="creator-avatar">
                    {group.creator.fullName?.charAt(0).toUpperCase()}
                  </div>
                  <div className="creator-details">
                    <div className="creator-name">{group.creator.fullName}</div>
                    <div className="creator-email">{group.creator.email}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Statistics */}
            <div className="modal-section">
              <h3>Statistics</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Members</span>
                  <span className="stat-value">{group._count?.members || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Tasks</span>
                  <span className="stat-value">{group._count?.tasks || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Reports</span>
                  <span className="stat-value">{group._count?.reports || 0}</span>
                </div>
                {group.stats && (
                  <>
                    <div className="stat-item">
                      <span className="stat-label">Completion Rate</span>
                      <span className="stat-value">{group.stats.completionRate.toFixed(1)}%</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Active Members</span>
                      <span className="stat-value">{group.stats.activeMembers}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Rotation Information */}
            <div className="modal-section">
              <h3>Rotation</h3>
              <div className="modal-info-grid">
                <div className="modal-info-item">
                  <span className="modal-info-label">Current Week:</span>
                  <span className="modal-info-value rotation-week">Week {group.currentRotationWeek}</span>
                </div>
                {group.lastRotationUpdate && (
                  <div className="modal-info-item">
                    <span className="modal-info-label">Last Rotation:</span>
                    <span className="modal-info-value">{formatDate(group.lastRotationUpdate)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Members Preview */}
            {group.members && group.members.length > 0 && (
              <div className="modal-section">
                <h3>Recent Members</h3>
                <div className="members-list">
                  {group.members.slice(0, 5).map((member) => (
                    <div key={member.id} className="member-item">
                      <div className="member-avatar">
                        {member.user.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="member-info">
                        <div className="member-name">{member.user.fullName}</div>
                        <div className="member-email">{member.user.email}</div>
                      </div>
                      <span className={`member-role ${member.groupRole.toLowerCase()}`}>
                        {member.groupRole}
                      </span>
                    </div>
                  ))}
                  {group.members.length > 5 && (
                    <div className="more-members">
                      +{group.members.length - 5} more members
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="modal-error">
            <p>Failed to load group details</p>
          </div>
        )}

        <div className="modal-footer">
          <button 
            className="modal-delete-btn"
            onClick={() => {
              if (group && window.confirm('Are you sure you want to delete this group?')) {
                onDelete(group.id);
                onClose();
              }
            }}
          >
            Delete Group
          </button>
          <button className="modal-close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupModal;