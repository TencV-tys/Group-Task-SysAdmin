// pages/AdminGroups.tsx - COMPLETE WITH THRESHOLD CHECKING IN TABLE
import React, { useState, useEffect, useCallback } from 'react';
import { AdminGroupsService } from '../services/admin.groups.service';
import type { Group, GroupStatisticsResponse } from '../services/admin.groups.service';
import GroupModal from '../components/GroupModal';
import LoadingScreen from '../components/LoadingScreen';
import ErrorDisplay from '../components/ErrorDisplay';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faExclamationTriangle, 
  faFlag,
  faTrash,
  faBan,
  faExclamationCircle,
  faInfoCircle,
  faUndo,
} from '@fortawesome/free-solid-svg-icons';
import './styles/AdminGroups.css';

interface FilterParams {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  search?: string;
  minMembers?: number;
  maxMembers?: number;
  createdAfter?: string;
  createdBefore?: string;
}

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

interface ReportAnalysis {
  groupId: string;
  groupName: string;
  reportCount: number;
  reportTypes: ReportTypeInfo[];
  suggestedActions: SuggestedAction[];
  requiresImmediateAction: boolean;
}

interface GroupWithAnalysis extends Group {
  reportAnalysis?: ReportAnalysis | null;
}

// Action icons mapping
const ACTION_ICONS = {
  SUSPEND: faExclamationCircle,
  RESTORE: faUndo,
  SOFT_DELETE: faTrash,
  HARD_DELETE: faBan,
  WARNING: faExclamationTriangle,
  REVIEW: faInfoCircle
} as const;

const ACTION_COLORS = {
  SUSPEND: '#e67700',
  RESTORE: '#2b8a3e',
  SOFT_DELETE: '#e67700',
  HARD_DELETE: '#fa5252',
  WARNING: '#fab005',
  REVIEW: '#1c7ed6'
} as const;

const ACTION_NAMES = {
  SUSPEND: 'Suspend Group',
  RESTORE: 'Restore Group',
  SOFT_DELETE: 'Soft Delete',
  HARD_DELETE: 'Hard Delete',
  WARNING: 'Send Warning',
  REVIEW: 'Mark for Review'
} as const;

type ActionType = keyof typeof ACTION_NAMES;

