// components/GroupModal.tsx - UPDATED: Threshold-based separate action buttons
import React, { useState, useEffect, useRef } from 'react';
import type { Group, ReportAnalysis, ActionType } from '../services/admin.groups.service';
import { AdminGroupsService, ACTION_BUTTONS } from '../services/admin.groups.service';
import LoadingScreen from './LoadingScreen';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExclamationTriangle,
  faFlag,
  faTrash,
  faBan,
  faExclamationCircle, 
  faUndo,
  faUsers,
  faTasks,
} from '@fortawesome/free-solid-svg-icons';
import './styles/GroupModal.css';

// ✅ Mirror backend thresholds
const REPORT_THRESHOLDS = {
  SUSPEND: 3,
  SOFT_DELETE: 6,
  HARD_DELETE: 10,
};

interface GroupWithDetails extends Group {
  stats?: {
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
}

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group | null;
  loading: boolean;
  onDelete: (hardDelete?: boolean) => void;
  onRestore?: (groupId: string) => Promise<void>;
  onApplyAction?: (groupId: string, action: ActionType) => Promise<void>;
  reportAnalysis?: ReportAnalysis | null;
}

const GroupModal: React.FC<GroupModalProps> = ({
  isOpen,
  onClose,
  group,
  loading,
  onDelete,
  onRestore,
  onApplyAction,
  reportAnalysis: initialAnalysis,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<'SOFT_DELETE' | 'HARD_DELETE' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [groupAnalysis, setGroupAnalysis] = useState<ReportAnalysis | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [analysisFetched, setAnalysisFetched] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const fetchInProgressRef = useRef(false);
  const analysisRequestIdRef = useRef<string | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Reset when group changes
  useEffect(() => {
    if (!group) return;
    const timer = setTimeout(() => {
      if (!isMountedRef.current) return;
      setShowDeleteConfirm(null);
      setSelectedAction(null);
      setFetchError(null);
      if (!initialAnalysis) {
        setGroupAnalysis(null);
        setAnalysisFetched(false);
        fetchInProgressRef.current = false;
        analysisRequestIdRef.current = null;
      } else {
        setGroupAnalysis(initialAnalysis);
        setAnalysisFetched(true);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [group, initialAnalysis]);

  // Sync initialAnalysis prop
  useEffect(() => {
    if (initialAnalysis && isMountedRef.current) {
      setGroupAnalysis(initialAnalysis);
      setAnalysisFetched(true);
      setFetchError(null);
    }
  }, [initialAnalysis]);

  // Auto-fetch analysis if not provided
  useEffect(() => {
    if (!group || !isOpen || initialAnalysis || analysisFetched || fetchInProgressRef.current || !isMountedRef.current) return;

    const requestId = `${group.id}-${Date.now()}`;
    analysisRequestIdRef.current = requestId;

    const fetchAnalysis = async () => {
      if (!group || !isMountedRef.current || fetchInProgressRef.current) return;
      fetchInProgressRef.current = true;
      try {
        const result = await AdminGroupsService.analyzeGroupReports(group.id);
        if (analysisRequestIdRef.current !== requestId || !isMountedRef.current) return;
        if (result.success && result.analysis && isMountedRef.current) {
          setGroupAnalysis(result.analysis);
          setAnalysisFetched(true);
          setFetchError(null);
        } else if (isMountedRef.current) {
          setFetchError(result.message || 'Failed to load report analysis');
        }
      } catch (err) {
        console.error(err)
        if (!isMountedRef.current) return;
        setFetchError('Network error while fetching analysis');
      } finally {
        if (analysisRequestIdRef.current === requestId && isMountedRef.current) {
          fetchInProgressRef.current = false;
        }
      } 
    };

    const timeoutId = setTimeout(fetchAnalysis, 300);
    return () => { clearTimeout(timeoutId); };
  }, [group, isOpen, initialAnalysis, analysisFetched]);

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return 'Invalid date'; }
  };

  const isDeleted = group?.isDeleted || group?.status === 'DELETED' || false;
  const isSuspended = group?.status === 'SUSPENDED' || false;
  const reportCount = group?._count?.reports || 0;

  // ✅ Derive which actions are available from report count — mirrors table logic
  const derivedActions: ActionType[] = [];
  if (isDeleted) {
    derivedActions.push('RESTORE');
  } else {
    if (reportCount >= REPORT_THRESHOLDS.HARD_DELETE) derivedActions.push('HARD_DELETE');
    else if (reportCount >= REPORT_THRESHOLDS.SOFT_DELETE) derivedActions.push('SOFT_DELETE');
    else if (reportCount >= REPORT_THRESHOLDS.SUSPEND) derivedActions.push('SUSPEND');
    if (isSuspended) derivedActions.push('RESTORE');
  }

  // Also merge in any available actions from fetched analysis (in case backend adds more)
  const analysisActions = (groupAnalysis?.availableActions || []).map(a => a.action as ActionType);
  const allActions = Array.from(new Set([...derivedActions, ...analysisActions]));

  const canExecuteAction = (action: ActionType): boolean => {
    // If we have analysis, use it; otherwise derive from count
    if (groupAnalysis) {
      return groupAnalysis.availableActions.some(a => a.action === action && a.canExecute);
    }
    return derivedActions.includes(action);
  };

  // ── Action handlers ──
  const handleActionClick = async (action: ActionType) => {
    if (!group) return;
    setSelectedAction(action);

    if (action === 'SOFT_DELETE' || action === 'HARD_DELETE') {
      setShowDeleteConfirm(action);
      return;
    }

    setActionLoading(true);
    try {
      if (action === 'RESTORE' && onRestore) {
        await onRestore(group.id);
      } else if (onApplyAction) {
        await onApplyAction(group.id, action);
      }
    } catch (err) {
      console.error(`[GroupModal] Action ${action} failed:`, err);
    } finally {
      if (isMountedRef.current) {
        setActionLoading(false);
        setSelectedAction(null);
      }
    }
  };

  const handleDeleteConfirm = () => {
    if (!showDeleteConfirm) return;
    onDelete(showDeleteConfirm === 'HARD_DELETE');
    setShowDeleteConfirm(null);
  };

  const handleRetryAnalysis = () => {
    setAnalysisFetched(false);
    setFetchError(null);
  };

  const groupWithDetails = group as GroupWithDetails | null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content group-modal" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="modal-header">
          <h2>
            <span className="modal-header-icon">👥</span>
            Group Details
            {isDeleted && <span className="deleted-badge-modal">Deleted</span>}
            {isSuspended && <span className="suspended-badge-modal">Suspended</span>}
          </h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* ── Body ── */}
        {loading || actionLoading ? (
          <div className="modal-loading">
            <LoadingScreen
              message={
                actionLoading
                  ? `Applying ${selectedAction ? (ACTION_BUTTONS[selectedAction]?.label?.toLowerCase() ?? selectedAction) : 'action'}...`
                  : 'Loading group details...'
              }
            />
          </div>
        ) : groupWithDetails ? (
          <div className="modal-body">

            {/* Group header */}
            <div className={`group-header ${isDeleted ? 'deleted' : ''} ${isSuspended ? 'suspended' : ''}`}>
              {groupWithDetails.avatarUrl ? (
                <img src={groupWithDetails.avatarUrl} alt={groupWithDetails.name} className="group-avatar-large" />
              ) : (
                <div className="group-avatar-placeholder-large">
                  {isDeleted ? '🗑️' : isSuspended ? '⚠️' : groupWithDetails.name?.charAt(0).toUpperCase() || 'G'}
                </div>
              )}
              <div className="group-title-info">
                <h3 className={isDeleted ? 'deleted-title' : ''}>{groupWithDetails.name}</h3>
                <p className="group-id">ID: {groupWithDetails.id.slice(0, 8)}...</p>
                <p className="group-invite">Invite Code: {groupWithDetails.inviteCode}</p>
                {groupWithDetails.description && (
                  <p className="group-description">{groupWithDetails.description}</p>
                )}
              </div>
            </div>

            {/* Status badges */}
            <div className="status-badges">
              <span className={`status-badge ${groupWithDetails.status?.toLowerCase() || 'active'}`}>
                {groupWithDetails.status || 'ACTIVE'}
              </span>
              {groupAnalysis?.requiresImmediateAction && (
                <span className="status-badge urgent">
                  <FontAwesomeIcon icon={faExclamationTriangle} /> Urgent
                </span>
              )}
              {/* ✅ Show threshold badge in modal header area too */}
              {!isDeleted && reportCount >= REPORT_THRESHOLDS.HARD_DELETE && (
                <span className="status-badge threshold-critical">🚨 Hard Delete Threshold</span>
              )}
              {!isDeleted && reportCount >= REPORT_THRESHOLDS.SOFT_DELETE && reportCount < REPORT_THRESHOLDS.HARD_DELETE && (
                <span className="status-badge threshold-high">⚠️ Soft Delete Threshold</span>
              )}
              {!isDeleted && reportCount >= REPORT_THRESHOLDS.SUSPEND && reportCount < REPORT_THRESHOLDS.SOFT_DELETE && (
                <span className="status-badge threshold-medium">📋 Suspend Threshold</span>
              )}
            </div>

            {/* Basic info */}
            <div className="modal-section">
              <h3>Basic Information</h3>
              <div className="modal-info-grid">
                <div className="modal-info-item">
                  <span className="modal-info-label">Created</span>
                  <span className="modal-info-value">{formatDate(groupWithDetails.createdAt)}</span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-info-label">Last Updated</span>
                  <span className="modal-info-value">{formatDate(groupWithDetails.updatedAt)}</span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-info-label">Rotation Week</span>
                  <span className="modal-info-value rotation-week">Week {groupWithDetails.currentRotationWeek}</span>
                </div>
                {groupWithDetails.lastRotationUpdate && (
                  <div className="modal-info-item">
                    <span className="modal-info-label">Last Rotation</span>
                    <span className="modal-info-value">{formatDate(groupWithDetails.lastRotationUpdate)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Creator */}
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
                  <FontAwesomeIcon icon={faUsers} className="stat-icon" />
                  <span className="stat-label">Members</span>
                  <span className="stat-value">{groupWithDetails._count?.members || 0}</span>
                </div>
                <div className="stat-item">
                  <FontAwesomeIcon icon={faTasks} className="stat-icon" />
                  <span className="stat-label">Tasks</span>
                  <span className="stat-value">{groupWithDetails._count?.tasks || 0}</span>
                </div>
                <div className="stat-item">
                  <FontAwesomeIcon icon={faFlag} className="stat-icon" />
                  <span className="stat-label">Reports</span>
                  <span className="stat-value">{reportCount}</span>
                </div>
                {groupWithDetails.stats && (
                  <div className="stat-item">
                    <span className="stat-label">Completion</span>
                    <span className="stat-value">{groupWithDetails.stats.completionRate.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Report Analysis */}
            {fetchError ? (
              <div className="modal-section">
                <h3>Report Analysis</h3>
                <div className="error-message">
                  <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: '#fa5252', marginRight: '8px' }} />
                  <span>{fetchError}</span>
                  <button className="retry-btn" onClick={handleRetryAnalysis}>Retry</button>
                </div>
              </div>
            ) : groupAnalysis && groupAnalysis.reportTypes.length > 0 ? (
              <div className="modal-section">
                <h3>
                  <FontAwesomeIcon icon={faFlag} style={{ marginRight: '8px', color: '#e67700' }} />
                  Report Analysis
                </h3>
                <div className="report-summary">
                  <div className="report-count">
                    <span className="report-count-label">Total Reports</span>
                    <span className="report-count-value">{groupAnalysis.reportCount}</span>
                  </div>
                  <div className="report-types-mini">
                    {groupAnalysis.reportTypes.map((type, idx) => (
                      <div key={idx} className="report-type-mini">
                        <span className="report-type-name">{type.type.replace(/_/g, ' ')}</span>
                        <span className="report-type-count">{type.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : groupAnalysis ? (
              <div className="modal-section">
                <h3>Report Analysis</h3>
                <p className="no-reports-message">No reports found for this group.</p>
              </div>
            ) : null}

            {/* Members Preview */}
            {groupWithDetails.members && groupWithDetails.members.length > 0 && (
              <div className="modal-section">
                <h3>Members ({groupWithDetails.members.length})</h3>
                <div className="members-list">
                  {groupWithDetails.members.slice(0, 5).map((member) => (
                    <div key={member.id} className="member-item">
                      <div className="member-avatar">
                        {member.user.avatarUrl ? (
                          <img src={member.user.avatarUrl} alt={member.user.fullName} />
                        ) : (
                          member.user.fullName.charAt(0).toUpperCase()
                        )}
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
                    <div className="more-members">+{groupWithDetails.members.length - 5} more members</div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="modal-error"><p>Failed to load group details</p></div>
        )}

        {/* ── Footer: Delete confirmation or action buttons ── */}
        <div className="modal-footer">
          {showDeleteConfirm ? (
            /* Delete confirmation inside footer */
            <div className="modal-delete-confirm">
              <p>
                {showDeleteConfirm === 'HARD_DELETE'
                  ? '⚠️ Permanently delete? This cannot be undone.'
                  : 'Archive (soft delete) this group?'}
              </p>
              <div className="modal-confirm-actions">
                <button
                  className={showDeleteConfirm === 'HARD_DELETE' ? 'confirm-hard' : 'confirm-soft'}
                  onClick={handleDeleteConfirm}
                  disabled={loading || actionLoading}
                >
                  {showDeleteConfirm === 'HARD_DELETE' ? 'Yes, Hard Delete' : 'Yes, Soft Delete'}
                </button>
                <button
                  className="confirm-cancel"
                  onClick={() => { setShowDeleteConfirm(null); setSelectedAction(null); }}
                  disabled={loading || actionLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="modal-action-buttons">

              {/* ── RESTORE ── visible when deleted or suspended */}
              {(isDeleted || allActions.includes('RESTORE')) && canExecuteAction('RESTORE') && (
                <button
                  className="modal-action-btn restore"
                  onClick={() => handleActionClick('RESTORE')}
                  disabled={actionLoading}
                  title="Restore this group"
                >
                  <FontAwesomeIcon icon={faUndo} />
                  <span>Restore</span>
                </button>
              )}

              {/* ── SUSPEND ── 3–5 reports */}
              {!isDeleted && allActions.includes('SUSPEND') && canExecuteAction('SUSPEND') && (
                <button
                  className="modal-action-btn suspend"
                  onClick={() => handleActionClick('SUSPEND')}
                  disabled={actionLoading}
                  title={`Suspend group (${reportCount} reports, threshold: ${REPORT_THRESHOLDS.SUSPEND})`}
                >
                  <FontAwesomeIcon icon={faExclamationCircle} />
                  <span>Suspend</span>
                </button>
              )}

              {/* ── SOFT DELETE ── 6–9 reports */}
              {!isDeleted && allActions.includes('SOFT_DELETE') && canExecuteAction('SOFT_DELETE') && (
                <button
                  className="modal-action-btn soft-delete"
                  onClick={() => handleActionClick('SOFT_DELETE')}
                  disabled={actionLoading}
                  title={`Soft delete (${reportCount} reports, threshold: ${REPORT_THRESHOLDS.SOFT_DELETE})`}
                >
                  <FontAwesomeIcon icon={faTrash} />
                  <span>Soft Delete</span>
                </button>
              )}

              {/* ── HARD DELETE ── 10+ reports */}
              {!isDeleted && allActions.includes('HARD_DELETE') && canExecuteAction('HARD_DELETE') && (
                <button
                  className="modal-action-btn hard-delete"
                  onClick={() => handleActionClick('HARD_DELETE')}
                  disabled={actionLoading}
                  title={`Hard delete (${reportCount} reports, threshold: ${REPORT_THRESHOLDS.HARD_DELETE})`}
                >
                  <FontAwesomeIcon icon={faBan} />
                  <span>Hard Delete</span>
                </button>
              )}

              <button
                className="modal-close-btn"
                onClick={onClose}
                disabled={actionLoading}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupModal;