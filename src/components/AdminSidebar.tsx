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
} from '@fortawesome/free-solid-svg-icons';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { AdminFeedbackService } from '../services/admin.feedback.service';
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
  const [loading, setLoading] = useState(false);

  // ✅ FIXED: Wrap fetchCounts in useCallback
  const fetchCounts = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      // Fetch feedback stats
      const statsResult = await AdminFeedbackService.getFeedbackStats();
      if (statsResult.success && statsResult.data) {
        // Count open and in-progress feedback
        const openCount = (statsResult.data.open || 0) + (statsResult.data.inProgress || 0);
        setFeedbackCount(openCount);
      }

      // TODO: Add notifications count when available
      // For now, using mock data
      setNotificationCount(12);
      
    } catch (error) {
      console.error('Failed to fetch counts:', error);
    } finally {
      setLoading(false);
    }
  }, [loading]); // ✅ Add loading to dependencies

  // ✅ FIXED: Add fetchCounts to dependency array
  useEffect(() => {
    fetchCounts();
    
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchCounts]); // ✅ Now includes fetchCounts

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
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
      path: '/admin/feedback',
      icon: faComment,
      label: 'Feedback',
      badge: feedbackCount > 0 ? feedbackCount.toString() : null
    },
    {
      path: '/admin/notifications',
      icon: faBell,
      label: 'Notifications',
      badge: notificationCount > 0 ? notificationCount.toString() : null
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
            {!collapsed && <span className="logo-text">GroupTask Admin</span>}
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
              <div className="profile-role">{admin?.role || 'Administrator'}</div>
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