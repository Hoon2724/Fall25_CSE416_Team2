import Navbar from '../Navbar.js';
import './SearchResult.css';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { searchItems } from '../../lib/api';

function SearchResult() {
    const location = useLocation();
    const navigate = useNavigate();
    const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const query = params.get('q') || '';
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await searchItems({ q: query, limit: 20, page: 1 });
                if (res.res_code === 200) {
                    setItems(res.items || []);
                } else {
                    setError(res.res_msg || 'Search failed');
                }
            } catch (e) {
                setError('Network error');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [query]);

    return (
        <div className="search-result-container">
            <Navbar />
            <div className="search-result-content">
                <div className="search-header">
                    <h1 className="search-title">Search Input: {query || 'All'}</h1>
                </div>

                <div className="itemUploadButton d-flex justify-content-center align-items-center">
                    <div className="itemUploadBtn d-flex justify-content-center align-items-center" onClick={() => navigate(`/item-post`)}>
                        <div className="post-text">List your item</div>
                    </div>
                </div>
                
                <div className="divider-line"></div>
                
                <div className="search-results">
                    {loading && <div style={{ padding: 12 }}>Loading...</div>}
                    {(!loading && error) && <div style={{ padding: 12, color: 'red' }}>{error}</div>}
                    {(!loading && !error) && items.map(item => (
                        <div 
                            key={item.id} 
                            className="search-result-item"
                            onClick={() => navigate(`/item/${item.id}`)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="result-item-image">
                                <img src={(item.images && item.images[0] && item.images[0].url) || 'https://via.placeholder.com/100x100/cccccc/666666?text=No+Image'} alt={item.title} />
                            </div>
                            <div className="result-item-info">
                                <h3 className="result-item-name">{item.title}</h3>
                                <p className="result-item-price">{item.price} won</p>
                                <p className="result-item-seller">{item.seller && item.seller.display_name}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default SearchResult;
