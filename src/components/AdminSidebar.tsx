// layouts/AdminSidebar.tsx
import React, { useState, useEffect, useRef } from 'react';
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
  
  // 🔥 Use refs to track if data has been fetched
  const hasFetchedRef = useRef(false);
  const fetchTimeoutRef = useRef<number|undefined>(undefined);

  // 🔥 Fetch counts only once when component mounts
  useEffect(() => {
    // Only fetch if we haven't fetched before
    if (hasFetchedRef.current) return;
    
    const fetchCounts = async () => {
      try {
        // Use Promise.allSettled to handle failures gracefully
        const [statsResult, unreadResult, reportsResult] = await Promise.allSettled([
          AdminFeedbackService.getFeedbackStats(),
          AdminNotificationsService.getUnreadCount(),
          AdminReportsService.getReports({ status: 'PENDING', limit: 1 })
        ]);

        // Handle feedback stats
        if (statsResult.status === 'fulfilled' && statsResult.value.success && statsResult.value.data) {
          const openCount = (statsResult.value.data.open || 0) + (statsResult.value.data.inProgress || 0);
          setFeedbackCount(openCount);
        }

        // Handle notification count
        if (unreadResult.status === 'fulfilled' && unreadResult.value.success && unreadResult.value.data) {
          setNotificationCount(unreadResult.value.data.count);
        }

        // Handle reports count
        if (reportsResult.status === 'fulfilled' && reportsResult.value.success && reportsResult.value.pagination) {
          setReportCount(reportsResult.value.pagination.total);
        }
        
        // Mark as fetched
        hasFetchedRef.current = true;
        
      } catch (error) {
        console.error('Failed to fetch counts:', error);
        // Don't mark as fetched on error so we can retry
      }
    };

    fetchCounts();

    // 🔥 NO interval! Just fetch once on mount

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []); // Empty dependency array = runs once on mount

  // 🔥 Listen for specific events that should trigger a refresh
  useEffect(() => {
    const handleFeedbackUpdate = () => {
      // Debounce the refresh
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      fetchTimeoutRef.current = setTimeout(() => {
        AdminFeedbackService.getFeedbackStats().then(result => {
          if (result.success && result.data) {
            const openCount = (result.data.open || 0) + (result.data.inProgress || 0);
            setFeedbackCount(openCount);
          }
        });
      }, 1000);
    };

    const handleNotificationUpdate = () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      fetchTimeoutRef.current = setTimeout(() => {
        AdminNotificationsService.getUnreadCount().then(result => {
          if (result.success && result.data) {
            setNotificationCount(result.data.count);
          }
        });
      }, 1000);
    };

    const handleReportUpdate = () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      fetchTimeoutRef.current = setTimeout(() => {
        AdminReportsService.getReports({ status: 'PENDING', limit: 1 }).then(result => {
          if (result.success && result.pagination) {
            setReportCount(result.pagination.total);
          }
        });
      }, 1000);
    };

    // Listen for custom events (these would be dispatched when actions happen)
    window.addEventListener('feedback-updated', handleFeedbackUpdate);
    window.addEventListener('notification-updated', handleNotificationUpdate);
    window.addEventListener('report-updated', handleReportUpdate);

    return () => {
      window.removeEventListener('feedback-updated', handleFeedbackUpdate);
      window.removeEventListener('notification-updated', handleNotificationUpdate);
      window.removeEventListener('report-updated', handleReportUpdate);
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

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
    if (role === 'SUPER_ADMIN') return 'Administrator';
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