import React, { useState, useEffect } from 'react';
import { useUsers } from '../hooks/useUsers';
import UsersModal from '../components/UsersModal';
import LoadingScreen from '../components/LoadingScreen';
import ErrorDisplay from '../components/ErrorDisplay';
import type { UserDetails } from '../services/admin.users.service';
import './styles/Users.css';

const Users = () => {
  const { users, loading, error, pagination, fetchUsers, getUserDetails } = useUsers();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // ✅ FIXED: Added dependencies and used useCallback for fetchUsers
  useEffect(() => {
    fetchUsers({ page: pagination.page, limit: pagination.limit });
  }, [fetchUsers, pagination.page, pagination.limit]);

  const handleSearch = () => {
    fetchUsers({ 
      page: 1, 
      limit: pagination.limit, 
      search: searchTerm || undefined 
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (newPage: number) => {
    fetchUsers({ 
      page: newPage, 
      limit: pagination.limit, 
      search: searchTerm || undefined 
    });
  };

  const handleViewUser = async (userId: string) => {
    setModalLoading(true);
    setShowModal(true);

    const result = await getUserDetails(userId);
    
    if (result.success && result.data) {
      setSelectedUser(result.data);
    } else {
      setShowModal(false);
    }
    
    setModalLoading(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'users-badge users-badge-active';
      case 'SUSPENDED': return 'users-badge users-badge-suspended';
      case 'BANNED': return 'users-badge users-badge-banned';
      default: return 'users-badge users-badge-inactive';
    }
  };

  const getRoleBadgeClass = (role: string) => {
    return role === 'ADMIN' ? 'users-badge users-badge-admin' : 'users-badge users-badge-user';
  };

  if (loading && users.length === 0) {
    return <LoadingScreen message="Loading users..." fullScreen />;
  }

  return (
    <div className="users-wrapper">
      <div className="users-container">
        {/* Header */}
        <div className="users-header">
          <div>
            <h1 className="users-title">Manage Users</h1>
            <p className="users-subtitle">View and manage system users</p>
          </div>
          <div className="users-search">
            <div className="users-search-wrapper">
              <svg className="users-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="users-search-input"
              />
              <button onClick={handleSearch} className="users-search-btn">
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && <ErrorDisplay message={error} />}

        {/* Users Table */}
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Groups</th>
                <th>Tasks</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="users-table-row">
                  <td>
                    <div className="users-user-info">
                      <div className="users-avatar">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.fullName} />
                        ) : (
                          <span>{user.fullName.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <span className="users-user-name">{user.fullName}</span>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={getRoleBadgeClass(user.role)}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span className={getStatusBadgeClass(user.roleStatus)}>
                      {user.roleStatus}
                    </span>
                  </td>
                  <td>{user.groupsCount}</td>
                  <td>{user.tasksCompleted}</td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>
                    <button
                      className="users-view-btn"
                      onClick={() => handleViewUser(user.id)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M22 12c-2.667 4.667-6 7-10 7s-7.333-2.333-10-7c2.667-4.667 6-7 10-7s7.333 2.333 10 7z" />
                      </svg>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="users-pagination">
            <button
              className="users-pagination-btn"
              disabled={pagination.page === 1}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              Previous
            </button>
            <span className="users-pagination-info">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              className="users-pagination-btn"
              disabled={pagination.page === pagination.pages}
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      <UsersModal
        isOpen={showModal}
        onClose={closeModal}
        user={selectedUser}
        loading={modalLoading}
      />
    </div>
  );
};

export default Users;