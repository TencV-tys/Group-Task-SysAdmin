// pages/Users.tsx - COMPLETE WITH SAFEIMAGE AND AVATAR HANDLING
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useUsers } from '../hooks/useUsers';
import UsersModal from '../components/UsersModal';
import LoadingScreen from '../components/LoadingScreen';
import ErrorDisplay from '../components/ErrorDisplay';
import type { UserDetails } from '../services/admin.users.service';
import './styles/Users.css';

// Safe Image Component to handle broken avatar URLs
const SafeImage = ({ src, className, fallbackChar }: { src: string; className: string; fallbackChar: string }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  
  if (error || !src) {
    return (
      <div className={`${className}-placeholder`}>
        {fallbackChar}
      </div>
    );
  }
  
  return (
    <img 
      src={src} 
      className={className}
      onError={() => {
        setError(true);
        setLoading(false);
      }}
      onLoad={() => setLoading(false)}
      style={{ display: loading ? 'none' : 'block' }}
      alt=""
    />
  );
};

const Users = () => {
  const { users, loading, error, pagination, fetchUsers, getUserDetails, setPagination, stats } = useUsers(10);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  
  // Refs to prevent multiple requests
  const fetchInProgress = useRef(false);
  const searchTimeoutRef = useRef<number | undefined>(undefined);

  // Debounce search term
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Reset to page 1 when search changes
  useEffect(() => {
    if (!fetchInProgress.current) {
      setPagination(prev => ({ ...prev, page: 1 }));
    }
  }, [debouncedSearch, statusFilter, roleFilter, setPagination]);

  // Fetch users when filters change
  useEffect(() => {
    const loadUsers = async () => {
      if (fetchInProgress.current) return;
      
      fetchInProgress.current = true;
      
      try {
        await fetchUsers({ 
          page: pagination.page, 
          limit: pagination.limit, 
          search: debouncedSearch || undefined,
          status: statusFilter || undefined,
          role: roleFilter || undefined
        });
      } finally {
        fetchInProgress.current = false;
        setInitialLoad(false);
      }
    };
    
    loadUsers();
  }, [pagination.page, pagination.limit, debouncedSearch, statusFilter, roleFilter, fetchUsers]);

  // ===== Handle stat card click =====
  const handleStatClick = (filterType: string, value: string) => {
    if (filterType === 'status') {
      setStatusFilter(value);
      setRoleFilter(''); // Clear role filter when clicking status
    } else if (filterType === 'role') {
      setRoleFilter(value);
      setStatusFilter(''); // Clear status filter when clicking role
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSearch = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    setDebouncedSearch(searchTerm);
  }, [searchTerm]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = useCallback((newPage: number) => {
    if (newPage === pagination.page || fetchInProgress.current) return;
    setPagination(prev => ({ ...prev, page: newPage }));
  }, [pagination.page, setPagination]);

  const handleViewUser = async (userId: string) => {
    if (selectedRowId === userId) return;
    
    setSelectedRowId(userId);
    setModalLoading(true);
    setShowModal(true);

    try {
      const result = await getUserDetails(userId);
      if (result.success && result.data) {
        setSelectedUser(result.data);
      } else {
        console.error('Failed to load user details:', result.message);
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
      setSelectedRowId(null);
    }, 300);
  };

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('');
    setRoleFilter('');
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [setPagination]);

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
      case 'ACTIVE': return 'users-badge users-badge-active';
      case 'SUSPENDED': return 'users-badge users-badge-suspended';
      case 'DISABLED': 
      case 'BANNED': return 'users-badge users-badge-banned';
      default: return 'users-badge users-badge-inactive';
    }
  };

  const getRoleBadgeClass = (role: string) => {
    return role === 'GROUP_ADMIN' ? 'users-badge users-badge-admin' : 'users-badge users-badge-user';
  };

  if (initialLoad && loading) {
    return <LoadingScreen message="Loading users..." fullScreen />;
  }

  return (
    <div className="users-wrapper">
      <div className="users-container">
        {/* Header */}
        <div className="users-header">
          <div className="users-header-left">
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
                aria-label="Search users"
              />
              <button 
                onClick={handleSearch} 
                className="users-search-btn" 
                disabled={loading || searchTerm === debouncedSearch}
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="users-stats">
            <div 
              className={`users-stat-card ${!statusFilter && !roleFilter ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter('');
                setRoleFilter('');
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              style={{ cursor: 'pointer' }}
            >
              <span className="users-stat-value">{stats.total}</span>
              <span className="users-stat-label">Total Users</span>
              {!statusFilter && !roleFilter && <div className="stat-active-indicator" />}
            </div>
            
            <div 
              className={`users-stat-card ${statusFilter === 'ACTIVE' ? 'active' : ''}`}
              onClick={() => handleStatClick('status', 'ACTIVE')}
              style={{ cursor: 'pointer' }}
            >
              <span className="users-stat-value">{stats.active}</span>
              <span className="users-stat-label">Active</span>
              {statusFilter === 'ACTIVE' && <div className="stat-active-indicator" />}
            </div>
            
            <div 
              className={`users-stat-card ${roleFilter === 'GROUP_ADMIN' ? 'active' : ''}`}
              onClick={() => handleStatClick('role', 'GROUP_ADMIN')}
              style={{ cursor: 'pointer' }}
            >
              <span className="users-stat-value">{stats.groupAdmins}</span>
              <span className="users-stat-label">Group Admins</span>
              {roleFilter === 'GROUP_ADMIN' && <div className="stat-active-indicator" />}
            </div>
          </div>
        )}

        {/* Active Filters */}
        {(statusFilter || roleFilter || debouncedSearch) && (
          <div className="users-active-filters">
            <span className="users-active-filters-label">Active filters:</span>
            {statusFilter && (
              <span className="users-filter-tag">
                Status: {statusFilter}
                <button onClick={() => setStatusFilter('')}>×</button>
              </span>
            )}
            {roleFilter && (
              <span className="users-filter-tag">
                Role: {roleFilter === 'GROUP_ADMIN' ? 'Group Admin' : 'User'}
                <button onClick={() => setRoleFilter('')}>×</button>
              </span>
            )}
            {debouncedSearch && (
              <span className="users-filter-tag">
                Search: "{debouncedSearch}"
                <button onClick={() => {
                  setSearchTerm('');
                  setDebouncedSearch('');
                }}>×</button>
              </span>
            )}
            <button className="users-clear-filters" onClick={clearFilters}>
              Clear All
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && <ErrorDisplay message={error} onRetry={() => {
          fetchUsers({ 
            page: pagination.page, 
            limit: pagination.limit, 
            search: debouncedSearch,
            status: statusFilter || undefined,
            role: roleFilter || undefined
          });
        }} />}

        {/* Users Table or Empty State */}
        {users.length === 0 && !loading ? (
          <div className="users-empty">
            <div className="users-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="8" r="4" />
                <path d="M5.5 20v-2a5 5 0 0 1 10 0v2" />
              </svg>
            </div>
            <h3 className="users-empty-title">No users found</h3>
            <p className="users-empty-message">
              {debouncedSearch || statusFilter || roleFilter
                ? "No users match your current filters. Try adjusting your search."
                : "There are no users in the system yet."}
            </p>
            {(debouncedSearch || statusFilter || roleFilter) && (
              <button className="users-empty-btn" onClick={clearFilters}>
                Clear Filters
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
                      className={`users-table-row ${selectedRowId === user.id ? 'selected' : ''} ${loading ? 'loading' : ''}`}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div className="users-user-info">
                          <div className="users-avatar">
                            <SafeImage 
                              src={user.avatarUrl || ''} 
                              className="user-avatar-img"
                              fallbackChar={user.fullName?.charAt(0).toUpperCase() || 'U'}
                            />
                          </div>
                          <span className="users-user-name">{user.fullName}</span>
                        </div>
                      </td>
                      <td className="users-email">{user.email}</td>
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
                      <td className="users-date">{formatDate(user.createdAt)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          className="users-view-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewUser(user.id);
                          }}
                          disabled={modalLoading && selectedRowId === user.id}
                          aria-label={`View details for ${user.fullName}`}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M22 12c-2.667 4.667-6 7-10 7s-7.333-2.333-10-7c2.667-4.667 6-7 10-7s7.333 2.333 10 7z" />
                          </svg>
                          <span>View</span>
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
                  disabled={pagination.page === 1 || loading}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  Previous
                </button>
                <div className="users-pagination-info">
                  <span>Page {pagination.page} of {pagination.pages}</span>
                  <span className="users-pagination-total">(Total: {pagination.total} users)</span>
                </div>
                <button
                  className="users-pagination-btn"
                  disabled={pagination.page === pagination.pages || loading}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  Next
                </button>
              </div>
            )}

            {/* Loading overlay for table updates */}
            {loading && (
              <div className="users-loading-overlay">
                <div className="users-spinner"></div>
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