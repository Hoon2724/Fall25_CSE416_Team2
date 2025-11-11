import Navbar from '../Navbar.js';
import './Search.css';

function Search() {
    // Dummy data for search history
    const searchHistory = [
        "CSE416",
        "refridgerator", 
        "Toilet paper",
        "POL102",
        "phy131"
    ];

    // Dummy data for search suggestions
    const searchSuggestions = [
        "Laptop",
        "Textbook", 
        "Electronics"
    ];

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
                    />
                </div>
                
                {/* Search History */}
                <div className="search-history-section">
                    <div className="history-header">
                        <h3 className="history-title">History</h3>
                        <button className="delete-all-btn">Delete All</button>
                    </div>
                    
                    <div className="history-list">
                        {searchHistory.map((item, index) => (
                            <div key={index} className="history-item">
                                <span className="history-text">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Search Suggestions */}
                <div className="search-suggestions-section">
                    {searchSuggestions.map((suggestion, index) => (
                        <button key={index} className="suggestion-btn">
                            {suggestion}
                        </button>
                    ))}
                </div>
                
                {/* Mobile Keyboard (only visible on mobile) */}
                <div className="mobile-keyboard">
                    <div className="keyboard-row">
                        <button className="key-btn">Q</button>
                        <button className="key-btn">W</button>
                        <button className="key-btn">E</button>
                        <button className="key-btn">R</button>
                        <button className="key-btn">T</button>
                        <button className="key-btn">Y</button>
                        <button className="key-btn">U</button>
                        <button className="key-btn">I</button>
                        <button className="key-btn">O</button>
                        <button className="key-btn">P</button>
                    </div>
                    <div className="keyboard-row">
                        <button className="key-btn">A</button>
                        <button className="key-btn">S</button>
                        <button className="key-btn">D</button>
                        <button className="key-btn">F</button>
                        <button className="key-btn">G</button>
                        <button className="key-btn">H</button>
                        <button className="key-btn">J</button>
                        <button className="key-btn">K</button>
                        <button className="key-btn">L</button>
                    </div>
                    <div className="keyboard-row">
                        <button className="key-btn">Z</button>
                        <button className="key-btn">X</button>
                        <button className="key-btn">C</button>
                        <button className="key-btn">V</button>
                        <button className="key-btn">B</button>
                        <button className="key-btn">N</button>
                        <button className="key-btn">M</button>
                    </div>
                    <div className="keyboard-bottom-row">
                        <button className="key-btn special-key">123</button>
                        <button className="key-btn special-key"><i className="bi bi-globe"></i></button>
                        <button className="key-btn space-key">space</button>
                        <button className="key-btn special-key">Go</button>
                        <button className="key-btn special-key"><i className="bi bi-mic"></i></button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Search;