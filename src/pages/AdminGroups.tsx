// pages/AdminGroups.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { AdminGroupsService } from '../services/admin.groups.service';
import type { Group, GroupStatisticsResponse } from '../services/admin.groups.service';
import GroupModal from '../components/GroupModal';
import LoadingScreen from '../components/LoadingScreen';
import ErrorDisplay from '../components/ErrorDisplay';
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

interface ExportFilterParams {
  search?: string;
  minMembers?: number;
  maxMembers?: number;
  createdAfter?: string;
  createdBefore?: string;
}

const AdminGroups = () => {
  const [groups, setGroups] = useState<Group[]>([]);
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

  // Modal
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const filterParams: FilterParams = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy,
        sortOrder
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

      const result = await AdminGroupsService.getGroups(filterParams);
      
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
    setShowDeleteConfirm(groupId);
  };

  const handleDeleteConfirm = async (groupId: string, hardDelete?: boolean) => {
    try {
      const result = await AdminGroupsService.deleteGroup(groupId, { hardDelete });
      if (result.success) {
        setShowDeleteConfirm(null);
        alert('Group deleted successfully!');
        fetchGroups();
        fetchStatistics();
      } else {
        alert(result.message || 'Failed to delete group');
      }
    } catch {
      alert('Network error. Please check your connection and try again.');
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const filterParams: ExportFilterParams = {};
      
      if (searchTerm) filterParams.search = searchTerm;
      if (minMembers) filterParams.minMembers = parseInt(minMembers);
      if (maxMembers) filterParams.maxMembers = parseInt(maxMembers);
      
      if (dateRange === 'custom') {
        if (startDate) filterParams.createdAfter = startDate;
        if (endDate) filterParams.createdBefore = endDate;
      }

      const result = await AdminGroupsService.exportGroups(format, filterParams);
      
      if (format === 'csv' && typeof result === 'string') {
        const blob = new Blob([result], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `groups-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else if (typeof result === 'object' && result !== null && 'success' in result) {
        const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `groups-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error exporting groups:', err);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => {
      setSelectedGroup(null);
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
          <div className="groups-header-actions">
            <div className="groups-export-dropdown">
              <button className="groups-export-btn">
                <span>📥</span>
                Export
              </button>
              <div className="groups-export-options">
                <button onClick={() => handleExport('json')}>Export as JSON</button>
                <button onClick={() => handleExport('csv')}>Export as CSV</button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="groups-stats">
            <div className="groups-stat-card">
              <span className="groups-stat-value">{stats.overview.total}</span>
              <span className="groups-stat-label">Total Groups</span>
            </div>
            <div className="groups-stat-card">
              <span className="groups-stat-value">{stats.overview.active}</span>
              <span className="groups-stat-label">Active Groups</span>
            </div>
            <div className="groups-stat-card">
              <span className="groups-stat-value">{stats.overview.recent}</span>
              <span className="groups-stat-label">New (30d)</span>
            </div>
            <div className="groups-stat-card">
              <span className="groups-stat-value">{stats.overview.withReports}</span>
              <span className="groups-stat-label">With Reports</span>
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

        {/* Groups Table or Empty State */}
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
            {/* Groups Table */}
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
                  {groups.map((group) => (
                    <tr 
                      key={group.id} 
                      onClick={() => handleRowClick(group.id)}
                      className={`groups-row ${selectedRowId === group.id ? 'selected' : ''}`}
                    >
                      <td>
                        <div className="groups-user-info">
                          <div className="groups-user-avatar">
                            {group.avatarUrl ? (
                              <img src={group.avatarUrl} alt={group.name} />
                            ) : (
                              <span>{group.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <div className="groups-user-name">{group.name}</div>
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
                        <span className={`groups-type-badge reports ${(group._count?.reports || 0) > 0 ? 'warning' : ''}`}>
                          <span>🚩</span>
                          {group._count?.reports || 0}
                        </span>
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
                            View
                          </button>
                          <button
                            className="groups-delete-btn"
                            onClick={(e) => handleDeleteClick(e, group.id)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                              <path d="M8 4V3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1" />
                            </svg>
                            Delete
                          </button>
                        </div>

                        {/* Delete Confirmation */}
                        {showDeleteConfirm === group.id && (
                          <div className="groups-delete-confirm" onClick={(e) => e.stopPropagation()}>
                            <p>Delete this group?</p>
                            <div className="confirm-actions">
                              <button 
                                className="confirm-soft"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteConfirm(group.id, false);
                                }}
                              >
                                Soft Delete
                              </button>
                              <button 
                                className="confirm-hard"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteConfirm(group.id, true);
                                }}
                              >
                                Hard Delete
                              </button>
                              <button 
                                className="confirm-cancel"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDeleteConfirm(null);
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
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
        />
      )}
    </div>
  );
};

export default AdminGroups;