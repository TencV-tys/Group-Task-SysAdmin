import React from 'react';
import type { UserDetails } from '../services/admin.users.service';
import './styles/UsersModal.css';

// Safe Image Component for modal
const SafeImage = ({ src, className, fallbackChar }: { src: string; className: string; fallbackChar: string }) => {
  const [error, setError] = React.useState(false);
  
  if (error || !src) {
    return (
      <div className={className}>
        {fallbackChar}
      </div>
    );
  }
  
  return (
    <img 
      src={src} 
      className={className}
      onError={() => setError(true)}
      alt=""
    />
  );
};

interface UsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserDetails | null;
  loading?: boolean;
}

const UsersModal: React.FC<UsersModalProps> = ({ isOpen, onClose, user, loading }) => {
  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'users-modal-badge users-modal-badge-active';
      case 'SUSPENDED': return 'users-modal-badge users-modal-badge-suspended';
      case 'BANNED': 
      case 'DISABLED': return 'users-modal-badge users-modal-badge-banned';
      default: return 'users-modal-badge users-modal-badge-inactive';
    }
  };

  const getRoleBadgeClass = (role: string) => {
    return role === 'GROUP_ADMIN'  // 👈 FIXED: Should be GROUP_ADMIN, not ADMIN
      ? 'users-modal-badge users-modal-badge-admin' 
      : 'users-modal-badge users-modal-badge-user';
  };

  return (
    <div className="users-modal-overlay" onClick={onClose}>
      <div className="users-modal" onClick={(e) => e.stopPropagation()}>
        <div className="users-modal-header">
          <h2>User Details</h2>
          <button className="users-modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="users-modal-loading">
            <div className="users-spinner"></div>
            <p>Loading user details...</p>
          </div>
        ) : user ? (
          <div className="users-modal-body">
            {/* User Profile */}
            <div className="users-modal-profile">
              <div className="users-modal-avatar">
                <SafeImage 
                  src={user.avatarUrl || ''} 
                  className="users-modal-avatar-img"
                  fallbackChar={user.fullName.charAt(0).toUpperCase()}
                />
              </div>
              <div>
                <h3>{user.fullName}</h3>
                <p>{user.email}</p>
                <div className="users-modal-badges">
                  <span className={getRoleBadgeClass(user.role)}>
                    {user.role === 'GROUP_ADMIN' ? 'Group Admin' : 'User'}
                  </span>
                  <span className={getStatusBadgeClass(user.roleStatus)}>
                    {user.roleStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="users-modal-stats">
              <div className="users-modal-stat">
                <span className="users-modal-stat-value">{user.stats?.groupsCount || 0}</span>
                <span className="users-modal-stat-label">Groups</span>
              </div>
              <div className="users-modal-stat">
                <span className="users-modal-stat-value">{user.stats?.totalTasks || 0}</span>
                <span className="users-modal-stat-label">Total Tasks</span>
              </div>
              <div className="users-modal-stat">
                <span className="users-modal-stat-value">{user.stats?.completedTasks || 0}</span>
                <span className="users-modal-stat-label">Completed</span>
              </div>
              <div className="users-modal-stat">
                <span className="users-modal-stat-value">{user.stats?.totalPoints || 0}</span>
                <span className="users-modal-stat-label">Points</span>
              </div>
            </div>

            {/* Groups Section */}
            {user.groups && user.groups.length > 0 && (
              <div className="users-modal-section">
                <h4>Groups</h4>
                <div className="users-modal-groups">
                  {user.groups.map((item, index) => (
                    <div key={index} className="users-modal-group">
                      <div className="users-modal-group-avatar">
                        <SafeImage 
                          src={item.group?.avatarUrl || ''} 
                          className="users-modal-group-avatar-img"
                          fallbackChar={item.group?.name?.charAt(0).toUpperCase() || 'G'}
                        />
                      </div>
                      <div className="users-modal-group-info">
                        <span className="users-modal-group-name">{item.group?.name || 'Unknown'}</span>
                        <span className="users-modal-group-role">{item.groupRole}</span>
                        <span className="users-modal-group-date">
                          Joined {formatDate(item.joinedAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Tasks Section */}
            {user.assignments && user.assignments.length > 0 && (
              <div className="users-modal-section">
                <h4>Recent Completed Tasks</h4>
                <div className="users-modal-tasks">
                  {user.assignments.map((task) => (
                    <div key={task.id} className="users-modal-task">
                      <div className="users-modal-task-info">
                        <span className="users-modal-task-title">{task.task?.title || 'Unknown Task'}</span>
                        <span className="users-modal-task-group">{task.task?.group?.name || 'Unknown Group'}</span>
                      </div>
                      <div className="users-modal-task-meta">
                        <span className="users-modal-task-points">+{task.points || 0} pts</span>
                        <span className="users-modal-task-date">{formatDate(task.completedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default UsersModal;