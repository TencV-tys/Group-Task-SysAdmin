import React, { useState, useEffect, useCallback } from 'react';
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
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Use useCallback to memoize fetchUsers function
  const fetchUsersCallback = useCallback((page: number, search?: string) => {
    fetchUsers({ 
      page, 
      limit: pagination.limit, 
      search: search || undefined 
    });
  }, [fetchUsers, pagination.limit]);

  useEffect(() => {
    fetchUsersCallback(pagination.page, searchTerm);
  }, [pagination.page, searchTerm, fetchUsersCallback]);

  const handleSearch = () => {
    fetchUsersCallback(1, searchTerm);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (newPage: number) => {
    fetchUsersCallback(newPage, searchTerm);
  };

  const handleViewUser = async (userId: string) => {
    setSelectedRowId(userId);
    setModalLoading(true);
    setShowModal(true);

    try {
      const result = await getUserDetails(userId);
      
      if (result.success && result.data) {
        setSelectedUser(result.data);
      } else {
        setShowModal(false);
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      setShowModal(false);
      setSelectedUser(null);
    } finally {
      setModalLoading(false);
      setSelectedRowId(null);
    }
  };

  const handleRowClick = (userId: string) => {
    handleViewUser(userId);
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => {
      setSelectedUser(null);
    }, 300);
  };

  const clearSearch = () => {
    setSearchTerm('');
    fetchUsersCallback(1, '');
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
      case 'DISABLED': return 'users-badge users-badge-disabled';
      default: return 'users-badge users-badge-inactive';
    }
  };

  const getRoleBadgeClass = (role: string) => {
    return role === 'GROUP_ADMIN' ? 'users-badge users-badge-admin' : 'users-badge users-badge-user';
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
                placeholder="Search users by name or email..."
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

        {/* Users Table or Empty State */}
        {users.length === 0 ? (
          <div className="users-empty">
            <div className="users-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="8" r="4" />
                <path d="M5.5 20v-2a5 5 0 0 1 10 0v2" />
              </svg>
            </div>
            <h3 className="users-empty-title">No users found</h3>
            <p className="users-empty-message">
              {searchTerm 
                ? "No users match your current search. Try adjusting your search terms."
                : "There are no users in the system yet."}
            </p>
            {searchTerm && (
              <button className="users-empty-btn" onClick={clearSearch}>
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <>
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
                    <tr 
                      key={user.id} 
                      onClick={() => handleRowClick(user.id)}
                      className={`users-table-row ${selectedRowId === user.id ? 'selected' : ''}`}
                      style={{ cursor: 'pointer' }}
                    >
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
                          {user.role === 'GROUP_ADMIN' ? 'Group Admin' : 'User'}
                        </span>
                      </td>
                      <td>
                        <span className={getStatusBadgeClass(user.roleStatus)}>
                          {user.roleStatus}
                        </span>
                      </td>
                      <td>
                        <span className="users-badge users-badge-count">
                          {user.groupsCount || 0}
                        </span>
                      </td>
                      <td>
                        <span className="users-badge users-badge-count">
                          {user.tasksCompleted || 0}
                        </span>
                      </td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          className="users-view-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewUser(user.id);
                          }}
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
          </>
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