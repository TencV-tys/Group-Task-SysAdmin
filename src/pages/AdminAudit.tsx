// pages/AdminAudit.tsx - FULLY UPDATED & FIXED

import React, { useState, useEffect, useCallback } from 'react';
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
    logs: allLogs,
    loading,
    error, 
    pagination,
    fetchLogs,
    getLogById,
    deleteLog, 
    setPagination,
  } = useAdminAudit(20);

  // Client-side filtered logs
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [adminFilter, setAdminFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('week');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Separate state for stats (unfiltered by action)
  const [dateRangeStats, setDateRangeStats] = useState<{ 
    total: number; 
    byAction: Array<{ action: string; count: number }> 
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Helper to get date range params
  const getDateRangeParams = useCallback(() => {
    const params: { startDate?: string; endDate?: string } = {};
    
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    if (dateRange === 'today') {
      const start = new Date(); start.setHours(0,0,0,0);
      params.startDate = start.toISOString();
      params.endDate = endOfDay.toISOString();
    } else if (dateRange === 'week') {
      const start = new Date(); start.setDate(start.getDate() - 6); start.setHours(0,0,0,0);
      params.startDate = start.toISOString();
      params.endDate = endOfDay.toISOString();
    } else if (dateRange === 'month') {
      const start = new Date(); start.setDate(start.getDate() - 29); start.setHours(0,0,0,0);
      params.startDate = start.toISOString();
      params.endDate = endOfDay.toISOString();
    } else if (dateRange === 'custom') {
      if (startDate) {
        const start = new Date(startDate); start.setHours(0,0,0,0);
        params.startDate = start.toISOString();
      }
      if (endDate) {
        const end = new Date(endDate); end.setHours(23,59,59,999);
        params.endDate = end.toISOString();
      }
    }
    
    return params;
  }, [dateRange, startDate, endDate]);

  // Fetch stats for date range
  const fetchDateRangeStats = useCallback(async () => {
    const dateParams = getDateRangeParams();
    console.log('📊 [AdminAudit] Fetching stats for date range:', dateParams);
    setStatsLoading(true);
    
    try {
      const bustedParams = {
        ...dateParams,
        _t: Date.now().toString()
      };
      const result = await AdminAuditService.getStatistics(bustedParams);
      console.log('📊 [AdminAudit] byAction data:', result.statistics?.byAction);
console.log('📊 [AdminAudit] byAction length:', result.statistics?.byAction?.length);
      console.log('📊 [AdminAudit] Stats result:', result);
      if (result.success && result.statistics) {
        setDateRangeStats({
          total: result.statistics.total,
          byAction: result.statistics.byAction || []
        });
      } else {
        // Set empty stats to show the component
        setDateRangeStats({
          total: 0,
          byAction: []
        });
      }
    } catch (err) {
      console.error('❌ [AdminAudit] Failed to fetch stats:', err);
      setDateRangeStats({
        total: 0,
        byAction: []
      });
    } finally {
      setStatsLoading(false);
    }
  }, [getDateRangeParams]);

  // ✅ Fetch stats on initial mount (run once)
  useEffect(() => {
    fetchDateRangeStats();
  }, [fetchDateRangeStats]);

  // ✅ Fetch stats when date range changes
useEffect(() => {
  fetchDateRangeStats();
}, [dateRange, startDate, endDate, fetchDateRangeStats]);
  // Fetch logs when filters change
  useEffect(() => {
    const fetchData = async () => {
      const dateParams = getDateRangeParams();
      
      const params: FetchParams = {
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit,
      };

      if (searchTerm) params.search = searchTerm;
      if (adminFilter) params.adminId = adminFilter;
      if (actionFilter) params.action = actionFilter;
      if (dateParams.startDate) params.startDate = dateParams.startDate;
      if (dateParams.endDate) params.endDate = dateParams.endDate;

      console.log('📤 [AdminAudit] Fetching logs with params:', params);
      await fetchLogs(params);
      setInitialLoad(false);
    };

    fetchData();
  }, [pagination.page, pagination.limit, searchTerm, adminFilter, actionFilter, getDateRangeParams, fetchLogs]);

  // Client-side filtering by action
  useEffect(() => {
    if (!allLogs) {
      setFilteredLogs([]);
      return;
    }

    let filtered = [...allLogs];
    
    if (actionFilter) {
      filtered = filtered.filter(log => log.action === actionFilter);
      console.log(`🔍 Client-side filter: showing ${filtered.length} logs with action "${actionFilter}" out of ${allLogs.length} total`);
    } 
    
    setFilteredLogs(filtered);
  }, [allLogs, actionFilter]);

  // Handle stat card click
  const handleStatClick = useCallback((action: string) => {
    console.log('📊 [AdminAudit] Stat card clicked with action:', action);
    
    if (actionFilter === action && action !== '') {
      setActionFilter('');
    } else {
      setActionFilter(action);
    }
    
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [actionFilter, setPagination]);

  const clearActionFilter = useCallback(() => {
    setActionFilter('');
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [setPagination]);

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage === pagination.page) return;
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleViewLog = async (logId: string) => {
    setSelectedRowId(logId);
    setModalLoading(true);
    setShowModal(true);

    try {
      const result = await getLogById(logId);
      if (result.success && result.log) {
        setSelectedLog(result.log);
      } else {
        setShowModal(false);
        setSelectedLog(null);
      }
    } catch (error) { 
      console.error(error);
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

  const handleDeleteLog = async (logId: string) => {
    const result = await deleteLog(logId);
    if (result.success) {
      // Force full refresh
      await fetchDateRangeStats(); 
      
      // Refresh current page logs
      const dateParams = getDateRangeParams();
      await fetchLogs({
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit,
        ...(searchTerm && { search: searchTerm }),
        ...(adminFilter && { adminId: adminFilter }),
        ...(actionFilter && { action: actionFilter }),
        ...(dateParams.startDate && { startDate: dateParams.startDate }),
        ...(dateParams.endDate && { endDate: dateParams.endDate }),
      });
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const dateParams = getDateRangeParams();
      const filterParams: ExportFilterParams = {};
      
      if (searchTerm) filterParams.search = searchTerm;
      if (adminFilter) filterParams.adminId = adminFilter;
      if (actionFilter) filterParams.action = actionFilter;
      if (dateParams.startDate) filterParams.startDate = dateParams.startDate;
      if (dateParams.endDate) filterParams.endDate = dateParams.endDate;
      
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
      console.error('❌ [AdminAudit] Error exporting logs:', err);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => setSelectedLog(null), 300);
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

  const formatActionLabel = (action: string): string => {
    return action
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  };

  if (initialLoad && loading && allLogs.length === 0) {
    return <LoadingScreen message="Loading audit logs..." fullScreen />;
  }

  const topActions = dateRangeStats?.byAction
    ?.sort((a, b) => b.count - a.count)
    .slice(0, 3) || [];

  console.log('📊 [AdminAudit] Top 3 actions for cards:', topActions);

  const displayLogs = filteredLogs;
  const displayTotal = filteredLogs.length;

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
            <button 
              className="audit-clear-all-btn" 
              onClick={clearFilters}
              disabled={loading}
            >
              Clear All Filters
            </button>
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
        {statsLoading ? (
          <div className="audit-stats-loading">Loading statistics...</div>
        ) : dateRangeStats ? (
          <div className="audit-stats">
            <div 
              className={`audit-stat-card ${actionFilter === '' ? 'active' : ''}`}
              onClick={() => handleStatClick('')}
              style={{ cursor: 'pointer' }}
            >
              <span className="audit-stat-value">{dateRangeStats.total}</span>
              <span className="audit-stat-label">Total Logs</span>
              {actionFilter === '' && <div className="stat-active-indicator" />}
            </div>

            {topActions.slice(0, 3).map((actionStat) => (
              <div 
                key={actionStat.action}
                className={`audit-stat-card ${actionFilter === actionStat.action ? 'active' : ''}`}
                onClick={() => handleStatClick(actionStat.action)}
                style={{ cursor: 'pointer' }}
              >
                <span className="audit-stat-value">{actionStat.count}</span>
                <span className="audit-stat-label">{formatActionLabel(actionStat.action)}</span>
                {actionFilter === actionStat.action && <div className="stat-active-indicator" />}
              </div>
            ))}
          </div>
        ) : (
          <div className="audit-stats-error">No statistics available</div>
        )}

        {/* Active Filter Indicator */}
        {actionFilter && (
          <div className="audit-active-filter">
            <span>Filtering by action: <strong>{formatActionLabel(actionFilter)}</strong> ({displayTotal} logs)</span>
            <button className="audit-clear-filter-btn" onClick={clearActionFilter}>
              Clear Filter
            </button>
          </div>
        )}

        {adminFilter && (
          <div className="audit-active-filter audit-active-filter-admin">
            <span>Filtering by Admin ID: <strong>{adminFilter}</strong></span>
            <button 
              className="audit-clear-filter-btn"
              onClick={() => {
                setAdminFilter('');
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
            >
              Clear
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
            <button className={`audit-filter-btn ${dateRange === 'today' ? 'active' : ''}`} onClick={() => setDateRange('today')}>Today</button>
            <button className={`audit-filter-btn ${dateRange === 'week' ? 'active' : ''}`} onClick={() => setDateRange('week')}>Last 7 Days</button>
            <button className={`audit-filter-btn ${dateRange === 'month' ? 'active' : ''}`} onClick={() => setDateRange('month')}>Last 30 Days</button>
            <button className={`audit-filter-btn ${dateRange === 'custom' ? 'active' : ''}`} onClick={() => setDateRange('custom')}>Custom</button>
          </div>

          {dateRange === 'custom' && (
            <div className="audit-date-range">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="audit-date-input" />
              <span>to</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="audit-date-input" />
            </div>
          )}
        </div>

        {error && <ErrorDisplay message={error} />}

        {loading && !initialLoad && (
          <div className="audit-loading-overlay">
            <div className="audit-loading-spinner"></div>
          </div>
        )}

        {displayLogs.length === 0 && !loading ? (
          <div className="audit-empty">
            <div className="audit-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="audit-empty-title">No audit logs found</h3>
            <p className="audit-empty-message">
              {actionFilter ? `No logs found with action "${formatActionLabel(actionFilter)}".` : "No logs match your current filters."}
            </p>
            {actionFilter && (
              <button className="audit-empty-btn" onClick={clearActionFilter}>Clear Action Filter</button>
            )}
          </div>
        ) : (
          <>
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
                  {displayLogs.map((log) => (
                    <tr key={log.id} onClick={() => handleRowClick(log.id)} className={`audit-row ${selectedRowId === log.id ? 'selected' : ''}`} style={{ cursor: 'pointer' }}>
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
                        <button className="audit-view-btn" onClick={(e) => { e.stopPropagation(); handleViewLog(log.id); }} disabled={modalLoading}>
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

            {pagination.pages > 1 && (
              <div className="audit-pagination">
                <button className="audit-pagination-btn" disabled={pagination.page === 1 || loading} onClick={() => handlePageChange(pagination.page - 1)}>Previous</button>
                <span className="audit-pagination-info">Page {pagination.page} of {pagination.pages}</span>
                <button className="audit-pagination-btn" disabled={pagination.page === pagination.pages || loading} onClick={() => handlePageChange(pagination.page + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <AuditModal 
          isOpen={showModal} 
          onClose={closeModal} 
          log={selectedLog} 
          loading={modalLoading}
          onDelete={handleDeleteLog}
          onDeleted={() => {
            console.log('Log deleted successfully');
          }}
        />
      )}
    </div>
  );
};

export default AdminAudit;