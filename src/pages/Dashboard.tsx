// pages/Dashboard.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../hooks/useAdminAuth';
import type { DashboardStats, ActivityLog } from '../services/admin.dashboard.service';
import { AdminDashboardService } from '../services/admin.dashboard.service';
import LoadingScreen from '../components/LoadingScreen';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUsers, 
  faUserCog, 
  faUsersCog,
  faComment,
  faFlag,
  faHistory,
  faBell,
  faSync,
  faCalendar,
  faClock,
  faExclamationTriangle,
  faCheckCircle,
  faSpinner,
  faUserPlus
} from '@fortawesome/free-solid-svg-icons';
import './styles/Dashboard.css';

const Dashboard = () => {
  const { admin } = useAdminAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]); // 👈 FIXED TYPE

  const fetchData = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      // Fetch dashboard stats
      const statsResult = await AdminDashboardService.getStats();
      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      } else {
        setError(statsResult.message || 'Failed to load dashboard stats');
      }

      // Fetch recent activity from audit logs
      const activityResult = await AdminDashboardService.getRecentActivity(10);
      if (activityResult.success && activityResult.logs) {
        setRecentActivity(activityResult.logs);
      }

    } catch { // 👈 FIXED: Removed unused 'err' parameter
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleCardClick = (path: string) => {
    navigate(path);
  };

  const getActivityIcon = (action: string) => {
    if (action.includes('USER')) return faUsers;
    if (action.includes('REPORT')) return faFlag;
    if (action.includes('FEEDBACK')) return faComment;
    if (action.includes('NOTIFICATION')) return faBell;
    return faHistory;
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
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

  if (loading) {
    return <LoadingScreen message="Loading dashboard..." fullScreen />;
  }

  if (error) {
    return (
      <div className="admin-dash-error">
        <FontAwesomeIcon icon={faExclamationTriangle} size="3x" />
        <p>{error}</p>
        <button onClick={handleRefresh} className="admin-dash-retry-btn">Retry</button>
      </div>
    );
  }
 
  return (
    <div className="admin-dash-wrapper">
      <div className="admin-dash-container">
        {/* Header */}
        <div className="admin-dash-header">
          <div>
            <h1 className="admin-dash-title">Dashboard</h1>
            <p className="admin-dash-welcome">Welcome back, {admin?.fullName || 'Admin'}!</p>
          </div>
          <div className="admin-dash-date">
            <FontAwesomeIcon icon={faCalendar} />
            {new Date().toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}
            <button 
              className="admin-dash-refresh-btn" 
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <FontAwesomeIcon icon={faSync} className={refreshing ? 'fa-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="admin-dash-grid">
          {/* Users Card */}
          <div 
            className="admin-dash-card admin-dash-card-users" 
            onClick={() => handleCardClick('/admin/users')}
          >
            <div className="admin-dash-card-icon">
              <FontAwesomeIcon icon={faUsers} />
            </div>
            <div className="admin-dash-card-content">
              <span className="admin-dash-card-value">{stats?.users.total || 0}</span>
              <span className="admin-dash-card-label">Total Users</span>
            </div>
            <div className="admin-dash-card-footer">
              <span className="admin-dash-badge admin-dash-badge-green">
                <FontAwesomeIcon icon={faUserPlus} /> +{stats?.users.newToday || 0} today
              </span>
            </div>
          </div>

          {/* Admins Card */}
          <div 
            className="admin-dash-card admin-dash-card-admins" 
            onClick={() => handleCardClick('/admin/users')}
          >
            <div className="admin-dash-card-icon">
              <FontAwesomeIcon icon={faUserCog} />
            </div>
            <div className="admin-dash-card-content">
              <span className="admin-dash-card-value">{stats?.admins.groupAdmins || 0}</span>
              <span className="admin-dash-card-label">Group Admins</span>
            </div>
            <div className="admin-dash-card-footer">
              <span className="admin-dash-badge admin-dash-badge-purple">
                {stats?.admins.systemAdmins || 1} System Admins
              </span>
            </div>
          </div>

          {/* Groups Card */}
          <div 
            className="admin-dash-card admin-dash-card-groups" 
            onClick={() => handleCardClick('/admin/groups')}
          >
            <div className="admin-dash-card-icon">
              <FontAwesomeIcon icon={faUsersCog} />
            </div>
            <div className="admin-dash-card-content">
              <span className="admin-dash-card-value">{stats?.groups.total || 0}</span>
              <span className="admin-dash-card-label">Total Groups</span>
            </div>
            <div className="admin-dash-card-footer">
              <span className="admin-dash-badge admin-dash-badge-blue">
                {stats?.groups.active || 0} Active
              </span>
            </div>
          </div>

          {/* Feedback Card */}
          <div 
            className="admin-dash-card admin-dash-card-feedback" 
            onClick={() => handleCardClick('/admin/feedback')}
          >
            <div className="admin-dash-card-icon">
              <FontAwesomeIcon icon={faComment} />
            </div>
            <div className="admin-dash-card-content">
              <span className="admin-dash-card-value">{stats?.feedback.total || 0}</span>
              <span className="admin-dash-card-label">Total Feedback</span>
            </div>
            <div className="admin-dash-card-footer">
              <span className="admin-dash-badge admin-dash-badge-yellow">
                {stats?.feedback.open || 0} Open
              </span>
            </div>
          </div>

          {/* Reports Card */}
          <div 
            className="admin-dash-card admin-dash-card-reports" 
            onClick={() => handleCardClick('/admin/reports')}
          >
            <div className="admin-dash-card-icon">
              <FontAwesomeIcon icon={faFlag} />
            </div>
            <div className="admin-dash-card-content">
              <span className="admin-dash-card-value">{stats?.reports.total || 0}</span>
              <span className="admin-dash-card-label">Total Reports</span>
            </div>
            <div className="admin-dash-card-footer">
              <span className="admin-dash-badge admin-dash-badge-red">
                {stats?.reports.pending || 0} Pending
              </span>
            </div>
          </div>

          {/* Audit Logs Card */}
          <div 
            className="admin-dash-card admin-dash-card-audit" 
            onClick={() => handleCardClick('/admin/audit')}
          >
            <div className="admin-dash-card-icon">
              <FontAwesomeIcon icon={faHistory} />
            </div>
            <div className="admin-dash-card-content">
              <span className="admin-dash-card-value">{stats?.auditLogs.last24h || 0}</span>
              <span className="admin-dash-card-label">Actions (24h)</span>
            </div>
            <div className="admin-dash-card-footer">
              <span className="admin-dash-badge admin-dash-badge-purple">
                {stats?.auditLogs.last7d || 0} this week
              </span>
            </div>
          </div>

          {/* Notifications Card */}
          <div 
            className="admin-dash-card admin-dash-card-notifications" 
            onClick={() => handleCardClick('/admin/notifications')}
          >
            <div className="admin-dash-card-icon">
              <FontAwesomeIcon icon={faBell} />
            </div>
            <div className="admin-dash-card-content">
              <span className="admin-dash-card-value">{stats?.notifications.unread || 0}</span>
              <span className="admin-dash-card-label">Unread</span>
            </div>
            <div className="admin-dash-card-footer">
              <span className="admin-dash-badge admin-dash-badge-pink">
                {stats?.notifications.total || 0} Total
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="admin-dash-quick-stats">
          <div className="admin-dash-stat-item">
            <div className="admin-dash-stat-icon">
              <FontAwesomeIcon icon={faUserPlus} />
            </div>
            <div className="admin-dash-stat-content">
              <span className="admin-dash-stat-label">New Users Today</span>
              <span className="admin-dash-stat-value">{stats?.users.newToday || 0}</span>
            </div>
          </div>

          <div className="admin-dash-stat-item">
            <div className="admin-dash-stat-icon">
              <FontAwesomeIcon icon={faSpinner} />
            </div>
            <div className="admin-dash-stat-content">
              <span className="admin-dash-stat-label">Pending Reports</span>
              <span className="admin-dash-stat-value">{stats?.reports.pending || 0}</span>
            </div>
          </div>

          <div className="admin-dash-stat-item">
            <div className="admin-dash-stat-icon">
              <FontAwesomeIcon icon={faCheckCircle} />
            </div>
            <div className="admin-dash-stat-content">
              <span className="admin-dash-stat-label">Resolved Reports</span>
              <span className="admin-dash-stat-value">{stats?.reports.resolved || 0}</span>
            </div>
          </div>

          <div className="admin-dash-stat-item">
            <div className="admin-dash-stat-icon">
              <FontAwesomeIcon icon={faClock} />
            </div>
            <div className="admin-dash-stat-content">
              <span className="admin-dash-stat-label">Actions (24h)</span>
              <span className="admin-dash-stat-value">{stats?.auditLogs.last24h || 0}</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <div className="admin-dash-activity">
            <div className="admin-dash-activity-header">
              <h3 className="admin-dash-activity-title">
                <FontAwesomeIcon icon={faHistory} />
                Recent Activity
              </h3>
              <a href="/admin/audit" className="admin-dash-activity-view-all">
                View All →
              </a>
            </div>
            <div className="admin-dash-activity-list">
              {recentActivity.map((log) => (
                <div key={log.id} className="admin-dash-activity-item">
                  <div className="admin-dash-activity-icon">
                    <FontAwesomeIcon icon={getActivityIcon(log.action)} />
                  </div>
                  <div className="admin-dash-activity-content">
                    <div className="admin-dash-activity-text">
                      <strong>{log.admin?.fullName || 'Admin'}</strong> {log.action.replace(/_/g, ' ').toLowerCase()}
                      {log.targetUser && (
                        <> user <strong>{log.targetUser.fullName}</strong></>
                      )}
                    </div>
                    <div className="admin-dash-activity-time">
                      <FontAwesomeIcon icon={faClock} />
                      {formatTimeAgo(log.createdAt)}
                    </div>
                  </div>
                  <span className="admin-dash-activity-badge">
                    {log.action}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;