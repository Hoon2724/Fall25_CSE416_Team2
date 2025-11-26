import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, getUserPosts, getUserItems, getUserWishlists, getUserViewHistory } from '../../lib/api';
import StatusBadge from '../../components/StatusBadge';

import './Option.css';

function Option(props) {
    const location = useLocation();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Removed test list; use real data from API

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
                switch (props.mode) {
                    case "myItem":
                        const res_userItem = await getUserItems(currentUser.id);
                        if (res_userItem.res_code === 200) {
                            const transformed = (res_userItem.items || []).map(item => ({
                                id: item.id,
                                title: item.title,
                                price: item.price,
                                image: (item.item_images && item.item_images[0] && item.item_images[0].url) || null
                            }));
                        setItems(transformed);
                        } 
                        else {
                        setError(res_userItem.res_msg || 'Failed to load items');
                        }
                        break;
                    case "history":
                        // Try server history first (if logged in); fallback to localStorage
                        try {
                            const server = await getUserViewHistory(currentUser.id, { limit: 12 });
                            if (server.res_code === 200) {
                                setItems(server.items || []);
                                break;
                            }
                        } catch (_e) { /* swallow */ }
                        try {
                            const raw = localStorage.getItem('recent_items');
                            const list = Array.isArray(JSON.parse(raw || '[]')) ? JSON.parse(raw || '[]') : [];
                            setItems(list);
                        } catch (e) {
                            setItems([]);
                        }
                        break;                   
                    case "post":
                        const res_post = await getUserPosts(currentUser.id);
                        if (res_post.res_code === 200)
                            setItems(res_post.posts || []);
                        else
                            setError(res_post.res_msg || 'Failed to load posts');
                        break;
                    case "favorite":
                        const res_fav = await getUserWishlists(currentUser.id);
                        if (res_fav.res_code === 200) {
                            // Transform wishlists to items format for display
                            const transformed = (res_fav.wishlists || []).map(w => ({
                                id: w.items.id,
                                title: w.items.title,
                                price: w.items.price,
                                image: (w.items.item_images && w.items.item_images[0] && w.items.item_images[0].url) || null
                            }));
                            setItems(transformed);
                        } else {
                            setError(res_fav.res_msg || 'Failed to load wishlists');
                        }
                    default:
                        break;
                }
            } catch (e) {
                setError('Network error');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [props.mode]);

    return (
        <div className="opItems d-flex">
            {loading && (
                <div className="opPlaceholder">Loading...</div>
            )}
            {!loading && error && (
                <div className="opError">{error}</div>
            )}
            {!loading && !error && items.length === 0 && (
                <div className="opPlaceholder">No items to display.</div>
            )}
            {!loading && !error && items.map(item => (
                <div 
                    key={item.id} 
                    className="opItem"
                    onClick={() => navigate(`/item/${item.id}`)}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="opImage">
                        <img 
                            src={item.image || 'data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\"><rect width=\"100%\" height=\"100%\" fill=\"%23cccccc\"/><text x=\"50%\" y=\"50%\" dominant-baseline=\"middle\" text-anchor=\"middle\" font-size=\"12\" fill=\"%23666666\" style=\"font-family:system-ui%2C%20-apple-system%2C%20Segoe%20UI%2C%20Roboto%2C%20Noto%20Sans%2C%20Helvetica%20Neue%2C%20Arial%2C%20sans-serif;\">No Image</text></svg>'} 
                            alt={item.title || item.name} 
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\"><rect width=\"100%\" height=\"100%\" fill=\"%23cccccc\"/><text x=\"50%\" y=\"50%\" dominant-baseline=\"middle\" text-anchor=\"middle\" font-size=\"12\" fill=\"%23666666\" style=\"font-family:system-ui%2C%20-apple-system%2C%20Segoe%20UI%2C%20Roboto%2C%20Noto%20Sans%2C%20Helvetica%20Neue%2C%20Arial%2C%20sans-serif;\">No Image</text></svg>'; }}
                        />
                    </div>
                    <div className="opInfo">
                        <h3 className="opName">{item.title || item.name}</h3>
                        <p className="opPrice">{item.price ? `${item.price.toLocaleString()} won` : 'Price not set'}</p>
                        <StatusBadge status={item.status} />
                    </div>
                </div>
            ))}
        </div>
    )
}

export default Option;