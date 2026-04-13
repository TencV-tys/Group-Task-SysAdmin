// layouts/AdminSidebar.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChartPie, 
  faUsers, 
  faComment, 
  faBell, 
  faSignOutAlt,
  faTimes,
  faChevronLeft,
  faChevronRight,
  faCrown,
  faFlag,
  faHistory,
  faLayerGroup,
} from '@fortawesome/free-solid-svg-icons';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { AdminFeedbackService } from '../services/admin.feedback.service';
import { AdminNotificationsService } from '../services/admin.notifications.service';
import { AdminReportsService } from '../services/admin.report.services';
import { adminSocket } from '../services/adminSocket';
import './styles/AdminSidebar.css';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const AdminSidebar: React.FC<SidebarProps> = ({ collapsed = false, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAdminAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [feedbackCount, setFeedbackCount] = useState<number>(0);
  const [notificationCount, setNotificationCount] = useState<number>(0);
  const [reportCount, setReportCount] = useState<number>(0);
  
  const isMountedRef = useRef(true);
  const listenersInitializedRef = useRef(false);
  const retryTimeoutRef = useRef<number | null>(null);

  // ========== FETCH INITIAL COUNTS ==========
  const fetchAllCounts = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      const [statsResult, unreadResult, reportsResult] = await Promise.allSettled([
        AdminFeedbackService.getFeedbackStats(),
        AdminNotificationsService.getUnreadCount(),
        AdminReportsService.getReports({ status: 'PENDING', limit: 1 })
      ]);

      if (!isMountedRef.current) return;

      if (statsResult.status === 'fulfilled' && statsResult.value.success && statsResult.value.data) {
        const openCount = (statsResult.value.data.open || 0) + (statsResult.value.data.inProgress || 0);
        setFeedbackCount(openCount);
      }

      if (unreadResult.status === 'fulfilled' && unreadResult.value.success && unreadResult.value.data) {
        setNotificationCount(unreadResult.value.data.count);
      }

      if (reportsResult.status === 'fulfilled' && reportsResult.value.success && reportsResult.value.pagination) {
        setReportCount(reportsResult.value.pagination.total);
      }
    } catch (error) {
      console.error('Failed to fetch counts:', error);
    }
  }, []);

  // ========== REFRESH FEEDBACK COUNT ==========
  const refreshFeedbackCount = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    const result = await AdminFeedbackService.getFeedbackStats();
    if (isMountedRef.current && result.success && result.data) {
      const openCount = (result.data.open || 0) + (result.data.inProgress || 0);
      setFeedbackCount(openCount);
    }
  }, []);

  // ========== REFRESH NOTIFICATION COUNT ==========
  const refreshNotificationCount = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    const result = await AdminNotificationsService.getUnreadCount();
    if (isMountedRef.current && result.success && result.data) {
      setNotificationCount(result.data.count);
    }
  }, []);

  // ========== REFRESH REPORT COUNT ==========
  const refreshReportCount = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    const result = await AdminReportsService.getReports({ status: 'PENDING', limit: 1 });
    if (isMountedRef.current && result.success && result.pagination) {
      setReportCount(result.pagination.total);
    }
  }, []);

  // ========== SETUP REAL-TIME SOCKET LISTENERS ==========
  const setupSocketListeners = useCallback(() => {
    if (listenersInitializedRef.current) return;
    
    // Check if socket is connected
    if (!adminSocket.isConnected) {
      console.log('⏳ [SIDEBAR] Socket not connected yet, will retry...');
      return; // Don't retry here, let the useEffect handle retry
    }
    
    listenersInitializedRef.current = true;
    
    // Type-safe event handlers
    const handleFeedbackStatus = () => {
      console.log('📢 [SIDEBAR] Real-time feedback update');
      refreshFeedbackCount();
    };
    
    const handleFeedbackDeleted = () => {
      console.log('📢 [SIDEBAR] Real-time feedback deleted');
      refreshFeedbackCount();
    };
    
    const handleNotificationNew = () => {
      console.log('📢 [SIDEBAR] New notification received');
      setNotificationCount(prev => prev + 1);
    };
    
    const handleNotificationRead = () => {
      console.log('📢 [SIDEBAR] Notification marked as read');
      refreshNotificationCount();
    };
    
    const handleReportStatus = () => {
      console.log('📢 [SIDEBAR] Report status changed');
      refreshReportCount();
    };
    
    const handleReportDeleted = () => {
      console.log('📢 [SIDEBAR] Report deleted');
      refreshReportCount();
    };
    
    const handleBulkReports = () => {
      console.log('📢 [SIDEBAR] Bulk reports updated');
      refreshReportCount();
    };
    
    // Register listeners
    adminSocket.on('feedback:status', handleFeedbackStatus);
    adminSocket.on('feedback:deleted', handleFeedbackDeleted);
    adminSocket.on('notification:new', handleNotificationNew);
    adminSocket.on('notification:read', handleNotificationRead);
    adminSocket.on('report:status', handleReportStatus);
    adminSocket.on('report:deleted', handleReportDeleted);
    adminSocket.on('reports:bulk-updated', handleBulkReports);
    
    console.log('✅ [SIDEBAR] Socket listeners initialized');
  }, [refreshFeedbackCount, refreshNotificationCount, refreshReportCount]);

  // ========== INITIAL FETCH - Run once on mount ==========
  useEffect(() => {
    isMountedRef.current = true;
    
    const loadInitialCounts = async () => {
      await fetchAllCounts();
    };
    
    loadInitialCounts();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchAllCounts]);

  // ========== SETUP SOCKET LISTENERS WITH RETRY ==========
  useEffect(() => {
    const attemptSetup = () => {
      if (adminSocket.isConnected) {
        setupSocketListeners();
      } else {
        console.log('⏳ [SIDEBAR] Socket not connected, scheduling retry...');
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = window.setTimeout(attemptSetup, 2000);
      }
    };
    
    const timeoutId = setTimeout(attemptSetup, 1000);
    
    return () => {
      clearTimeout(timeoutId);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      // Clean up all listeners
      adminSocket.off('feedback:status');
      adminSocket.off('feedback:deleted');
      adminSocket.off('notification:new');
      adminSocket.off('notification:read');
      adminSocket.off('report:status');
      adminSocket.off('report:deleted');
      adminSocket.off('reports:bulk-updated');
      listenersInitializedRef.current = false;
    };
  }, [setupSocketListeners]);

  // ========== REFRESH WHEN PAGE BECOMES VISIBLE ==========
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isMountedRef.current) {
        fetchAllCounts();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchAllCounts]);

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const getDisplayRole = (role: string | undefined) => {
    if (!role) return 'Administrator';
    if (role === 'SUPER_ADMIN') return 'Administrator';
    return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const menuItems = [
    { path: '/admin/dashboard', icon: faChartPie, label: 'Dashboard', badge: null },
    { path: '/admin/users', icon: faUsers, label: 'Manage Users', badge: null },
    { path: '/admin/groups', icon: faLayerGroup, label: 'Manage Groups', badge: null },
    {
      path: '/admin/feedback',
      icon: faComment,
      label: 'Feedback',
      badge: feedbackCount > 0 ? (feedbackCount > 99 ? '99+' : feedbackCount.toString()) : null
    },
    {
      path: '/admin/notifications',
      icon: faBell,
      label: 'Notifications',
      badge: notificationCount > 0 ? (notificationCount > 99 ? '99+' : notificationCount.toString()) : null
    },
    {
      path: '/admin/reports',
      icon: faFlag,
      label: 'Reports',
      badge: reportCount > 0 ? (reportCount > 99 ? '99+' : reportCount.toString()) : null
    },
    { path: '/admin/audit', icon: faHistory, label: 'Audit Logs', badge: null }
  ];

  return (
    <>
      <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo">
              <FontAwesomeIcon icon={faCrown} size="lg" />
            </div>
            {!collapsed && <span className="logo-text">Admin Dashboard</span>}
          </div>
          <button className="toggle-btn" onClick={onToggle}>
            <FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} />
          </button>
        </div>

        <div className="admin-profile">
          <div className="profile-avatar">
            {admin?.fullName?.charAt(0).toUpperCase() || 'A'}
          </div>
          {!collapsed && (
            <div className="profile-info">
              <div className="profile-name">{admin?.fullName || 'Admin'}</div>
              <div className="profile-role">{getDisplayRole(admin?.role)}</div>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
            >
              <span className="nav-icon">
                <FontAwesomeIcon icon={item.icon} />
              </span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
              {!collapsed && item.badge && (
                <span className="nav-badge">{item.badge}</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={() => setShowLogoutConfirm(true)}>
            <span className="nav-icon">
              <FontAwesomeIcon icon={faSignOutAlt} />
            </span>
            {!collapsed && <span className="nav-label">Logout</span>}
          </button>
        </div>
      </aside>

      {showLogoutConfirm && (
        <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Logout</h3>
              <button className="modal-close" onClick={() => setShowLogoutConfirm(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to logout?</p>
            </div>
            <div className="modal-footer">
              <button className="modal-cancel" onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
              <button className="modal-confirm" onClick={handleLogout}>
                Logout
              </button> 
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminSidebar;