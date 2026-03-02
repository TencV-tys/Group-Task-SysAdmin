import React, { useState, useEffect } from 'react';
import { useAdminFeedback } from '../hooks/useAdminFeedback';
import FeedbackModal from '../components/FeedbackModal';
import LoadingScreen from '../components/LoadingScreen';
import ErrorDisplay from '../components/ErrorDisplay';
import type { FeedbackDetails } from '../services/admin.feedback.service';
import './styles/Feedback.css';

const Feedback = () => {
  const {
    feedback,
    loading,
    error,
    stats,
    pagination,
    fetchFeedback,
    fetchStats,
    getFeedbackDetails,
    updateStatus
  } = useAdminFeedback();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackDetails | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    fetchFeedback({ 
      page: pagination.page, 
      limit: pagination.limit,
      status: statusFilter || undefined
    });
    fetchStats();
  }, [fetchFeedback, fetchStats, pagination.page, pagination.limit, statusFilter]);

  const handleSearch = () => {
    fetchFeedback({ 
      page: 1, 
      limit: pagination.limit, 
      search: searchTerm || undefined,
      status: statusFilter || undefined
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (newPage: number) => {
    fetchFeedback({ 
      page: newPage, 
      limit: pagination.limit,
      search: searchTerm || undefined,
      status: statusFilter || undefined
    });
  };

  const handleViewFeedback = async (feedbackId: string) => {
    setModalLoading(true);
    setShowModal(true);

    const result = await getFeedbackDetails(feedbackId);
    
    if (result.success && result.data) {
      setSelectedFeedback(result.data);
    } else {
      setShowModal(false);
    }
    
    setModalLoading(false);
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedFeedback) return;
    
    const result = await updateStatus(selectedFeedback.id, status);
    if (result.success) {
      setSelectedFeedback(result.data || null);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedFeedback(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'BUG': return '🐛';
      case 'FEATURE_REQUEST': return '✨';
      case 'GENERAL': return '💬';
      case 'SUGGESTION': return '💡';
      case 'COMPLAINT': return '⚠️';
      case 'QUESTION': return '❓';
      default: return '📝';
    }
  };

  const getTypeClass = (type: string) => {
    switch (type) {
      case 'BUG': return 'bug';
      case 'FEATURE_REQUEST': return 'feature';
      case 'SUGGESTION': return 'suggestion';
      case 'QUESTION': return 'question';
      default: return 'general';
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'OPEN': return 'open';
      case 'IN_PROGRESS': return 'progress';
      case 'RESOLVED': return 'resolved';
      case 'CLOSED': return 'closed';
      default: return '';
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    fetchFeedback({ page: 1, limit: pagination.limit });
  };

  if (loading && feedback.length === 0) {
    return <LoadingScreen message="Loading feedback..." fullScreen />;
  }

  return (
    <div className="feedback-wrapper">
      <div className="feedback-container">
        {/* Header */}
        <div className="feedback-header">
          <div className="feedback-header-left">
            <h1>Feedback Management</h1>
            <p>View and manage user feedback</p>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="feedback-stats">
            <div className="feedback-stat-card open">
              <span className="feedback-stat-value">{stats.open}</span>
              <span className="feedback-stat-label">Open</span>
            </div>
            <div className="feedback-stat-card progress">
              <span className="feedback-stat-value">{stats.inProgress}</span>
              <span className="feedback-stat-label">In Progress</span>
            </div>
            <div className="feedback-stat-card resolved">
              <span className="feedback-stat-value">{stats.resolved}</span>
              <span className="feedback-stat-label">Resolved</span>
            </div>
            <div className="feedback-stat-card closed">
              <span className="feedback-stat-value">{stats.closed}</span>
              <span className="feedback-stat-label">Closed</span>
            </div>
            <div className="feedback-stat-card">
              <span className="feedback-stat-value">{stats.total}</span>
              <span className="feedback-stat-label">Total</span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="feedback-filters">
          <div className="feedback-search">
            <div className="feedback-search-wrapper">
              <svg className="feedback-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search feedback..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="feedback-search-input"
              />
              <button onClick={handleSearch} className="feedback-search-btn">
                Search
              </button>
            </div>
          </div>

          <div className="feedback-filter-group">
            <button
              className={`feedback-filter-btn ${!statusFilter ? 'active' : ''}`}
              onClick={() => setStatusFilter('')}
            >
              All
            </button>
            <button
              className={`feedback-filter-btn ${statusFilter === 'OPEN' ? 'active' : ''}`}
              onClick={() => setStatusFilter('OPEN')}
            >
              Open
            </button>
            <button
              className={`feedback-filter-btn ${statusFilter === 'IN_PROGRESS' ? 'active' : ''}`}
              onClick={() => setStatusFilter('IN_PROGRESS')}
            >
              In Progress
            </button>
            <button
              className={`feedback-filter-btn ${statusFilter === 'RESOLVED' ? 'active' : ''}`}
              onClick={() => setStatusFilter('RESOLVED')}
            >
              Resolved
            </button>
            <button
              className={`feedback-filter-btn ${statusFilter === 'CLOSED' ? 'active' : ''}`}
              onClick={() => setStatusFilter('CLOSED')}
            >
              Closed
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && <ErrorDisplay message={error} />}

        {/* Feedback Table or Empty State */}
        {feedback.length === 0 ? (
          <div className="feedback-empty">
            <div className="feedback-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="feedback-empty-title">No feedback found</h3>
            <p className="feedback-empty-message">
              {searchTerm || statusFilter 
                ? "No feedback matches your current filters. Try adjusting your search."
                : "There are no feedback submissions yet."}
            </p>
            {(searchTerm || statusFilter) && (
              <button className="feedback-empty-btn" onClick={clearFilters}>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Feedback Table */}
            <div className="feedback-table-container">
              <table className="feedback-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Type</th>
                    <th>Message</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {feedback.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="feedback-user-info">
                          <div className="feedback-user-avatar">
                            {item.user.avatarUrl ? (
                              <img src={item.user.avatarUrl} alt={item.user.fullName} />
                            ) : (
                              <span>{item.user.fullName.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <span className="feedback-user-name">{item.user.fullName}</span>
                            <span className="feedback-user-email">{item.user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`feedback-type-badge ${getTypeClass(item.type)}`}>
                          <span>{getTypeIcon(item.type)}</span>
                          {item.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div className="feedback-message-preview" title={item.message}>
                          {item.message}
                        </div>
                      </td>
                      <td>{item.category || '-'}</td>
                      <td>
                        <span className={`feedback-status-badge ${getStatusClass(item.status)}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>{formatDate(item.createdAt)}</td>
                      <td>
                        <button
                          className="feedback-view-btn"
                          onClick={() => handleViewFeedback(item.id)}
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
              <div className="feedback-pagination">
                <button
                  className="feedback-pagination-btn"
                  disabled={pagination.page === 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  Previous
                </button>
                <span className="feedback-pagination-info">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  className="feedback-pagination-btn"
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

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showModal}
        onClose={closeModal}
        feedback={selectedFeedback}
        loading={modalLoading}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
};

export default Feedback;