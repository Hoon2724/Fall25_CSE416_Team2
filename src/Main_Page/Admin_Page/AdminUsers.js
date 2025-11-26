import './AdminUsers.css'

import { useEffect, useState } from 'react';
import Navbar from "../Navbar";
import { Link } from 'react-router-dom';
import { getAllUsers, deleteUser, updateUserByAdmin } from '../../lib/api';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAllUsers({ page, search: searchTerm || undefined });
      if (res.res_code === 200) {
        setUsers(res.users || []);
        setPagination(res.pagination);
      } else {
        setError(res.res_msg || 'Failed to load users');
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, searchTerm]);

  const handleDelete = async (userId) => {
    if (!window.confirm('정말 이 사용자를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const res = await deleteUser(userId);
      if (res.res_code === 200) {
        loadUsers();
      } else {
        alert(res.res_msg || 'Failed to delete user');
      }
    } catch (e) {
      alert('Network error');
    }
  };

  const handleToggleAdmin = async (userId, currentIsAdmin) => {
    try {
      const res = await updateUserByAdmin(userId, { is_admin: !currentIsAdmin });
      if (res.res_code === 200) {
        loadUsers();
      } else {
        alert(res.res_msg || 'Failed to update user');
      }
    } catch (e) {
      alert('Network error');
    }
  };

  return (
    <div>
      <Navbar />

      <div className="adminUsersCtn">
        <div className="adminReturnBtn">
          <Link to='../admin'>
          <span className="bi bi-arrow-left"></span>
          <span className="returnDesc">Return</span>
          </Link>
        </div>
        <div className="adminUsersTitle">Configure Users</div>

        {error && (
          <div style={{ color: 'red', margin: '10px 0' }}>{error}</div>
        )}

        <div style={{ margin: '20px 0' }}>
          <input
            type="text"
            placeholder="Search users by email or name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '14px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            <ul className="nav flex-column adminUsersList">
              {users.map((user) => (
                <li key={user.id} className="nav-item adminUsersItem">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{user.display_name || 'No name'}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{user.email}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Trust Score: {user.trust_score || 0} | 
                        Reviews: {user.total_reviews || 0} | 
                        Verified: {user.school_verified ? 'Yes' : 'No'} |
                        Admin: {user.is_admin ? 'Yes' : 'No'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#999' }}>
                        Created: {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                        style={{
                          padding: '5px 10px',
                          fontSize: '12px',
                          backgroundColor: user.is_admin ? '#ff9800' : '#4caf50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        style={{
                          padding: '5px 10px',
                          fontSize: '12px',
                          backgroundColor: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {pagination && (
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={!pagination.has_prev}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: pagination.has_prev ? '#007bff' : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: pagination.has_prev ? 'pointer' : 'not-allowed'
                  }}
                >
                  Previous
                </button>
                <span style={{ padding: '8px' }}>
                  Page {pagination.current_page} of {pagination.total_pages} (Total: {pagination.total_count})
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!pagination.has_next}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: pagination.has_next ? '#007bff' : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: pagination.has_next ? 'pointer' : 'not-allowed'
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default AdminUsers;