const AdminGroups = () => {
  const [groups, setGroups] = useState<GroupWithAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<GroupStatisticsResponse['statistics'] | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1,
    hasMore: false
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [minMembers, setMinMembers] = useState('');
  const [maxMembers, setMaxMembers] = useState('');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom' | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal and delete
  const [selectedGroup, setSelectedGroup] = useState<GroupWithAnalysis | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Report analysis modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<ReportAnalysis | null>(null);
  const [applyingAction, setApplyingAction] = useState(false);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const filterParams: FilterParams = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy,
        sortOrder,
        _t: Date.now() // Add timestamp to avoid cache
      };

      if (searchTerm) filterParams.search = searchTerm;
      if (minMembers) filterParams.minMembers = parseInt(minMembers);
      if (maxMembers) filterParams.maxMembers = parseInt(maxMembers);

      if (dateRange === 'today') {
        const today = new Date().toISOString().split('T')[0];
        filterParams.createdAfter = today;
        filterParams.createdBefore = today;
      } else if (dateRange === 'week') {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);
        filterParams.createdAfter = start.toISOString().split('T')[0];
        filterParams.createdBefore = end.toISOString().split('T')[0];
      } else if (dateRange === 'month') {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - 1);
        filterParams.createdAfter = start.toISOString().split('T')[0];
        filterParams.createdBefore = end.toISOString().split('T')[0];
      } else if (dateRange === 'custom') {
        if (startDate) filterParams.createdAfter = startDate;
        if (endDate) filterParams.createdBefore = endDate;
      }

      const result = await AdminGroupsService.getGroupsWithAnalysis(filterParams);
      
      if (result.success) {
        setGroups(result.groups || []);
        setPagination(prev => ({
          total: result.pagination?.total || 0,
          page: prev.page,
          limit: prev.limit,
          pages: result.pagination?.pages || 1,
          hasMore: result.pagination?.hasMore || false
        }));
        setError(null);
      } else {
        setError(result.message || 'Failed to load groups');
      }
    } catch (err) {
      setError('Network error');
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm, sortBy, sortOrder, minMembers, maxMembers, dateRange, startDate, endDate]);

  const fetchStatistics = useCallback(async () => {
    try {
      const result = await AdminGroupsService.getGroupStatistics();
      if (result.success) {
        setStats(result.statistics || null);
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
    fetchStatistics();
  }, [fetchGroups, fetchStatistics]);

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleStatClick = (filterType: string) => {
    switch(filterType) {
      case 'total':
        clearFilters();
        break;
      case 'reports':
        setMinMembers('1');
        break;
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleAnalyzeReports = async (groupId: string) => {
    try {
      const result = await AdminGroupsService.analyzeGroupReports(groupId);
      if (result.success && result.analysis) {
        setSelectedAnalysis(result.analysis);
        setShowReportModal(true);
      } else {
        alert('Could not analyze reports for this group');
      }
    } catch (error) {
      console.error('Error analyzing reports:', error);
      alert('Failed to analyze reports');
    }
  };

  const handleApplyAction = async (action: string) => {
    if (!selectedAnalysis) return;
    
    setApplyingAction(true);
    try {
      const result = await AdminGroupsService.applyAction(
        selectedAnalysis.groupId,
        action
      );
      
      if (result.success) {
        alert(`${ACTION_NAMES[action as ActionType] || action} applied successfully`);
        setShowReportModal(false);
        await Promise.all([
          fetchGroups(),
          fetchStatistics()
        ]);
      } else {
        alert(result.message || 'Failed to apply action');
      }
    } catch (error) {
      console.error('Error applying action:', error);
      alert('Failed to apply action');
    } finally {
      setApplyingAction(false);
    }
  };

  const handleViewGroup = async (groupId: string) => {
    setSelectedRowId(groupId);
    setModalLoading(true);
    setShowModal(true);

    try {
      const result = await AdminGroupsService.getGroupById(groupId);
      
      if (result.success && result.group) {
        setSelectedGroup(result.group);
      } else {
        setShowModal(false);
        setSelectedGroup(null);
      }
    } catch (error) {
      console.error('Error loading group:', error);
      setShowModal(false);
      setSelectedGroup(null);
    } finally {
      setModalLoading(false);
      setSelectedRowId(null);
    }
  };

  const handleRowClick = (groupId: string) => {
    handleViewGroup(groupId);
  };

  const handleDeleteClick = (e: React.MouseEvent, groupId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setShowDeleteModal(groupId);
  };

  const handleDeleteConfirm = async (groupId: string, hardDelete?: boolean) => {
    setDeleteLoading(true);
    try {
      const result = await AdminGroupsService.deleteGroup(groupId, { hardDelete });
      if (result.success) {
        setShowDeleteModal(null);
        alert('Group deleted successfully!');
        await Promise.all([
          fetchGroups(),
          fetchStatistics()
        ]);
      } else {
        alert(result.message || 'Failed to delete group');
      }
    } catch {
      alert('Network error. Please check your connection and try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRestore = async (groupId: string) => {
    setDeleteLoading(true);
    try {
      const result = await AdminGroupsService.applyAction(groupId, 'RESTORE');
      if (result.success) {
        alert('Group restored successfully!');
        await Promise.all([
          fetchGroups(),
          fetchStatistics()
        ]);
        // Close any open modals
        closeDeleteModal();
        closeReportModal();
      } else {
        alert(result.message || 'Failed to restore group');
      }
    } catch (error) {
      console.error('Error restoring group:', error);
      alert('Failed to restore group');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Helper function to check if delete actions are allowed based on thresholds
  const canDeleteGroup = (group: GroupWithAnalysis): boolean => {
    if (!group.reportAnalysis?.suggestedActions) return false;
    
    return group.reportAnalysis.suggestedActions.some(
      a => (a.action === 'SOFT_DELETE' || a.action === 'HARD_DELETE') && 
      a.reportTypes.some(type => {
        const typeData = group.reportAnalysis?.reportTypes?.find(t => t.type === type);
        return typeData?.meetsThreshold === true;
      })
    );
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => {
      setSelectedGroup(null);
    }, 300);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(null);
  };

  const closeReportModal = () => {
    setShowReportModal(false);
    setTimeout(() => {
      setSelectedAnalysis(null);
    }, 300);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setMinMembers('');
    setMaxMembers('');
    setDateRange('all');
    setStartDate('');
    setEndDate('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="groups-stats">
            <div 
              className={`groups-stat-card ${dateRange === 'all' && !minMembers ? 'active' : ''}`}
              onClick={() => handleStatClick('total')}
              style={{ cursor: 'pointer' }}
            >
              <span className="groups-stat-value">{stats.overview.total}</span>
              <span className="groups-stat-label">Total Groups</span>
              {dateRange === 'all' && !minMembers && <div className="stat-active-indicator" />}
            </div>
            <div 
              className={`groups-stat-card ${minMembers ? 'active' : ''}`}
              onClick={() => handleStatClick('reports')}
              style={{ cursor: 'pointer' }}
            >
              <span className="groups-stat-value">{stats.overview.withReports}</span>
              <span className="groups-stat-label">With Reports</span>
              {minMembers && <div className="stat-active-indicator" />}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="groups-filters">
          <div className="groups-search">
            <div className="groups-search-wrapper">
              <svg className="groups-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search groups by name, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="groups-search-input"
              />
              <button onClick={handleSearch} className="groups-search-btn">
                Search
              </button>
            </div>
          </div>

          <div className="groups-filter-row">
            <div className="groups-filter-group">
              <label>Sort By</label>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="groups-select"
              >
                <option value="createdAt">Created Date</option>
                <option value="name">Name</option>
                <option value="updatedAt">Last Updated</option>
              </select>
              <button 
                className="groups-sort-order"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>

            <div className="groups-filter-group">
              <label>Member Count</label>
              <div className="groups-range-inputs">
                <input
                  type="number"
                  placeholder="Min"
                  value={minMembers}
                  onChange={(e) => setMinMembers(e.target.value)}
                  className="groups-range-input"
                  min="0"
                />
                <span>-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(e.target.value)}
                  className="groups-range-input"
                  min="0"
                />
              </div>
            </div>
          </div>

          <div className="groups-filter-row">
            <div className="groups-filter-group">
              <label>Date Range</label>
              <div className="groups-date-buttons">
                <button
                  className={`groups-date-btn ${dateRange === 'all' ? 'active' : ''}`}
                  onClick={() => setDateRange('all')}
                >
                  All
                </button>
                <button
                  className={`groups-date-btn ${dateRange === 'today' ? 'active' : ''}`}
                  onClick={() => setDateRange('today')}
                >
                  Today
                </button>
                <button
                  className={`groups-date-btn ${dateRange === 'week' ? 'active' : ''}`}
                  onClick={() => setDateRange('week')}
                >
                  Last 7 Days
                </button>
                <button
                  className={`groups-date-btn ${dateRange === 'month' ? 'active' : ''}`}
                  onClick={() => setDateRange('month')}
                >
                  Last 30 Days
                </button>
                <button
                  className={`groups-date-btn ${dateRange === 'custom' ? 'active' : ''}`}
                  onClick={() => setDateRange('custom')}
                >
                  Custom
                </button>
              </div>
            </div>

            {dateRange === 'custom' && (
              <div className="groups-date-range">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="groups-date-input"
                  placeholder="Start Date"
                />
                <span>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="groups-date-input"
                  placeholder="End Date"
                />
              </div>
            )}
          </div>

          {(searchTerm || minMembers || maxMembers || dateRange !== 'all' || sortBy !== 'createdAt' || sortOrder !== 'desc') && (
            <div className="groups-active-filters">
              <button className="groups-clear-filters" onClick={clearFilters}>
                Clear All Filters
              </button>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && <ErrorDisplay message={error} />}

        {/* Groups Table */}
        {groups.length === 0 ? (
          <div className="groups-empty">
            <div className="groups-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="8" r="4" />
                <path d="M5.5 20v-2a5 5 0 0 1 10 0v2" />
                <path d="M20 12h-4" />
                <path d="M16 8h4" />
                <path d="M20 4h-4" />
              </svg>
            </div>
            <h3 className="groups-empty-title">No groups found</h3>
            <p className="groups-empty-message">
              {searchTerm || minMembers || maxMembers || dateRange !== 'all'
                ? "No groups match your current filters. Try adjusting your search."
                : "There are no groups available yet."}
            </p>
            {(searchTerm || minMembers || maxMembers || dateRange !== 'all') && (
              <button className="groups-empty-btn" onClick={clearFilters}>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="groups-table-container">
              <table className="groups-table">
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>Members</th>
                    <th>Tasks</th>
                    <th>Reports</th>
                    <th>Created</th>
                    <th>Rotation</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => {
                    // Check if group is soft-deleted
                    const isSoftDeleted = group.name.startsWith('[DELETED]');
                    // Check if delete is allowed based on thresholds
                    const deleteAllowed = canDeleteGroup(group);
                    
                    return (
                      <tr 
                        key={group.id} 
                        onClick={() => handleRowClick(group.id)}
                        className={`groups-row ${selectedRowId === group.id ? 'selected' : ''} ${isSoftDeleted ? 'deleted' : ''}`}
                      >
                        <td>
                          <div className="groups-user-info">
                            <div className="groups-user-avatar">
                              {group.avatarUrl ? (
                                <img src={group.avatarUrl} alt={group.name} />
                              ) : (
                                <span>{isSoftDeleted ? '🗑️' : group.name.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <div>
                              <div className="groups-user-name">
                                {group.name}
                                {isSoftDeleted && <span className="deleted-badge">Deleted</span>}
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
                            <span>👥</span>
                            {group._count?.members || 0}
                          </span>
                        </td>
                        <td>
                          <span className="groups-type-badge tasks">
                            <span>📋</span>
                            {group._count?.tasks || 0}
                          </span>
                        </td>
                        <td>
                          <div className="reports-cell">
                            <span className={`groups-type-badge reports ${(group._count?.reports || 0) > 0 ? 'warning' : ''}`}>
                              <span>🚩</span>
                              {group._count?.reports || 0}
                            </span>
                            {group.reportAnalysis?.requiresImmediateAction && (
                              <button
                                className="report-warning-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAnalyzeReports(group.id);
                                }}
                                title="Reports require attention"
                              >
                                <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: '#fa5252' }} />
                              </button>
                            )}
                            {(group._count?.reports || 0) > 0 && !group.reportAnalysis?.requiresImmediateAction && (
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
                          <div className="groups-date">
                            <span className="groups-date-icon">📅</span>
                            {formatDate(group.createdAt)}
                          </div>
                        </td>
                        <td>
                          <div className="groups-rotation">
                            <span className="rotation-week">Week {group.currentRotationWeek}</span>
                            {group.lastRotationUpdate && (
                              <span className="rotation-date">
                                {new Date(group.lastRotationUpdate).toLocaleDateString()}
                              </span>
                            )}
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
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M22 12c-2.667 4.667-6 7-10 7s-7.333-2.333-10-7c2.667-4.667 6-7 10-7s7.333 2.333 10 7z" />
                              </svg>
                              <span>View</span>
                            </button>
                            {isSoftDeleted ? ( 
                              <button
                                className="groups-restore-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRestore(group.id);
                                }}
                                title="Restore group"
                              >
                                <FontAwesomeIcon icon={faUndo} />
                                <span>Restore</span>
                              </button>
                            ) : (
                              <button
                                className={`groups-delete-btn ${!deleteAllowed ? 'disabled' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (deleteAllowed) {
                                    handleDeleteClick(e, group.id);
                                  }
                                }}
                                disabled={!deleteAllowed}
                                title={!deleteAllowed ? 'Need more reports to delete' : 'Delete group'}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 6h18" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                  <path d="M8 4V3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1" />
                                </svg>
                                <span>Delete</span>
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
            {pagination.pages > 1 && (
              <div className="groups-pagination">
                <button
                  className="groups-pagination-btn"
                  disabled={pagination.page === 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  Previous
                </button>
                <span className="groups-pagination-info">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  className="groups-pagination-btn"
                  disabled={pagination.page === pagination.pages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Group Modal */}
      {showModal && (
        <GroupModal
          isOpen={showModal}
          onClose={closeModal}
          group={selectedGroup}
          loading={modalLoading}
          onDelete={handleDeleteConfirm}
          onRestore={handleRestore}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="groups-delete-overlay" onClick={closeDeleteModal}>
          <div className="groups-delete-confirm" onClick={(e) => e.stopPropagation()}>
            <p>Are you sure you want to delete this group?</p>
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
                Report Analysis - {selectedAnalysis.groupName}
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
                          <span>{type.message}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedAnalysis.suggestedActions.length > 0 && (
                <div className="suggested-actions-section">
                  <h3>Suggested Actions</h3>
                  <div className="suggested-actions-list">
                    {selectedAnalysis.suggestedActions.map((action, index) => {
                      // Check if ANY report type for this action meets threshold
                      const canApply = action.reportTypes.some(type => {
                        const typeData = selectedAnalysis.reportTypes.find(t => t.type === type);
                        return typeData?.meetsThreshold === true;
                      });

                      // Check if this is a soft-deleted group (for RESTORE action)
                      const isSoftDeleted = selectedAnalysis.groupName.startsWith('[DELETED]');
                      
                      // Only show RESTORE if group is soft-deleted
                      if (action.action === 'RESTORE' && !isSoftDeleted) {
                        return null;
                      }

                      // Get threshold info for display
                      const thresholdInfo = action.reportTypes.map(type => {
                        const typeData = selectedAnalysis.reportTypes.find(t => t.type === type);
                        const meetsThreshold = typeData?.meetsThreshold ? '✅' : '❌';
                        return `${meetsThreshold} ${type.replace(/_/g, ' ')}: ${typeData?.count || 0}/${typeData?.threshold || 0}`;
                      }).join(' · ');

                      return (
                        <div key={index} className={`suggested-action-item severity-${action.severity.toLowerCase()}`}>
                          <div className="action-header">
                            <FontAwesomeIcon 
                              icon={ACTION_ICONS[action.action as ActionType] || faInfoCircle}
                              style={{ color: ACTION_COLORS[action.action as ActionType] || '#868e96' }}
                            />
                            <span className="action-name">{ACTION_NAMES[action.action as ActionType] || action.action.replace(/_/g, ' ')}</span>
                            <span className={`severity-badge severity-${action.severity.toLowerCase()}`}>
                              {action.severity}
                            </span>
                          </div>
                          
                          <p className="action-reason">{action.reason}</p>
                          
                          <div className="threshold-info">
                            <small>{thresholdInfo}</small>
                          </div>

                          <button
                            className={`apply-action-btn ${!canApply ? 'disabled' : ''} ${action.action.toLowerCase()}`}
                            onClick={() => handleApplyAction(action.action)}
                            disabled={!canApply || applyingAction}
                            title={!canApply ? 'Threshold not met for this action' : `Apply ${ACTION_NAMES[action.action as ActionType]}`}
                          >
                            {applyingAction ? 'Applying...' : `Apply ${ACTION_NAMES[action.action as ActionType] || action.action.replace(/_/g, ' ')}`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="modal-close-btn" onClick={closeReportModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGroups;