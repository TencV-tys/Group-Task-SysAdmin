import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminNotifications } from '../hooks/useAdminNotifications';
import LoadingScreen from '../components/LoadingScreen';
import ErrorDisplay from '../components/ErrorDisplay';
import type { AdminNotification } from '../services/admin.notifications.service';
import './styles/Notifications.css';

const Notifications = () => {
  const navigate = useNavigate();
  const {
    notifications,
    loading, 
    error,
    unreadCount,
    pagination,
    markAsRead,
    markAllAsRead, 
    deleteNotification,
    deleteAllRead,
    refreshNotifications,
    updateFilters,
    currentFilters
  } = useAdminNotifications();

  // Initialize state with safe defaults
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>(
    currentFilters?.read === undefined ? 'all' : currentFilters.read ? 'read' : 'unread'
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(currentFilters?.page || 1);
  
  // Refs
  const filterTimeoutRef = useRef<number|undefined>(undefined);
  const isUpdatingRef = useRef(false);

  // Update filters when page or filter changes
  useEffect(() => {
    if (isUpdatingRef.current) return;
    
    if (filterTimeoutRef.current) {
      clearTimeout(filterTimeoutRef.current);
    }

    filterTimeoutRef.current = setTimeout(() => {
      const readFilter = filter === 'all' ? undefined : filter === 'read';
      console.log('🔄 Applying filters:', { page: currentPage, read: readFilter });
      
      isUpdatingRef.current = true;
      updateFilters({
        page: currentPage,
        limit: 10,
        read: readFilter
      });
      
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 500);
    }, 300);

    return () => {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
    };
  }, [currentPage, filter, updateFilters]);

  const handleFilterChange = useCallback((newFilter: 'all' | 'unread' | 'read') => {
    console.log('🔄 Filter changed to:', newFilter);
    setFilter(newFilter);
    setCurrentPage(1);
    // Clear selections when filter changes
    setSelectedIds([]);
    setSelectAll(false);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    if (newPage === currentPage) return;
    console.log('📄 Page changed to:', newPage);
    setCurrentPage(newPage);
    // Clear selections when page changes
    setSelectedIds([]);
    setSelectAll(false);
  }, [currentPage]);

  const handleMarkAsRead = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (processingId) return;
    
    setProcessingId(id);
    await markAsRead(id);
    setProcessingId(null);
  }, [markAsRead, processingId]);

  const handleMarkSelectedAsRead = useCallback(async () => {
    if (selectedIds.length === 0 || processingId) return;
    
    for (const id of selectedIds) {
      await markAsRead(id);
    }
    setSelectedIds([]);
    setSelectAll(false);
  }, [selectedIds, markAsRead, processingId]);

  const handleDelete = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (processingId) return;
    
    if (window.confirm('Are you sure you want to delete this notification?')) {
      setProcessingId(id);
      await deleteNotification(id);
      setProcessingId(null);
    }
  }, [deleteNotification, processingId]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.length === 0 || processingId) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} notifications?`)) {
      for (const id of selectedIds) {
        await deleteNotification(id);
      }
      setSelectedIds([]);
      setSelectAll(false);
    }
  }, [selectedIds, deleteNotification, processingId]);

  const handleDeleteAllRead = useCallback(async () => {
    const readCount = notifications.filter(n => n.read).length;
    if (readCount === 0 || processingId) return;
    
    if (window.confirm(`Are you sure you want to delete all ${readCount} read notifications?`)) {
      await deleteAllRead();
    }
  }, [deleteAllRead, notifications, processingId]);

  const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (selectAll) {
      setSelectedIds([]);
      setSelectAll(false);
    } else {
      setSelectedIds(notifications.map(n => n.id));
      setSelectAll(true);
    }
  }, [selectAll, notifications]);

  const handleSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const newSelected = prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : [...prev, id];
      
      setSelectAll(newSelected.length === notifications.length && notifications.length > 0);
      
      return newSelected;
    });
  }, [notifications.length]);

  const handleNotificationClick = useCallback(async (notification: AdminNotification) => {
    if (processingId) return;
    
    if (!notification.read) {
      setProcessingId(notification.id);
      await markAsRead(notification.id);
      setProcessingId(null);
    }

    const { type, data } = notification;
    
    setTimeout(() => {
      if (type === 'FEEDBACK_SUBMITTED' && data?.feedbackId) {
        navigate(`/admin/feedback?id=${data.feedbackId}`);
      } else if (type === 'USER_REGISTERED' && data?.userId) {
        navigate(`/admin/users?id=${data.userId}`);
      } else if (type === 'REPORT_SUBMITTED' && data?.reportId) {
        navigate(`/admin/reports?id=${data.reportId}`);
      } else if (type === 'SYSTEM_ALERT') {
        navigate('/admin/dashboard');
      }
    }, 100);
  }, [markAsRead, navigate, processingId]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }, []);

  const getPriorityIcon = useCallback((priority: string) => {
    switch (priority) {
      case 'HIGH': return '🔴';
      case 'MEDIUM': return '🟡';
      case 'LOW': return '🔵';
      default: return '⚪';
    }
  }, []);

  const getTypeIcon = useCallback((type: string) => {
    switch (type) {
      case 'USER_REGISTERED': return '👤';
      case 'FEEDBACK_SUBMITTED': return '💬';
      case 'REPORT_SUBMITTED': return '🚩';
      case 'SYSTEM_ALERT': return '⚠️';
      default: return '📌';
    }
  }, []);

  const getDataPreview = useCallback((data: unknown) => {
    if (!data) return null;
    
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      
      if (obj.feedbackId) {
        return `Feedback ID: ${String(obj.feedbackId).substring(0, 8)}...`;
      }
      
      if (obj.userId && obj.userName) {
        return `User: ${String(obj.userName)}`;
      }
      
      if (obj.reportId) {
        return `Report ID: ${String(obj.reportId).substring(0, 8)}...`;
      }
    }
    
    return null;
  }, []);

  const clearFilters = useCallback(() => {
    handleFilterChange('all');
  }, [handleFilterChange]);

  if (loading && notifications.length === 0) {
    return <LoadingScreen message="Loading notifications..." fullScreen />;
  }

  return (
    <div className="notifications-wrapper">
      <div className="notifications-container">
        {/* Header */}
        <div className="notifications-header">
          <div className="notifications-header-left">
            <h1 className="notifications-title">Notifications</h1>
            <p className="notifications-subtitle">
              {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
            </p>
          </div>
          <div className="notifications-actions">
            {selectedIds.length > 0 && (
              <>
                <button
                  className="notifications-btn notifications-btn-primary"
                  onClick={handleMarkSelectedAsRead}
                  disabled={processingId !== null}
                >
                  {processingId ? 'Processing...' : `Mark ${selectedIds.length} as Read`}
                </button>
                <button
                  className="notifications-btn notifications-btn-danger"
                  onClick={handleDeleteSelected}
                  disabled={processingId !== null}
                >
                  {processingId ? 'Processing...' : `Delete ${selectedIds.length}`}
                </button>
              </>
            )}
            <button
              className="notifications-btn notifications-btn-secondary"
              onClick={markAllAsRead}
              disabled={unreadCount === 0 || processingId !== null}
            >
              {processingId ? 'Processing...' : 'Mark All as Read'}
            </button>
            <button
              className="notifications-btn notifications-btn-danger"
              onClick={handleDeleteAllRead}
              disabled={notifications.filter(n => n.read).length === 0 || processingId !== null}
            >
              {processingId ? 'Processing...' : 'Delete All Read'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="notifications-filters">
          <button
            className={`notifications-filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => handleFilterChange('all')}
            disabled={processingId !== null}
          >
            All
          </button>
          <button
            className={`notifications-filter-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => handleFilterChange('unread')}
            disabled={processingId !== null}
          >
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </button>
          <button
            className={`notifications-filter-btn ${filter === 'read' ? 'active' : ''}`}
            onClick={() => handleFilterChange('read')}
            disabled={processingId !== null}
          >
            Read
          </button>
        </div>

        {/* Error Display */}
        {error && <ErrorDisplay message={error} onRetry={refreshNotifications} />}

        {/* Loading overlay */}
        {loading && (
          <div className="notifications-loading-overlay">
            <div className="notifications-spinner"></div>
          </div>
        )}

        {/* Notifications List or Empty State */}
        {notifications.length === 0 && !loading ? (
          <div className="notifications-empty-state">
            <div className="notifications-empty-card">
              <div className="notifications-empty-icon">🔔</div>
              <h2 className="notifications-empty-title">No notifications yet</h2>
              <p className="notifications-empty-message">
                {filter !== 'all' 
                  ? `There are no ${filter} notifications to display. Try changing your filter.`
                  : "You don't have any notifications at the moment."}
              </p>
              {(filter !== 'all') && (
                <button 
                  className="notifications-empty-btn notifications-empty-btn-primary" 
                  onClick={clearFilters}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        ) : notifications.length > 0 ? (
          <>
            {/* Select All */}
            <div className="notifications-select-all">
              <label className="notifications-checkbox">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  disabled={processingId !== null}
                />
                <span>Select All ({notifications.length})</span>
              </label>
            </div>

            {/* Notifications List */}
            <div className="notifications-list">
              {notifications.map((notification) => {
                const dataPreview = getDataPreview(notification.data);
                const isProcessing = processingId === notification.id;
                
                return (
                  <div
                    key={notification.id}
                    className={`notifications-item ${!notification.read ? 'unread' : ''} ${isProcessing ? 'disabled' : 'clickable'}`}
                    onClick={() => !isProcessing && handleNotificationClick(notification)}
                  >
                    <div className="notifications-item-left" onClick={(e) => e.stopPropagation()}>
                      <label className="notifications-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(notification.id)}
                          onChange={(e) => handleSelect(e, notification.id)}
                          disabled={isProcessing}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </label>
                      <span className="notifications-priority">
                        {getPriorityIcon(notification.priority)}
                      </span>
                      <span className="notifications-icon">
                        {getTypeIcon(notification.type)}
                      </span>
                    </div>
                    
                    <div className="notifications-item-content">
                      <div className="notifications-item-header">
                        <h3 className="notifications-item-title">
                          {notification.title}
                          {isProcessing && <span className="notifications-processing"> (updating...)</span>}
                        </h3>
                        <span className="notifications-item-time">
                          {formatDate(notification.createdAt)}
                        </span>
                      </div>
                      <p className="notifications-item-message">{notification.message}</p>
                      
                      {dataPreview && (
                        <div className="notifications-item-preview">
                          <span className="notifications-preview-text">{dataPreview}</span>
                        </div>
                      )}
                    </div>

                    <div className="notifications-item-actions" onClick={(e) => e.stopPropagation()}>
                      {!notification.read && (
                        <button
                          className="notifications-item-btn"
                          onClick={(e) => handleMarkAsRead(e, notification.id)}
                          title="Mark as read"
                          disabled={isProcessing}
                        >
                          ✓
                        </button>
                      )}
                      <button
                        className="notifications-item-btn delete"
                        onClick={(e) => handleDelete(e, notification.id)}
                        title="Delete"
                        disabled={isProcessing}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="notifications-pagination">
                <button
                  className="notifications-pagination-btn"
                  disabled={currentPage === 1 || loading}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  Previous
                </button>
                <div className="notifications-pagination-info">
                  <span>Page {currentPage} of {pagination.pages}</span>
                  <span className="notifications-pagination-total">
                    (Total: {pagination.total} {pagination.total === 1 ? 'notification' : 'notifications'})
                  </span>
                </div>
                <button
                  className="notifications-pagination-btn"
                  disabled={currentPage === pagination.pages || loading}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default Notifications;