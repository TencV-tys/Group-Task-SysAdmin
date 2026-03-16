// pages/AdminGroups.tsx - COMPLETE FIXED WITH ALL TYPES
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAdminGroups } from '../hooks/useAdminGroups';
import { AdminGroupsService, ACTION_BUTTONS, GroupStatus } from '../services/admin.groups.service';
import type { 
  Group, 
  ReportAnalysis, 
  ActionType, 
  GroupFilters,
  AvailableAction 
} from '../services/admin.groups.service';
import GroupModal from '../components/GroupModal';
import LoadingScreen from '../components/LoadingScreen';
import ErrorDisplay from '../components/ErrorDisplay';
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
} from '@fortawesome/free-solid-svg-icons';
import './styles/AdminGroups.css';

interface LocalGroupFilters {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  search?: string;
  status?: string;
  hasReports?: boolean;
}

// Type guard for GroupResponse
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

// Extended Group type with reportAnalysis
interface GroupWithAnalysis extends Group {
  reportAnalysis?: ReportAnalysis | null;
}

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

  console.log('📊 [AdminGroups] Hook data:', { 
    groupsCount: groups.length, 
    loading, 
    error, 
    stats: stats ? 'present' : 'null',
    pagination 
  });

  const [filters, setFilters] = useState<LocalGroupFilters>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<ReportAnalysis | null>(null);

  // Track initial loads
  const initialLoadDoneRef = useRef(false);
  const statsLoadedRef = useRef(false);

  // ===== Helper to build API filters =====
  const buildApiFilters = useCallback((customFilters?: Partial<LocalGroupFilters>): GroupFilters => {
    const currentFilters = customFilters || filters;
    const apiFilters: GroupFilters = { 
      page: currentFilters.page,
      limit: currentFilters.limit,
      sortBy: currentFilters.sortBy,
      sortOrder: currentFilters.sortOrder,
    };
    
    const currentStatus = customFilters?.status !== undefined ? customFilters.status : statusFilter;
    if (currentStatus !== 'ALL') {
      apiFilters.status = currentStatus as GroupStatus;
    }
    
    const currentSearch = customFilters?.search !== undefined ? customFilters.search : searchInput;
    if (currentSearch) {
      apiFilters.search = currentSearch;
    }
    
    if (currentFilters.hasReports) {
      apiFilters.hasReports = currentFilters.hasReports;
    }
    
    return apiFilters;
  }, [filters, statusFilter, searchInput]);

  // ===== Load groups with explicit filters =====
  const loadGroups = useCallback(async (filterParams?: Partial<LocalGroupFilters>) => {
    const apiFilters = buildApiFilters(filterParams);
    console.log('🚀 [AdminGroups] Loading groups with filters:', apiFilters);
    await fetchGroups(apiFilters);
  }, [fetchGroups, buildApiFilters]);

  // ===== Initial load =====
  useEffect(() => {
    if (!initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true;
      console.log('📥 [AdminGroups] Initial groups load');
      loadGroups();
    }
  }, [loadGroups]);

  // ===== Load stats once =====
  useEffect(() => {
    if (!statsLoadedRef.current) {
      statsLoadedRef.current = true;
      console.log('📥 [AdminGroups] Initial stats fetch');
      fetchStats();
    }
  }, [fetchStats]);

  // ===== Handlers that explicitly call loadGroups with new filters =====
  const handleSearch = () => {
    console.log('🔍 [AdminGroups] Search triggered with input:', searchInput);
    const newFilters = { ...filters, page: 1, search: searchInput };
    setFilters(newFilters);
    loadGroups(newFilters);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleStatusChange = (status: string) => {
    console.log('🏷️ [AdminGroups] Status filter changed:', status);
    setStatusFilter(status);
    const newFilters = { ...filters, page: 1, hasReports: undefined, status };
    setFilters(newFilters);
    loadGroups(newFilters);
  };

  const handlePageChange = (newPage: number) => {
    console.log('📄 [AdminGroups] Page changed:', newPage);
    const newFilters = { ...filters, page: newPage };
    setFilters(newFilters);
    loadGroups(newFilters);
  };

  const handleSortChange = (sortBy: string) => {
    console.log('🔽 [AdminGroups] Sort by changed:', sortBy);
    const newFilters = { ...filters, sortBy, page: 1 };
    setFilters(newFilters);
    loadGroups(newFilters);
  };

 const handleSortOrderToggle = () => {
  const newOrder = filters.sortOrder === 'asc' ? 'desc' : 'asc';
  console.log('🔄 [AdminGroups] Sort order toggled:', newOrder);
  const newFilters: LocalGroupFilters = { 
    ...filters, 
    sortOrder: newOrder, // TypeScript now knows this is 'asc' | 'desc'
    page: 1 
  };
  setFilters(newFilters);
  loadGroups(newFilters);
};

  const handleRefresh = () => {
    console.log('🔄 [AdminGroups] Manual refresh triggered');
    setRefreshing(true);
    Promise.all([
      loadGroups(),
      fetchStats()
    ]).finally(() => {
      setRefreshing(false);
    });
  }; 

  const handleStatClick = (status: string) => {
    console.log('📊 [AdminGroups] Stat card clicked:', status);
    
    if (status === 'REPORTS') {
      const newFilters = { 
        ...filters, 
        hasReports: true,
        page: 1 
      };
      setStatusFilter('ALL');
      setFilters(newFilters);
      loadGroups(newFilters);
    } else {
      const newFilters = { 
        ...filters, 
        hasReports: undefined,
        page: 1,
        status 
      };
      setStatusFilter(status);
      setFilters(newFilters);
      loadGroups(newFilters);
    }
  };

  const clearFilters = () => {
    console.log('🧹 [AdminGroups] Clearing all filters');
    setSearchInput('');
    setStatusFilter('ALL');
    const newFilters: LocalGroupFilters = {
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
    setFilters(newFilters);
    loadGroups(newFilters);
  };

  // Report analysis
  const handleAnalyzeReports = async (groupId: string) => {
    console.log('🔍 [AdminGroups] Analyzing reports for group:', groupId);
    const result = await analyzeGroup(groupId);
    
    if (result.success && result.analysis) {
      setSelectedAnalysis(result.analysis);
      setShowReportModal(true);
    } else {
      alert('Could not analyze reports for this group');
    }
  };

 // In AdminGroups.tsx - Fix handleApplyAction signature

const handleApplyAction = async (groupId: string, action: ActionType) => {
  // Find the selected analysis for this group
  const analysis = selectedAnalysis?.groupId === groupId ? selectedAnalysis : null;
  
  if (!analysis) {
    console.error('❌ [AdminGroups] No selected analysis for group:', groupId);
    return;
  }
  
  console.log('🎬 [AdminGroups] Applying action:', { 
    action, 
    groupId 
  }); 
  
  const result = await applyAction(groupId, action);
  
  if (result.success) {
    alert(`${ACTION_BUTTONS[action].label} applied successfully`);
    setShowReportModal(false);
    setSelectedAnalysis(null);
    await loadGroups();
    await fetchStats();
  } else {
    alert(result.message || 'Failed to apply action');
  }
};
  // View group details - FIXED with proper typing
  const handleViewGroup = async (groupId: string) => {
    if (selectedRowId === groupId) return;
    
    console.log('👁️ [AdminGroups] Viewing group:', groupId);
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
      console.error('❌ [AdminGroups] Exception loading group:', err);
    } finally {
      setModalLoading(false);
      setSelectedRowId(null);
    }
  };

  const handleRowClick = (groupId: string) => {
    handleViewGroup(groupId);
  };

  // Delete handlers
  const handleDeleteClick = (e: React.MouseEvent, groupId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setShowDeleteModal(groupId);
  };

  const handleDeleteConfirm = async (groupId: string, hardDelete?: boolean) => {
    const mode = hardDelete ? 'HARD DELETE' : 'SOFT DELETE';
    console.log(`🗑️ [AdminGroups] ${mode} confirm`);
    
    setDeleteLoading(true);
    try {
      const result = await deleteGroup(groupId, hardDelete);
      
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

  const handleRestore = async (groupId: string) => {
    console.log('♻️ [AdminGroups] Restore clicked');
    
    setDeleteLoading(true);
    try {
      const result = await applyAction(groupId, 'RESTORE');
      
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

  // Modal close handlers
  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => setSelectedGroup(null), 300);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(null);
  };

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

  // Check if delete button should be disabled based on report analysis - FIXED with proper types
  const isDeleteDisabled = (group: GroupWithAnalysis): boolean => {
    // If no reports, delete is allowed
    if (!group._count?.reports || group._count.reports === 0) {
      return false;
    }
    
    // Check if there's analysis data
    const analysis = group.reportAnalysis;
    if (!analysis) return true; // Disable if reports exist but no analysis yet
    
    // Check if any delete action is available with proper typing
    const hasSoftDelete = analysis.availableActions?.some(
      (a: AvailableAction) => a.action === 'SOFT_DELETE' && a.canExecute
    );
    const hasHardDelete = analysis.availableActions?.some(
      (a: AvailableAction) => a.action === 'HARD_DELETE' && a.canExecute
    );
    
    return !(hasSoftDelete || hasHardDelete);
  };

  if (loading && groups.length === 0) {
    return <LoadingScreen message="Loading groups..." fullScreen />;
  }

  return (
    <div className="groups-wrapper">
      <div className="groups-container">
        {/* Header */}
        <div className="groups-header">
          <div className="groups-header-left">
            <h1>
              <span className="groups-header-icon">👥</span>
              Manage Groups
            </h1>
            <p>View and manage all user groups</p>
          </div>
          <div className="groups-header-actions">
            <button 
              className="refresh-btn" 
              onClick={handleRefresh} 
              disabled={refreshing}
            >
              <FontAwesomeIcon icon={faRedoAlt} className={refreshing ? 'fa-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="groups-stats">
            <div 
              className={`groups-stat-card ${statusFilter === 'ALL' && !filters.hasReports ? 'active' : ''}`}
              onClick={() => handleStatClick('ALL')}
              style={{ cursor: 'pointer' }}
            >
              <span className="groups-stat-value">{stats.overview.total}</span>
              <span className="groups-stat-label">Total Groups</span>
              {statusFilter === 'ALL' && !filters.hasReports && <div className="stat-active-indicator" />}
            </div>
            
            <div 
              className={`groups-stat-card ${statusFilter === 'ACTIVE' ? 'active' : ''}`}
              onClick={() => handleStatClick('ACTIVE')}
              style={{ cursor: 'pointer' }}
            >
              <span className="groups-stat-value">{stats.overview.active || 0}</span>
              <span className="groups-stat-label">Active</span>
              {statusFilter === 'ACTIVE' && <div className="stat-active-indicator" />}
            </div>
            
            <div 
              className={`groups-stat-card ${statusFilter === 'SUSPENDED' ? 'active' : ''}`}
              onClick={() => handleStatClick('SUSPENDED')}
              style={{ cursor: 'pointer' }}
            >
              <span className="groups-stat-value">{stats.overview.suspended || 0}</span>
              <span className="groups-stat-label">Suspended</span>
              {statusFilter === 'SUSPENDED' && <div className="stat-active-indicator" />}
            </div>
            
            <div 
              className={`groups-stat-card ${statusFilter === 'DELETED' ? 'active' : ''}`}
              onClick={() => handleStatClick('DELETED')}
              style={{ cursor: 'pointer' }}
            >
              <span className="groups-stat-value">{stats.overview.deleted || 0}</span>
              <span className="groups-stat-label">Deleted</span>
              {statusFilter === 'DELETED' && <div className="stat-active-indicator" />}
            </div>
            
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

        {/* Filters */}
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
              <button 
                className="groups-search-btn" 
                onClick={handleSearch}
                disabled={loading}
              >
                Search
              </button>
            </div>
          </div>

          <div className="groups-filter-row">
            <div className="groups-filter-group">
              <label>Sort By</label>
              <div className="groups-sort-controls">
                <select 
                  value={filters.sortBy} 
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="groups-select"
                  disabled={loading}
                >
                  <option value="createdAt">Created Date</option>
                  <option value="name">Name</option>
                  <option value="updatedAt">Last Updated</option>
                </select>
                <button 
                  className="groups-sort-order"
                  onClick={handleSortOrderToggle}
                  disabled={loading}
                >
                  {filters.sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>

            <div className="groups-filter-group">
              <label>Status Filter</label>
              <select 
                value={statusFilter} 
                onChange={(e) => handleStatusChange(e.target.value)}
                className="groups-select"
                disabled={loading}
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="DELETED">Deleted</option>
              </select>
            </div>
          </div>

          {(searchInput || statusFilter !== 'ALL' || filters.hasReports) && (
            <div className="groups-active-filters">
              <button className="groups-clear-filters" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && <ErrorDisplay message={error} onRetry={handleRefresh} />}

        {/* Groups Table or Empty State */}
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
                ? "No groups match your current filters. Try adjusting your search."
                : "There are no groups available yet."}
            </p>
            {(searchInput || statusFilter !== 'ALL' || filters.hasReports) && (
              <button className="groups-empty-btn" onClick={clearFilters}>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Results Summary */}
            <div className="groups-results-summary">
              <span>Showing {groups.length} of {pagination.total} groups</span>
            </div>

            {/* Groups Table */}
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
                    const reportAnalysis = groupWithAnalysis.reportAnalysis;
                    
                    return (
                      <tr
                        key={group.id}
                        onClick={() => handleRowClick(group.id)}
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
                              {group.description && (
                                <div className="groups-user-email">{group.description.substring(0, 30)}...</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="groups-type-badge members">
                            <FontAwesomeIcon icon={faUsers} />
                            {group._count?.members || 0}
                          </span>
                        </td>
                        <td>
                          <span className="groups-type-badge tasks">
                            <FontAwesomeIcon icon={faTasks} />
                            {group._count?.tasks || 0}
                          </span>
                        </td>
                        <td>
                          <div className="reports-cell">
                            <span className={`groups-type-badge reports ${(group._count?.reports || 0) > 0 ? 'warning' : ''}`}>
                              <FontAwesomeIcon icon={faFlag} />
                              {group._count?.reports || 0}
                            </span>
                            {reportAnalysis?.requiresImmediateAction && (
                              <button
                                className="report-warning-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAnalyzeReports(group.id);
                                }}
                                title="Reports require immediate attention"
                              >
                                <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: '#fa5252' }} />
                              </button>
                            )}
                            {(group._count?.reports || 0) > 0 && !reportAnalysis?.requiresImmediateAction && (
                              <button
                                className="report-info-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAnalyzeReports(group.id);
                                }}
                                title="View report analysis"
                              >
                                <FontAwesomeIcon icon={faFlag} style={{ color: '#e67700' }} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${group.status?.toLowerCase() || 'active'}`}>
                            {group.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td>
                          <div className="groups-date">
                            <span className="groups-date-icon">📅</span>
                            {formatDate(group.createdAt)}
                          </div>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="groups-action-buttons">
                            <button
                              className="groups-view-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewGroup(group.id);
                              }}
                              disabled={loading}
                            >
                              <FontAwesomeIcon icon={faEye} />
                              <span>View</span>
                            </button>

                            {isDeleted ? (
  <button
    className="groups-restore-btn"
    onClick={(e) => {
      e.stopPropagation();
      handleRestore(group.id);
    }}
    disabled={actionLoading}
  >
    <FontAwesomeIcon icon={faUndo} />
    <span>Restore</span>
  </button>
) : (
  // Only show delete button if it's NOT disabled
  !isDeleteDisabled(groupWithAnalysis) && (
    <button
  className={`groups-delete-btn ${isDeleteDisabled(groupWithAnalysis) ? 'hidden' : ''}`}
  onClick={(e) => handleDeleteClick(e, group.id)}
  disabled={actionLoading || isDeleteDisabled(groupWithAnalysis)}
  title="Delete group"
>
  <FontAwesomeIcon icon={faTrash} />
  <span>Delete</span>
</button>
  )
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
                <button
                  className="groups-pagination-btn"
                  disabled={filters.page === 1 || loading}
                  onClick={() => handlePageChange(filters.page - 1)}
                >
                  <FontAwesomeIcon icon={faChevronLeft} />
                </button>
                <span className="groups-pagination-info">
                  Page {filters.page} of {totalPages}
                </span>
                <button
                  className="groups-pagination-btn"
                  disabled={filters.page === totalPages || loading}
                  onClick={() => handlePageChange(filters.page + 1)}
                >
                  <FontAwesomeIcon icon={faChevronRight} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Group Modal */}
      {showModal && selectedGroup && (
        <GroupModal
          isOpen={showModal}
          onClose={closeModal}
          group={selectedGroup}
          loading={modalLoading}
          onDelete={handleDeleteConfirm}
          onRestore={handleRestore}
          onApplyAction={handleApplyAction}
          reportAnalysis={selectedAnalysis}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="groups-delete-overlay" onClick={closeDeleteModal}>
          <div className="groups-delete-confirm" onClick={(e) => e.stopPropagation()}>
            <p>Delete this group?</p>
            <div className="confirm-actions">
              <button
                className="confirm-soft"
                onClick={() => handleDeleteConfirm(showDeleteModal, false)}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Soft Delete'}
              </button>
              <button
                className="confirm-hard"
                onClick={() => handleDeleteConfirm(showDeleteModal, true)}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Hard Delete'}
              </button>
              <button
                className="confirm-cancel"
                onClick={closeDeleteModal}
                disabled={deleteLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Analysis Modal */}
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

              <div className="report-types-section">
                <h3>Reports by Type</h3>
                <div className="report-types-list">
                  {selectedAnalysis.reportTypes.map((type, index) => (
                    <div key={index} className={`report-type-item ${type.meetsThreshold ? 'threshold-met' : ''}`}>
                      <div className="report-type-header">
                        <span className="report-type-name">{type.type.replace(/_/g, ' ')}</span>
                        <span className="report-type-count">{type.count}/{type.threshold}</span>
                      </div>
                      <div className="report-type-progress">
                        <div
                          className="progress-bar"
                          style={{
                            width: `${Math.min((type.count / type.threshold) * 100, 100)}%`,
                            backgroundColor: type.meetsThreshold ? '#fa5252' : '#e67700'
                          }}
                        />
                      </div>
                      {type.meetsThreshold && (
                        <div className="threshold-message">
                          <FontAwesomeIcon icon={faExclamationTriangle} />
                          <span>Threshold met!</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedAnalysis.availableActions.length > 0 && (
                <div className="suggested-actions-section">
                  <h3>Available Actions</h3>
                  <div className="suggested-actions-list">
                    {selectedAnalysis.availableActions.map((action, index) => {
                      const buttonConfig = ACTION_BUTTONS[action.action];
                      
                      return (
                        <div key={index} className={`suggested-action-item severity-${action.severity.toLowerCase()}`}>
                          <div className="action-header">
                            <span className="action-icon">{buttonConfig.icon}</span>
                            <span className="action-name">{buttonConfig.label}</span>
                            <span className={`severity-badge severity-${action.severity.toLowerCase()}`}>
                              {action.severity}
                            </span>
                          </div>
                          <p className="action-reason">{action.reason}</p>
                          <div className="action-types">
                            {action.reportTypes.map((type, i) => (
                              <span key={i} className="action-type-tag">
                                {type.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                   <button
  className={`apply-action-btn ${!action.canExecute ? 'disabled' : ''}`}
  onClick={() => {
    if (selectedAnalysis) {
      handleApplyAction(selectedAnalysis.groupId, action.action);
    }
  }}
  disabled={!action.canExecute || actionLoading}
  style={{
    backgroundColor: action.canExecute ? buttonConfig.hoverColor : '#cccccc',
    color: action.canExecute ? 'white' : '#666666',
    cursor: !action.canExecute || actionLoading ? 'not-allowed' : 'pointer',
    opacity: !action.canExecute || actionLoading ? 0.5 : 1
  }}
>
  {actionLoading ? 'Applying...' : `Apply ${buttonConfig.label}`}
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