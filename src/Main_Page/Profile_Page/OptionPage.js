import './OptionPage.css'
import Navbar from '../Navbar.js'
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, getUserPosts, getUserWishlists, removeFromWishlist } from '../../lib/api';
import StatusBadge from '../../components/StatusBadge.js';

function OptionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Removed test lists; use real API data

  // Determine what to show based on URL or default
  const isPosts = location.pathname.includes('post') || location.search.includes('type=posts');
  const isWishlists = location.pathname.includes('favorite') || location.search.includes('type=wishlists');

  useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError('');
            try {
                // Get current user first
                const userRes = await getCurrentUser();
                if (userRes.res_code !== 200) {
                    setError('Please sign in to view your data');
                    setLoading(false);
                    return;
                }

                const currentUser = userRes.user;
                setUser(currentUser);

                // Load appropriate data based on page type
                if (isPosts) {
                    const res = await getUserPosts(currentUser.id);
                    if (res.res_code === 200) {
                        setItems(res.posts || []);
                    } else {
                        setError(res.res_msg || 'Failed to load posts'); 
                    }
                } else if (isWishlists) {
                    const res = await getUserWishlists(currentUser.id);
                    if (res.res_code === 200) {
                        // Transform wishlists to items format for display
                        const transformed = (res.wishlists || []).map(w => ({
                            id: w.items.id,
                            title: w.items.title,
                            price: w.items.price,
                            status: w.items.status,
                            image: (w.items.item_images && w.items.item_images[0] && w.items.item_images[0].url) || null
                        }));
                        setItems(transformed);
                    } else {
                        setError(res.res_msg || 'Failed to load wishlists');
                    }
                } else {
                    throw new Error("Unknown parameter detected");
                }
            } catch (e) {
                setError('Network error');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [isPosts, isWishlists]);

  const getTitle = () => {
        if (isPosts) return 'My Posts';
        if (isWishlists) return 'My Favorite Items';
        return "Error";
    };

  return (
      <div>
          <Navbar />
          <div className="opTitleCtn_sep">
              <div className="opTitle_sep">{getTitle()}</div>
          </div>
          {loading && <div style={{ padding: 20, textAlign: 'center' }}>Loading...</div>}
          {error && <div style={{ padding: 20, textAlign: 'center', color: 'red' }}>{error}</div>}
          {!loading && !error && (
              <div className="opItems_sep">
                  {items.length === 0 ? (
                      <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>No items found</div>
                  ) : (
                      items.map(item => {
                        const isPostCard = isPosts;
                        if (isPostCard) {
                          const created = item.created_at ? new Date(item.created_at) : null;
                          const dateStr = created ? created.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '';
                          return (
                            <div 
                              key={item.id}
                              className="opItem_sep"
                              onClick={() => navigate(`/community/post/${item.id}`)}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="opInfo_sep" style={{ marginLeft: 0 }}>
                                <h3 className="opName_sep">{item.title}</h3>
                                <p className="opPrice_sep">{item.communities?.name || 'Community'}</p>
                                <p className="opSeller_sep" style={{ color: 'gray' }}>{dateStr}</p>
                              </div>
                            </div>
                          );
                        }
                        // wishlist item card
                        return (
                          <div 
                              key={item.id} 
                              className="opItem_sep"
                              onClick={() => navigate(`/item/${item.id}`)}
                              style={{ cursor: 'pointer' }}
                          >
                              <div className="opImage_sep">
                                  <img 
                                      src={item.image || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%" height="100%" fill=\"%23cccccc\"/><text x=\"50%\" y=\"50%\" dominant-baseline=\"middle\" text-anchor=\"middle\" font-size=\"12\" fill=\"%23666666\" style=\"font-family:system-ui%2C%20-apple-system%2C%20Segoe%20UI%2C%20Roboto%2C%20Noto%20Sans%2C%20Helvetica%20Neue%2C%20Arial%2C%20sans-serif;\">No Image</text></svg>'} 
                                      alt={item.title || item.name} 
                                  />
                              </div>
                              <div className="opInfo_sep">
                                  <h3 className="opName_sep">{item.title || item.name}</h3>
                                  <p className="opPrice_sep">{item.price ? `${item.price.toLocaleString()} won` : 'Price not set'}</p>
                                  <StatusBadge status={item.status} />
                              </div>
                          </div>
                        );
                      })
                  )}
              </div>
          )}
      </div>
  )
}

export default OptionPage;