// pages/Reports.tsx - HARD DELETE ONLY (No soft delete option)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Report, ReportFilters } from '../services/admin.report.services';
import { AdminReportsService } from '../services/admin.report.services';
import { adminSocket } from '../services/adminSocket';
import LoadingScreen from '../components/LoadingScreen';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFlag, 
  faCheckCircle, 
  faClock, 
  faSearch,
  faFilter,
  faEye,
  faCheck,
  faTimes,
  faSpinner, 
  faExclamationTriangle,
  faChevronLeft,
  faChevronRight,
  faRedoAlt,
  faUsers,
  faCalendarAlt,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import './styles/Reports.css';

interface ReportStatistics {
  overview: {
    total: number;
    pending: number;
    reviewing: number;
    resolved: number;
    dismissed: number;
    resolutionRate: number;
  };
  byType: Array<{
    type: string;
    count: number;
  }>;
  topReportedGroups: Array<{
    groupId: string;
    groupName: string;
    reportCount: number;
  }>;
  recentReports: Array<{
    id: string;
    type: string;
    status: string;
    reporterName: string;
    groupName: string;
    createdAt: string;
  }>;
}

interface NewReportSocketData {
  reportId: string;
  groupId: string;
  groupName: string;
  reporterId: string;
  reporterName: string;
  reportType: string;
  description: string;
  createdAt: string;
  status: string;
}

interface ReportStatusSocketData {
  reportId: string;
  groupId: string;
  groupName: string;
  reporterId: string;
  reporterName: string;
  oldStatus: string;
  newStatus: string;
  resolvedBy: string;
  resolutionNotes: string | null;
  resolvedAt: string;
}

interface ReportDeletedSocketData {
  reportId: string;
  groupId: string;
  groupName: string;
  reporterId: string;
  reporterName: string;
  deletedBy: string;
  hardDelete: boolean;
  deletedAt: string;
}

// Safe Image Component
const SafeImage = ({ src, className, fallbackChar }: { src: string; className: string; fallbackChar: string }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  
  if (error || !src) {
    return (
      <div className={`${className}-placeholder`}>
        {fallbackChar}
      </div>
    );
  }
  
  return (
    <img 
      src={src} 
      className={className}
      onError={() => {
        setError(true);
        setLoading(false);
      }}
      onLoad={() => setLoading(false)}
      style={{ display: loading ? 'none' : 'block' }}
      alt=""
    />
  );
};

const getAllowedNextStatuses = (currentStatus: string): string[] => {
  switch (currentStatus) {
    case 'PENDING':
      return ['REVIEWING', 'RESOLVED', 'DISMISSED'];
    case 'REVIEWING':
      return ['RESOLVED', 'DISMISSED'];
    case 'RESOLVED':
      return ['DISMISSED'];
    case 'DISMISSED':
      return [];
    default:
      return ['PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED'];
  }
};

