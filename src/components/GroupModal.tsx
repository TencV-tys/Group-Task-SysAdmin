// components/GroupModal.tsx - FIXED useEffect dependency
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
  faInfoCircle,
  faUndo,
  faUsers,
  faTasks,
} from '@fortawesome/free-solid-svg-icons';
import './styles/GroupModal.css';

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
  onDelete: (groupId: string, hardDelete?: boolean) => void;
  onRestore?: (groupId: string) => Promise<void>;
  onApplyAction?: (groupId: string, action: ActionType) => Promise<void>;
  reportAnalysis?: ReportAnalysis | null;
}

const ACTION_ICONS = {
  SUSPEND: faExclamationCircle,
  SOFT_DELETE: faTrash,
  HARD_DELETE: faBan,
  RESTORE: faUndo,
  REVIEW: faInfoCircle,
} as const;

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
  console.log('🏁 [GroupModal] Rendering', { 
    isOpen, 
    hasGroup: !!group, 
    loading, 
    hasAnalysis: !!initialAnalysis 
  });

  const [showDeleteOptions, setShowDeleteOptions] = useState(false);
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
    console.log('🟢 [GroupModal] Mounted');
    return () => {
      isMountedRef.current = false;
      console.log('🔴 [GroupModal] Unmounted');
    };
  }, []);

  // Log when props change
  useEffect(() => {
    console.log('📨 [GroupModal] Props updated:', { 
      isOpen, 
      groupName: group?.name,
      groupId: group?.id,
      loading,
      hasAnalysis: !!initialAnalysis
    });
  }, [isOpen, group, loading, initialAnalysis]);

  // Reset state when group changes - with debounce
