// pages/Reports.tsx
import React, { useState, useEffect, useCallback } from 'react';
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

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiFilters = { ...filters };
      if (apiFilters.status === 'ALL') delete apiFilters.status;
      
      const result = await AdminReportsService.getReports(apiFilters);
      
      if (result.success) {
        setReports(result.reports || []);
        setTotalReports(result.pagination?.total || 0);
      } else {
        setError(result.message || 'Failed to load reports');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      const result = await AdminReportsService.getReportStatistics();
      if (result.success && result.statistics) {
        setStats(result.statistics);
      }
    } catch {
      console.error('Failed to fetch stats');
    }
  }, []);

  useEffect(() => {
    fetchReports();
    fetchStats();
  }, [fetchReports, fetchStats]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReports();
    fetchStats();
  };

  const handleSearch = () => {
    setFilters(prev => ({ ...prev, search: searchInput, page: 1 }));
  };

  const handleStatusChange = (status: string) => {
    setFilters(prev => ({ ...prev, status, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
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

  const handleUpdateStatus = async () => {
    if (!selectedReport) return;
    
    setSubmitting(true);
    try {
      const result = await AdminReportsService.updateReportStatus(
        selectedReport.id,
        updateStatus,
        updateNotes
      );
      
      if (result.success && result.report) {
        setReports(prev => prev.map(r => 
          r.id === selectedReport.id ? result.report! : r
        ));
        setShowUpdateModal(false);
        setSelectedRowId(null);
        fetchStats();
      } else {
        alert(result.message || 'Failed to update report');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setSubmitting(false);
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
    setFilters({
      status: 'ALL',
      page: 1,
      limit: 20
    });
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

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card total">
            <div className="stat-icon">
              <FontAwesomeIcon icon={faFlag} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.overview.total}</span>
              <span className="stat-label">Total Reports</span>
            </div>
          </div>
          <div className="stat-card pending">
            <div className="stat-icon">
              <FontAwesomeIcon icon={faClock} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.overview.pending}</span>
              <span className="stat-label">Pending</span>
            </div>
          </div>
          <div className="stat-card reviewing">
            <div className="stat-icon">
              <FontAwesomeIcon icon={faSpinner} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.overview.reviewing}</span>
              <span className="stat-label">Reviewing</span>
            </div>
          </div>
          <div className="stat-card resolved">
            <div className="stat-icon">
              <FontAwesomeIcon icon={faCheckCircle} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.overview.resolved}</span>
              <span className="stat-label">Resolved</span>
            </div>
          </div>
          <div className="stat-card dismissed">
            <div className="stat-icon">
              <FontAwesomeIcon icon={faTimes} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.overview.dismissed}</span>
              <span className="stat-label">Dismissed</span>
            </div>
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
                    {reports.map((report) => (
                      <tr 
                        key={report.id} 
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
                            {report.type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>
                          <div className="group-cell">
                            {report.group.avatarUrl ? (
                              <img src={report.group.avatarUrl} alt="" className="group-avatar" />
                            ) : (
                              <div className="group-avatar-placeholder">
                                {report.group.name.charAt(0)}
                              </div>
                            )}
                            <span>{report.group.name}</span>
                          </div>
                        </td>
                        <td>
                          <div className="user-cell">
                            {report.reporter.avatarUrl ? (
                              <img src={report.reporter.avatarUrl} alt="" className="user-avatar" />
                            ) : (
                              <div className="user-avatar-placeholder">
                                {report.reporter.fullName.charAt(0)}
                              </div>
                            )}
                            <span>{report.reporter.fullName}</span>
                          </div>
                        </td>
                        <td>
                          <div className="description-cell" title={report.description}>
                            {report.description.length > 50 
                              ? `${report.description.substring(0, 50)}...` 
                              : report.description}
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
                                handleViewDetails(report);
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
                    {selectedReport.type.replace(/_/g, ' ')}
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
                  <span>{selectedReport.group.name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Members:</span>
                  <span><FontAwesomeIcon icon={faUsers} /> {selectedReport.group._count.members}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Tasks:</span>
                  <span><FontAwesomeIcon icon={faFlag} /> {selectedReport.group._count.tasks}</span>
                </div>
                {selectedReport.group.description && (
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
                  <span>{selectedReport.reporter.fullName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Email:</span>
                  <span>{selectedReport.reporter.email}</span>
                </div>
              </div>

              <div className="details-section">
                <h3>Report Description</h3>
                <div className="description-box">
                  {selectedReport.description}
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
                  handleUpdateClick({ stopPropagation: () => {} } as React.MouseEvent, selectedReport);
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