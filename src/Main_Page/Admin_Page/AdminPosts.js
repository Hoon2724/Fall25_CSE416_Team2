import './AdminPosts.css'

import { useEffect, useState } from 'react';
import Navbar from "../Navbar";
import { Link } from 'react-router-dom';
import { getAllPosts, deletePostByAdmin } from '../../lib/api';

function AdminPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const loadPosts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAllPosts({ page, search: searchTerm || undefined });
      if (res.res_code === 200) {
        setPosts(res.posts || []);
        setPagination(res.pagination);
      } else {
        setError(res.res_msg || 'Failed to load posts');
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [page, searchTerm]);

  const handleDelete = async (postId) => {
    if (!window.confirm('정말 이 포스트를 삭제하시겠습니까?')) {
      return;
    }

    try {
      console.log('Attempting to delete post:', postId);
      const res = await deletePostByAdmin(postId);
      console.log('Delete response:', res);
      if (res.res_code === 200) {
        alert('포스트가 성공적으로 삭제되었습니다.');
        loadPosts();
      } else {
        console.error('Delete failed:', res);
        alert(res.res_msg || 'Failed to delete post');
      }
    } catch (e) {
      console.error('Delete error:', e);
      alert('Network error: ' + e.message);
    }
  };

  return (
    <div>
      <Navbar />

      <div className="adminPostsCtn">
        <div className="adminReturnBtn">
          <Link to='../admin'>
          <span className="bi bi-arrow-left"></span>
          <span className="returnDesc">Return</span>
          </Link>
        </div>
        <div className="adminPostsTitle">Configure Community Posts</div>

        {error && (
          <div style={{ color: 'red', margin: '10px 0' }}>{error}</div>
        )}

        <div style={{ margin: '20px 0' }}>
          <input
            type="text"
            placeholder="Search posts by title or content..."
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
            <ul className="nav flex-column adminPostsList">
              {posts.map((post) => (
                <li key={post.id} className="nav-item adminPostsItem">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{post.title}</div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                        {post.content && post.content.length > 100 
                          ? post.content.substring(0, 100) + '...' 
                          : post.content}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Community: {post.community?.name || 'N/A'} | 
                        Author: {post.author?.display_name || 'Unknown'} ({post.author?.email || 'N/A'}) | 
                        Upvotes: {post.upvotes || 0} | 
                        Comments: {post.comment_count || 0}
                      </div>
                      <div style={{ fontSize: '11px', color: '#999' }}>
                        Created: {new Date(post.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ marginLeft: '20px' }}>
                      <button
                        onClick={() => handleDelete(post.id)}
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

export default AdminPosts;