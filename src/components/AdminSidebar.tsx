// layouts/AdminSidebar.tsx - UPDATED with GT Logo Image

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

  faFlag,
  faHistory,
  faLayerGroup,
  faExclamationTriangle,
  faEnvelope,
  faMessage,
} from '@fortawesome/free-solid-svg-icons';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { useAdminSocket } from '../contexts/AdminSocketContext';
import { AdminFeedbackService } from '../services/admin.feedback.service';
import { AdminNotificationsService } from '../services/admin.notifications.service';
import { AdminReportsService } from '../services/admin.report.services';
import { AdminGroupsService } from '../services/admin.groups.service';
import './styles/AdminSidebar.css';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const AdminSidebar: React.FC<SidebarProps> = ({ collapsed = false, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAdminAuth();
  const { subscribe } = useAdminSocket();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [feedbackCount, setFeedbackCount] = useState<number>(0);
  const [notificationCount, setNotificationCount] = useState<number>(0);
  const [reportCount, setReportCount] = useState<number>(0);
  const [groupsWithReportsCount, setGroupsWithReportsCount] = useState<number>(0);
  
  const isMountedRef = useRef(true);
  const initialLoadDoneRef = useRef(false);

  // ========== FETCH ALL COUNTS (COMPLETE REFRESH) ==========
  const fetchAllCounts = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    console.log('📊 [SIDEBAR] Fetching all counts...');
    
    try {
      const [statsResult, unreadResult, reportsResult, groupsResult] = await Promise.allSettled([
        AdminFeedbackService.getFeedbackStats(),
        AdminNotificationsService.getUnreadCount(),
        AdminReportsService.getReports({ status: 'PENDING', limit: 1 }),
        AdminGroupsService.getGroups({ hasReports: true, limit: 1 })
      ]);

      if (!isMountedRef.current) return;

      if (statsResult.status === 'fulfilled' && statsResult.value.success && statsResult.value.data) {
        const pendingCount = (statsResult.value.data.open || 0) + (statsResult.value.data.inProgress || 0);
        console.log(`📊 [SIDEBAR] Feedback count: ${pendingCount}`);
        setFeedbackCount(pendingCount);
      }

      if (unreadResult.status === 'fulfilled' && unreadResult.value.success && unreadResult.value.data) {
        console.log(`📊 [SIDEBAR] Notification count: ${unreadResult.value.data.count}`);
        setNotificationCount(unreadResult.value.data.count);
      }

      if (reportsResult.status === 'fulfilled' && reportsResult.value.success && reportsResult.value.pagination) {
        console.log(`📊 [SIDEBAR] Report count: ${reportsResult.value.pagination.total}`);
        setReportCount(reportsResult.value.pagination.total);
      }

      if (groupsResult.status === 'fulfilled' && groupsResult.value.success && groupsResult.value.pagination) {
        console.log(`📊 [SIDEBAR] Groups with reports count: ${groupsResult.value.pagination.total}`);
        setGroupsWithReportsCount(groupsResult.value.pagination.total);
      }
    } catch (error) {
      console.error('❌ [SIDEBAR] Failed to fetch counts:', error);
    }
  }, []);

  // ========== REFRESH FUNCTIONS ==========
  const refreshFeedbackCount = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    console.log('🔄 [SIDEBAR] Refreshing feedback count...');
    const result = await AdminFeedbackService.getFeedbackStats();
    if (isMountedRef.current && result.success && result.data) {
      const pendingCount = (result.data.open || 0) + (result.data.inProgress || 0);
      console.log(`📊 [SIDEBAR] New feedback count: ${pendingCount}`);
      setFeedbackCount(pendingCount);
    }
  }, []);

  const refreshNotificationCount = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    console.log('🔄 [SIDEBAR] Refreshing notification count...');
    const result = await AdminNotificationsService.getUnreadCount();
    if (isMountedRef.current && result.success && result.data) {
      console.log(`📊 [SIDEBAR] New notification count: ${result.data.count}`);
      setNotificationCount(result.data.count);
    }
  }, []);

  const refreshReportCount = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    console.log('🔄 [SIDEBAR] Refreshing report count...');
    const result = await AdminReportsService.getReports({ status: 'PENDING', limit: 1 });
    if (isMountedRef.current && result.success && result.pagination) {
      console.log(`📊 [SIDEBAR] New report count: ${result.pagination.total}`);
      setReportCount(result.pagination.total);
    }
  }, []);

  const refreshGroupsWithReportsCount = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    console.log('🔄 [SIDEBAR] Refreshing groups with reports count...');
    const result = await AdminGroupsService.getGroups({ hasReports: true, limit: 1 });
    if (isMountedRef.current && result.success && result.pagination) {
      console.log(`📊 [SIDEBAR] New groups with reports count: ${result.pagination.total}`);
      setGroupsWithReportsCount(result.pagination.total);
    }
  }, []);

  // ========== INITIAL LOAD ==========
  useEffect(() => {
    let isActive = true;
    
    const loadInitialData = async () => {
      if (!initialLoadDoneRef.current && isActive) {
        initialLoadDoneRef.current = true;
        await fetchAllCounts();
      }
    };
    
    loadInitialData();
    
    return () => {
      isActive = false;
    };
  }, [fetchAllCounts]);

  // ========== SETUP SOCKET SUBSCRIPTIONS ==========
  useEffect(() => {
    isMountedRef.current = true;
    
    console.log('🎧 [SIDEBAR] Setting up socket subscriptions...');
    
    // Feedback events
    const unsubscribeFeedbackStatus = subscribe('feedback:status', () => refreshFeedbackCount());
    const unsubscribeFeedbackDeleted = subscribe('feedback:deleted', () => refreshFeedbackCount());
    const unsubscribeFeedbackNew = subscribe('feedback:new', () => refreshFeedbackCount());
    const unsubscribeFeedbackUpdated = subscribe('feedback:updated', () => refreshFeedbackCount());
    
    // Notification events
    const unsubscribeNotificationNew = subscribe('notification:new', () => refreshNotificationCount());
    const unsubscribeNotificationRead = subscribe('notification:read', () => refreshNotificationCount());
    const unsubscribeNotificationReadAll = subscribe('notification:read:all', () => refreshNotificationCount());
    const unsubscribeNotificationDeleted = subscribe('notification:deleted', () => refreshNotificationCount());
    
    // Report events
    const unsubscribeReportNew = subscribe('report:new', () => {
      console.log('📢 [SIDEBAR] New report received');
      refreshGroupsWithReportsCount();
      refreshReportCount();
    });
    
    const unsubscribeReportStatus = subscribe('report:status', () => {
      console.log('📢 [SIDEBAR] Report status changed');
      refreshGroupsWithReportsCount();
      refreshReportCount();
    });
    
    const unsubscribeReportDeleted = subscribe('report:deleted', () => {
      console.log('📢 [SIDEBAR] Report deleted');
      refreshGroupsWithReportsCount();
      refreshReportCount();
    });
    
    // Group events
    const unsubscribeGroupReportCountUpdated = subscribe('group:report_count_updated', () => {
      console.log('📢 [SIDEBAR] Group report count updated');
      refreshGroupsWithReportsCount();
      refreshReportCount();
    });
    
    const unsubscribeGroupDeleted = subscribe('group:deleted', () => {
      console.log('📢 [SIDEBAR] Group deleted');
      refreshGroupsWithReportsCount();
    });
    
    const unsubscribeGroupSuspended = subscribe('group:suspended', () => {
      console.log('📢 [SIDEBAR] Group suspended');
      refreshGroupsWithReportsCount();
    });
    
    const unsubscribeGroupRestored = subscribe('group:restored', () => {
      console.log('📢 [SIDEBAR] Group restored');
      refreshGroupsWithReportsCount();
    });
    
    const unsubscribeGroupAdminAction = subscribe('group:admin_action', () => {
      console.log('📢 [SIDEBAR] Group admin action');
      refreshGroupsWithReportsCount();
    });

    // Visibility change and interval
    const handleVisibilityChange = () => {
      if (!document.hidden && isMountedRef.current) {
        console.log('👁️ [SIDEBAR] Page became visible, refreshing counts...');
        fetchAllCounts();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    const intervalId = setInterval(() => {
      if (isMountedRef.current) {
        console.log('⏰ [SIDEBAR] Periodic refresh...');
        fetchAllCounts();
      }
    }, 30000);
    
    return () => {
      console.log('🧹 [SIDEBAR] Cleaning up...');
      isMountedRef.current = false;
      
      unsubscribeFeedbackStatus();
      unsubscribeFeedbackDeleted();
      unsubscribeFeedbackNew();
      unsubscribeFeedbackUpdated();
      unsubscribeNotificationNew();
      unsubscribeNotificationRead();
      unsubscribeNotificationReadAll();
      unsubscribeNotificationDeleted();
      unsubscribeReportNew();
      unsubscribeReportStatus();
      unsubscribeReportDeleted();
      unsubscribeGroupReportCountUpdated();
      unsubscribeGroupDeleted();
      unsubscribeGroupSuspended();
      unsubscribeGroupRestored();
      unsubscribeGroupAdminAction();
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [subscribe, refreshFeedbackCount, refreshNotificationCount, refreshReportCount, refreshGroupsWithReportsCount, fetchAllCounts]);

  useEffect(() => {
    console.log('🟢 [SIDEBAR] MOUNTED');
    return () => {
      console.log('🔴 [SIDEBAR] UNMOUNTED');
    };
  }, []);

  // ========== HELPER FUNCTIONS ==========
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleLogout = async () => {
    console.log('🚪 [SIDEBAR] Logging out...'); 
    await logout();
    navigate('/admin/login');
  };

  const getDisplayRole = (role: string | undefined) => {
    if (!role) return 'Administrator';
    if (role === 'SUPER_ADMIN') return 'Super Admin';
    if (role === 'ADMIN') return 'Administrator';
    return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  // Define menu items with their specific badge types
  const menuItems = [
    { 
      path: '/admin/dashboard', 
      icon: faChartPie, 
      label: 'Dashboard', 
      getCount: () => null, 
      badgeType: 'default',
      warningIcon: null
    },
    { 
      path: '/admin/users', 
      icon: faUsers, 
      label: 'Manage Users', 
      getCount: () => null, 
      badgeType: 'default',
      warningIcon: null
    },
    { 
      path: '/admin/groups', 
      icon: faLayerGroup, 
      label: 'Manage Groups', 
      getCount: () => groupsWithReportsCount,
      badgeType: 'warning',
      warningIcon: faExclamationTriangle
    },
    {
      path: '/admin/feedback',
      icon: faComment,
      label: 'Feedback',
      getCount: () => feedbackCount,
      badgeType: 'feedback',
      warningIcon: faMessage
    },
    {
      path: '/admin/notifications',
      icon: faBell,
      label: 'Notifications',
      getCount: () => notificationCount,
      badgeType: 'info',
      warningIcon: faEnvelope
    },
    {
      path: '/admin/reports',
      icon: faFlag,
      label: 'Reports',
      getCount: () => reportCount,
      badgeType: 'danger',
      warningIcon: faExclamationTriangle
    },
    { 
      path: '/admin/audit', 
      icon: faHistory, 
      label: 'Audit Logs', 
      getCount: () => null, 
      badgeType: 'default',
      warningIcon: null
    }
  ];

  return (
    <>
      <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            {/* ✅ Updated: Use GT Logo Image instead of Crown Icon */}
            <div className="logo logo-image-wrapper">
              <img 
                src="/src/assets/GTRLOGO.jpeg" 
                alt="GroupTask Logo" 
                className="sidebar-logo-image"
              />
            </div>
            {!collapsed && <span className="logo-text">Admin Dashboard</span>}
          </div>
          <button className="toggle-btn" onClick={onToggle} aria-label="Toggle sidebar">
            <FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} />
          </button>
        </div>

        <div className="admin-profile">
          <div className="profile-avatar">
            {admin?.fullName?.charAt(0).toUpperCase() || 'A'}
          </div>
          {!collapsed && (
            <div className="profile-info">
              <div className="profile-name">{admin?.fullName || 'Admin User'}</div>
              <div className="profile-role">{getDisplayRole(admin?.role)}</div>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const count = item.getCount ? item.getCount() : null;
            const hasCount = count !== null && count > 0;
            const displayCount = hasCount ? (count > 99 ? '99+' : count.toString()) : null;
            const badgeType = item.badgeType;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                data-tooltip={collapsed ? item.label : undefined}
              >
                <span className="nav-icon">
                  <FontAwesomeIcon icon={item.icon} />
                </span>
                {!collapsed && <span className="nav-label">{item.label}</span>}
                {!collapsed && hasCount && (
                  <span className={`nav-badge ${badgeType}`}>
                    {displayCount}
                  </span>
                )}
                {/* Show warning icon for ALL items with counts when collapsed */}
                {collapsed && hasCount && item.warningIcon && (
                  <span className={`collapsed-warning-icon ${badgeType}`}>
                    <FontAwesomeIcon icon={item.warningIcon} size="xs" />
                  </span>
                )}
              </Link>
            );
          })}
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