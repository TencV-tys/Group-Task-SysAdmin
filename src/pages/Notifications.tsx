// pages/Notifications.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminNotifications } from '../hooks/useAdminNotifications';
import LoadingScreen from '../components/LoadingScreen';
import ErrorDisplay from '../components/ErrorDisplay';
import type { AdminNotification } from '../services/admin.notifications.service'; // 👈 Import the type
import './styles/Notifications.css';

const Notifications = () => {
  const navigate = useNavigate();
  const {
    notifications,
    loading,
    error,
    unreadCount,
    pagination,
    fetchNotifications,
    markAsRead,
    markAllAsRead, 
    deleteNotification,
    deleteAllRead
  } = useAdminNotifications();

  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    fetchNotifications({ 
      page: pagination.page, 
      limit: pagination.limit,
      read: filter === 'all' ? undefined : filter === 'read'
    });
  }, [fetchNotifications, pagination.page, pagination.limit, filter]);

  const handlePageChange = (newPage: number) => {
    fetchNotifications({ 
      page: newPage, 
      limit: pagination.limit,
      read: filter === 'all' ? undefined : filter === 'read'
    });
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
  };

  const handleMarkSelectedAsRead = async () => {
    for (const id of selectedIds) {
      await markAsRead(id);
    }
    setSelectedIds([]);
    setSelectAll(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this notification?')) {
      await deleteNotification(id);
    }
  };

  const handleDeleteSelected = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} notifications?`)) {
      for (const id of selectedIds) {
        await deleteNotification(id);
      }
      setSelectedIds([]);
      setSelectAll(false);
    }
  };

  const handleDeleteAllRead = async () => {
    if (window.confirm('Are you sure you want to delete all read notifications?')) {
      await deleteAllRead();
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map(n => n.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // 👇 FIXED: Use proper type instead of 'any'
  const handleNotificationClick = async (notification: AdminNotification) => {
    // Mark as read first
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
    const { type, data } = notification;
    
    if (type === 'FEEDBACK_SUBMITTED' && data?.feedbackId) {
      navigate(`/admin/feedback?id=${data.feedbackId}`);
    } else if (type === 'USER_REGISTERED' && data?.userId) {
      navigate(`/admin/users?id=${data.userId}`);
    } else if (type === 'REPORT_SUBMITTED' && data?.reportId) {
      navigate(`/admin/reports?id=${data.reportId}`);
    } else if (type === 'SYSTEM_ALERT') {
      navigate('/admin/dashboard');
    } else {
      // Default fallback
      navigate(`/admin/notifications?id=${notification.id}`);
    }
  };

  const formatDate = (dateString: string) => {
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
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'HIGH': return '🔴';
      case 'MEDIUM': return '🟡';
      case 'LOW': return '🔵';
      default: return '⚪';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'USER_REGISTERED': return '👤';
      case 'FEEDBACK_SUBMITTED': return '💬';
      case 'REPORT_SUBMITTED': return '🚩';
      case 'SYSTEM_ALERT': return '⚠️';
      default: return '📌';
    }
  };

// pages/Notifications.tsx

const getDataPreview = (data: unknown) => {
  if (!data) return null;
  
  // Type guard to check if it's an object
  if (typeof data === 'object' && data !== null) {
    // Safe property access with type assertion
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
  
  return 'Click to view details';
};


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
                  disabled={loading} // 👈 Disable during loading
                >
                  {loading ? 'Processing...' : 'Mark Selected as Read'}
                </button>
                <button
                  className="notifications-btn notifications-btn-danger"
                  onClick={handleDeleteSelected}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Delete Selected'}
                </button>
              </>
            )}
            <button
              className="notifications-btn notifications-btn-secondary"
              onClick={markAllAsRead}
              disabled={unreadCount === 0 || loading}
            >
              {loading ? 'Processing...' : 'Mark All as Read'}
            </button>
            <button
              className="notifications-btn notifications-btn-danger"
              onClick={handleDeleteAllRead}
              disabled={notifications.filter(n => n.read).length === 0 || loading}
            >
              {loading ? 'Processing...' : 'Delete All Read'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="notifications-filters">
          <button
            className={`notifications-filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
            disabled={loading}
          >
            All
          </button>
          <button
            className={`notifications-filter-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
            disabled={loading}
          >
            Unread
          </button>
          <button
            className={`notifications-filter-btn ${filter === 'read' ? 'active' : ''}`}
            onClick={() => setFilter('read')}
            disabled={loading}
          >
            Read
          </button>
        </div>

        {/* Error Display */}
        {error && <ErrorDisplay message={error} />}

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="notifications-empty">
            <div className="notifications-empty-icon">🔔</div>
            <h3 className="notifications-empty-title">No notifications</h3>
            <p className="notifications-empty-message">
              {filter !== 'all' 
                ? `No ${filter} notifications found.` 
                : 'You\'re all caught up!'}
            </p>
          </div>
        ) : (
          <>
            {/* Select All */}
            <div className="notifications-select-all">
              <label className="notifications-checkbox">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  disabled={loading}
                />
                <span>Select All</span>
              </label>
            </div>

            {/* Notifications List */}
            <div className="notifications-list">
              {notifications.map((notification) => {
                const dataPreview = getDataPreview(notification.data);
                
                return (
                  <div
                    key={notification.id}
                    className={`notifications-item ${!notification.read ? 'unread' : ''} ${loading ? 'disabled' : 'clickable'}`}
                    onClick={() => !loading && handleNotificationClick(notification)}
                  >
                    <div className="notifications-item-left" onClick={(e) => e.stopPropagation()}>
                      <label className="notifications-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(notification.id)}
                          onChange={() => handleSelect(notification.id)}
                          disabled={loading}
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
                        <h3 className="notifications-item-title">{notification.title}</h3>
                        <span className="notifications-item-time">
                          {formatDate(notification.createdAt)}
                        </span>
                      </div>
                      <p className="notifications-item-message">{notification.message}</p>
                      
                      {/* Simple data preview instead of JSON */}
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
                          onClick={() => handleMarkAsRead(notification.id)}
                          title="Mark as read"
                          disabled={loading}
                        >
                          ✓
                        </button>
                      )}
                      <button
                        className="notifications-item-btn delete"
                        onClick={() => handleDelete(notification.id)}
                        title="Delete"
                        disabled={loading}
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
                  disabled={pagination.page === 1 || loading}
                  onClick={() => !loading && handlePageChange(pagination.page - 1)}
                >
                  Previous
                </button>
                <span className="notifications-pagination-info">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  className="notifications-pagination-btn"
                  disabled={pagination.page === pagination.pages || loading}
                  onClick={() => !loading && handlePageChange(pagination.page + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* Optional: Add loading overlay for background operations */}
        {loading && notifications.length > 0 && (
          <div className="notifications-loading-overlay">
            <div className="notifications-spinner"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;