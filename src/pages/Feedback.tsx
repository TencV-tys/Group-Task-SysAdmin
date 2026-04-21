// pages/Feedback.tsx - COMPLETE REWRITE OF STATS SECTION

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAdminFeedback } from '../hooks/useAdminFeedback';
import FeedbackModal from '../components/FeedbackModal';
import LoadingScreen from '../components/LoadingScreen';
import type { Feedback, FeedbackDetails } from '../services/admin.feedback.service';
import './styles/Feedback.css';

const DeleteConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  feedbackTitle: string;
  deleting: boolean;
}> = ({ isOpen, onClose, onConfirm, feedbackTitle, deleting }) => {
  if (!isOpen) return null;
  
  return ( 
    <div className="feedback-modal-overlay" onClick={onClose}>
      <div className="feedback-modal delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="feedback-modal-header">
          <h2>Delete Feedback</h2>
          <button className="feedback-modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="feedback-modal-body">
          <p>Are you sure you want to delete this feedback?</p>
          <div className="delete-feedback-preview">
            <strong>{feedbackTitle}</strong>
          </div>
          <p className="delete-warning">⚠️ This action cannot be undone.</p>
        </div>
        <div className="feedback-modal-footer">
          <button className="feedback-modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="feedback-modal-btn-delete" onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Separate StatsCard component to ensure re-renders
const StatsCard: React.FC<{
  label: string;
  value: number;
  status: string;
  isActive: boolean;
  onClick: () => void;
}> = React.memo(({ label, value, status, isActive, onClick }) => {
  console.log(`📊 [StatsCard] Rendering ${label}: ${value}, isActive: ${isActive}`);
  return (
    <div 
      className={`feedback-stat-card ${status.toLowerCase()} ${isActive ? 'active' : ''}`} 
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <span className="feedback-stat-value">{value}</span>
      <span className="feedback-stat-label">{label}</span>
    </div>
  );
});

const Feedback: React.FC = () => {
  console.log('🏁 [Feedback] Component rendering');
  
  const {
    feedback,
    loading,
    error,
    globalStats,
    pagination,
    actionLoading,
    hasNewFeedback,
    getFeedbackDetails,
    updateStatus,
    deleteFeedback,
    updateFilters,
    currentFilters,
  } = useAdminFeedback();

  // Local UI state
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ id: string; title: string; message: string } | null>(null);
  
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackDetails | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  
  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<Feedback | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Force re-render counter
  const [renderKey, setRenderKey] = useState(0);

  const toastTimeoutRef = useRef<number | undefined>(undefined);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Force re-render when globalStats changes
  useEffect(() => {
    console.log('🟢 [Feedback] globalStats CHANGED, forcing re-render');
    console.log('🟢 New stats:', globalStats);
    setRenderKey(prev => prev + 1);
  }, [globalStats]);

  // Show toast when hasNewFeedback changes
  useEffect(() => {
    if (hasNewFeedback) {
      setToastMessage({
        id: Date.now().toString(),
        title: '📢 New Feedback',
        message: 'New feedback has been submitted!'
      });
      
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
    }
  }, [hasNewFeedback]);

  const handleStatClick = (status: string) => {
    console.log('📊 Stat card clicked:', status);
    setStatusFilter(status);
    updateFilters({ 
      page: 1, 
      limit: 10, 
      status: status || undefined,
      search: searchInput || undefined
    });
  };

  const handleSearch = () => {
    console.log('🔍 Search triggered:', searchInput);
    updateFilters({ 
      page: 1, 
      limit: 10, 
      status: statusFilter || undefined,
      search: searchInput || undefined
    });
  };

  const handlePageChange = (newPage: number) => {
    console.log('📄 Page changed:', newPage);
    updateFilters({ 
      page: newPage, 
      limit: 10, 
      status: statusFilter || undefined,
      search: searchInput || undefined
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    updateFilters({
      page: currentFilters?.page || 1,
      limit: 10,
      status: statusFilter || undefined,
      search: searchInput || undefined
    });
    setTimeout(() => setRefreshing(false), 500);
  };

  const clearFilters = () => {
    setSearchInput('');
    setStatusFilter('');
    updateFilters({ page: 1, limit: 10, status: undefined, search: undefined });
  };

  const handleViewFeedback = async (feedbackId: string) => {
    if (selectedRowId === feedbackId) return;
    
    setSelectedRowId(feedbackId);
    setModalLoading(true);
    
    try {
      const result = await getFeedbackDetails(feedbackId);
      if (result.success && result.data && isMountedRef.current) {
        setSelectedFeedback(result.data);
        setShowModal(true);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setModalLoading(false);
      setSelectedRowId(null);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedFeedback) return;
    
    const result = await updateStatus(selectedFeedback.id, status);
    if (result.success && isMountedRef.current) {
      setShowModal(false);
      setSelectedFeedback(null);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, feedbackItem: Feedback) => {
    e.stopPropagation();
    setFeedbackToDelete(feedbackItem);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!feedbackToDelete || deleting) return;
    
    setDeleting(true);
    const result = await deleteFeedback(feedbackToDelete.id);
    if (result.success) {
      setShowDeleteModal(false);
      setFeedbackToDelete(null);
      if (selectedFeedback?.id === feedbackToDelete.id) {
        setShowModal(false);
        setSelectedFeedback(null);
      }
      setToastMessage({
        id: feedbackToDelete.id,
        title: '✅ Feedback Deleted',
        message: 'Feedback has been deleted successfully'
      });
      setTimeout(() => setToastMessage(null), 3000);
    }
    setDeleting(false); 
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => setSelectedFeedback(null), 300);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
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

  // Memoize stats to prevent unnecessary recalculations
  const statsData = useMemo(() => {
    console.log('📊 [useMemo] Recalculating statsData from globalStats:', globalStats);
    return globalStats || { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0, byType: {} };
  }, [globalStats]);

  console.log('🏁 [Feedback] RENDER with statsData:', statsData);
  console.log('🏁 [Feedback] RenderKey:', renderKey);

  if (loading && feedback.length === 0) {
    return <LoadingScreen message="Loading feedback..." fullScreen />;
  }

  return (
    <div className="feedback-wrapper" key={`wrapper-${renderKey}`}>
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

        {/* DEBUG PANEL */}
        <div style={{ background: '#f0f0f0', padding: '10px', margin: '10px', border: '1px solid red', fontSize: '12px', fontFamily: 'monospace' }}>
          <h3 style={{ margin: 0, color: 'red' }}>🔴 DEBUG - Stats Values</h3>
          <div><strong>Total:</strong> {statsData.total}</div>
          <div><strong>Open:</strong> {statsData.open}</div>
          <div><strong>In Progress:</strong> {statsData.inProgress}</div>
          <div><strong>Resolved:</strong> {statsData.resolved}</div>
          <div><strong>Closed:</strong> {statsData.closed}</div>
          <div><strong>Render Key:</strong> {renderKey}</div>
        </div>

        {/* Stats Cards - Using separate component with key */}
        <div className="feedback-stats" key={`stats-container-${renderKey}`}>
          <StatsCard
            label="Total"
            value={statsData.total}
            status="total"
            isActive={statusFilter === ''}
            onClick={() => handleStatClick('')}
          />
          <StatsCard
            label="Open"
            value={statsData.open}
            status="open"
            isActive={statusFilter === 'OPEN'}
            onClick={() => handleStatClick('OPEN')}
          />
          <StatsCard
            label="In Progress"
            value={statsData.inProgress}
            status="progress"
            isActive={statusFilter === 'IN_PROGRESS'}
            onClick={() => handleStatClick('IN_PROGRESS')}
          />
          <StatsCard
            label="Resolved"
            value={statsData.resolved}
            status="resolved"
            isActive={statusFilter === 'RESOLVED'}
            onClick={() => handleStatClick('RESOLVED')}
          />
          <StatsCard
            label="Closed"
            value={statsData.closed}
            status="closed"
            isActive={statusFilter === 'CLOSED'}
            onClick={() => handleStatClick('CLOSED')}
          />
        </div>

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
              <button onClick={handleSearch} className="feedback-search-btn" disabled={loading}>Search</button>
            </div>
          </div>
        </div>

        {error && <div className="feedback-error">{error}</div>}

        {feedback.length === 0 && !loading ? (
          <div className="feedback-empty">
            <div className="feedback-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3>No feedback found</h3>
            <p>{searchInput || statusFilter ? "No feedback matches your filters." : "No feedback submissions yet."}</p>
            {(searchInput || statusFilter) && <button onClick={clearFilters}>Clear Filters</button>}
          </div>
        ) : feedback.length > 0 ? (
          <>
            <div className="feedback-results-summary">
              <span>Showing {feedback.length} of {pagination.total} results</span>
            </div>

            <div className="feedback-table-container">
              <table className="feedback-table">
                <thead>
                  <tr><th>User</th><th>Type</th><th>Message</th><th>Category</th><th>Status</th><th>Date</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {feedback.map((item) => (
                    <tr key={item.id} onClick={() => handleViewFeedback(item.id)} className={`feedback-row ${selectedRowId === item.id ? 'selected' : ''}`}>
                      <td>
                        <div className="feedback-user-info">
                          <div className="feedback-user-avatar">
                            {item.user.avatarUrl ? <img src={item.user.avatarUrl} alt={item.user.fullName} /> : <span>{item.user.fullName?.charAt(0).toUpperCase() || '?'}</span>}
                          </div>
                          <div>
                            <span className="feedback-user-name">{item.user.fullName}</span>
                            <span className="feedback-user-email">{item.user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td><span className={`feedback-type-badge ${item.type?.toLowerCase()}`}>{item.type?.replace('_', ' ') || 'General'}</span></td>
                      <td><div className="feedback-message-preview" title={item.message}>{item.message.length > 50 ? `${item.message.substring(0, 50)}...` : item.message}</div></td>
                      <td>{item.category || '-'}</td>
                      <td><span className={`feedback-status-badge ${getStatusClass(item.status)}`}>{item.status.replace('_', ' ')}</span></td>
                      <td>{formatDate(item.createdAt)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="feedback-action-buttons">
                          <button className="feedback-view-btn" onClick={(e) => { e.stopPropagation(); handleViewFeedback(item.id); }} disabled={loading || actionLoading}>View</button>
                          {item.status === 'CLOSED' && (
                            <button className="feedback-delete-btn" onClick={(e) => { e.stopPropagation(); handleDeleteClick(e, item); }} disabled={loading || actionLoading || deleting}>Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.pages > 1 && (
              <div className="feedback-pagination">
                <button disabled={currentFilters?.page === 1 || loading} onClick={() => handlePageChange((currentFilters?.page || 1) - 1)}>Previous</button>
                <span>Page {currentFilters?.page || 1} of {pagination.pages}</span>
                <button disabled={currentFilters?.page === pagination.pages || loading} onClick={() => handlePageChange((currentFilters?.page || 1) + 1)}>Next</button>
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

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        feedbackTitle={feedbackToDelete?.message.substring(0, 50) || ''}
        deleting={deleting}
      />
    </div>
  );
};

export default Feedback;