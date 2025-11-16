import './OptionPage.css'
import Navbar from '../Navbar.js'
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, getUserPosts, getUserItems, getUserWishlists } from '../../lib/api';

function OptionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const testFavList = [
        {
            id: 1,
            title: "tst1",
            description: "tst1",
            category: null,
            price: 1
        },
        {
            id: 2,
            title: "tst2",
            description: "tst2",
            category: null,
            price: 2
        },
        {
            id: 3,
            title: "tst3",
            description: "tst3",
            category: null,
            price: 3
        },
        {
            id: 4,
            title: "tst4",
            description: "tst4",
            category: null,
            price: 4
        }
    ]

    const testPostList = [
      {
            id: 4,
            title: "tst4",
            description: "tst4",
            category: null,
            price: 4
        },
        {
            id: 5,
            title: "tst5",
            description: "tst5",
            category: null,
            price: 5
        },
        {
            id: 6,
            title: "tst6",
            description: "tst6",
            category: null,
            price: 6
        },
        {
            id: 7,
            title: "tst7",
            description: "tst7",
            category: null,
            price: 7
        },
        {
            id: 8,
            title: "tst8",
            description: "tst8",
            category: null,
            price: 8
        },
        {
            id: 9,
            title: "tst9",
            description: "tst9",
            category: null,
            price: 9
        },
        {
            id: 10,
            title: "tst10",
            description: "tst10",
            category: null,
            price: 10
        },
        {
            id: 11,
            title: "tst11",
            description: "tst11",
            category: null,
            price: 11
        }
    ]

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
                        // setItems(res.posts || []);

                        // Test Data
                        setItems(testPostList);

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
                            image: (w.items.item_images && w.items.item_images[0] && w.items.item_images[0].url) || null
                        }));
                        // setItems(transformed);

                        // Test Data
                        setItems(testFavList);

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
        if (isWishlists) return 'My Favorite Posts';
        return "Error";
    };

  return (
      <div>
          <Navbar />
          <div className="opTitleCtn">
              <div className="opTitle">{getTitle()}</div>
          </div>
          {loading && <div style={{ padding: 20, textAlign: 'center' }}>Loading...</div>}
          {error && <div style={{ padding: 20, textAlign: 'center', color: 'red' }}>{error}</div>}
          {!loading && !error && (
              <div className="opItems">
                  {items.length === 0 ? (
                      <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>No items found</div>
                  ) : (
                      items.map(item => (
                          <div 
                              key={item.id} 
                              className="opItem"
                              onClick={() => navigate(`/item/${item.id}`)}
                              style={{ cursor: 'pointer' }}
                          >
                              <div className="opImage">
                                  <img 
                                      src={item.image || './profile.png'} 
                                      alt={item.title || item.name} 
                                  />
                              </div>
                              <div className="opInfo">
                                  <h3 className="opName">{item.title || item.name}</h3>
                                  <p className="opPrice">{item.price ? `${item.price.toLocaleString()} won` : 'Price not set'}</p>
                                  <p className="opSeller">Seller Name</p>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          )}
      </div>
  )
}

export default OptionPage;