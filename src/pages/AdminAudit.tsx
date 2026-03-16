// pages/AdminAudit.tsx - WITH CLICKABLE STATS CARDS
import React, { useState, useEffect } from 'react';
import { useAdminAudit } from '../hooks/useAdminAudit';
import AuditModal from '../components/AuditModal';
import LoadingScreen from '../components/LoadingScreen';
import ErrorDisplay from '../components/ErrorDisplay';
import { AdminAuditService } from '../services/admin.audit.service';
import type { AuditLog } from '../services/admin.audit.service';
import './styles/AdminAudit.css';

interface ExportFilterParams {
  search?: string;
  adminId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}  

interface FetchParams {
  limit: number;
  offset: number;
  search?: string;
  adminId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}

const AdminAudit = () => {
  console.log('🏁 [AdminAudit] Component rendering');
  
  const {
    logs,
    loading,
    error,
    stats,
    pagination,
    fetchLogs,
    fetchStatistics,
    getLogById,
    setPagination,
  } = useAdminAudit(20);

  console.log('📊 [AdminAudit] Hook data:', { 
    logsCount: logs.length, 
    loading, 
    error,
    stats: stats ? 'present' : 'null',
    pagination 
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [adminFilter, setAdminFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('week');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [initialLoad, setInitialLoad] = useState(true);

  // Modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // ===== NEW: Handle stat card click =====
  const handleStatClick = (action: string) => {
    console.log('📊 [AdminAudit] Stat card clicked:', action);
    setActionFilter(action);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Fetch logs when filters or pagination change
  useEffect(() => {
    console.log('🔍 [AdminAudit] Fetch logs useEffect triggered with:', {
      page: pagination.page,
      limit: pagination.limit,
      searchTerm,
      adminFilter,
      actionFilter,
      dateRange,
      startDate,
      endDate
    });

    const fetchData = async () => {
      const params: FetchParams = {
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit,
      };

      if (searchTerm) params.search = searchTerm;
      if (adminFilter) params.adminId = adminFilter;
      if (actionFilter) params.action = actionFilter;

      // Date range logic
      if (dateRange === 'today') {
        const start = new Date(); start.setHours(0,0,0,0);
        const end = new Date(); end.setHours(23,59,59,999);
        params.startDate = start.toISOString();
        params.endDate = end.toISOString();
        console.log('📅 Today range:', { start: params.startDate, end: params.endDate });
      } else if (dateRange === 'week') {
        const end = new Date(); end.setHours(23,59,59,999);
        const start = new Date(); start.setDate(start.getDate() - 6); start.setHours(0,0,0,0);
        params.startDate = start.toISOString();
        params.endDate = end.toISOString();
        console.log('📅 Week range:', { start: params.startDate, end: params.endDate });
      } else if (dateRange === 'month') {
        const end = new Date(); end.setHours(23,59,59,999);
        const start = new Date(); start.setDate(start.getDate() - 29); start.setHours(0,0,0,0);
        params.startDate = start.toISOString();
        params.endDate = end.toISOString();
        console.log('📅 Month range:', { start: params.startDate, end: params.endDate });
      } else if (dateRange === 'custom') {
        if (startDate) {
          const start = new Date(startDate); start.setHours(0,0,0,0);
          params.startDate = start.toISOString();
        }
        if (endDate) {
          const end = new Date(endDate); end.setHours(23,59,59,999);
          params.endDate = end.toISOString();
        }
        console.log('📅 Custom range:', { start: params.startDate, end: params.endDate });
      }

      console.log('📤 [AdminAudit] Fetching logs with params:', params);
      await fetchLogs(params);
      setInitialLoad(false);
    };

    fetchData();
  }, [pagination.page, pagination.limit, searchTerm, adminFilter, actionFilter, dateRange, startDate, endDate, fetchLogs]);

  // Fetch statistics when date range changes
  useEffect(() => {
    console.log('📊 [AdminAudit] Fetch stats useEffect triggered with dateRange:', dateRange);
    
    const statsParams: { startDate?: string; endDate?: string } = {};
    
    if (dateRange === 'today') {
      const start = new Date(); start.setHours(0,0,0,0);
      const end = new Date(); end.setHours(23,59,59,999);
      statsParams.startDate = start.toISOString();
      statsParams.endDate = end.toISOString();
    } else if (dateRange === 'week') {
      const end = new Date(); end.setHours(23,59,59,999);
      const start = new Date(); start.setDate(start.getDate() - 6); start.setHours(0,0,0,0);
      statsParams.startDate = start.toISOString();
      statsParams.endDate = end.toISOString();
    } else if (dateRange === 'month') {
      const end = new Date(); end.setHours(23,59,59,999);
      const start = new Date(); start.setDate(start.getDate() - 29); start.setHours(0,0,0,0);
      statsParams.startDate = start.toISOString();
      statsParams.endDate = end.toISOString();
    } else if (dateRange === 'custom') {
      if (startDate) statsParams.startDate = startDate;
      if (endDate) statsParams.endDate = endDate;
    }
    
    console.log('📤 [AdminAudit] Fetching stats with params:', statsParams);
    fetchStatistics(statsParams).then(result => {
      console.log('📥 [AdminAudit] Stats result:', result);
    });
  }, [dateRange, startDate, endDate, fetchStatistics]);

  const handleSearch = () => {
    console.log('🔍 [AdminAudit] Search clicked, resetting to page 1');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      console.log('↵ [AdminAudit] Enter key pressed');
      handleSearch();
    }
  };

  const handlePageChange = (newPage: number) => {
    console.log('📄 [AdminAudit] Page changing to:', newPage);
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleViewLog = async (logId: string) => {
    console.log('👁️ [AdminAudit] Viewing log:', logId);
    setSelectedRowId(logId);
    setModalLoading(true);
    setShowModal(true);

    try {
      const result = await getLogById(logId);
      console.log('📦 [AdminAudit] Log details result:', result);
      if (result.success && result.log) {
        setSelectedLog(result.log);
      } else {
        console.error('❌ [AdminAudit] Failed to load log:', result.message);
        setShowModal(false);
        setSelectedLog(null);
      }
    } catch (error) { 
      console.error('❌ [AdminAudit] Error loading audit log:', error);
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
    console.log('📥 [AdminAudit] Exporting as:', format);
    try {
      const filterParams: ExportFilterParams = {};
      if (searchTerm) filterParams.search = searchTerm;
      if (adminFilter) filterParams.adminId = adminFilter;
      if (actionFilter) filterParams.action = actionFilter;
      if (dateRange === 'custom') {
        if (startDate) filterParams.startDate = startDate;
        if (endDate) filterParams.endDate = endDate;
      }
      console.log('📤 [AdminAudit] Export params:', filterParams);

      const result = await AdminAuditService.exportLogs(format, filterParams);

      if (format === 'csv' && typeof result === 'string') {
        console.log('✅ [AdminAudit] CSV export successful');
        const blob = new Blob([result], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else if (typeof result === 'object' && result !== null && 'success' in result) {
        console.log('✅ [AdminAudit] JSON export successful');
        const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('❌ [AdminAudit] Error exporting logs:', err);
    }
  };

  const closeModal = () => {
    console.log('🚪 [AdminAudit] Closing modal');
    setShowModal(false);
    setTimeout(() => setSelectedLog(null), 300);
  };

  const clearFilters = () => {
    console.log('🧹 [AdminAudit] Clearing all filters');
    setSearchTerm('');
    setAdminFilter('');
    setActionFilter('');
    setDateRange('week');
    setStartDate('');
    setEndDate('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionIcon = (action: string): string => {
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

  const getActionClass = (action: string): string => {
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

  if (initialLoad && loading && logs.length === 0) {
    console.log('⏳ [AdminAudit] Showing loading screen');
    return <LoadingScreen message="Loading audit logs..." fullScreen />;
  }

  console.log('🎨 [AdminAudit] Rendering with stats:', stats);

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

        {/* Stats Cards - NOW CLICKABLE */}
        {stats && (
          <div className="audit-stats">
            {/* Total Logs Card - Click to clear action filter */}
            <div 
              className={`audit-stat-card ${actionFilter === '' ? 'active' : ''}`}
              onClick={() => handleStatClick('')}
              style={{ cursor: 'pointer' }}
            >
              <span className="audit-stat-value">{stats.total}</span>
              <span className="audit-stat-label">Total Logs</span>
              {actionFilter === '' && <div className="stat-active-indicator" />}
            </div>

            {/* Action Cards - Show top actions */}
            {stats.byAction?.slice(0, 3).map((action) => (
              <div 
                key={action.action}
                className={`audit-stat-card ${actionFilter === action.action ? 'active' : ''}`}
                onClick={() => handleStatClick(action.action)}
                style={{ cursor: 'pointer' }}
              >
                <span className="audit-stat-value">{action.count}</span>
                <span className="audit-stat-label">{action.action.replace(/_/g, ' ')}</span>
                {actionFilter === action.action && <div className="stat-active-indicator" />}
              </div>
            ))}

            {/* If less than 3 actions, add placeholder for unique actions */}
            {stats.byAction && stats.byAction.length < 3 && (
              <div className="audit-stat-card">
                <span className="audit-stat-value">{stats.byAction.length}</span>
                <span className="audit-stat-label">Unique Actions</span>
              </div>
            )}
          </div>
        )}

        {/* Active Filter Indicator */}
        {actionFilter && (
          <div className="audit-active-filter">
            <span>Filtering by action: <strong>{actionFilter.replace(/_/g, ' ')}</strong></span>
            <button 
              className="audit-clear-filter-btn"
              onClick={() => handleStatClick('')}
            >
              Clear Filter
            </button>
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
              <button onClick={handleSearch} className="audit-search-btn" disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          <div className="audit-filter-group">
            <button
              className={`audit-filter-btn ${dateRange === 'today' ? 'active' : ''}`}
              onClick={() => {
                console.log('📅 [AdminAudit] Date range changed to: today');
                setDateRange('today');
              }}
            >
              Today
            </button>
            <button
              className={`audit-filter-btn ${dateRange === 'week' ? 'active' : ''}`}
              onClick={() => {
                console.log('📅 [AdminAudit] Date range changed to: week');
                setDateRange('week');
              }}
            >
              Last 7 Days
            </button>
            <button
              className={`audit-filter-btn ${dateRange === 'month' ? 'active' : ''}`}
              onClick={() => {
                console.log('📅 [AdminAudit] Date range changed to: month');
                setDateRange('month');
              }}
            >
              Last 30 Days
            </button>
            <button
              className={`audit-filter-btn ${dateRange === 'custom' ? 'active' : ''}`}
              onClick={() => {
                console.log('📅 [AdminAudit] Date range changed to: custom');
                setDateRange('custom');
              }}
            >
              Custom
            </button>
          </div>

          {dateRange === 'custom' && (
            <div className="audit-date-range">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  console.log('📅 [AdminAudit] Start date changed:', e.target.value);
                  setStartDate(e.target.value);
                }}
                className="audit-date-input"
                placeholder="Start Date"
              />
              <span>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  console.log('📅 [AdminAudit] End date changed:', e.target.value);
                  setEndDate(e.target.value);
                }}
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
              onChange={(e) => {
                console.log('👤 [AdminAudit] Admin filter changed:', e.target.value);
                setAdminFilter(e.target.value);
              }}
              className="audit-filter-input"
            />
            <input
              type="text"
              placeholder="Filter by Action"
              value={actionFilter}
              onChange={(e) => {
                console.log('🎬 [AdminAudit] Action filter changed:', e.target.value);
                setActionFilter(e.target.value);
              }}
              className="audit-filter-input"
            />
          </div>
        </div>

        {/* Error Display */}
        {error && <ErrorDisplay message={error} />}

        {/* Loading overlay for subsequent loads */}
        {loading && !initialLoad && (
          <div className="audit-loading-overlay">
            <div className="audit-loading-spinner"></div>
          </div>
        )}

        {/* Audit Table or Empty State */}
        {logs.length === 0 && !loading ? (
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
                          disabled={modalLoading}
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
                  disabled={pagination.page === 1 || loading}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  Previous
                </button>
                <span className="audit-pagination-info">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  className="audit-pagination-btn"
                  disabled={pagination.page === pagination.pages || loading}
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