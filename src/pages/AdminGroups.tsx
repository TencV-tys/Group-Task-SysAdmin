// pages/AdminGroups.tsx - COMPLETELY FIXED for React 18 StrictMode
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
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import './styles/AdminGroups.css';

const REPORT_THRESHOLDS = {
  SUSPEND: 3,
  SOFT_DELETE: 6,
  HARD_DELETE: 10,
};

const SEARCH_DEBOUNCE_DELAY = 500;

interface LocalGroupFilters {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  search?: string;
  status?: string;
  hasReports?: boolean;
}

type ActionType = 'SUSPEND' | 'SOFT_DELETE' | 'HARD_DELETE' | 'RESTORE' | 'REVIEW';

function getActionsFromReportCount(reportCount: number, isDeleted: boolean, isSuspended: boolean) {
  const actions: string[] = [];
  if (isDeleted || isSuspended) {
    actions.push('RESTORE');
    return actions;
  }
  if (reportCount >= REPORT_THRESHOLDS.HARD_DELETE) actions.push('HARD_DELETE');
  else if (reportCount >= REPORT_THRESHOLDS.SOFT_DELETE) actions.push('SOFT_DELETE');
  else if (reportCount >= REPORT_THRESHOLDS.SUSPEND) actions.push('SUSPEND');
  return actions;
}

const AdminGroups: React.FC = () => {
  const {
    groups,
    loading,
    error,
    stats,
    pagination,
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
  const [isSearching, setIsSearching] = useState(false);

  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<ReportAnalysis | null>(null);
  const [rowActionLoading, setRowActionLoading] = useState<string | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDoneRef = useRef(false);

  const updateTimeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  // Store current filters in ref to avoid dependency issues
  const currentFiltersRef = useRef({
    search: '',
    status: 'ALL',
    page: 1,
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc',
    hasReports: undefined as boolean | undefined
  });

  // Update ref when state changes
  useEffect(() => {
    currentFiltersRef.current = {
      search: searchInput,
      status: statusFilter,
      page: filters.page,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      hasReports: filters.hasReports
    };
  }, [searchInput, statusFilter, filters.page, filters.sortBy, filters.sortOrder, filters.hasReports]);

  // ✅ FIXED: Direct API call using ref values
  const executeSearch = useCallback(() => {
    if (!isMountedRef.current) return;
    
    const current = currentFiltersRef.current;
    console.log('🔍 [SEARCH] Executing:', current);
    
    const apiFilters: GroupFilters = {
      page: current.page,
      limit: 20,
      sortBy: current.sortBy,
      sortOrder: current.sortOrder,
      search: current.search || undefined,
      status: current.status !== 'ALL' ? current.status as GroupStatus : undefined,
      hasReports: current.hasReports
    };
    
    fetchGroups(apiFilters);
  }, [fetchGroups]);

  // ✅ Handle search input with debounce
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    
    if (value.trim()) {
      setIsSearching(true);
    }
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setIsSearching(false);
      executeSearch();
    }, SEARCH_DEBOUNCE_DELAY);
  };

  // ✅ Clear search
  const clearSearch = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setSearchInput('');
    setIsSearching(false);
    // Use setTimeout to ensure state is updated before search
    setTimeout(() => executeSearch(), 0);
  };

  // ✅ Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      setIsSearching(false);
      executeSearch();
    }
  };

  // ✅ Handle status change
  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setFilters(prev => ({ ...prev, page: 1, status: status !== 'ALL' ? status : undefined }));
    setTimeout(() => executeSearch(), 0);
  };

  // ✅ Handle sort change
  const handleSortChange = (sortBy: string) => {
    setFilters(prev => ({ ...prev, sortBy, page: 1 }));
    setTimeout(() => executeSearch(), 0);
  };

  // ✅ Handle sort order toggle
  const handleSortOrderToggle = () => {
    const newOrder = filters.sortOrder === 'asc' ? 'desc' : 'asc';
    setFilters(prev => ({ ...prev, sortOrder: newOrder, page: 1 }));
    setTimeout(() => executeSearch(), 0);
  };

  // ✅ Handle page change
  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
    setTimeout(() => executeSearch(), 0);
  };

  // ✅ Handle stat click
  const handleStatClick = (statStatus: string) => {
    if (statStatus === 'REPORTS') {
      setStatusFilter('ALL');
      setFilters(prev => ({ ...prev, page: 1, hasReports: true, status: undefined }));
      setTimeout(() => executeSearch(), 0);
    } else if (statStatus === 'ALL') {
      setStatusFilter('ALL');
      setFilters(prev => ({ ...prev, page: 1, hasReports: undefined, status: undefined }));
      setTimeout(() => executeSearch(), 0);
    } else {
      setStatusFilter(statStatus);
      setFilters(prev => ({ ...prev, page: 1, status: statStatus as GroupStatus, hasReports: undefined }));
      setTimeout(() => executeSearch(), 0);
    }
  };

  // ✅ Clear all filters
  const clearFilters = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setSearchInput('');
    setStatusFilter('ALL');
    setIsSearching(false);
    setFilters({
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    setTimeout(() => executeSearch(), 0);
  };

useEffect(() => {
  if (!initialLoadDoneRef.current) {
    initialLoadDoneRef.current = true;
    console.log('🚀 [AdminGroups] Initial load');
    executeSearch();
    fetchStats();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  // ✅ Refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([executeSearch(), fetchStats()]).finally(() => {
      if (isMountedRef.current) {
        setRefreshing(false);
        setHasUpdates(false);
      }
    });
  }, [executeSearch, fetchStats]);

  // ✅ Socket listeners
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
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [handleRefresh]);

  // ✅ Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(() => {
      if (isMountedRef.current && !loading && !refreshing && !isSearching) {
        executeSearch();
        fetchStats();
      }
    }, 30000);
    return () => clearInterval(id);
  }, [executeSearch, fetchStats, loading, refreshing, isSearching]);

  // ===== Rest of handlers (same as before) =====
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAnalyzeReports = async (groupId: string) => {
    const result = await analyzeGroup(groupId);
    if (result.success && result.analysis) {
      setSelectedAnalysis(result.analysis);
      setShowReportModal(true);
    } else {
      alert('Could not analyze reports for this group');
    }
  };

  const handleApplyActionFromModal = async (groupId: string, action: ActionType) => {
    const result = await applyAction(groupId, action);
    if (result.success) {
      alert(`${ACTION_BUTTONS[action]?.label ?? action} applied successfully`);
      setShowReportModal(false);
      setSelectedAnalysis(null);
      executeSearch();
      fetchStats();
    } else {
      alert(result.message || 'Failed to apply action');
    }
  };

  const handleRowAction = async (e: React.MouseEvent, groupId: string, action: ActionType) => {
    e.stopPropagation();
    e.preventDefault();
    if (rowActionLoading) return;

    if (action === 'SOFT_DELETE' || action === 'HARD_DELETE') {
      setShowDeleteModal(groupId + ':' + action);
      return;
    }

    setRowActionLoading(groupId + ':' + action);
    try {
      const result = await applyAction(groupId, action);
      if (result.success) {
        executeSearch();
        fetchStats();
      } else {
        alert(result.message || `Failed to apply ${action}`);
      }
    } finally {
      setRowActionLoading(null);
    }
  };

  const handleViewGroup = async (groupId: string) => {
    if (selectedRowId === groupId) return;
    setSelectedRowId(groupId);
    setModalLoading(true);
    try {
      const result = await getGroupById(groupId);
      if (result.success && 'group' in result && result.group) {
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
        executeSearch();
        fetchStats();
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
        executeSearch();
        fetchStats();
      } else {
        alert(result.message || 'Failed to restore group');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => setSelectedGroup(null), 300);
  };

  const closeDeleteModal = () => setShowDeleteModal(null);

  const closeReportModal = () => {
    setShowReportModal(false);
    setTimeout(() => setSelectedAnalysis(null), 300);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const hasActiveFilters = !!(searchInput || statusFilter !== 'ALL' || filters.hasReports);

  if (loading && groups.length === 0) return <LoadingScreen message="Loading groups..." fullScreen />;

  // ===== RENDER JSX =====
  return (
    <div className="groups-wrapper">
      <div className="groups-container">
        {/* Header */}
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

        {/* Stats Cards */}
        {stats && (
          <div className="groups-stats">
            <div className={`groups-stat-card ${statusFilter === 'ALL' && !filters.hasReports ? 'active' : ''}`} onClick={() => handleStatClick('ALL')} style={{ cursor: 'pointer' }}>
              <span className="groups-stat-value">{stats.overview.total}</span>
              <span className="groups-stat-label">Total Groups</span>
            </div>
            <div className={`groups-stat-card ${statusFilter === 'ACTIVE' ? 'active' : ''}`} onClick={() => handleStatClick('ACTIVE')} style={{ cursor: 'pointer' }}>
              <span className="groups-stat-value">{stats.overview.active || 0}</span>
              <span className="groups-stat-label">Active</span>
            </div>
            <div className={`groups-stat-card ${statusFilter === 'SUSPENDED' ? 'active' : ''}`} onClick={() => handleStatClick('SUSPENDED')} style={{ cursor: 'pointer' }}>
              <span className="groups-stat-value">{stats.overview.suspended || 0}</span>
              <span className="groups-stat-label">Suspended</span>
            </div>
            <div className={`groups-stat-card ${statusFilter === 'DELETED' ? 'active' : ''}`} onClick={() => handleStatClick('DELETED')} style={{ cursor: 'pointer' }}>
              <span className="groups-stat-value">{stats.overview.deleted || 0}</span>
              <span className="groups-stat-label">Soft Deleted</span>
            </div>
            <div className={`groups-stat-card reports ${filters.hasReports ? 'active' : ''}`} onClick={() => handleStatClick('REPORTS')} style={{ cursor: 'pointer' }}>
              <span className="groups-stat-value">{stats.overview.withReports || 0}</span>
              <span className="groups-stat-label">With Reports</span>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="groups-filters">
          <div className="groups-search">
            <div className="groups-search-wrapper">
              <FontAwesomeIcon icon={faSearch} className="groups-search-icon" />
              <input
                type="text"
                placeholder="Search groups by name, description, or invite code..."
                value={searchInput}
                onChange={handleSearchInputChange}
                onKeyPress={handleKeyPress}
                className="groups-search-input"
              />
              {searchInput && (
                <button className="groups-search-clear" onClick={clearSearch} title="Clear search">
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              )}
              {isSearching && (
                <div className="groups-search-spinner">
                  <div className="spinner"></div>
                </div>
              )}
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

          {hasActiveFilters && (
            <div className="groups-active-filters">
              {searchInput && (
                <span className="active-filter-badge">
                  <FontAwesomeIcon icon={faSearch} />
                  Search: "{searchInput}"
                  <button onClick={clearSearch}>
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                </span>
              )}
              {statusFilter !== 'ALL' && (
                <span className="active-filter-badge">
                  Status: {statusFilter}
                  <button onClick={() => handleStatusChange('ALL')}>
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                </span>
              )}
              <button className="groups-clear-filters" onClick={clearFilters}>
                Clear All
              </button>
            </div>
          )}
        </div>

        {error && <ErrorDisplay message={error} onRetry={handleRefresh} />}

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
              {hasActiveFilters
                ? 'No groups match your current filters. Try adjusting your search.'
                : 'There are no groups available yet.'}
            </p>
            {hasActiveFilters && (
              <button className="groups-empty-btn" onClick={clearFilters}>
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="groups-results-summary">
              <span>Showing {groups.length} of {pagination.total} groups</span>
              {isSearching && <span className="searching-indicator">Searching...</span>}
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
                    const reportCount = group._count?.reports || 0;
                    const rowActions = getActionsFromReportCount(reportCount, isDeleted, isSuspended);

                    return (
                      <tr
                        key={group.id}
                        onClick={() => handleViewGroup(group.id)}
                        className={`groups-row ${selectedRowId === group.id ? 'selected' : ''} ${isDeleted ? 'deleted' : ''} ${isSuspended ? 'suspended' : ''}`}
                      >
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
                            </div>
                          </div>
                        </td>
                        <td><span className="groups-type-badge members"><FontAwesomeIcon icon={faUsers} /> {group._count?.members || 0}</span></td>
                        <td><span className="groups-type-badge tasks"><FontAwesomeIcon icon={faTasks} /> {group._count?.tasks || 0}</span></td>
                        <td>
                          <div className="reports-cell">
                            <span className={`groups-type-badge reports ${reportCount > 0 ? 'warning' : ''}`}>
                              <FontAwesomeIcon icon={faFlag} /> {reportCount}
                            </span>
                          </div>
                        </td>
                        <td><span className={`status-badge ${group.status?.toLowerCase() || 'active'}`}>{group.status || 'ACTIVE'}</span></td>
                        <td><div className="groups-date"><span className="groups-date-icon">📅</span>{formatDate(group.createdAt)}</div></td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="groups-action-buttons">
                            <button className="groups-view-btn" onClick={(e) => { e.stopPropagation(); handleViewGroup(group.id); }} disabled={loading}>
                              <FontAwesomeIcon icon={faEye} /> <span>View</span>
                            </button>
                            {(isDeleted || isSuspended) && (
                              <button className="groups-restore-btn" onClick={(e) => { e.stopPropagation(); handleRestore(group.id); }} disabled={!!rowActionLoading || deleteLoading}>
                                <FontAwesomeIcon icon={faUndo} /> <span>{isSuspended ? 'Unsuspend' : 'Restore'}</span>
                              </button>
                            )}
                            {!isDeleted && !isSuspended && rowActions.includes('SUSPEND') && (
                              <button className="groups-suspend-btn" onClick={(e) => handleRowAction(e, group.id, 'SUSPEND')} disabled={rowActionLoading === `${group.id}:SUSPEND`}>
                                <FontAwesomeIcon icon={faExclamationCircle} /> <span>Suspend</span>
                              </button>
                            )}
                            {!isDeleted && !isSuspended && rowActions.includes('SOFT_DELETE') && (
                              <button className="groups-softdelete-btn" onClick={(e) => handleRowAction(e, group.id, 'SOFT_DELETE')} disabled={!!rowActionLoading}>
                                <FontAwesomeIcon icon={faTrash} /> <span>Soft Del</span>
                              </button>
                            )}
                            {!isDeleted && !isSuspended && rowActions.includes('HARD_DELETE') && (
                              <button className="groups-harddelete-btn" onClick={(e) => handleRowAction(e, group.id, 'HARD_DELETE')} disabled={!!rowActionLoading}>
                                <FontAwesomeIcon icon={faBan} /> <span>Hard Del</span>
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

      {/* Modals */}
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

      {showDeleteModal && (
        <div className="groups-delete-overlay" onClick={closeDeleteModal}>
          <div className="groups-delete-confirm" onClick={(e) => e.stopPropagation()}>
            <p>{deleteAction === 'HARD_DELETE' ? '⚠️ Permanently delete this group? This cannot be undone.' : 'Archive (soft delete) this group?'}</p>
            <div className="confirm-actions">
              <button className="confirm-soft" onClick={() => handleDeleteConfirm(false)} disabled={deleteLoading}>Soft Delete</button>
              <button className="confirm-hard" onClick={() => handleDeleteConfirm(true)} disabled={deleteLoading}>Hard Delete</button>
              <button className="confirm-cancel" onClick={closeDeleteModal} disabled={deleteLoading}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showReportModal && selectedAnalysis && (
        <div className="modal-overlay" onClick={closeReportModal}>
          <div className="modal-content report-analysis-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Report Analysis — {selectedAnalysis.groupName}</h2>
              <button className="modal-close" onClick={closeReportModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="analysis-summary">
                <div className="summary-stat">
                  <span className="summary-label">Total Reports</span>
                  <span className="summary-value">{selectedAnalysis.reportCount}</span>
                </div>
              </div>
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