// GroupModal.tsx - FIXED useEffect dependency
useEffect(() => {
  if (!group) return;
  
  const timer = setTimeout(() => {
    if (!isMountedRef.current) return;
    
    console.log(`🔄 [GroupModal] Group changed to "${group?.name ?? 'null'}" — resetting local state`);
    setShowDeleteOptions(false);
    setSelectedAction(null);
    setFetchError(null);
    
    if (!initialAnalysis) {
      console.log('🧹 [GroupModal] Clearing analysis (no initialAnalysis provided)');
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
}, [group, initialAnalysis]); // 👈 Use 'group' instead of group?.id and group?.name

  // Sync initialAnalysis prop → local state
  useEffect(() => {
    if (initialAnalysis && isMountedRef.current) {
      console.log('📥 [GroupModal] Received initialAnalysis:', {
        groupName: initialAnalysis.groupName,
        reportCount: initialAnalysis.reportCount,
        actions: initialAnalysis.availableActions.map(a => a.action),
        requiresImmediate: initialAnalysis.requiresImmediateAction
      });
      setGroupAnalysis(initialAnalysis);
      setAnalysisFetched(true);
      setFetchError(null);
    }
  }, [initialAnalysis]);

  // Fetch analysis if not provided - with debounce and request deduplication
  useEffect(() => {
    if (!group || !isOpen || initialAnalysis || analysisFetched || fetchInProgressRef.current || !isMountedRef.current) {
      return;
    }

    const requestId = `${group.id}-${Date.now()}`;
    analysisRequestIdRef.current = requestId;
    
    console.log(`🚀 [Analysis:${requestId}] Triggering analysis fetch for group:`, group.id, group.name);
    
    const fetchAnalysis = async () => {
      if (!group || !isMountedRef.current || fetchInProgressRef.current) return;
      
      fetchInProgressRef.current = true;
      console.log(`🔍 [Analysis:${requestId}] Fetching analysis...`);
      
      try {
        const result = await AdminGroupsService.analyzeGroupReports(group.id);
        
        if (analysisRequestIdRef.current !== requestId || !isMountedRef.current) {
          console.log(`⏭️ [Analysis:${requestId}] Request superseded by newer request`);
          return;
        }
        
        console.log(`📦 [Analysis:${requestId}] Analysis fetch result:`, result);
        
        if (result.success && result.analysis && isMountedRef.current) {
          console.log(`✅ [Analysis:${requestId}] Analysis fetched:`, {
            reportCount: result.analysis.reportCount,
            actions: result.analysis.availableActions.map(a => a.action),
            requiresImmediate: result.analysis.requiresImmediateAction
          });
          setGroupAnalysis(result.analysis);
          setAnalysisFetched(true);
          setFetchError(null);
        } else if (isMountedRef.current) {
          console.error(`❌ [Analysis:${requestId}] Analysis fetch failed:`, result.message);
          setFetchError(result.message || 'Failed to load report analysis');
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        
        console.error(`❌ [Analysis:${requestId}] Analysis fetch exception:`, err);
        setFetchError('Network error while fetching analysis');
      } finally {
        if (analysisRequestIdRef.current === requestId && isMountedRef.current) {
          fetchInProgressRef.current = false;
          console.log(`🏁 [Analysis:${requestId}] Fetch completed`);
        }
      }
    };

    const timeoutId = setTimeout(fetchAnalysis, 300);
    
    return () => {
      clearTimeout(timeoutId);
      console.log(`🧹 [Analysis:${requestId}] Cleanup - cancelling pending fetch`);
    };
  }, [group, isOpen, initialAnalysis, analysisFetched, group?.id, group?.name]); // 👈 Added missing dependencies

  if (!isOpen) {
    console.log('🚪 [GroupModal] Not open, returning null');
    return null;
  }

  // ... rest of the component remains the same ...
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (err) {
      console.error('❌ [GroupModal] Date formatting error:', err);
      return 'Invalid date';
    }
  };

  // Derived state
  const isDeleted = group?.isDeleted || group?.status === 'DELETED' || false;
  const isSuspended = group?.status === 'SUSPENDED' || false;
  const availableActions = groupAnalysis?.availableActions || [];

  console.log('📊 [GroupModal] Derived state:', {
    isDeleted,
    isSuspended,
    availableActions: availableActions.map(a => a.action),
    showDeleteOptions,
    fetchError
  });

  const canExecuteAction = (action: ActionType): boolean =>
    groupAnalysis?.availableActions.some(a => a.action === action && a.canExecute) || false;

  const getActionReason = (action: ActionType): string | null =>
    groupAnalysis?.availableActions.find(a => a.action === action)?.reason || null;

  // Action handlers
  const handleActionClick = (action: ActionType) => {
    console.log(`🎬 [GroupModal] Action clicked: "${action}"`);
    setSelectedAction(action);

    if (action === 'SOFT_DELETE' || action === 'HARD_DELETE') {
      console.log(`🗑️ [GroupModal] Showing delete confirmation for: "${action}"`);
      setShowDeleteOptions(true);
    } else if (action === 'RESTORE') {
      handleRestore();
    } else if (action === 'SUSPEND') {
      handleSuspend();
    } else if (onApplyAction) {
      handleApplyAction(action);
    }
  };

  const handleSuspend = async () => {
    if (!group) return;
    console.log('⚠️ [GroupModal] Suspending group:', { id: group.id, name: group.name });
    setActionLoading(true);
    try {
      if (onApplyAction) {
        await onApplyAction(group.id, 'SUSPEND');
        console.log('✅ [GroupModal] Suspend success');
      }
    } catch (err) {
      console.error('❌ [GroupModal] Suspend failed:', err);
    } finally {
      if (isMountedRef.current) {
        setActionLoading(false);
        setSelectedAction(null);
        console.log('🏁 [GroupModal] actionLoading → false (suspend)');
      }
    }
  };

  const handleRestore = async () => {
    if (!group) return;
    console.log('♻️ [GroupModal] Restoring group:', { id: group.id, name: group.name });
    setActionLoading(true);
    try {
      if (onRestore) {
        await onRestore(group.id);
        console.log('✅ [GroupModal] Restore success');
      } else if (onApplyAction) {
        await onApplyAction(group.id, 'RESTORE');
        console.log('✅ [GroupModal] Restore success (via applyAction)');
      }
    } catch (err) {
      console.error('❌ [GroupModal] Restore failed:', err);
    } finally {
      if (isMountedRef.current) {
        setActionLoading(false);
        setSelectedAction(null);
        console.log('🏁 [GroupModal] actionLoading → false (restore)');
      }
    }
  };

  const handleApplyAction = async (action: ActionType) => {
    if (!group || !onApplyAction) return;
    console.log(`🎬 [GroupModal] Applying action "${action}" to group:`, { id: group.id, name: group.name });
    setActionLoading(true);
    try {
      await onApplyAction(group.id, action);
      console.log(`✅ [GroupModal] Action "${action}" success`);
    } catch (err) {
      console.error(`❌ [GroupModal] Action "${action}" failed:`, err);
    } finally {
      if (isMountedRef.current) {
        setActionLoading(false);
        setSelectedAction(null);
        console.log(`🏁 [GroupModal] actionLoading → false (${action})`);
      }
    }
  };

  const handleDeleteConfirm = (hardDelete: boolean) => {
    if (!group) return;
    const mode = hardDelete ? 'HARD DELETE' : 'SOFT DELETE';
    console.log(`🗑️ [GroupModal] Confirming ${mode} for group:`, { id: group.id, name: group.name });
    onDelete(group.id, hardDelete);
    setShowDeleteOptions(false);
  };

  const handleCancelDelete = () => {
    console.log('🚫 [GroupModal] Delete cancelled');
    setShowDeleteOptions(false);
    setSelectedAction(null);
  };

  const handleRetryAnalysis = () => {
    console.log('🔄 [GroupModal] Retrying analysis fetch');
    setAnalysisFetched(false);
    setFetchError(null);
  };

  const groupWithDetails = group as GroupWithDetails | null;

  console.log(`🪟 [GroupModal] Final render — group: "${groupWithDetails?.name ?? 'null'}"`,
    `| loading: ${loading}`,
    `| actionLoading: ${actionLoading}`,
    `| isDeleted: ${isDeleted}`,
    `| isSuspended: ${isSuspended}`,
    `| analysis: ${groupAnalysis ? `loaded (${groupAnalysis.reportCount} reports)` : fetchError ? 'error' : 'none'}`,
    `| availableActions: ${availableActions.map(a => a.action).join(', ') || 'none'}`
  );

  return (
    <div className="modal-overlay" onClick={() => {
      console.log('👆 [GroupModal] Overlay clicked');
      onClose();
    }}>
      <div className="modal-content group-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <h2>
            <span className="modal-header-icon">👥</span>
            Group Details
            {isDeleted && <span className="deleted-badge-modal">Deleted</span>}
            {isSuspended && <span className="suspended-badge-modal">Suspended</span>}
          </h2>
          <button className="modal-close" onClick={() => {
            console.log('❌ [GroupModal] Close button clicked');
            onClose();
          }}>×</button>
        </div>

        {/* Body */}
        {loading || actionLoading ? (
          <div className="modal-loading">
            <LoadingScreen
              message={
                actionLoading
                  ? `Applying ${selectedAction ? ACTION_BUTTONS[selectedAction].label.toLowerCase() : 'action'}...`
                  : 'Loading group details...'
              }
            />
          </div>
        ) : groupWithDetails ? (
          <div className="modal-body">

            {/* Group Header */}
            <div className={`group-header ${isDeleted ? 'deleted' : ''} ${isSuspended ? 'suspended' : ''}`}>
              {groupWithDetails.avatarUrl ? (
                <img
                  src={groupWithDetails.avatarUrl}
                  alt={groupWithDetails.name}
                  className="group-avatar-large"
                  onError={() => console.log('🖼️ [GroupModal] Avatar failed to load')}
                />
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

            {/* Status Badges */}
            <div className="status-badges">
              <span className={`status-badge ${groupWithDetails.status?.toLowerCase() || 'active'}`}>
                {groupWithDetails.status || 'ACTIVE'}
              </span>
              {groupAnalysis?.requiresImmediateAction && (
                <span className="status-badge urgent">
                  <FontAwesomeIcon icon={faExclamationTriangle} /> Urgent
                </span>
              )}
            </div>

            {/* Basic Information */}
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
                  <span className="modal-info-value rotation-week">
                    Week {groupWithDetails.currentRotationWeek}
                  </span>
                </div>
                {groupWithDetails.lastRotationUpdate && (
                  <div className="modal-info-item">
                    <span className="modal-info-label">Last Rotation</span>
                    <span className="modal-info-value">
                      {formatDate(groupWithDetails.lastRotationUpdate)}
                    </span>
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
                  <span className="stat-value">{groupWithDetails._count?.reports || 0}</span>
                </div>
                {groupWithDetails.stats && (
                  <div className="stat-item">
                    <span className="stat-label">Completion</span>
                    <span className="stat-value">
                      {groupWithDetails.stats.completionRate.toFixed(1)}%
                    </span>
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
                  <button className="retry-btn" onClick={handleRetryAnalysis}>
                    Retry
                  </button>
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
                      <div
                        key={idx}
                        className={`report-type-mini ${type.meetsThreshold ? 'threshold-met' : ''}`}
                      >
                        <span className="report-type-name">{type.type.replace(/_/g, ' ')}</span>
                        <span className="report-type-count">{type.count}/{type.threshold}</span>
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
                          <img 
                            src={member.user.avatarUrl} 
                            alt={member.user.fullName}
                            onError={() => console.log('🖼️ [GroupModal] Member avatar failed to load')}
                          />
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

        {/* Footer */}
        <div className="modal-footer">
          {!showDeleteOptions ? (
            <div className="modal-action-buttons">
              {isDeleted ? (
                <button
                  className={`modal-action-btn restore ${!canExecuteAction('RESTORE') ? 'disabled' : ''}`}
                  onClick={() => handleActionClick('RESTORE')}
                  disabled={!canExecuteAction('RESTORE') || actionLoading}
                  title={getActionReason('RESTORE') || 'Restore group'}
                  style={{
                    backgroundColor: canExecuteAction('RESTORE') ? ACTION_BUTTONS.RESTORE.hoverColor : undefined,
                    color: 'white',
                  }}
                >
                  <FontAwesomeIcon icon={ACTION_ICONS.RESTORE} />
                  <span>Restore Group</span>
                </button>
              ) : (
                <>
                  {availableActions.some(a => a.action === 'SUSPEND') && (
                    <button
                      className={`modal-action-btn suspend ${!canExecuteAction('SUSPEND') ? 'disabled' : ''}`}
                      onClick={() => handleActionClick('SUSPEND')}
                      disabled={!canExecuteAction('SUSPEND') || actionLoading}
                      title={getActionReason('SUSPEND') || 'Suspend group'}
                      style={{
                        backgroundColor: canExecuteAction('SUSPEND') ? ACTION_BUTTONS.SUSPEND.hoverColor : undefined,
                        color: 'white',
                      }}
                    >
                      <FontAwesomeIcon icon={ACTION_ICONS.SUSPEND} />
                      <span>Suspend Group</span>
                    </button>
                  )}

                  {availableActions.some(a => a.action === 'SOFT_DELETE') && (
                    <button
                      className={`modal-action-btn soft-delete ${!canExecuteAction('SOFT_DELETE') ? 'disabled' : ''}`}
                      onClick={() => handleActionClick('SOFT_DELETE')}
                      disabled={!canExecuteAction('SOFT_DELETE') || actionLoading}
                      title={getActionReason('SOFT_DELETE') || 'Soft delete group'}
                      style={{
                        backgroundColor: canExecuteAction('SOFT_DELETE') ? ACTION_BUTTONS.SOFT_DELETE.hoverColor : undefined,
                        color: 'white',
                      }}
                    >
                      <FontAwesomeIcon icon={ACTION_ICONS.SOFT_DELETE} />
                      <span>Soft Delete</span>
                    </button>
                  )}

                  {availableActions.some(a => a.action === 'HARD_DELETE') && (
                    <button
                      className={`modal-action-btn hard-delete ${!canExecuteAction('HARD_DELETE') ? 'disabled' : ''}`}
                      onClick={() => handleActionClick('HARD_DELETE')}
                      disabled={!canExecuteAction('HARD_DELETE') || actionLoading}
                      title={getActionReason('HARD_DELETE') || 'Hard delete group'}
                      style={{
                        backgroundColor: canExecuteAction('HARD_DELETE') ? ACTION_BUTTONS.HARD_DELETE.hoverColor : undefined,
                        color: 'white',
                      }}
                    >
                      <FontAwesomeIcon icon={ACTION_ICONS.HARD_DELETE} />
                      <span>Hard Delete</span>
                    </button>
                  )}
                </>
              )}

              <button
                className="modal-close-btn"
                onClick={() => {
                  console.log('❌ [GroupModal] Close button clicked');
                  onClose();
                }}
                disabled={actionLoading}
              >
                Close
              </button>
            </div>
          ) : (
            <div className="delete-options-modal">
              <p>Delete this group?</p>
              <div className="delete-actions-modal">
                <button
                  className={`delete-soft-modal ${!canExecuteAction('SOFT_DELETE') ? 'disabled' : ''}`}
                  onClick={() => handleDeleteConfirm(false)}
                  disabled={!canExecuteAction('SOFT_DELETE') || actionLoading}
                  title={!canExecuteAction('SOFT_DELETE') ? 'Threshold not met' : 'Archive group'}
                >
                  {actionLoading && selectedAction === 'SOFT_DELETE' ? 'Deleting...' : 'Soft Delete'}
                </button>
                <button
                  className={`delete-hard-modal ${!canExecuteAction('HARD_DELETE') ? 'disabled' : ''}`}
                  onClick={() => handleDeleteConfirm(true)}
                  disabled={!canExecuteAction('HARD_DELETE') || actionLoading}
                  title={!canExecuteAction('HARD_DELETE') ? 'Threshold not met' : 'Permanently delete'}
                >
                  {actionLoading && selectedAction === 'HARD_DELETE' ? 'Deleting...' : 'Hard Delete'}
                </button>
                <button
                  className="delete-cancel-modal"
                  onClick={handleCancelDelete}
                  disabled={actionLoading}
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