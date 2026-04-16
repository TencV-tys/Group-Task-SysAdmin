// pages/Feedback.tsx - FIXED: Only use globalStats for stat cards, no filtered stats calls

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAdminFeedback } from '../hooks/useAdminFeedback';
import { adminSocket } from '../services/adminSocket';
import FeedbackModal from '../components/FeedbackModal';
import LoadingScreen from '../components/LoadingScreen';
import ErrorDisplay from '../components/ErrorDisplay';
import type { FeedbackDetails, FeedbackFilters } from '../services/admin.feedback.service';
import './styles/Feedback.css';

interface LocalFeedbackFilters {
  page: number;
  limit: number;
  status?: string;
  search?: string;
}

const Feedback: React.FC = () => {
  console.log('🏁 [Feedback] Component rendering');
  
  const {
    feedback,
    loading,
    error,
    globalStats,
    pagination,
    actionLoading,
    fetchFeedback,
    fetchGlobalStats,
    getFeedbackDetails,
    updateStatus,
    refreshFeedback,
  } = useAdminFeedback();

  const [filters, setFilters] = useState<LocalFeedbackFilters>({
    page: 1,
    limit: 10,
  });

  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [hasNewFeedback, setHasNewFeedback] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ id: string; title: string; message: string } | null>(null);
  
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackDetails | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const initialLoadDoneRef = useRef(false);
  const fetchInProgressRef = useRef(false);
  const toastTimeoutRef = useRef<number | undefined>(undefined);
  const lastShownFeedbackIdRef = useRef<string | null>(null);
  const pendingToastRef = useRef<{ id: string; title: string; message: string } | null>(null);
  const isMountedRef = useRef(true);

  // ===== Helper to build API filters =====
  const buildApiFilters = useCallback((
    customFilters?: Partial<LocalFeedbackFilters>,
    statusOverride?: string,
    searchOverride?: string
  ): FeedbackFilters => {
    const currentFilters = customFilters || filters;
    const apiFilters: FeedbackFilters = { 
      page: currentFilters.page,
      limit: currentFilters.limit,
    };
    
    const activeStatus = statusOverride !== undefined ? statusOverride : statusFilter;
    if (activeStatus && activeStatus !== '') {
      apiFilters.status = activeStatus;
    }
    
    const activeSearch = searchOverride !== undefined ? searchOverride : searchInput;
    if (activeSearch && activeSearch.trim() !== '') {
      apiFilters.search = activeSearch;
    }
    
    return apiFilters;
  }, [filters, statusFilter, searchInput]);

  // ===== Load feedback ONLY (no stats here) =====
  const loadFeedbackOnly = useCallback(async (
    filterParams?: Partial<LocalFeedbackFilters>,
    statusOverride?: string,
    searchOverride?: string
  ) => {
    if (fetchInProgressRef.current) {
      console.log('⏭️ [Feedback] Skipping fetch - already in progress');
      return;
    }
    
    fetchInProgressRef.current = true;
    
    try {
      const apiFilters = buildApiFilters(filterParams, statusOverride, searchOverride);
      console.log('🚀 [Feedback] Loading feedback with filters:', apiFilters);
      
      await fetchFeedback(apiFilters);
      setHasNewFeedback(false);
    } catch (err) {
      console.error('❌ [Feedback] Error loading feedback:', err);
    } finally {
      fetchInProgressRef.current = false;
    }
  }, [fetchFeedback, buildApiFilters]);

  // ===== Load global stats =====
  const loadGlobalStats = useCallback(async () => {
    try {
      await fetchGlobalStats(true);
    } catch (err) {
      console.error('❌ [Feedback] Error loading global stats:', err);
    }
  }, [fetchGlobalStats]);

  // ===== INITIAL LOAD =====
  useEffect(() => {
    if (!initialLoadDoneRef.current && isMountedRef.current) {
      initialLoadDoneRef.current = true;
      console.log('📥 [Feedback] Initial load - fetching global stats and feedback');
      
      // Load global stats AND feedback
      Promise.all([
        loadGlobalStats(),
        loadFeedbackOnly()
      ]).catch(err => {
        console.error('❌ [Feedback] Initial load failed:', err);
      });
    }
  }, [loadGlobalStats, loadFeedbackOnly]);

  // ===== Cleanup =====
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ===== REAL-TIME SOCKET LISTENERS =====
  useEffect(() => {
    const handleNewFeedback = (...args: unknown[]) => {
      const data = args[0] as { feedbackId: string; type: string; userName: string; message: string };
      console.log('📢 Real-time: New feedback received', data);
      
      if (!statusFilter || statusFilter === '') {
        if (data.feedbackId !== lastShownFeedbackIdRef.current) {
          lastShownFeedbackIdRef.current = data.feedbackId;
          pendingToastRef.current = {
            id: data.feedbackId,
            title: `New ${data.type} Feedback`,
            message: `${data.userName}: ${data.message.substring(0, 100)}${data.message.length > 100 ? '...' : ''}`
          };
        }
      }
      
      loadFeedbackOnly(undefined, statusFilter, searchInput);
      loadGlobalStats(); // Update stats on new feedback
      setHasNewFeedback(true);
    };
    
    const handleFeedbackStatusChanged = (...args: unknown[]) => {
      const data = args[0] as { feedbackId: string; oldStatus: string; newStatus: string };
      console.log('📢 Real-time: Feedback status changed', data);
      
      loadFeedbackOnly(undefined, statusFilter, searchInput);
      loadGlobalStats(); // Update stats on status change
      
      if (selectedFeedback?.id === data.feedbackId && isMountedRef.current) {
        getFeedbackDetails(data.feedbackId).then(result => {
          if (result.success && result.data && isMountedRef.current) {
            setSelectedFeedback(result.data);
          }
        });
      }
    };
    
    const handleFeedbackUpdated = (...args: unknown[]) => {
      console.log('📢 Real-time: Feedback updated', args[0]);
      loadFeedbackOnly(undefined, statusFilter, searchInput);
      loadGlobalStats();
      
      if (selectedFeedback && isMountedRef.current) {
        getFeedbackDetails(selectedFeedback.id).then(result => {
          if (result.success && result.data && isMountedRef.current) {
            setSelectedFeedback(result.data);
          }
        });
      }
    };
    
    const handleFeedbackDeleted = (...args: unknown[]) => {
      const data = args[0] as { feedbackId: string };
      console.log('📢 Real-time: Feedback deleted', data);
      loadFeedbackOnly(undefined, statusFilter, searchInput);
      loadGlobalStats();
      
      if (selectedFeedback?.id === data.feedbackId && isMountedRef.current) {
        setShowModal(false);
        setSelectedFeedback(null);
      }
    };
    
    adminSocket.on('feedback:new', handleNewFeedback);
    adminSocket.on('feedback:status', handleFeedbackStatusChanged);
    adminSocket.on('feedback:updated', handleFeedbackUpdated);
    adminSocket.on('feedback:deleted', handleFeedbackDeleted);
    
    return () => {
      adminSocket.off('feedback:new', handleNewFeedback);
      adminSocket.off('feedback:status', handleFeedbackStatusChanged);
      adminSocket.off('feedback:updated', handleFeedbackUpdated);
      adminSocket.off('feedback:deleted', handleFeedbackDeleted);
    };
  }, [statusFilter, searchInput, loadFeedbackOnly, loadGlobalStats, selectedFeedback, getFeedbackDetails]);

  // ===== Show toast for new feedback =====
  useEffect(() => {
    if (pendingToastRef.current) {
      const toast = pendingToastRef.current;
      pendingToastRef.current = null;
      
      setToastMessage(toast);
      
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setToastMessage(null);
        setTimeout(() => {
          lastShownFeedbackIdRef.current = null;
        }, 1000);
      }, 5000);
    }
  }, [feedback]);

  // ===== Handlers =====
  const handleSearch = () => {
    console.log('🔍 [Feedback] Search triggered:', searchInput);
    const newFilters = { ...filters, page: 1 };
    setFilters(newFilters);
    loadFeedbackOnly(newFilters, statusFilter, searchInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (newPage: number) => {
    console.log('📄 [Feedback] Page changed:', newPage);
    const newFilters = { ...filters, page: newPage };
    setFilters(newFilters);
    loadFeedbackOnly(newFilters, statusFilter, searchInput);
  };

  const handleRefresh = async () => {
    console.log('🔄 [Feedback] Manual refresh');
    setRefreshing(true);
    
    try {
      await refreshFeedback({
        page: filters.page,
        limit: filters.limit,
        status: statusFilter || undefined,
        search: searchInput || undefined
      });
      setHasNewFeedback(false);
    } catch (err) {
      console.error('❌ [Feedback] Refresh failed:', err);
    } finally {
      if (isMountedRef.current) {
        setRefreshing(false);
      }
    }
  };

  const handleStatClick = (status: string) => {
    console.log('📊 [Feedback] Stat card clicked:', status);
    setStatusFilter(status);
    const newFilters = { ...filters, page: 1 };
    setFilters(newFilters);
    loadFeedbackOnly(newFilters, status, searchInput);
    setHasNewFeedback(false);
  };

  const clearFilters = () => {
    console.log('🧹 [Feedback] Clearing filters');
    setSearchInput('');
    setStatusFilter('');
    const newFilters = { page: 1, limit: 10 };
    setFilters(newFilters);
    loadFeedbackOnly(newFilters, '', '');
    setHasNewFeedback(false);
  };

  const handleViewFeedback = async (feedbackId: string) => {
    if (selectedRowId === feedbackId) return;
    
    console.log('👁️ [Feedback] Viewing:', feedbackId);
    setSelectedRowId(feedbackId);
    setModalLoading(true);
    
    try {
      const result = await getFeedbackDetails(feedbackId);
      
      if (result.success && result.data && isMountedRef.current) {
        setSelectedFeedback(result.data);
        setShowModal(true);
      } else {
        alert('Failed to load feedback details');
      }
    } catch (err) {
      console.error('❌ [Feedback] Error:', err);
    } finally {
      if (isMountedRef.current) {
        setModalLoading(false);
        setSelectedRowId(null);
      }
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedFeedback) return;
    
    const result = await updateStatus(selectedFeedback.id, status);
    if (result.success && isMountedRef.current) {
      await loadFeedbackOnly(undefined, statusFilter, searchInput);
      await loadGlobalStats();
      
      const updatedDetails = await getFeedbackDetails(selectedFeedback.id);
      if (updatedDetails.success && updatedDetails.data && isMountedRef.current) {
        setSelectedFeedback(updatedDetails.data);
        setTimeout(() => {
          if (isMountedRef.current) {
            setShowModal(false);
            setSelectedFeedback(null);
          }
        }, 500);
      } else if (isMountedRef.current) {
        setShowModal(false);
        setSelectedFeedback(null);
      }
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => {
      if (isMountedRef.current) {
        setSelectedFeedback(null);
      }
    }, 300);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
      case 'OPEN': return ['IN_PROGRESS', 'RESOLVED', 'CLOSED'];
      case 'IN_PROGRESS': return ['RESOLVED', 'CLOSED'];
      case 'RESOLVED': return ['CLOSED'];
      default: return [];
    }
  };

  if (loading && feedback.length === 0) {
    return <LoadingScreen message="Loading feedback..." fullScreen />;
  }

  return (
    <div className="feedback-wrapper">
      {toastMessage && (
        <div className="feedback-toast" key={toastMessage.id}>
          <div className="toast-content">
            <strong>{toastMessage.title}</strong>
            <span>{toastMessage.message}</span>
          </div>
          <button className="toast-close" onClick={() => setToastMessage(null)}>×</button>
        </div>
      )}

      <div className="feedback-container">
        <div className="feedback-header">
          <div className="feedback-header-left">
            <h1>
              Feedback Management
              {hasNewFeedback && <span className="feedback-new-badge">●</span>}
            </h1>
            <p>View and manage user feedback</p>
          </div>
          <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing || loading}>
            <svg className={refreshing ? 'fa-spin' : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Stats Cards - ONLY use globalStats, never filteredStats */}
        {globalStats ? (
          <div className="feedback-stats">
            <div 
              className={`feedback-stat-card total ${statusFilter === '' ? 'active' : ''}`}
              onClick={() => handleStatClick('')}
              style={{ cursor: 'pointer' }}
            >
              <span className="feedback-stat-value">{globalStats.total}</span>
              <span className="feedback-stat-label">Total</span>
              {statusFilter === '' && <div className="stat-active-indicator" />}
            </div>
            
            <div 
              className={`feedback-stat-card open ${statusFilter === 'OPEN' ? 'active' : ''}`}
              onClick={() => handleStatClick('OPEN')}
              style={{ cursor: 'pointer' }}
            >
              <span className="feedback-stat-value">{globalStats.open}</span>
              <span className="feedback-stat-label">Open</span>
              {statusFilter === 'OPEN' && <div className="stat-active-indicator" />}
            </div>
            
            <div 
              className={`feedback-stat-card progress ${statusFilter === 'IN_PROGRESS' ? 'active' : ''}`}
              onClick={() => handleStatClick('IN_PROGRESS')}
              style={{ cursor: 'pointer' }}
            >
              <span className="feedback-stat-value">{globalStats.inProgress}</span>
              <span className="feedback-stat-label">In Progress</span>
              {statusFilter === 'IN_PROGRESS' && <div className="stat-active-indicator" />}
            </div>
            
            <div 
              className={`feedback-stat-card resolved ${statusFilter === 'RESOLVED' ? 'active' : ''}`}
              onClick={() => handleStatClick('RESOLVED')}
              style={{ cursor: 'pointer' }}
            >
              <span className="feedback-stat-value">{globalStats.resolved}</span>
              <span className="feedback-stat-label">Resolved</span>
              {statusFilter === 'RESOLVED' && <div className="stat-active-indicator" />}
            </div>
            
            <div 
              className={`feedback-stat-card closed ${statusFilter === 'CLOSED' ? 'active' : ''}`}
              onClick={() => handleStatClick('CLOSED')}
              style={{ cursor: 'pointer' }}
            >
              <span className="feedback-stat-value">{globalStats.closed}</span>
              <span className="feedback-stat-label">Closed</span>
              {statusFilter === 'CLOSED' && <div className="stat-active-indicator" />}
            </div>
          </div>
        ) : (
          <div className="feedback-stats-loading">
            <div className="stat-skeleton"></div>
            <div className="stat-skeleton"></div>
            <div className="stat-skeleton"></div>
            <div className="stat-skeleton"></div>
            <div className="stat-skeleton"></div>
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
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="feedback-search-input"
              />
              <button 
                onClick={handleSearch} 
                className="feedback-search-btn"
                disabled={loading}
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {error && <ErrorDisplay message={error} onRetry={handleRefresh} />}

        {feedback.length === 0 && !loading ? (
          <div className="feedback-empty">
            <div className="feedback-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="feedback-empty-title">No feedback found</h3>
            <p className="feedback-empty-message">
              {searchInput || statusFilter 
                ? "No feedback matches your current filters."
                : "There are no feedback submissions yet."}
            </p>
            {(searchInput || statusFilter) && (
              <button className="feedback-empty-btn" onClick={clearFilters}>
                Clear Filters
              </button>
            )}
          </div>
        ) : feedback.length > 0 ? (
          <>
            <div className="feedback-results-summary">
              <span>Showing {feedback.length} of {pagination.total} results</span>
            </div>

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
                      onClick={() => handleViewFeedback(item.id)}
                      className={`feedback-row ${selectedRowId === item.id ? 'selected' : ''}`}
                    >
                      <td>
                        <div className="feedback-user-info">
                          <div className="feedback-user-avatar">
                            {item.user.avatarUrl ? (
                              <img 
                                src={item.user.avatarUrl} 
                                alt={item.user.fullName}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) {
                                    const span = document.createElement('span');
                                    span.textContent = item.user.fullName?.charAt(0).toUpperCase() || '?';
                                    parent.appendChild(span);
                                  }
                                }}
                              />
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
                        <span className={`feedback-type-badge ${item.type?.toLowerCase()}`}>
                          {item.type?.replace('_', ' ') || 'General'}
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
                          disabled={loading || actionLoading}
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

            {pagination.pages > 1 && (
              <div className="feedback-pagination">
                <button
                  className="feedback-pagination-btn"
                  disabled={filters.page === 1 || loading}
                  onClick={() => handlePageChange(filters.page - 1)}
                >
                  Previous
                </button>
                <span className="feedback-pagination-info">
                  Page {filters.page} of {pagination.pages}
                </span>
                <button
                  className="feedback-pagination-btn"
                  disabled={filters.page === pagination.pages || loading}
                  onClick={() => handlePageChange(filters.page + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>

      {showModal && selectedFeedback && (
        <FeedbackModal
          isOpen={showModal}
          onClose={closeModal}
          feedback={selectedFeedback}
          loading={modalLoading}
          onUpdateStatus={handleUpdateStatus}
          nextStatusOptions={getNextStatusOptions(selectedFeedback.status)}
        />
      )}
    </div>
  );
};

export default Feedback;