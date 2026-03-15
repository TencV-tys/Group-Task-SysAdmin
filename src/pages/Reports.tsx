// pages/Reports.tsx - COMPLETE FIXED VERSION
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Report, ReportFilters } from '../services/admin.report.services';
import { AdminReportsService } from '../services/admin.report.services';
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

// Safe Image Component to handle broken avatar URLs
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
  const isFetchingRef = useRef(false);

  // ===== FIXED: Pass filters as parameter, not dependency =====
  const fetchReports = useCallback(async (filterParams?: ReportFilters) => {
    if (isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      // Use provided filters or current state
      const apiFilters = filterParams || filters;
      const queryFilters = { ...apiFilters };
      if (queryFilters.status === 'ALL') delete queryFilters.status;
      
      const result = await AdminReportsService.getReports(queryFilters);
      
      if (result.success) {
        setReports(result.reports || []);
        setTotalReports(result.pagination?.total || 0);
      } else {
        setError(result.message || 'Failed to load reports');
      }
    } catch (err) {
      console.error('Fetch reports error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [filters]); // 👈 Empty dependency array - NEVER recreates

  const fetchStats = useCallback(async () => {
    try {
      const result = await AdminReportsService.getReportStatistics();
      if (result.success && result.statistics) {
        setStats(result.statistics);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // ===== Update useEffect to pass current filters =====
  useEffect(() => {
    fetchReports(filters);
  }, [filters, fetchReports]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReports(filters);
    fetchStats();
  };

  const handleSearch = () => {
    const newFilters = { ...filters, search: searchInput, page: 1 };
    setFilters(newFilters);
    fetchReports(newFilters);
  };

  const handleStatusChange = (status: string) => {
    const newFilters = { ...filters, status, page: 1 };
    setFilters(newFilters);
    fetchReports(newFilters);
  };

  // ===== Handle stat card click =====
  const handleStatClick = (status: string) => {
    const newFilters = { ...filters, status, page: 1 };
    setFilters(newFilters);
    fetchReports(newFilters);
  };

  const handlePageChange = (newPage: number) => {
    const newFilters = { ...filters, page: newPage };
    setFilters(newFilters);
    fetchReports(newFilters);
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
    setUpdateStatus(report.status);
    setUpdateNotes(report.resolutionNotes || '');
    setShowUpdateModal(true);
  };

  // ===== FIXED: Update handler that preserves current filter =====
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
        // Close modal
        setShowUpdateModal(false);
        
        // Store current filter before refresh
        const currentFilter = filters.status;
        
        // Refresh data with CURRENT filters
        await fetchReports(filters);
        await fetchStats();
        
        // Clear states
        setSelectedReport(null);
        setSelectedRowId(null);
        setUpdateStatus('');
        setUpdateNotes('');
        
        // Show success message
        alert(`Report status updated to ${updateStatus}`);
        
        // If the report no longer matches current filter, 
        // offer to switch to ALL view
        if (currentFilter !== 'ALL' && currentFilter !== updateStatus) {
          if (window.confirm('Report updated. Switch to "All Reports" view to see it?')) {
            const newFilters = { ...filters, status: 'ALL', page: 1 };
            setFilters(newFilters);
            await fetchReports(newFilters);
          }
        }
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
    fetchReports(newFilters);
  };

  if (loading && !refreshing) {
    return <LoadingScreen message="Loading reports..." />;
  }

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1>
          <FontAwesomeIcon icon={faFlag} className="page-icon" />
          Reports Management
        </h1>
        <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing}>
          <FontAwesomeIcon icon={faRedoAlt} className={refreshing ? 'fa-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats Cards - NOW CLICKABLE */}
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
      ) : (
        <>
          {/* Reports Table or Empty State */}
          {reports.length === 0 ? (
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
              {/* Reports Table */}
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
                   {reports.map((report, index) => {
  // 👈 Move console.log here, outside JSX
  console.log('Rendering status:', report.status);
  
  return (
    <tr 
      key={`${report.id}-${report.status}-${report.resolvedAt || index}`} 
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
      <td>
        <div className="description-cell" title={report.description}>
          {report.description?.length > 50 
            ? `${report.description.substring(0, 50)}...` 
            : report.description || 'No description'}
        </div>
      </td>
      <td>
        <div className="date-cell">
          <FontAwesomeIcon icon={faCalendarAlt} />
          {getTimeAgo(report.createdAt)}
        </div>
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
        </>
      )}

      {/* Details Modal */}
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
                <label>Status</label>
                <select 
                  value={updateStatus} 
                  onChange={(e) => setUpdateStatus(e.target.value)}
                  className="form-control"
                >
                  <option value="PENDING">Pending</option>
                  <option value="REVIEWING">Reviewing</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="DISMISSED">Dismissed</option>
                </select>
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
                disabled={submitting}
              >
                {submitting ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  ); 
};

export default Reports;