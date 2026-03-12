// AdminSidebar.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
  const [loading, setLoading] = useState(false);

  const fetchCounts = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      // Fetch feedback stats
      const statsResult = await AdminFeedbackService.getFeedbackStats();
      if (statsResult.success && statsResult.data) {
        const openCount = (statsResult.data.open || 0) + (statsResult.data.inProgress || 0);
        setFeedbackCount(openCount);
      }

      // Fetch notification unread count
      const unreadResult = await AdminNotificationsService.getUnreadCount();
      if (unreadResult.success && unreadResult.data) {
        setNotificationCount(unreadResult.data.count);
      }

      // Fetch pending reports count
      const reportsResult = await AdminReportsService.getReports({ status: 'PENDING', limit: 1 });
      if (reportsResult.success && reportsResult.pagination) {
        setReportCount(reportsResult.pagination.total);
      }
      
    } catch (error) {
      console.error('Failed to fetch counts:', error);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    fetchCounts();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  // Listen for storage events (for multi-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'notification-updated' || e.key === 'feedback-updated' || e.key === 'report-updated') {
        fetchCounts();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchCounts]);

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  // Format role for display - hide SUPER_ADMIN
  const getDisplayRole = (role: string | undefined) => {
    if (!role) return 'Administrator';
    if (role === 'SUPER_ADMIN') return 'Administrator'; // Hide SUPER_ADMIN
    return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const menuItems = [
    {
      path: '/admin/dashboard',
      icon: faChartPie,
      label: 'Dashboard',
      badge: null
    },
    {
      path: '/admin/users',
      icon: faUsers,
      label: 'Manage Users',
      badge: null
    },
    {
      path: '/admin/groups',
      icon: faLayerGroup,
      label: 'Manage Groups',
      badge: null
    },
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
    {
      path: '/admin/audit',
      icon: faHistory,
      label: 'Audit Logs',
      badge: null
    }
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

      {/* Logout Confirmation Modal */}
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