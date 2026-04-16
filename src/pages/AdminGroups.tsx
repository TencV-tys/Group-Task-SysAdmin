// pages/AdminGroups.tsx - UPDATED: Threshold-based separate action buttons + Soft Delete stat card
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAdminGroups } from '../hooks/useAdminGroups';
import { AdminGroupsService, ACTION_BUTTONS, GroupStatus } from '../services/admin.groups.service';
import type { 
  Group, 
  ReportAnalysis,  
  GroupFilters,
} from '../services/admin.groups.service';
import GroupModal from '../components/GroupModal';
import LoadingScreen from '../components/LoadingScreen';
import ErrorDisplay from '../components/ErrorDisplay';
import { adminSocket } from '../services/adminSocket';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExclamationTriangle,
  faFlag,
  faTrash,
  faUndo,
  faEye,
  faRedoAlt,
  faSearch,
  faChevronLeft,
  faChevronRight,
  faUsers,
  faTasks,
  faArrowUp,
  faBan,
  faExclamationCircle,
} from '@fortawesome/free-solid-svg-icons';
import './styles/AdminGroups.css';

// ✅ THRESHOLD CONSTANTS — mirror backend REPORT_COUNT_THRESHOLDS
const REPORT_THRESHOLDS = {
  SUSPEND: 3,      // 3–5 reports  → SUSPEND
  SOFT_DELETE: 6,  // 6–9 reports  → SOFT_DELETE
  HARD_DELETE: 10, // 10+ reports  → HARD_DELETE
};

interface LocalGroupFilters {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  search?: string;
  status?: string;
  hasReports?: boolean;
}

interface GroupResponseSuccess {
  success: true;
  group: Group & {
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
  };
  message: string;
}

interface GroupResponseError {
  success: false;
  message: string;
}

type GroupResponse = GroupResponseSuccess | GroupResponseError;

interface GroupWithAnalysis extends Group {
  reportAnalysis?: ReportAnalysis | null;
}

// ─────────────────────────────────────────────
// Helper: derive which actions are available
// from a group's report count (no analysis fetch needed for table)
// ─────────────────────────────────────────────
function getActionsFromReportCount(reportCount: number, isDeleted: boolean, isSuspended: boolean) {
  const actions: string[] = [];
  if (isDeleted) {
    actions.push('RESTORE');
    return actions;
  }
  if (reportCount >= REPORT_THRESHOLDS.HARD_DELETE) actions.push('HARD_DELETE');
  else if (reportCount >= REPORT_THRESHOLDS.SOFT_DELETE) actions.push('SOFT_DELETE');
  else if (reportCount >= REPORT_THRESHOLDS.SUSPEND) actions.push('SUSPEND');
  if (isSuspended) actions.push('RESTORE');
  return actions;
}

type ActionType = 'SUSPEND' | 'SOFT_DELETE' | 'HARD_DELETE' | 'RESTORE' | 'REVIEW';

