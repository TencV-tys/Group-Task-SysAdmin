import  { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../hooks/useAdminAuth';
import LoadingScreen from '../components/LoadingScreen';
import ErrorDisplay from '../components/ErrorDisplay';
import './styles/Dashboard.css';

const Dashboard = () => {
  const { admin } = useAdminAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Mock data - will be replaced with API calls
  const stats = {
    totalUsers: 1248,
    newUsersToday: 12,
    totalGroups: 156,
    totalAdmins: 8,
    feedbackCount: 89,
    unreadFeedback: 23,
    unreadNotifications: 15
  };

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // TODO: Replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setLoading(false);
      } catch {
        setError('Failed to load dashboard stats');
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleCardClick = (cardType: string) => {
    switch(cardType) {
      case 'users':
        navigate('/admin/users');
        break;
      case 'groups':
        navigate('/admin/groups');
        break;
      case 'feedback':
        navigate('/admin/feedback');
        break;
      case 'notifications':
        navigate('/admin/notifications');
        break;
      default:
        break;
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading dashboard..." fullScreen />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="dash-wrapper">
      <div className="dash-container">
        {/* Header */}
        <div className="dash-header">
          <div>
            <h1 className="dash-title">Dashboard</h1>
            <p className="dash-welcome">Welcome back, {admin?.fullName || 'Admin'}!</p>
          </div>
          <div className="dash-date">
            {new Date().toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </div>
        </div>

        {/* Stats Grid - 3x3 */}
        <div className="dash-grid">
          {/* Users Card */}
          <div className="dash-card dash-card-users" onClick={() => handleCardClick('users')}>
            <div className="dash-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="dash-card-content">
              <span className="dash-card-value">{stats.totalUsers}</span>
              <span className="dash-card-label">Total Users</span>
            </div>
            <div className="dash-card-footer">
              <span className="dash-badge dash-badge-green">+{stats.newUsersToday} today</span>
            </div>
          </div>

          {/* Admins Card */}
          <div className="dash-card dash-card-admins" onClick={() => handleCardClick('users')}>
            <div className="dash-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="dash-card-content">
              <span className="dash-card-value">{stats.totalAdmins}</span>
              <span className="dash-card-label">Group Admins</span>
            </div>
            <div className="dash-card-footer">
              <span className="dash-badge dash-badge-blue">System Admins</span>
            </div>
          </div>

          {/* Groups Card */}
          <div className="dash-card dash-card-groups" onClick={() => handleCardClick('groups')}>
            <div className="dash-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="dash-card-content">
              <span className="dash-card-value">{stats.totalGroups}</span>
              <span className="dash-card-label">Total Groups</span>
            </div>
            <div className="dash-card-footer">
              <span className="dash-badge dash-badge-purple">Active</span>
            </div>
          </div>

          {/* Feedback Card */}
          <div className="dash-card dash-card-feedback" onClick={() => handleCardClick('feedback')}>
            <div className="dash-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="dash-card-content">
              <span className="dash-card-value">{stats.feedbackCount}</span>
              <span className="dash-card-label">Total Feedback</span>
            </div>
            <div className="dash-card-footer">
              <span className="dash-badge dash-badge-yellow">{stats.unreadFeedback} unread</span>
            </div>
          </div>

          {/* Notifications Card */}
          <div className="dash-card dash-card-notifications" onClick={() => handleCardClick('notifications')}>
            <div className="dash-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <div className="dash-card-content">
              <span className="dash-card-value">{stats.unreadNotifications}</span>
              <span className="dash-card-label">Notifications</span>
            </div>
            <div className="dash-card-footer">
              <span className="dash-badge dash-badge-red">Unread</span>
            </div>
          </div>

          {/* Placeholder for future card 6 */}
          <div className="dash-card dash-card-placeholder">
            <div className="dash-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <div className="dash-card-content">
              <span className="dash-card-value">Coming</span>
              <span className="dash-card-label">Soon</span>
            </div>
            <div className="dash-card-footer">
              <span className="dash-badge dash-badge-gray">New</span>
            </div>
          </div>

          {/* Placeholder for future card 7 */}
          <div className="dash-card dash-card-placeholder">
            <div className="dash-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <div className="dash-card-content">
              <span className="dash-card-value">Coming</span>
              <span className="dash-card-label">Soon</span>
            </div>
            <div className="dash-card-footer">
              <span className="dash-badge dash-badge-gray">New</span>
            </div>
          </div>

          {/* Placeholder for future card 8 */}
          <div className="dash-card dash-card-placeholder">
            <div className="dash-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <div className="dash-card-content">
              <span className="dash-card-value">Coming</span>
              <span className="dash-card-label">Soon</span>
            </div>
            <div className="dash-card-footer">
              <span className="dash-badge dash-badge-gray">New</span>
            </div>
          </div>

          {/* Placeholder for future card 9 */}
          <div className="dash-card dash-card-placeholder">
            <div className="dash-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <div className="dash-card-content">
              <span className="dash-card-value">Coming</span>
              <span className="dash-card-label">Soon</span>
            </div>
            <div className="dash-card-footer">
              <span className="dash-badge dash-badge-gray">New</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="dash-quick-stats">
          <div className="dash-stat-item">
            <span className="dash-stat-label">New Users Today</span>
            <span className="dash-stat-value">{stats.newUsersToday}</span>
          </div>
          <div className="dash-stat-item">
            <span className="dash-stat-label">Unread Feedback</span>
            <span className="dash-stat-value">{stats.unreadFeedback}</span>
          </div>
          <div className="dash-stat-item">
            <span className="dash-stat-label">New Notifications</span>
            <span className="dash-stat-value">{stats.unreadNotifications}</span>
          </div>
          <div className="dash-stat-item">
            <span className="dash-stat-label">System Admins</span>
            <span className="dash-stat-value">1</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;