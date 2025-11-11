import Navbar from '../Navbar.js';
import './Item.css';

function Item() {
    // Dummy data for item description
    const itemData = {
        id: 1,
        name: "Laptop Stand 13 inch.",
        price: "40,000 won",
        seller: "Jane Doe",
        reputation: "100/100",
        description: "A laptop stand for 13 inch. laptop. It can be used for those smaller than 13 inch. and tablets.",
        condition: "I just opened it from the box, so the condition is near perfect.",
        image: "https://via.placeholder.com/300x300/cccccc/666666?text=Laptop+Stand"
    };

    return (
        <div className="item-page-wrapper">
            <Navbar />
            <div className="item-description-container">
                {/* Image Section */}
                <div className="item-image-section">
                    <img src={itemData.image} alt={itemData.name} className="item-main-image" />
                </div>
                
                {/* Main Content Grid */}
                <div className="item-content-grid">
                    {/* Left Side: Title, Description, Condition */}
                    <div className="item-details-section">
                        <h1 className="item-title">{itemData.name}</h1>
                        <p className="item-description">{itemData.description}</p>
                        <p className="item-condition">{itemData.condition}</p>
                    </div>
                    
                    {/* Right Side: Price/Seller Info + Buttons */}
                    <div className="item-right-section">
                        <div className="item-price-seller-box">
                            <div className="item-price">{itemData.price}</div>
                            <div className="item-seller">{itemData.seller}</div>
                            <div className="item-reputation">Reputation: {itemData.reputation}</div>
                        </div>
                        
                        <div className="item-actions">
                            <button className="favorite-btn">
                                <span className="favorite-icon"><i className="bi bi-heart"></i></span>
                                <span className="favorite-text">Favorite</span>
                            </button>
                            <button className="chat-btn">
                                <span className="chat-icon"><i className="bi bi-chat-dots"></i></span>
                                <span className="chat-text">Click to chat with the seller</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Item;