const AdminGroups: React.FC = () => {
  console.log('🏁 [AdminGroups] Component rendering');
  
  const {
    groups,
    loading,
    error,
    stats,
    pagination,
    actionLoading,
    fetchGroups,
    fetchStats,
    analyzeGroup,
    applyAction,
    deleteGroup,
    getGroupById,
  } = useAdminGroups();

  const [filters, setFilters] = useState<LocalGroupFilters>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [hasUpdates, setHasUpdates] = useState(false);
  
  // Modal states
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<ReportAnalysis | null>(null);

  // Track inline action loading per group row
  const [rowActionLoading, setRowActionLoading] = useState<string | null>(null);

  const initialLoadDoneRef = useRef(false);
  const statsLoadedRef = useRef(false);
  const updateTimeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  // ===== Build API filters =====
  const buildApiFilters = useCallback((customFilters?: Partial<LocalGroupFilters>): GroupFilters => {
    const currentFilters = customFilters || filters;
    const apiFilters: GroupFilters = { 
      page: currentFilters.page,
      limit: currentFilters.limit,
      sortBy: currentFilters.sortBy,
      sortOrder: currentFilters.sortOrder,
    };
    const currentStatus = customFilters?.status !== undefined ? customFilters.status : statusFilter;
    if (currentStatus !== 'ALL') apiFilters.status = currentStatus as GroupStatus;
    const currentSearch = customFilters?.search !== undefined ? customFilters.search : searchInput;
    if (currentSearch) apiFilters.search = currentSearch;
    if (currentFilters.hasReports) apiFilters.hasReports = currentFilters.hasReports;
    return apiFilters;
  }, [filters, statusFilter, searchInput]);

  const loadGroups = useCallback(async (filterParams?: Partial<LocalGroupFilters>) => {
    if (!isMountedRef.current) return;
    await fetchGroups(buildApiFilters(filterParams));
  }, [fetchGroups, buildApiFilters]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([loadGroups(), fetchStats()]).finally(() => {
      if (isMountedRef.current) { setRefreshing(false); setHasUpdates(false); }
    });
  }, [loadGroups, fetchStats]);

  // ===== Real-time socket =====
  useEffect(() => {
    isMountedRef.current = true;
    const handleGroupUpdate = () => {
      if (!isMountedRef.current) return;
      setHasUpdates(true);
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = window.setTimeout(() => {
        if (isMountedRef.current) handleRefresh();
      }, 1500);
    };
    adminSocket.on('group:suspended', handleGroupUpdate);
    adminSocket.on('group:deleted', handleGroupUpdate);
    adminSocket.on('group:restored', handleGroupUpdate);
    adminSocket.on('group:admin_action', handleGroupUpdate);
    return () => {
      isMountedRef.current = false;
      adminSocket.off('group:suspended');
      adminSocket.off('group:deleted');
      adminSocket.off('group:restored');
      adminSocket.off('group:admin_action');
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    };
  }, [handleRefresh]);

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(() => {
      if (isMountedRef.current && !loading && !refreshing && !modalLoading) {
        loadGroups(); fetchStats();
      }
    }, 30000);
    return () => clearInterval(id);
  }, [loadGroups, fetchStats, loading, refreshing, modalLoading]);

  // Refresh on page visibility
  useEffect(() => {
    const handler = () => {
      if (!document.hidden && isMountedRef.current && !loading && !refreshing) handleRefresh();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [handleRefresh, loading, refreshing]);

  // Initial loads
  useEffect(() => {
    if (!initialLoadDoneRef.current) { initialLoadDoneRef.current = true; loadGroups(); }
  }, [loadGroups]);
  useEffect(() => {
    if (!statsLoadedRef.current) { statsLoadedRef.current = true; fetchStats(); }
  }, [fetchStats]);

  // ===== Filter handlers =====
  const handleSearch = () => {
    const nf = { ...filters, page: 1, search: searchInput };
    setFilters(nf); loadGroups(nf);
  };
  const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearch(); };
  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    const nf = { ...filters, page: 1, hasReports: undefined, status };
    setFilters(nf); loadGroups(nf);
  };
  const handlePageChange = (newPage: number) => {
    const nf = { ...filters, page: newPage };
    setFilters(nf); loadGroups(nf);
  };
  const handleSortChange = (sortBy: string) => {
    const nf = { ...filters, sortBy, page: 1 };
    setFilters(nf); loadGroups(nf);
  };
  const handleSortOrderToggle = () => {
    const nf: LocalGroupFilters = { ...filters, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc', page: 1 };
    setFilters(nf); loadGroups(nf);
  };
  const handleStatClick = (status: string) => {
    if (status === 'REPORTS') {
      const nf = { ...filters, hasReports: true, page: 1 };
      setStatusFilter('ALL'); setFilters(nf); loadGroups(nf);
    } else {
      const nf = { ...filters, hasReports: undefined, page: 1, status };
      setStatusFilter(status); setFilters(nf); loadGroups(nf);
    }
  };
  const clearFilters = () => {
    setSearchInput(''); setStatusFilter('ALL');
    const nf: LocalGroupFilters = { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' };
    setFilters(nf); loadGroups(nf);
  };

  // ===== Report analysis modal =====
  const handleAnalyzeReports = async (groupId: string) => {
    const result = await analyzeGroup(groupId);
    if (result.success && result.analysis) {
      setSelectedAnalysis(result.analysis);
      setShowReportModal(true);
    } else {
      alert('Could not analyze reports for this group');
    }
  };

  // ===== Apply action from report modal =====
  const handleApplyActionFromModal = async (groupId: string, action: ActionType) => {
    const result = await applyAction(groupId, action);
    if (result.success) {
      alert(`${ACTION_BUTTONS[action]?.label ?? action} applied successfully`);
      setShowReportModal(false);
      setSelectedAnalysis(null);
      await loadGroups(); await fetchStats();
    } else {
      alert(result.message || 'Failed to apply action');
    }
  };

  // ===== Inline row action buttons =====
  const handleRowAction = async (e: React.MouseEvent, groupId: string, action: ActionType) => {
    e.stopPropagation();
    e.preventDefault();
    if (rowActionLoading) return;

    // Soft/hard delete → show confirm modal
    if (action === 'SOFT_DELETE' || action === 'HARD_DELETE') {
      setShowDeleteModal(groupId + ':' + action);
      return;
    }

    setRowActionLoading(groupId + ':' + action);
    try {
      const result = await applyAction(groupId, action);
      if (result.success) {
        await loadGroups(); await fetchStats();
      } else {
        alert(result.message || `Failed to apply ${action}`);
      }
    } finally {
      setRowActionLoading(null);
    }
  };

  // ===== View group details =====
  const handleViewGroup = async (groupId: string) => {
    if (selectedRowId === groupId) return;
    setSelectedRowId(groupId);
    setModalLoading(true);
    try {
      const result = await getGroupById(groupId) as GroupResponse;
      if (result.success && result.group) {
        setSelectedGroup(result.group);
        setShowModal(true);
      } else {
        alert('Failed to load group details');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
      setSelectedRowId(null);
    }
  };

 // ===== Delete confirm modal =====
const parseDeleteModal = () => {
  if (!showDeleteModal) return { groupId: null, action: null };
  const parts = showDeleteModal.split(':');
  if (parts.length === 2) return { groupId: parts[0], action: parts[1] as ActionType };
  return { groupId: showDeleteModal, action: null };
};

const { groupId: deleteGroupId, action: deleteAction } = parseDeleteModal();

const handleDeleteConfirm = async (hardDelete?: boolean) => {
  if (!deleteGroupId) return;

  const isHard = deleteAction === 'HARD_DELETE' || hardDelete === true;
  setDeleteLoading(true);
  try {
    const result = await deleteGroup(deleteGroupId, isHard);
    if (result.success) {
      setShowDeleteModal(null);
      setShowModal(false);
      alert('Group deleted successfully!');
      await loadGroups(); 
      await fetchStats();
    } else {
      alert(result.message || 'Failed to delete group');
    }
  } finally {
    setDeleteLoading(false);
  }
};

const handleRestore = async (groupIdParam: string) => {
  setDeleteLoading(true);
  try {
    const result = await applyAction(groupIdParam, 'RESTORE');
    if (result.success) {
      alert('Group restored successfully!');
      setShowDeleteModal(null);
      setShowReportModal(false);
      setShowModal(false);
      await loadGroups(); 
      await fetchStats();
    } else {
      alert(result.message || 'Failed to restore group');
    }
  } finally {
    setDeleteLoading(false);
  }
};

  const closeModal = () => { setShowModal(false); setTimeout(() => setSelectedGroup(null), 300); };
  const closeDeleteModal = () => setShowDeleteModal(null);
  const closeReportModal = () => { setShowReportModal(false); setTimeout(() => setSelectedAnalysis(null), 300); };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return 'Invalid date'; }
  }; 

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  if (loading && groups.length === 0) return <LoadingScreen message="Loading groups..." fullScreen />;

  return (
    <div className="groups-wrapper">
      <div className="groups-container">

        {/* ── Header ── */}
        <div className="groups-header">
          <div className="groups-header-left">
            <h1>
              <span className="groups-header-icon">👥</span>
              Manage Groups
              {hasUpdates && (
                <span className="groups-update-badge">
                  <FontAwesomeIcon icon={faArrowUp} /> New Updates
                </span>
              )}
            </h1>
            <p>View and manage all user groups</p>
          </div>
          <div className="groups-header-actions">
            <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing}>
              <FontAwesomeIcon icon={faRedoAlt} className={refreshing ? 'fa-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* ── Stats Cards ── */}
        {stats && (
          <div className="groups-stats">
            {/* Total */}
            <div
              className={`groups-stat-card ${statusFilter === 'ALL' && !filters.hasReports ? 'active' : ''}`}
              onClick={() => handleStatClick('ALL')}
              style={{ cursor: 'pointer' }}
            >
              <span className="groups-stat-value">{stats.overview.total}</span>
              <span className="groups-stat-label">Total Groups</span>
              {statusFilter === 'ALL' && !filters.hasReports && <div className="stat-active-indicator" />}
            </div>

            {/* Active */}
            <div
              className={`groups-stat-card ${statusFilter === 'ACTIVE' ? 'active' : ''}`}
              onClick={() => handleStatClick('ACTIVE')}
              style={{ cursor: 'pointer' }}
            >
              <span className="groups-stat-value">{stats.overview.active || 0}</span>
              <span className="groups-stat-label">Active</span>
              {statusFilter === 'ACTIVE' && <div className="stat-active-indicator" />}
            </div>

            {/* Suspended */}
            <div
              className={`groups-stat-card ${statusFilter === 'SUSPENDED' ? 'active' : ''}`}
              onClick={() => handleStatClick('SUSPENDED')}
              style={{ cursor: 'pointer' }}
            >
              <span className="groups-stat-value">{stats.overview.suspended || 0}</span>
              <span className="groups-stat-label">Suspended</span>
              {statusFilter === 'SUSPENDED' && <div className="stat-active-indicator" />}
            </div>

            {/* ✅ CHANGED: "Soft Deleted" instead of "Deleted/Hard Deleted" */}
            <div
              className={`groups-stat-card ${statusFilter === 'DELETED' ? 'active' : ''}`}
              onClick={() => handleStatClick('DELETED')}
              style={{ cursor: 'pointer' }}
            >
              <span className="groups-stat-value">{stats.overview.deleted || 0}</span>
              <span className="groups-stat-label">Soft Deleted</span>
              {statusFilter === 'DELETED' && <div className="stat-active-indicator" />}
            </div>

            {/* With Reports */}
            <div
              className={`groups-stat-card reports ${filters.hasReports ? 'active' : ''}`}
              onClick={() => handleStatClick('REPORTS')}
              style={{ cursor: 'pointer' }}
            >
              <span className="groups-stat-value">{stats.overview.withReports || 0}</span>
              <span className="groups-stat-label">With Reports</span>
              {filters.hasReports && <div className="stat-active-indicator" />}
            </div>
          </div>
        )}

        {/* ── Filters ── */}
        <div className="groups-filters">
          <div className="groups-search">
            <div className="groups-search-wrapper">
              <FontAwesomeIcon icon={faSearch} className="groups-search-icon" />
              <input
                type="text"
                placeholder="Search groups by name, description..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="groups-search-input"
              />
              <button className="groups-search-btn" onClick={handleSearch} disabled={loading}>
                Search
              </button>
            </div>
          </div>

          <div className="groups-filter-row">
            <div className="groups-filter-group">
              <label>Sort By</label>
              <div className="groups-sort-controls">
                <select value={filters.sortBy} onChange={(e) => handleSortChange(e.target.value)} className="groups-select" disabled={loading}>
                  <option value="createdAt">Created Date</option>
                  <option value="name">Name</option>
                  <option value="updatedAt">Last Updated</option>
                </select>
                <button className="groups-sort-order" onClick={handleSortOrderToggle} disabled={loading}>
                  {filters.sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
            <div className="groups-filter-group">
              <label>Status Filter</label>
              <select value={statusFilter} onChange={(e) => handleStatusChange(e.target.value)} className="groups-select" disabled={loading}>
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="DELETED">Soft Deleted</option>
              </select>
            </div>
          </div>

          {(searchInput || statusFilter !== 'ALL' || filters.hasReports) && (
            <div className="groups-active-filters">
              <button className="groups-clear-filters" onClick={clearFilters}>Clear Filters</button>
            </div>
          )}
        </div>

        {/* ── Error ── */}
        {error && <ErrorDisplay message={error} onRetry={handleRefresh} />}

        {/* ── Table or Empty ── */}
        {groups.length === 0 ? (
          <div className="groups-empty">
            <div className="groups-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="8" r="4" />
                <path d="M5.5 20v-2a5 5 0 0 1 10 0v2" />
                <path d="M20 12h-4M16 8h4M20 4h-4" />
              </svg>
            </div>
            <h3 className="groups-empty-title">No groups found</h3>
            <p className="groups-empty-message">
              {searchInput || statusFilter !== 'ALL' || filters.hasReports
                ? 'No groups match your current filters. Try adjusting your search.'
                : 'There are no groups available yet.'}
            </p>
            {(searchInput || statusFilter !== 'ALL' || filters.hasReports) && (
              <button className="groups-empty-btn" onClick={clearFilters}>Clear Filters</button>
            )}
          </div>
        ) : (
          <>
            <div className="groups-results-summary">
              <span>Showing {groups.length} of {pagination.total} groups</span>
            </div>

            <div className="groups-table-container">
              <table className="groups-table">
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>Members</th>
                    <th>Tasks</th>
                    <th>Reports</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => {
                    const isDeleted = AdminGroupsService.isGroupDeleted(group);
                    const isSuspended = AdminGroupsService.isGroupSuspended(group);
                    const groupWithAnalysis = group as GroupWithAnalysis;
                    const reportCount = group._count?.reports || 0;
                    const reportAnalysis = groupWithAnalysis.reportAnalysis;

                    // ✅ Derive which action buttons to show from report count
                    const rowActions = getActionsFromReportCount(reportCount, isDeleted, isSuspended);

                    return (
                      <tr
                        key={group.id}
                        onClick={() => handleViewGroup(group.id)}
                        className={`groups-row ${selectedRowId === group.id ? 'selected' : ''} ${isDeleted ? 'deleted' : ''} ${isSuspended ? 'suspended' : ''}`}
                      >
                        {/* Group name */}
                        <td>
                          <div className="groups-user-info">
                            <div className="groups-user-avatar">
                              {group.avatarUrl ? (
                                <img src={group.avatarUrl} alt={group.name} />
                              ) : (
                                <span>{isDeleted ? '🗑️' : isSuspended ? '⚠️' : group.name?.charAt(0).toUpperCase() || 'G'}</span>
                              )}
                            </div>
                            <div>
                              <div className="groups-user-name">
                                {group.name}
                                {isDeleted && <span className="deleted-badge">Deleted</span>}
                                {isSuspended && <span className="suspended-badge">Suspended</span>}
                              </div>
                              <div className="groups-user-email">ID: {group.id.slice(0, 8)}...</div>
                              {group.description && (
                                <div className="groups-user-email">{group.description.substring(0, 30)}...</div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Members */}
                        <td>
                          <span className="groups-type-badge members">
                            <FontAwesomeIcon icon={faUsers} />
                            {group._count?.members || 0}
                          </span>
                        </td>

                        {/* Tasks */}
                        <td>
                          <span className="groups-type-badge tasks">
                            <FontAwesomeIcon icon={faTasks} />
                            {group._count?.tasks || 0}
                          </span>
                        </td>

                        {/* Reports + threshold badge */}
                        <td>
                          <div className="reports-cell">
                            <span className={`groups-type-badge reports ${reportCount > 0 ? 'warning' : ''}`}>
                              <FontAwesomeIcon icon={faFlag} />
                              {reportCount}
                            </span>
                            {/* Show threshold label alongside count */}
                            {reportCount >= REPORT_THRESHOLDS.HARD_DELETE && (
                              <span className="threshold-badge critical">HARD DELETE</span>
                            )}
                            {reportCount >= REPORT_THRESHOLDS.SOFT_DELETE && reportCount < REPORT_THRESHOLDS.HARD_DELETE && (
                              <span className="threshold-badge high">SOFT DELETE</span>
                            )}
                            {reportCount >= REPORT_THRESHOLDS.SUSPEND && reportCount < REPORT_THRESHOLDS.SOFT_DELETE && (
                              <span className="threshold-badge medium">SUSPEND</span>
                            )}
                            {reportAnalysis?.requiresImmediateAction && (
                              <button
                                className="report-warning-btn"
                                onClick={(e) => { e.stopPropagation(); handleAnalyzeReports(group.id); }}
                                title="Reports require immediate attention"
                              >
                                <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: '#fa5252' }} />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td>
                          <span className={`status-badge ${group.status?.toLowerCase() || 'active'}`}>
                            {group.status || 'ACTIVE'}
                          </span>
                        </td>

                        {/* Created */}
                        <td>
                          <div className="groups-date">
                            <span className="groups-date-icon">📅</span>
                            {formatDate(group.createdAt)}
                          </div>
                        </td>

                        {/* ✅ Action buttons — separated by threshold */}
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="groups-action-buttons">
                            {/* View always shown */}
                            <button
                              className="groups-view-btn"
                              onClick={(e) => { e.stopPropagation(); handleViewGroup(group.id); }}
                              disabled={loading}
                              title="View details"
                            >
                              <FontAwesomeIcon icon={faEye} />
                              <span>View</span>
                            </button>

                            {/* RESTORE — for deleted or suspended groups */}
                            {(isDeleted || rowActions.includes('RESTORE')) && (
                              <button
                                className="groups-restore-btn"
                                onClick={(e) => { e.stopPropagation(); handleRestore(group.id); }}
                                disabled={!!rowActionLoading || deleteLoading}
                                title="Restore group"
                              >
                                <FontAwesomeIcon icon={faUndo} />
                                <span>Restore</span>
                              </button>
                            )}

                            {/* SUSPEND — 3–5 reports */}
                            {!isDeleted && rowActions.includes('SUSPEND') && (
                              <button
                                className="groups-suspend-btn"
                                onClick={(e) => handleRowAction(e, group.id, 'SUSPEND')}
                                disabled={rowActionLoading === `${group.id}:SUSPEND`}
                                title={`Suspend (${reportCount} reports — threshold: ${REPORT_THRESHOLDS.SUSPEND})`}
                              >
                                <FontAwesomeIcon icon={faExclamationCircle} />
                                <span>{rowActionLoading === `${group.id}:SUSPEND` ? '...' : 'Suspend'}</span>
                              </button>
                            )}

                            {/* SOFT DELETE — 6–9 reports */}
                            {!isDeleted && rowActions.includes('SOFT_DELETE') && (
                              <button
                                className="groups-softdelete-btn"
                                onClick={(e) => handleRowAction(e, group.id, 'SOFT_DELETE')}
                                disabled={!!rowActionLoading}
                                title={`Soft delete (${reportCount} reports — threshold: ${REPORT_THRESHOLDS.SOFT_DELETE})`}
                              >
                                <FontAwesomeIcon icon={faTrash} />
                                <span>Soft Del</span>
                              </button>
                            )}

                            {/* HARD DELETE — 10+ reports */}
                            {!isDeleted && rowActions.includes('HARD_DELETE') && (
                              <button
                                className="groups-harddelete-btn"
                                onClick={(e) => handleRowAction(e, group.id, 'HARD_DELETE')}
                                disabled={!!rowActionLoading}
                                title={`Hard delete (${reportCount} reports — threshold: ${REPORT_THRESHOLDS.HARD_DELETE})`}
                              >
                                <FontAwesomeIcon icon={faBan} />
                                <span>Hard Del</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="groups-pagination">
                <button className="groups-pagination-btn" disabled={filters.page === 1 || loading} onClick={() => handlePageChange(filters.page - 1)}>
                  <FontAwesomeIcon icon={faChevronLeft} />
                </button>
                <span className="groups-pagination-info">Page {filters.page} of {totalPages}</span>
                <button className="groups-pagination-btn" disabled={filters.page === totalPages || loading} onClick={() => handlePageChange(filters.page + 1)}>
                  <FontAwesomeIcon icon={faChevronRight} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Group Detail Modal ── */}
      {showModal && selectedGroup && (
        <GroupModal
          isOpen={showModal}
          onClose={closeModal}
          group={selectedGroup}
          loading={modalLoading}
          onDelete={handleDeleteConfirm}
          onRestore={handleRestore}
          onApplyAction={handleApplyActionFromModal}
          reportAnalysis={selectedAnalysis}
        />
      )}

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteModal && (
        <div className="groups-delete-overlay" onClick={closeDeleteModal}>
          <div className="groups-delete-confirm" onClick={(e) => e.stopPropagation()}>
            <p>
              {deleteAction === 'HARD_DELETE'
                ? '⚠️ Permanently delete this group? This cannot be undone.'
                : deleteAction === 'SOFT_DELETE'
                ? 'Archive (soft delete) this group?'
                : 'Delete this group?'}
            </p>
            <div className="confirm-actions">
              {/* If action is already determined from row button */}
              {deleteAction === 'SOFT_DELETE' && (
                <button className="confirm-soft" onClick={() => handleDeleteConfirm(false)} disabled={deleteLoading}>
                  {deleteLoading ? 'Deleting...' : 'Soft Delete'}
                </button>
              )}
              {deleteAction === 'HARD_DELETE' && (
                <button className="confirm-hard" onClick={() => handleDeleteConfirm(true)} disabled={deleteLoading}>
                  {deleteLoading ? 'Deleting...' : 'Hard Delete'}
                </button>
              )}
              {/* Legacy: no action pre-selected, show both */}
              {!deleteAction && (
                <>
                  <button className="confirm-soft" onClick={() => handleDeleteConfirm(false)} disabled={deleteLoading}>
                    {deleteLoading ? 'Deleting...' : 'Soft Delete'}
                  </button>
                  <button className="confirm-hard" onClick={() => handleDeleteConfirm(true)} disabled={deleteLoading}>
                    {deleteLoading ? 'Deleting...' : 'Hard Delete'}
                  </button>
                </>
              )}
              <button className="confirm-cancel" onClick={closeDeleteModal} disabled={deleteLoading}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Report Analysis Modal ── */}
      {showReportModal && selectedAnalysis && (
        <div className="modal-overlay" onClick={closeReportModal}>
          <div className="modal-content report-analysis-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <FontAwesomeIcon icon={faFlag} style={{ marginRight: '8px' }} />
                Report Analysis — {selectedAnalysis.groupName}
              </h2>
              <button className="modal-close" onClick={closeReportModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="analysis-summary">
                <div className="summary-stat">
                  <span className="summary-label">Total Reports</span>
                  <span className="summary-value">{selectedAnalysis.reportCount}</span>
                </div>
                {selectedAnalysis.requiresImmediateAction && (
                  <div className="urgent-warning">
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                    <span>Urgent action required!</span>
                  </div>
                )}
              </div>

              {/* Threshold guide */}
              <div className="threshold-guide">
                <div className={`threshold-item ${selectedAnalysis.reportCount >= REPORT_THRESHOLDS.SUSPEND ? 'met' : ''}`}>
                  <span className="threshold-dot medium" />
                  <span>Suspend: {REPORT_THRESHOLDS.SUSPEND}+ reports</span>
                </div>
                <div className={`threshold-item ${selectedAnalysis.reportCount >= REPORT_THRESHOLDS.SOFT_DELETE ? 'met' : ''}`}>
                  <span className="threshold-dot high" />
                  <span>Soft Delete: {REPORT_THRESHOLDS.SOFT_DELETE}+ reports</span>
                </div>
                <div className={`threshold-item ${selectedAnalysis.reportCount >= REPORT_THRESHOLDS.HARD_DELETE ? 'met' : ''}`}>
                  <span className="threshold-dot critical" />
                  <span>Hard Delete: {REPORT_THRESHOLDS.HARD_DELETE}+ reports</span>
                </div>
              </div>

              <div className="report-types-section">
                <h3>Reports by Type</h3>
                <div className="report-types-list">
                  {selectedAnalysis.reportTypes.map((type, index) => (
                    <div key={index} className="report-type-item">
                      <div className="report-type-header">
                        <span className="report-type-name">{type.type.replace(/_/g, ' ')}</span>
                        <span className="report-type-count">{type.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ✅ Separate action buttons in modal */}
              {selectedAnalysis.availableActions.length > 0 && (
                <div className="suggested-actions-section">
                  <h3>Available Actions</h3>
                  <div className="suggested-actions-list">
                    {selectedAnalysis.availableActions.map((action, index) => {
                      const buttonConfig = ACTION_BUTTONS[action.action];
                      return (
                        <div key={index} className={`suggested-action-item severity-${action.severity.toLowerCase()}`}>
                          <div className="action-header">
                            <span className="action-icon">{buttonConfig?.icon}</span>
                            <span className="action-name">{buttonConfig?.label ?? action.action}</span>
                            <span className={`severity-badge severity-${action.severity.toLowerCase()}`}>
                              {action.severity}
                            </span>
                          </div>
                          <p className="action-reason">{action.reason}</p>
                          <button
                            className={`apply-action-btn ${!action.canExecute ? 'disabled' : ''}`}
                            onClick={() => {
                              if (selectedAnalysis) handleApplyActionFromModal(selectedAnalysis.groupId, action.action);
                            }}
                            disabled={!action.canExecute || actionLoading}
                          >
                            {actionLoading ? 'Applying...' : `Apply ${buttonConfig?.label ?? action.action}`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="modal-close-btn" onClick={closeReportModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>  
  );
};

export default AdminGroups;