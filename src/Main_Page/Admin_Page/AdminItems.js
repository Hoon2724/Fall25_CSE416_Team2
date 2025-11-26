import './AdminItems.css'

import { useEffect, useState } from 'react';
import Navbar from "../Navbar";
import { Link } from 'react-router-dom';
import { getAllItems, deleteItemByAdmin } from '../../lib/api';

function AdminItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const loadItems = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAllItems({ page, search: searchTerm || undefined });
      if (res.res_code === 200) {
        setItems(res.items || []);
        setPagination(res.pagination);
      } else {
        setError(res.res_msg || 'Failed to load items');
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [page, searchTerm]);

  const handleDelete = async (itemId) => {
    if (!window.confirm('정말 이 아이템을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const res = await deleteItemByAdmin(itemId);
      if (res.res_code === 200) {
        loadItems();
      } else {
        alert(res.res_msg || 'Failed to delete item');
      }
    } catch (e) {
      alert('Network error');
    }
  };

  return (
    <div>
      <Navbar />

      <div className="adminItemsCtn">
        <div className="adminReturnBtn">
          <Link to='../admin'>
          <span className="bi bi-arrow-left"></span>
          <span className="returnDesc">Return</span>
          </Link>
        </div>
        <div className="adminItemsTitle">Configure Market Item Posts</div>

        {error && (
          <div style={{ color: 'red', margin: '10px 0' }}>{error}</div>
        )}

        <div style={{ margin: '20px 0' }}>
          <input
            type="text"
            placeholder="Search items by title or description..."
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
            <ul className="nav flex-column adminItemsList">
              {items.map((item) => (
                <li key={item.id} className="nav-item adminItemsItem">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{item.title}</div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                        {item.description && item.description.length > 100 
                          ? item.description.substring(0, 100) + '...' 
                          : item.description}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Category: {item.category?.name || 'N/A'} | 
                        Price: ${item.price || 0} | 
                        Seller: {item.seller?.display_name || 'Unknown'} ({item.seller?.email || 'N/A'}) | 
                        Images: {item.images?.length || 0}
                      </div>
                      <div style={{ fontSize: '11px', color: '#999' }}>
                        Created: {new Date(item.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ marginLeft: '20px' }}>
                      <button
                        onClick={() => handleDelete(item.id)}
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

export default AdminItems;