const Reports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({
    status: 'ALL',
    page: 1,
    limit: 20
  });
  const [totalReports, setTotalReports] = useState(0);
  const [stats, setStats] = useState<ReportStatistics | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [toastMessage, setToastMessage] = useState<{ id: string; title: string; message: string } | null>(null);
  const [hasNewReport, setHasNewReport] = useState(false);
  
  // Delete state - HARD DELETE ONLY
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  const isMountedRef = useRef(true);
  const toastTimeoutRef = useRef<number | undefined>(undefined);
  const lastShownReportIdRef = useRef<string | null>(null);
  const pendingToastRef = useRef<{ id: string; title: string; message: string } | null>(null);

  // Helper function to refresh all data
  const refreshAllData = useCallback(async () => {
    try {
      const queryFilters = { ...filters };
      if (queryFilters.status === 'ALL') delete queryFilters.status;
      
      const [freshReports, freshStats] = await Promise.all([
        AdminReportsService.getReports(queryFilters),
        AdminReportsService.getReportStatistics()
      ]);
      
      if (freshReports.success && isMountedRef.current) {
        setReports(freshReports.reports || []);
        setTotalReports(freshReports.pagination?.total || 0);
      }
      
      if (freshStats.success && freshStats.statistics && isMountedRef.current) {
        setStats(freshStats.statistics);
      }
      
      return true;
    } catch (err) {
      console.error('Refresh error:', err);
      return false;
    }
  }, [filters]);

  // ===== FETCH REPORTS =====
  const fetchReports = useCallback(async (filterParams?: ReportFilters) => {
    try {
      const apiFilters = filterParams || filters;
      const queryFilters = { ...apiFilters };
      if (queryFilters.status === 'ALL') delete queryFilters.status;
      
      console.log('📥 Fetching reports with filters:', queryFilters);
      
      const result = await AdminReportsService.getReports(queryFilters);
      
      if (result.success && isMountedRef.current) {
        setReports(result.reports || []);
        setTotalReports(result.pagination?.total || 0);
        setHasNewReport(false);
        setError(null);
      } else if (isMountedRef.current) {
        setError(result.message || 'Failed to load reports');
      }
    } catch (err) {
      console.error('Fetch reports error:', err);
      if (isMountedRef.current) {
        setError('Network error. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      const result = await AdminReportsService.getReportStatistics();
      if (result.success && result.statistics && isMountedRef.current) {
        setStats(result.statistics);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // ===== REAL-TIME SOCKET LISTENERS =====
  useEffect(() => {
    const handleNewReport = (...args: unknown[]) => {
      const data = args[0] as NewReportSocketData;
      console.log('📢 Real-time: New report received', data);
      
      if (data.reportId !== lastShownReportIdRef.current) {
        lastShownReportIdRef.current = data.reportId;
        
        pendingToastRef.current = {
          id: data.reportId,
          title: '🚨 New Report',
          message: `${data.reporterName} reported "${data.groupName}" for ${data.reportType?.replace(/_/g, ' ') || 'unknown'}`
        };
      }
      
      refreshAllData();
      setHasNewReport(true);
    };
    
    const handleReportStatusChanged = (...args: unknown[]) => {
      const data = args[0] as ReportStatusSocketData;
      console.log('📢 Real-time: Report status changed', data);
      
      refreshAllData();
      
      setToastMessage({
        id: data.reportId,
        title: '✅ Status Updated',
        message: `Report #${data.reportId.slice(0, 8)} changed from ${data.oldStatus} to ${data.newStatus}`
      });
      
      setTimeout(() => setToastMessage(null), 3000);
      
      if (selectedReport?.id === data.reportId && isMountedRef.current) {
        AdminReportsService.getReportById(data.reportId).then(result => {
          if (result.success && result.report && isMountedRef.current) {
            setSelectedReport(result.report);
          }
        });
      }
    };
    
    const handleReportDeleted = (...args: unknown[]) => {
      const data = args[0] as ReportDeletedSocketData;
      console.log('📢 Real-time: Report HARD DELETED', data);
      
      refreshAllData();
      
      setToastMessage({
        id: data.reportId,
        title: '🗑️ Report Permanently Deleted',
        message: `Report #${data.reportId.slice(0, 8)} was permanently deleted by ${data.deletedBy}`
      });
      
      setTimeout(() => setToastMessage(null), 3000);
      
      if (selectedReport?.id === data.reportId) {
        setShowDetailsModal(false);
        setSelectedReport(null);
      }
    };
    
    adminSocket.on('report:new', handleNewReport);
    adminSocket.on('report:status', handleReportStatusChanged);
    adminSocket.on('report:deleted', handleReportDeleted);
    
    return () => {
      adminSocket.off('report:new', handleNewReport);
      adminSocket.off('report:status', handleReportStatusChanged);
      adminSocket.off('report:deleted', handleReportDeleted);
    };
  }, [refreshAllData, selectedReport]);

  // ===== Show toast for new report =====
  useEffect(() => {
    if (pendingToastRef.current) {
      const toast = pendingToastRef.current;
      pendingToastRef.current = null;
      
      setToastMessage(toast);
      
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setToastMessage(null);
        setTimeout(() => {
          lastShownReportIdRef.current = null;
        }, 1000);
      }, 5000);
    } 
  }, [reports]);

  useEffect(() => {
    if (isMountedRef.current) {
      fetchStats();
    }
  }, [filters.status, fetchStats]);

  // ===== Initial data load =====
  useEffect(() => {
    isMountedRef.current = true;
    
    const loadInitialData = async () => {
      await Promise.all([fetchReports(filters), fetchStats()]);
    };
    
    loadInitialData();
    
    return () => {
      isMountedRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when filters change
  useEffect(() => {
    if (isMountedRef.current && !loading) {
      fetchReports(filters);
    }
  }, [filters.page, filters.status, filters.search, fetchReports, filters, loading]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAllData();
    setHasNewReport(false);
    setRefreshing(false);
  };

  const handleSearch = () => {
    const newFilters = { ...filters, search: searchInput, page: 1 };
    setFilters(newFilters);
  };

  const handleStatusChange = (status: string) => {
    const newFilters = { ...filters, status, page: 1 };
    setFilters(newFilters);
    setHasNewReport(false);
  };

  const handleStatClick = (status: string) => {
    const newFilters = { ...filters, status, page: 1 };
    setFilters(newFilters);
    setHasNewReport(false);
  };

  const handlePageChange = (newPage: number) => {
    const newFilters = { ...filters, page: newPage };
    setFilters(newFilters);
  };

  const handleRowClick = (report: Report) => {
    handleViewDetails(report);
  };

  const handleViewDetails = (report: Report) => {
    setSelectedRowId(report.id);
    setSelectedReport(report);
    setShowDetailsModal(true);
  };

  const handleUpdateClick = (e: React.MouseEvent, report: Report) => {
    e.stopPropagation();
    setSelectedReport(report);
    setUpdateStatus('');
    setUpdateNotes(report.resolutionNotes || '');
    setShowUpdateModal(true);
  };

  // ===== DELETE HANDLER - HARD DELETE ONLY (no soft delete option) =====
  const handleDeleteClick = (report: Report) => {
    setReportToDelete(report);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!reportToDelete) return;
    
    setDeleting(true);
    try {
      // HARD DELETE ONLY - always pass true
      const result = await AdminReportsService.deleteReport(reportToDelete.id, true);
      
      if (result.success) {
        setShowDeleteModal(false);
        setReportToDelete(null);
        
        setRefreshing(true);
        await refreshAllData();
        setRefreshing(false);
        
        setToastMessage({
          id: Date.now().toString(),
          title: '🗑️ Report Permanently Deleted',
          message: `Report #${reportToDelete.id.slice(0, 8)} has been permanently deleted`
        });
        
        setTimeout(() => setToastMessage(null), 3000);
        
        // Close details modal if open
        if (selectedReport?.id === reportToDelete.id) {
          setShowDetailsModal(false);
          setSelectedReport(null);
          setSelectedRowId(null);
        }
        
      } else {
        alert(result.message || 'Failed to delete report');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Network error. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedReport) return;
    
    setSubmitting(true);
    try {
      const result = await AdminReportsService.updateReportStatus(
        selectedReport.id,
        updateStatus,
        updateNotes
      );
      
      if (result.success) {
        setShowUpdateModal(false);
        
        setRefreshing(true);
        await refreshAllData();
        setRefreshing(false);
        
        setToastMessage({
          id: Date.now().toString(),
          title: '✅ Status Updated',
          message: `Report status changed to ${updateStatus}`
        });
        
        setTimeout(() => setToastMessage(null), 3000);
        
        setSelectedReport(null);
        setSelectedRowId(null);
        setUpdateStatus('');
        setUpdateNotes('');
        
      } else {
        alert(result.message || 'Failed to update report');
      }
    } catch (err) {
      console.error('Update error:', err);
      alert('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewFullDetails = async (report: Report) => {
    setSelectedRowId(report.id);
    try {
      const result = await AdminReportsService.getReportById(report.id);
      if (result.success && result.report) {
        setSelectedReport(result.report);
        setShowDetailsModal(true);
      } else {
        setSelectedReport(report);
        setShowDetailsModal(true);
      }
    } catch (err) {
      console.error('Error fetching details:', err);
      setSelectedReport(report);
      setShowDetailsModal(true);
    }
  };

  const closeModal = () => {
    setShowDetailsModal(false);
    setTimeout(() => {
      setSelectedReport(null);
      setSelectedRowId(null);
    }, 300);
  };

  const closeUpdateModal = () => {
    setShowUpdateModal(false);
    setTimeout(() => {
      setSelectedReport(null);
      setSelectedRowId(null);
      setUpdateStatus('');
      setUpdateNotes('');
    }, 300);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDING': return 'status-pending';
      case 'REVIEWING': return 'status-reviewing';
      case 'RESOLVED': return 'status-resolved';
      case 'DISMISSED': return 'status-dismissed';
      default: return '';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return faClock;
      case 'REVIEWING': return faSpinner;
      case 'RESOLVED': return faCheckCircle;
      case 'DISMISSED': return faTimes;
      default: return faFlag;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'INAPPROPRIATE_CONTENT': return '🚫';
      case 'HARASSMENT': return '⚠️';
      case 'SPAM': return '📧';
      case 'OFFENSIVE_BEHAVIOR': return '🤬';
      case 'TASK_ABUSE': return '📋';
      case 'GROUP_MISUSE': return '👥';
      case 'OTHER': return '❓';
      default: return '🏷️';
    }
  };

  const getTypeClass = (type: string) => {
    switch (type) {
      case 'INAPPROPRIATE_CONTENT': return 'inappropriate';
      case 'HARASSMENT': return 'harassment';
      case 'SPAM': return 'spam';
      case 'OFFENSIVE_BEHAVIOR': return 'offensive';
      case 'TASK_ABUSE': return 'task';
      case 'GROUP_MISUSE': return 'group';
      default: return 'other';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  const totalPages = Math.ceil(totalReports / (filters.limit || 20));

  const clearFilters = () => {
    setSearchInput('');
    const newFilters = {
      status: 'ALL',
      page: 1,
      limit: 20
    };
    setFilters(newFilters);
    setHasNewReport(false);
  };

  if (loading && !refreshing && reports.length === 0) {
    return <LoadingScreen message="Loading reports..." />;
  }

  return (
    <div className="reports-page">
      {/* Toast notification */}
      {toastMessage && (
        <div className="reports-toast" key={toastMessage.id}>
          <div className="toast-content">
            <strong>{toastMessage.title}</strong>
            <span>{toastMessage.message}</span>
          </div>
          <button className="toast-close" onClick={() => setToastMessage(null)}>×</button>
        </div>
      )}

      <div className="page-header">
        <h1>
          <FontAwesomeIcon icon={faFlag} className="page-icon" />
          Reports Management
          {hasNewReport && <span className="new-reports-badge">●</span>}
        </h1>
        <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing}>
          <FontAwesomeIcon icon={faRedoAlt} className={refreshing ? 'fa-spin' : ''} />
          Refresh
        </button>
      </div>

      {stats && (
        <div className="stats-grid">
          <div 
            className={`stat-card total ${filters.status === 'ALL' ? 'active' : ''}`}
            onClick={() => handleStatClick('ALL')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon">
              <FontAwesomeIcon icon={faFlag} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.overview.total}</span>
              <span className="stat-label">Total Reports</span>
            </div>
            {filters.status === 'ALL' && <div className="stat-active-indicator" />}
          </div>
          
          <div 
            className={`stat-card pending ${filters.status === 'PENDING' ? 'active' : ''}`}
            onClick={() => handleStatClick('PENDING')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon">
              <FontAwesomeIcon icon={faClock} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.overview.pending}</span>
              <span className="stat-label">Pending</span>
            </div>
            {filters.status === 'PENDING' && <div className="stat-active-indicator" />}
          </div>
          
          <div 
            className={`stat-card reviewing ${filters.status === 'REVIEWING' ? 'active' : ''}`}
            onClick={() => handleStatClick('REVIEWING')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon">
              <FontAwesomeIcon icon={faSpinner} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.overview.reviewing}</span>
              <span className="stat-label">Reviewing</span>
            </div>
            {filters.status === 'REVIEWING' && <div className="stat-active-indicator" />}
          </div>
          
          <div 
            className={`stat-card resolved ${filters.status === 'RESOLVED' ? 'active' : ''}`}
            onClick={() => handleStatClick('RESOLVED')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon">
              <FontAwesomeIcon icon={faCheckCircle} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.overview.resolved}</span>
              <span className="stat-label">Resolved</span>
            </div>
            {filters.status === 'RESOLVED' && <div className="stat-active-indicator" />}
          </div>
          
          <div 
            className={`stat-card dismissed ${filters.status === 'DISMISSED' ? 'active' : ''}`}
            onClick={() => handleStatClick('DISMISSED')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon">
              <FontAwesomeIcon icon={faTimes} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.overview.dismissed}</span>
              <span className="stat-label">Dismissed</span>
            </div>
            {filters.status === 'DISMISSED' && <div className="stat-active-indicator" />}
          </div>
          
          <div className="stat-card rate">
            <div className="stat-icon">
              <FontAwesomeIcon icon={faCheckCircle} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.overview.resolutionRate}%</span>
              <span className="stat-label">Resolution Rate</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <FontAwesomeIcon icon={faFilter} className="filter-icon" />
          <select 
            value={filters.status} 
            onChange={(e) => handleStatusChange(e.target.value)}
            className="filter-select"
          >
            <option value="ALL">All Reports</option>
            <option value="PENDING">Pending</option>
            <option value="REVIEWING">Reviewing</option>
            <option value="RESOLVED">Resolved</option>
            <option value="DISMISSED">Dismissed</option>
          </select>
        </div>
        <div className="search-box">
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search reports..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="search-input"
          />
          <button className="search-btn" onClick={handleSearch}>
            Search
          </button>
        </div>
      </div>

      {/* Error State */}
      {error ? (
        <div className="error-state">
          <FontAwesomeIcon icon={faExclamationTriangle} size="3x" />
          <p>{error}</p>
          <button onClick={handleRefresh} className="retry-btn">Retry</button>
        </div>
      ) : reports.length === 0 && !loading ? (
        <div className="empty-state">
          <div className="empty-icon">
            <FontAwesomeIcon icon={faFlag} />
          </div>
          <h3>No reports found</h3>
          <p>
            {searchInput || filters.status !== 'ALL'
              ? "No reports match your current filters. Try adjusting your search."
              : "There are no reports in the system yet."}
          </p>
          {(searchInput || filters.status !== 'ALL') && (
            <button className="empty-btn" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Group</th>
                  <th>Reported By</th>
                  <th>Description</th>
                  <th>Reported</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report, index) => (
                  <tr 
                    key={`${report.id}-${report.status}-${index}`} 
                    onClick={() => handleRowClick(report)}
                    className={`report-row ${selectedRowId === report.id ? 'selected' : ''}`}
                  >
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(report.status)}`}>
                        <FontAwesomeIcon icon={getStatusIcon(report.status)} />
                        {report.status}
                      </span>
                    </td>
                    <td>
                      <span className={`type-badge ${getTypeClass(report.type)}`}>
                        <span>{getTypeIcon(report.type)}</span>
                        {report.type?.replace(/_/g, ' ') || 'Unknown'}
                      </span>
                    </td>
                    <td>
                      <div className="group-cell">
                        {report.group?.avatarUrl ? (
                          <SafeImage 
                            src={report.group.avatarUrl} 
                            className="group-avatar"
                            fallbackChar={report.group?.name?.charAt(0) || 'G'}
                          />
                        ) : (
                          <div className="group-avatar-placeholder">
                            {report.group?.name?.charAt(0) || 'G'}
                          </div>
                        )}
                        <span>{report.group?.name || 'Unknown Group'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="user-cell">
                        {report.reporter?.avatarUrl ? (
                          <SafeImage 
                            src={report.reporter.avatarUrl} 
                            className="user-avatar"
                            fallbackChar={report.reporter?.fullName?.charAt(0) || 'U'}
                          />
                        ) : (
                          <div className="user-avatar-placeholder">
                            {report.reporter?.fullName?.charAt(0) || 'U'}
                          </div>
                        )}
                        <span>{report.reporter?.fullName || 'Unknown User'}</span>
                      </div>
                    </td>
                    <td className="description-cell" title={report.description}>
                      {report.description?.length > 50 
                        ? `${report.description.substring(0, 50)}...` 
                        : report.description || 'No description'}
                    </td>
                    <td className="date-cell">
                      <FontAwesomeIcon icon={faCalendarAlt} />
                      {getTimeAgo(report.createdAt)}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="action-buttons">
                        <button 
                          className="action-btn view"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewFullDetails(report);
                          }}
                          title="View Details"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </button>
                        <button 
                          className="action-btn update"
                          onClick={(e) => handleUpdateClick(e, report)}
                          title="Update Status"
                        >
                          <FontAwesomeIcon icon={faCheck} />
                        </button>
                        {/* NO DELETE BUTTON IN TABLE ROW - Only in modal for DISMISSED */}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => handlePageChange((filters.page || 1) - 1)}
                disabled={filters.page === 1}
                className="page-btn"
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
              <span className="page-info">
                Page {filters.page} of {totalPages}
              </span>
              <button 
                onClick={() => handlePageChange((filters.page || 1) + 1)}
                disabled={filters.page === totalPages}
                className="page-btn"
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Details Modal - WITH DELETE BUTTON (only shows if status is DISMISSED) */}
      {showDetailsModal && selectedReport && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content report-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Report Details</h2>
              <button className="modal-close" onClick={closeModal}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="modal-body">
              <div className="details-section">
                <h3>Report Information</h3>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className={`status-badge ${getStatusBadgeClass(selectedReport.status)}`}>
                    <FontAwesomeIcon icon={getStatusIcon(selectedReport.status)} />
                    {selectedReport.status}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Type:</span>
                  <span className={`type-badge ${getTypeClass(selectedReport.type)}`}>
                    <span>{getTypeIcon(selectedReport.type)}</span>
                    {selectedReport.type?.replace(/_/g, ' ') || 'Unknown'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Reported:</span>
                  <span>{formatDate(selectedReport.createdAt)}</span>
                </div>
                {selectedReport.resolvedAt && (
                  <div className="detail-row">
                    <span className="detail-label">Resolved:</span>
                    <span>{formatDate(selectedReport.resolvedAt)}</span>
                  </div>
                )}
                {selectedReport.resolver && (
                  <div className="detail-row">
                    <span className="detail-label">Resolved by:</span>
                    <span>{selectedReport.resolver.fullName}</span>
                  </div>
                )}
              </div>

              <div className="details-section">
                <h3>Group Information</h3>
                <div className="detail-row">
                  <span className="detail-label">Name:</span>
                  <span>{selectedReport.group?.name || 'Unknown'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Members:</span>
                  <span><FontAwesomeIcon icon={faUsers} /> {selectedReport.group?._count?.members || 0}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Tasks:</span>
                  <span><FontAwesomeIcon icon={faFlag} /> {selectedReport.group?._count?.tasks || 0}</span>
                </div>
                {selectedReport.group?.description && (
                  <div className="detail-row description">
                    <span className="detail-label">Description:</span>
                    <p>{selectedReport.group.description}</p>
                  </div>
                )}
              </div>

              <div className="details-section">
                <h3>Reporter Information</h3>
                <div className="detail-row">
                  <span className="detail-label">Name:</span>
                  <span>{selectedReport.reporter?.fullName || 'Unknown'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Email:</span>
                  <span>{selectedReport.reporter?.email || 'Unknown'}</span>
                </div>
              </div>

              <div className="details-section">
                <h3>Report Description</h3>
                <div className="description-box">
                  {selectedReport.description || 'No description provided'}
                </div>
              </div>

              {selectedReport.resolutionNotes && (
                <div className="details-section">
                  <h3>Resolution Notes</h3>
                  <div className="resolution-notes">
                    {selectedReport.resolutionNotes}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="modal-cancel" onClick={closeModal}>
                Close
              </button>
              <button 
                className="modal-confirm"
                onClick={() => {
                  closeModal();
                  setTimeout(() => {
                    handleUpdateClick({ stopPropagation: () => {} } as React.MouseEvent, selectedReport);
                  }, 300);
                }}
              >
                Update Status
              </button>
              {/* DELETE BUTTON - ONLY SHOW WHEN STATUS IS DISMISSED - HARD DELETE ONLY */}
              {selectedReport.status === 'DISMISSED' && (
                <button 
                  className="modal-confirm delete"
                  onClick={() => {
                    closeModal();
                    setTimeout(() => {
                      handleDeleteClick(selectedReport);
                    }, 300);
                  }}
                >
                  <FontAwesomeIcon icon={faTrash} /> Permanently Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Update Modal */}
      {showUpdateModal && selectedReport && (
        <div className="modal-overlay" onClick={closeUpdateModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Update Report Status</h2>
              <button className="modal-close" onClick={closeUpdateModal}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Current Status</label>
                <div className="current-status-display">
                  <span className={`status-badge ${getStatusBadgeClass(selectedReport.status)}`}>
                    <FontAwesomeIcon icon={getStatusIcon(selectedReport.status)} />
                    {selectedReport.status}
                  </span>
                </div>
              </div>
              <div className="form-group">
                <label>Change Status To</label>
                <select 
                  value={updateStatus} 
                  onChange={(e) => setUpdateStatus(e.target.value)}
                  className="form-control"
                >
                  <option value="">Select new status...</option>
                  {getAllowedNextStatuses(selectedReport.status).map(status => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                {getAllowedNextStatuses(selectedReport.status).length === 0 && (
                  <p className="form-hint" style={{ color: '#fa5252', marginTop: 8 }}>
                    This report is in a terminal state and cannot be changed.
                  </p>
                )}
              </div>
              <div className="form-group">
                <label>Resolution Notes</label>
                <textarea
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  placeholder="Add notes about this resolution..."
                  rows={4}
                  className="form-control"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-cancel" onClick={closeUpdateModal}>
                Cancel
              </button>
              <button 
                className="modal-confirm"
                onClick={handleUpdateStatus}
                disabled={submitting || !updateStatus || getAllowedNextStatuses(selectedReport.status).length === 0}
              >
                {submitting ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal - HARD DELETE ONLY (no options, just warning) */}
      {showDeleteModal && reportToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: '#fa5252', marginRight: '8px' }} />
                Permanently Delete Report
              </h2>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="modal-body">
              <p className="warning-text">
                ⚠️ <strong>Warning: This action is PERMANENT and cannot be undone!</strong>
              </p>
              <p>Are you sure you want to permanently delete this report?</p>
              
              {reportToDelete && (
                <div className="report-summary">
                  <strong>Report ID:</strong> {reportToDelete.id.slice(0, 8)}...
                  <br />
                  <strong>Type:</strong> {reportToDelete.type}
                  <br />
                  <strong>Group:</strong> {reportToDelete.group?.name || 'Unknown'}
                  <br />
                  <strong>Reporter:</strong> {reportToDelete.reporter?.fullName || 'Unknown'}
                  <br />
                  <strong>Created:</strong> {formatDate(reportToDelete.createdAt)}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="modal-cancel" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button 
                className="modal-confirm delete"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Yes, Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;