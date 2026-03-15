// components/GroupModal.tsx - WITH PROPER TYPING
import React, { useState, useEffect, useCallback } from 'react';
import type { Group } from '../services/admin.groups.service';
import { AdminGroupsService } from '../services/admin.groups.service';
import LoadingScreen from './LoadingScreen';
import './styles/GroupModal.css';

// Report Analysis Types
interface ReportTypeInfo {
  type: string;
  count: number;
  threshold: number;
  suggestedAction: string;
  severity: string;
  message: string;
  meetsThreshold: boolean;
}

interface SuggestedAction {
  action: string;
  reason: string;
  severity: string;
  reportTypes: string[];
}

interface ReportAnalysisData {
  reportCount: number;
  reportTypes: ReportTypeInfo[];
  suggestedActions: SuggestedAction[];
  requiresImmediateAction: boolean;
}

// Extend the Group interface for the detailed view
interface GroupWithDetails extends Group {
  stats?: {
    activeMembers: number;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
  };
  members?: Array<{
    id: string;
    userId: string;
    groupRole: string;
    joinedAt: string;
    user: {
      id: string;
      fullName: string;
      email: string;
      avatarUrl?: string;
      roleStatus: string;
    };
  }>;
  reportAnalysis?: ReportAnalysisData;
}

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group | null;
  loading: boolean;
  onDelete: (groupId: string, hardDelete?: boolean) => void;
  onRestore?: (groupId: string) => Promise<void>;
}

