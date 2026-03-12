// pages/Feedback.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    updateStatus,
    refreshFeedback
  } = useAdminFeedback();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [debouncedStatus, setDebouncedStatus] = useState<string>('');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackDetails | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Refs
  const isMounted = useRef(true);
  const fetchInProgress = useRef(false);
  const searchTimeoutRef = useRef<number|undefined>(undefined);
  const statusTimeoutRef = useRef<number|undefined>(undefined);

  // Fetch stats once on mount
  useEffect(() => {
    fetchStats();
    return () => {
      isMounted.current = false;
    };
  }, [fetchStats]);

  // Debounce search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Debounce status filter
  useEffect(() => {
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }

    statusTimeoutRef.current = setTimeout(() => {
      setDebouncedStatus(statusFilter);
      setCurrentPage(1);
    }, 500);

    return () => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, [statusFilter]);

  // Fetch feedback when dependencies change - USING HARDCODED LIMIT
  useEffect(() => {
    const loadFeedback = async () => {
      if (fetchInProgress.current) return;
      
      fetchInProgress.current = true;
      
      try {
        await fetchFeedback({ 
          page: currentPage, 
          limit: 10, // Hardcoded limit to prevent infinite loops
          status: debouncedStatus || undefined,
          search: debouncedSearch || undefined
        });
      } finally {
        fetchInProgress.current = false;
        setInitialLoad(false);
      }
    };
 
    loadFeedback();
  }, [currentPage, debouncedStatus, debouncedSearch, fetchFeedback]); // Removed pagination.limit

  // Safety effect to prevent infinite loading
  useEffect(() => {
    let timeoutId: number;
    
    if (loading && !fetchInProgress.current && !initialLoad) {
      timeoutId = setTimeout(() => {
        console.log('⚠️ Feedback loading stuck - forcing silent refresh');
        refreshFeedback();
      }, 10000);
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [loading, refreshFeedback, initialLoad]);

  const handleSearch = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    setDebouncedSearch(searchTerm);
    setCurrentPage(1);
  }, [searchTerm]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const handlePageChange = useCallback((newPage: number) => {
    if (newPage === currentPage || fetchInProgress.current || loading) return;
    setCurrentPage(newPage);
  }, [currentPage, loading]);

  const handleViewFeedback = async (feedbackId: string) => {
    if (selectedRowId === feedbackId) return;
    
    setSelectedRowId(feedbackId);
    setModalLoading(true);
    setShowModal(true);

    try {
      const result = await getFeedbackDetails(feedbackId);
      
      if (result.success && result.data && isMounted.current) {
        setSelectedFeedback(result.data);
      } else {
        if (isMounted.current) {
          setShowModal(false);
          setSelectedFeedback(null);
        }
      }
    } catch (error) {
      console.error('Error loading feedback:', error);
      if (isMounted.current) {
        setShowModal(false);
        setSelectedFeedback(null);
      }
    } finally {
      if (isMounted.current) {
        setModalLoading(false);
        setSelectedRowId(null);
      }
    }
  };

  const handleRowClick = (feedbackId: string) => {
    handleViewFeedback(feedbackId);
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => {
      if (isMounted.current) {
        setSelectedFeedback(null);
      }
    }, 300);
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedFeedback) return;
    
    const result = await updateStatus(selectedFeedback.id, status);
    if (result.success && isMounted.current) {
      if (result.data) {
        setSelectedFeedback(result.data);
      }
      closeModal();
    }
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

  const getNextStatusOptions = (currentStatus: string): string[] => {
    switch (currentStatus) {
      case 'OPEN':
        return ['IN_PROGRESS', 'RESOLVED', 'CLOSED'];
      case 'IN_PROGRESS':
        return ['RESOLVED', 'CLOSED'];
      case 'RESOLVED':
        return ['CLOSED'];
      case 'CLOSED':
        return [];
      default:
        return [];
    }
  };

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('');
    setDebouncedStatus('');
    setCurrentPage(1);
  }, []);

  // Show loading screen only on initial load
  if (initialLoad && loading && feedback.length === 0) {
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
            <div className="feedback-stat-card total">
              <span className="feedback-stat-value">{stats.total}</span>
              <span className="feedback-stat-label">Total</span>
            </div>
          </div>
        )}

        {/* Loading overlay for subsequent loads */}
        {loading && !initialLoad && (
          <div className="feedback-loading-overlay">
            <div className="feedback-loading-spinner"></div>
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
                disabled={loading || fetchInProgress.current}
              />
              <button 
                onClick={handleSearch} 
                className="feedback-search-btn"
                disabled={loading || fetchInProgress.current || searchTerm === debouncedSearch}
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          <div className="feedback-filter-group">
            <button
              className={`feedback-filter-btn ${!statusFilter ? 'active' : ''}`}
              onClick={() => setStatusFilter('')}
              disabled={loading || fetchInProgress.current}
            >
              All
            </button>
            <button
              className={`feedback-filter-btn ${statusFilter === 'OPEN' ? 'active' : ''}`}
              onClick={() => setStatusFilter('OPEN')}
              disabled={loading || fetchInProgress.current}
            >
              Open {stats?.open ? `(${stats.open})` : ''}
            </button>
            <button
              className={`feedback-filter-btn ${statusFilter === 'IN_PROGRESS' ? 'active' : ''}`}
              onClick={() => setStatusFilter('IN_PROGRESS')}
              disabled={loading || fetchInProgress.current}
            >
              In Progress {stats?.inProgress ? `(${stats.inProgress})` : ''}
            </button>
            <button
              className={`feedback-filter-btn ${statusFilter === 'RESOLVED' ? 'active' : ''}`}
              onClick={() => setStatusFilter('RESOLVED')}
              disabled={loading || fetchInProgress.current}
            >
              Resolved {stats?.resolved ? `(${stats.resolved})` : ''}
            </button>
            <button
              className={`feedback-filter-btn ${statusFilter === 'CLOSED' ? 'active' : ''}`}
              onClick={() => setStatusFilter('CLOSED')}
              disabled={loading || fetchInProgress.current}
            >
              Closed {stats?.closed ? `(${stats.closed})` : ''}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && <ErrorDisplay message={error} onRetry={() => {
          fetchFeedback({ 
            page: currentPage, 
            limit: 10, // Hardcoded limit
            status: debouncedStatus || undefined,
            search: debouncedSearch || undefined
          });
        }} />}

        {/* Feedback Table or Empty State */}
        {feedback.length === 0 && !loading ? (
          <div className="feedback-empty">
            <div className="feedback-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="feedback-empty-title">No feedback found</h3>
            <p className="feedback-empty-message">
              {debouncedSearch || debouncedStatus 
                ? "No feedback matches your current filters. Try adjusting your search."
                : "There are no feedback submissions yet."}
            </p>
            {(debouncedSearch || debouncedStatus) && (
              <button className="feedback-empty-btn" onClick={clearFilters}>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Results Summary */}
            <div className="feedback-results-summary">
              <span>Showing {feedback.length} of {pagination.total} results</span>
            </div>

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
                    <tr 
                      key={item.id} 
                      onClick={() => handleRowClick(item.id)}
                      className={`feedback-row ${selectedRowId === item.id ? 'selected' : ''} ${loading || fetchInProgress.current ? 'disabled' : ''}`}
                      style={{ cursor: loading || fetchInProgress.current ? 'wait' : 'pointer' }}
                    >
                      <td>
                        <div className="feedback-user-info">
                          <div className="feedback-user-avatar">
                            {item.user.avatarUrl ? (
                              <img src={item.user.avatarUrl} alt={item.user.fullName} />
                            ) : (
                              <span>{item.user.fullName?.charAt(0).toUpperCase() || '?'}</span>
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
                          {item.message.length > 50 
                            ? `${item.message.substring(0, 50)}...` 
                            : item.message}
                        </div>
                      </td>
                      <td>{item.category || '-'}</td>
                      <td>
                        <span className={`feedback-status-badge ${getStatusClass(item.status)}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>{formatDate(item.createdAt)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          className="feedback-view-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewFeedback(item.id);
                          }}
                          disabled={modalLoading || loading || fetchInProgress.current}
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
                  disabled={currentPage === 1 || loading || fetchInProgress.current}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  Previous
                </button>
                <div className="feedback-pagination-info">
                  <span>Page {currentPage} of {pagination.pages}</span>
                  <span className="feedback-pagination-total">
                    (Total: {pagination.total} {pagination.total === 1 ? 'item' : 'items'})
                  </span>
                </div>
                <button
                  className="feedback-pagination-btn"
                  disabled={currentPage === pagination.pages || loading || fetchInProgress.current}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Feedback Modal */}
      {showModal && (
        <FeedbackModal
          isOpen={showModal}
          onClose={closeModal}
          feedback={selectedFeedback}
          loading={modalLoading}
          onUpdateStatus={handleUpdateStatus}
          nextStatusOptions={selectedFeedback ? getNextStatusOptions(selectedFeedback.status) : []}
        />
      )}
    </div>
  );
};

export default Feedback;