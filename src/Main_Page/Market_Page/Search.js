import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../Navbar.js';
import './Search.css';
import { getSearchHistory, saveSearchHistory, clearAllSearchHistory, deleteSearchHistory } from '../../lib/api';

function Search() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchHistory, setSearchHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Dummy data for search suggestions
    const searchSuggestions = [
        "Laptop",
        "Textbook", 
        "Electronics"
    ];

    useEffect(() => {
        const loadHistory = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await getSearchHistory();
                if (res.res_code === 200) {
                    setSearchHistory((res.search_history || []).map(h => h.search_query));
                } else {
                    // If unauthorized, just show empty history
                    setSearchHistory([]);
                }
            } catch (e) {
                setSearchHistory([]);
            } finally {
                setLoading(false);
            }
        };
        loadHistory();
    }, []);

    const handleSearch = async (query) => {
        if (!query.trim()) return;

        try {
            // Save search history
            await saveSearchHistory(query.trim());
            
            // Navigate to search results
            navigate(`/search-result?q=${encodeURIComponent(query.trim())}`);
        } catch (e) {
            // Still navigate even if history save fails
            navigate(`/search-result?q=${encodeURIComponent(query.trim())}`);
        }
    };

    const handleHistoryClick = (historyItem) => {
        handleSearch(historyItem);
    };

    const handleSuggestionClick = (suggestion) => {
        handleSearch(suggestion);
    };

    const handleDeleteHistory = async (historyItem, index) => {
        try {
            // Get history ID from API response if available
            const res = await getSearchHistory();
            if (res.res_code === 200 && res.search_history) {
                const historyEntry = res.search_history.find(h => h.search_query === historyItem);
                if (historyEntry && historyEntry.id) {
                    await deleteSearchHistory(historyEntry.id);
                    setSearchHistory(prev => prev.filter((_, i) => i !== index));
                }
            }
        } catch (e) {
            console.error('Failed to delete history:', e);
        }
    };

    const handleClearAllHistory = async () => {
        try {
            const res = await clearAllSearchHistory();
            if (res.res_code === 200) {
                setSearchHistory([]);
            }
        } catch (e) {
            console.error('Failed to clear history:', e);
        }
    };

    const handleEnter = (e) => {
        if (e.key === 'Enter') {
            handleSearch(searchQuery);
        }
    };

    return (
        <div className="search-page-wrapper">
            <Navbar />
            <div className="search-page-container">
                {/* Search Input Field */}
                <div className="search-input-section">
                    <input 
                        type="text" 
                        className="search-main-input" 
                        placeholder="Input to search"
                        autoFocus
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={handleEnter}
                    />
                </div>
                
                {/* Search History */}
                <div className="search-history-section">
                    <div className="history-header">
                        <h3 className="history-title">History</h3>
                        {searchHistory.length > 0 && (
                            <button className="delete-all-btn" onClick={handleClearAllHistory}>
                                Delete All
                            </button>
                        )}
                    </div>
                    
                    {loading ? (
                        <div style={{ padding: 12, textAlign: 'center' }}>Loading...</div>
                    ) : (
                        <div className="history-list">
                            {searchHistory.length === 0 ? (
                                <div style={{ padding: 12, color: '#999' }}>No search history</div>
                            ) : (
                                searchHistory.map((item, index) => (
                                    <div 
                                        key={index} 
                                        className="history-item"
                                        onClick={() => handleHistoryClick(item)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <span className="history-text">{item}</span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteHistory(item, index);
                                            }}
                                            style={{ 
                                                background: 'none', 
                                                border: 'none', 
                                                color: '#999',
                                                cursor: 'pointer',
                                                marginLeft: 'auto'
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
                
                {/* Search Suggestions */}
                <div className="search-suggestions-section">
                    {searchSuggestions.map((suggestion, index) => (
                        <button 
                            key={index} 
                            className="suggestion-btn"
                            onClick={() => handleSuggestionClick(suggestion)}
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Search;