const GroupModal: React.FC<GroupModalProps> = ({ 
  isOpen, 
  onClose,  
  group, 
  loading,
  onDelete,
  onRestore 
}) => {
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [groupAnalysis, setGroupAnalysis] = useState<ReportAnalysisData | null>(null);

  const fetchGroupAnalysis = useCallback(async () => {
    if (!group) return;
    try {
      const result = await AdminGroupsService.analyzeGroupReports(group.id);
      if (result.success && result.analysis) {
        setGroupAnalysis(result.analysis);
      }
    } catch (error) {
      console.error('Error fetching analysis:', error);
    }
  }, [group]);

  useEffect(() => {
    if (group && isOpen) {
      fetchGroupAnalysis();
    }
  }, [group, isOpen, fetchGroupAnalysis]);

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteOptions(true);
  };

  const handleDeleteConfirm = (hardDelete: boolean) => {
    if (group) {
      onDelete(group.id, hardDelete);
      setShowDeleteOptions(false);
      onClose();
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteOptions(false);
  };

  const handleRestore = async () => {
    if (!group || !onRestore) return;
    
    setRestoreLoading(true);
    try {
      await onRestore(group.id);
      onClose();
    } catch (error) {
      console.error('Error restoring group:', error);
    } finally {
      setRestoreLoading(false);
    }
  };

  // Check if group is soft-deleted
  const isSoftDeleted = group?.name?.startsWith('[DELETED]');

  // Check if delete actions are allowed based on thresholds
  const canSoftDelete = groupAnalysis?.suggestedActions?.some(
    (a: SuggestedAction) => a.action === 'SOFT_DELETE' && 
    a.reportTypes.some((type: string) => {
      const typeData = groupAnalysis?.reportTypes?.find((t: ReportTypeInfo) => t.type === type);
      return typeData?.meetsThreshold === true;
    })
  );

  const canHardDelete = groupAnalysis?.suggestedActions?.some(
    (a: SuggestedAction) => a.action === 'HARD_DELETE' && 
    a.reportTypes.some((type: string) => {
      const typeData = groupAnalysis?.reportTypes?.find((t: ReportTypeInfo) => t.type === type);
      return typeData?.meetsThreshold === true;
    })
  );

  // Cast group to GroupWithDetails to access extended properties
  const groupWithDetails = group as GroupWithDetails | null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content group-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <span className="modal-header-icon">👥</span>
            Group Details
            {isSoftDeleted && <span className="deleted-badge-modal">Deleted</span>}
          </h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {loading || restoreLoading ? (
          <div className="modal-loading">
            <LoadingScreen message={restoreLoading ? "Restoring group..." : "Loading group details..."} />
          </div>
        ) : groupWithDetails ? (
          <div className="modal-body">
            {/* Group Header */}
            <div className={`group-header ${isSoftDeleted ? 'deleted' : ''}`}>
              {groupWithDetails.avatarUrl ? (
                <img src={groupWithDetails.avatarUrl} alt={groupWithDetails.name} className="group-avatar-large" />
              ) : (
                <div className="group-avatar-placeholder-large">
                  {isSoftDeleted ? '🗑️' : groupWithDetails.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="group-title-info">
                <h3 className={isSoftDeleted ? 'deleted-title' : ''}>{groupWithDetails.name}</h3>
                <p className="group-id">ID: {groupWithDetails.id.slice(0, 8)}...</p>
                <p className="group-invite">Invite Code: {groupWithDetails.inviteCode}</p>
              </div>
            </div>

            {/* Basic Information */}
            <div className="modal-section">
              <h3>Basic Information</h3>
              <div className="modal-info-grid">
                <div className="modal-info-item">
                  <span className="modal-info-label">Description:</span>
                  <span className="modal-info-value">{groupWithDetails.description || 'No description'}</span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-info-label">Created:</span>
                  <span className="modal-info-value">{formatDate(groupWithDetails.createdAt)}</span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-info-label">Last Updated:</span>
                  <span className="modal-info-value">{formatDate(groupWithDetails.updatedAt)}</span>
                </div>
              </div>
            </div>

            {/* Creator Information */}
            {groupWithDetails.creator && (
              <div className="modal-section">
                <h3>Creator</h3>
                <div className="creator-info">
                  <div className="creator-avatar">
                    {groupWithDetails.creator.fullName?.charAt(0).toUpperCase()}
                  </div>
                  <div className="creator-details">
                    <div className="creator-name">{groupWithDetails.creator.fullName}</div>
                    <div className="creator-email">{groupWithDetails.creator.email}</div>
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
                  <span className="stat-value">{groupWithDetails._count?.members || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Tasks</span>
                  <span className="stat-value">{groupWithDetails._count?.tasks || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Reports</span>
                  <span className="stat-value">{groupWithDetails._count?.reports || 0}</span>
                </div>
                {groupWithDetails.stats && (
                  <>
                    <div className="stat-item">
                      <span className="stat-label">Completion Rate</span>
                      <span className="stat-value">{groupWithDetails.stats.completionRate.toFixed(1)}%</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Active Members</span>
                      <span className="stat-value">{groupWithDetails.stats.activeMembers}</span>
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
                  <span className="modal-info-value rotation-week">Week {groupWithDetails.currentRotationWeek}</span>
                </div>
                {groupWithDetails.lastRotationUpdate && (
                  <div className="modal-info-item">
                    <span className="modal-info-label">Last Rotation:</span>
                    <span className="modal-info-value">{formatDate(groupWithDetails.lastRotationUpdate)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Members Preview */}
            {groupWithDetails.members && groupWithDetails.members.length > 0 && (
              <div className="modal-section">
                <h3>Recent Members</h3>
                <div className="members-list">
                  {groupWithDetails.members.slice(0, 5).map((member) => (
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
                  {groupWithDetails.members.length > 5 && (
                    <div className="more-members">
                      +{groupWithDetails.members.length - 5} more members
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
          {!showDeleteOptions ? (
            <>
              {isSoftDeleted ? (
                // Show Restore button for soft-deleted groups
                <button 
                  className="modal-restore-btn"
                  onClick={handleRestore}
                  disabled={restoreLoading}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12h2a7 7 0 0 1 7-7h2" />
                    <path d="M3 12h2a7 7 0 0 0 7 7h2" />
                    <path d="M9 9l3-3-3-3" />
                    <path d="M9 15l3 3-3 3" />
                  </svg>
                  Restore Group
                </button>
              ) : (
                // Show Delete button for active groups (with threshold check)
                <button 
                  className={`modal-delete-btn ${!canSoftDelete && !canHardDelete ? 'disabled' : ''}`}
                  onClick={handleDeleteClick}
                  disabled={!canSoftDelete && !canHardDelete}
                  title={!canSoftDelete && !canHardDelete ? 'Need more reports to delete' : 'Delete group'}
                >
                  Delete Group
                </button>
              )}
              <button className="modal-close-btn" onClick={onClose}>
                Close
              </button>
            </>
          ) : (
            <div className="delete-options-modal">
              <p>Delete this group?</p>
              <div className="delete-actions-modal">
                <button 
                  className={`delete-soft-modal ${!canSoftDelete ? 'disabled' : ''}`}
                  onClick={() => handleDeleteConfirm(false)}
                  disabled={!canSoftDelete}
                  title={!canSoftDelete ? 'Threshold not met for soft delete' : 'Soft delete - Group will be archived'}
                >
                  Soft Delete
                </button>
                <button 
                  className={`delete-hard-modal ${!canHardDelete ? 'disabled' : ''}`}
                  onClick={() => handleDeleteConfirm(true)}
                  disabled={!canHardDelete}
                  title={!canHardDelete ? 'Threshold not met for hard delete' : 'Hard delete - Permanent removal'}
                >
                  Hard Delete
                </button>
                <button 
                  className="delete-cancel-modal"
                  onClick={handleCancelDelete}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupModal;