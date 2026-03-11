// pages/AdminAudit.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { AdminAuditService } from '../services/admin.audit.service';
import type { AuditLog, AuditStatisticsResponse } from '../services/admin.audit.service';
import AuditModal from '../components/AuditModal';
import LoadingScreen from '../components/LoadingScreen';
import ErrorDisplay from '../components/ErrorDisplay';
import './styles/AdminAudit.css';


interface ExportFilterParams {
  search?: string;
  adminId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}
interface FetchLogsParams {
  limit: number;
  offset: number;
  search?: string;
  adminId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}
const AdminAudit = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AuditStatisticsResponse['statistics'] | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1,
    hasMore: false
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [adminFilter, setAdminFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('week');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Define fetchLogs with useCallback

const fetchLogs = useCallback(async () => {
  setLoading(true);
  try {
    const filterParams: FetchLogsParams = {
      limit: pagination.limit,
      offset: (pagination.page - 1) * pagination.limit
    };

    if (searchTerm) filterParams.search = searchTerm;
    if (adminFilter) filterParams.adminId = adminFilter;
    if (actionFilter) filterParams.action = actionFilter;

    // Handle date range
    if (dateRange === 'today') {
      const today = new Date().toISOString().split('T')[0];
      filterParams.startDate = today;
      filterParams.endDate = today;
    } else if (dateRange === 'week') {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      filterParams.startDate = start.toISOString().split('T')[0];
      filterParams.endDate = end.toISOString().split('T')[0];
    } else if (dateRange === 'month') {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 1);
      filterParams.startDate = start.toISOString().split('T')[0];
      filterParams.endDate = end.toISOString().split('T')[0];
    } else if (dateRange === 'custom') {
      if (startDate) filterParams.startDate = startDate;
      if (endDate) filterParams.endDate = endDate;
    }

    const result = await AdminAuditService.getLogs(filterParams);
    
    if (result.success) {
      setLogs(result.logs || []);
      setPagination(prev => ({
        total: result.pagination?.total || 0,
        page: prev.page,
        limit: prev.limit,
        pages: Math.ceil((result.pagination?.total || 0) / prev.limit),
        hasMore: result.pagination?.hasMore || false
      }));
      setError(null);
    } else {
      setError(result.message || 'Failed to load audit logs');
    }
  } catch (err) {
    setError('Network error');
    console.error('Error fetching logs:', err);
  } finally {
    setLoading(false);
  }
}, [pagination.page, pagination.limit, searchTerm, adminFilter, actionFilter, dateRange, startDate, endDate]);
  // Define fetchStatistics with useCallback
  const fetchStatistics = useCallback(async () => {
    try {
      const result = await AdminAuditService.getStatistics();
      if (result.success) {
        setStats(result.statistics || null);
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchStatistics();
  }, [fetchLogs, fetchStatistics]);

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    // fetchLogs will be called by useEffect after page changes
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleViewLog = async (logId: string) => {
    setSelectedRowId(logId);
    setModalLoading(true);
    setShowModal(true);

    try {
      const result = await AdminAuditService.getLogById(logId);
      
      if (result.success && result.log) {
        setSelectedLog(result.log);
      } else {
        setShowModal(false);
        setSelectedLog(null);
      }
    } catch (error) {
      console.error('Error loading audit log:', error);
      setShowModal(false);
      setSelectedLog(null);
    } finally {
      setModalLoading(false);
      setSelectedRowId(null);
    }
  };

  const handleRowClick = (logId: string) => {
    handleViewLog(logId);
  };

const handleExport = async (format: 'json' | 'csv') => {
  try {
    const filterParams: ExportFilterParams = {};
    
    if (searchTerm) filterParams.search = searchTerm;
    if (adminFilter) filterParams.adminId = adminFilter;
    if (actionFilter) filterParams.action = actionFilter;
    
    if (dateRange === 'custom') {
      if (startDate) filterParams.startDate = startDate;
      if (endDate) filterParams.endDate = endDate;
    }

    const result = await AdminAuditService.exportLogs(format, filterParams);
    
    if (format === 'csv' && typeof result === 'string') {
      const blob = new Blob([result], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else if (typeof result === 'object' && result !== null && 'success' in result) {
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  } catch (err) {
    console.error('Error exporting logs:', err);
  }
};
  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => {
      setSelectedLog(null);
    }, 300);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setAdminFilter('');
    setActionFilter('');
    setDateRange('week');
    setStartDate('');
    setEndDate('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionIcon = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('create')) return '➕';
    if (actionLower.includes('delete')) return '🗑️';
    if (actionLower.includes('update') || actionLower.includes('edit')) return '✏️';
    if (actionLower.includes('login')) return '🔑';
    if (actionLower.includes('export')) return '📥';
    if (actionLower.includes('view')) return '👁️';
    if (actionLower.includes('setting')) return '⚙️';
    if (actionLower.includes('ban') || actionLower.includes('suspend')) return '🚫';
    if (actionLower.includes('approve') || actionLower.includes('verify')) return '✅';
    if (actionLower.includes('reject')) return '❌';
    return '📝';
  };

  const getActionClass = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('create')) return 'create';
    if (actionLower.includes('delete')) return 'delete';
    if (actionLower.includes('update') || actionLower.includes('edit')) return 'update';
    if (actionLower.includes('login')) return 'login';
    if (actionLower.includes('export')) return 'export';
    if (actionLower.includes('view')) return 'view';
    if (actionLower.includes('setting')) return 'setting';
    if (actionLower.includes('ban') || actionLower.includes('suspend')) return 'ban';
    if (actionLower.includes('approve') || actionLower.includes('verify')) return 'approve';
    if (actionLower.includes('reject')) return 'reject';
    return 'other';
  };

  if (loading && logs.length === 0) {
    return <LoadingScreen message="Loading audit logs..." fullScreen />;
  }

  return (
    <div className="audit-wrapper">
      <div className="audit-container">
        {/* Header */}
        <div className="audit-header">
          <div className="audit-header-left">
            <h1>Audit Logs</h1>
            <p>Track all admin actions and system events</p>
          </div>
          <div className="audit-header-actions">
            <div className="audit-export-dropdown">
              <button className="audit-export-btn">
                <span>📥</span>
                Export
              </button>
              <div className="audit-export-options">
                <button onClick={() => handleExport('json')}>Export as JSON</button>
                <button onClick={() => handleExport('csv')}>Export as CSV</button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="audit-stats">
            <div className="audit-stat-card">
              <span className="audit-stat-value">{stats.total}</span>
              <span className="audit-stat-label">Total Logs</span>
            </div>
            <div className="audit-stat-card">
              <span className="audit-stat-value">{stats.byAction?.length || 0}</span>
              <span className="audit-stat-label">Unique Actions</span>
            </div>
            <div className="audit-stat-card">
              <span className="audit-stat-value">{stats.topAdmins?.length || 0}</span>
              <span className="audit-stat-label">Active Admins</span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="audit-filters">
          <div className="audit-search">
            <div className="audit-search-wrapper">
              <svg className="audit-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search by action, details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="audit-search-input"
              />
              <button onClick={handleSearch} className="audit-search-btn">
                Search
              </button>
            </div>
          </div>

          <div className="audit-filter-group">
            <button
              className={`audit-filter-btn ${dateRange === 'today' ? 'active' : ''}`}
              onClick={() => setDateRange('today')}
            >
              Today
            </button>
            <button
              className={`audit-filter-btn ${dateRange === 'week' ? 'active' : ''}`}
              onClick={() => setDateRange('week')}
            >
              Last 7 Days
            </button>
            <button
              className={`audit-filter-btn ${dateRange === 'month' ? 'active' : ''}`}
              onClick={() => setDateRange('month')}
            >
              Last 30 Days
            </button>
            <button
              className={`audit-filter-btn ${dateRange === 'custom' ? 'active' : ''}`}
              onClick={() => setDateRange('custom')}
            >
              Custom
            </button>
          </div>

          {dateRange === 'custom' && (
            <div className="audit-date-range">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="audit-date-input"
                placeholder="Start Date"
              />
              <span>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="audit-date-input"
                placeholder="End Date"
              />
            </div>
          )}

          <div className="audit-filter-inputs">
            <input
              type="text"
              placeholder="Filter by Admin ID"
              value={adminFilter}
              onChange={(e) => setAdminFilter(e.target.value)}
              className="audit-filter-input"
            />
            <input
              type="text"
              placeholder="Filter by Action"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="audit-filter-input"
            />
          </div>
        </div>

        {/* Error Display */}
        {error && <ErrorDisplay message={error} />}

        {/* Audit Table or Empty State */}
        {logs.length === 0 ? (
          <div className="audit-empty">
            <div className="audit-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="audit-empty-title">No audit logs found</h3>
            <p className="audit-empty-message">
              {searchTerm || adminFilter || actionFilter || dateRange !== 'week'
                ? "No logs match your current filters. Try adjusting your search."
                : "There are no audit logs available yet."}
            </p>
            {(searchTerm || adminFilter || actionFilter || dateRange !== 'week') && (
              <button className="audit-empty-btn" onClick={clearFilters}>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Audit Table */}
            <div className="audit-table-container">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Admin</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>IP Address</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr 
                      key={log.id} 
                      onClick={() => handleRowClick(log.id)}
                      className={`audit-row ${selectedRowId === log.id ? 'selected' : ''}`}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div className="audit-timestamp">
                          <span className="audit-timestamp-icon">🕒</span>
                          {formatDate(log.createdAt)}
                        </div>
                      </td>
                      <td>
                        <div className="audit-admin-info">
                          <div className="audit-admin-avatar">
                            {log.admin?.fullName?.charAt(0).toUpperCase() || 'A'}
                          </div>
                          <div>
                            <div className="audit-admin-name">{log.admin?.fullName || 'Unknown Admin'}</div>
                            <div className="audit-admin-email">{log.admin?.email || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`audit-action-badge ${getActionClass(log.action)}`}>
                          <span>{getActionIcon(log.action)}</span>
                          {log.action}
                        </span>
                      </td>
                      <td>
                        {log.targetUser ? (
                          <div className="audit-target-info">
                            <div className="audit-target-avatar">
                              {log.targetUser.fullName?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="audit-target-name">{log.targetUser.fullName}</div>
                              <div className="audit-target-email">{log.targetUser.email}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="audit-no-target">-</span>
                        )}
                      </td>
                      <td>
                        {log.ipAddress ? (
                          <div className="audit-ip">
                            <span className="audit-ip-icon">🌐</span>
                            {log.ipAddress}
                          </div>
                        ) : '-'}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          className="audit-view-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewLog(log.id);
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M22 12c-2.667 4.667-6 7-10 7s-7.333-2.333-10-7c2.667-4.667 6-7 10-7s7.333 2.333 10 7z" />
                          </svg>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="audit-pagination">
                <button
                  className="audit-pagination-btn"
                  disabled={pagination.page === 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  Previous
                </button>
                <span className="audit-pagination-info">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  className="audit-pagination-btn"
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

      {/* Audit Modal */}
      {showModal && (
        <AuditModal
          isOpen={showModal}
          onClose={closeModal}
          log={selectedLog}
          loading={modalLoading}
        />
      )}
    </div>
  );
};

export default AdminAudit;