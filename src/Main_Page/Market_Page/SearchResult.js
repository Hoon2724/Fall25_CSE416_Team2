import Navbar from '../Navbar.js';
import './SearchResult.css';

function SearchResult() {
    // Dummy data for search results (Laptop search)
    const searchResults = [
        {
            id: 1,
            name: "Laptop Stand 13 inch.",
            price: "40,000 won",
            seller: "Jane Doe",
            image: "https://via.placeholder.com/100x100/cccccc/666666?text=Laptop+Stand"
        },
        {
            id: 2,
            name: "Macbook Air 2024",
            price: "199,000 won",
            seller: "Gildong Hong",
            image: "https://via.placeholder.com/100x100/cccccc/666666?text=Macbook"
        }
    ];

    return (
        <div className="search-result-container">
            <Navbar />
            <div className="search-result-content">
                <div className="search-header">
                    <h1 className="search-title">Search Input: Laptop</h1>
                </div>
                
                <div className="divider-line"></div>
                
                <div className="search-results">
                    {searchResults.map(item => (
                        <div key={item.id} className="search-result-item">
                            <div className="result-item-image">
                                <img src={item.image} alt={item.name} />
                            </div>
                            <div className="result-item-info">
                                <h3 className="result-item-name">{item.name}</h3>
                                <p className="result-item-price">{item.price}</p>
                                <p className="result-item-seller">{item.seller}</p>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="post-button">
                    <button className="post-btn">
                        <span className="post-icon">+</span>
                        <span className="post-text">Post</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SearchResult;
