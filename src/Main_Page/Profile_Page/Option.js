import './Option.css';
import Navbar from '../Navbar.js';

function Option() {
    //example marketItem Data
    const marketItems = [
        {
            id: 1,
            name: "Laptop Stand 13 inch.",
            price: "40,000 won",
            seller: "Jane Doe",
            image: "https://via.placeholder.com/100x100/cccccc/666666?text=Laptop+Stand"
        },
        {
            id: 2,
            name: "CSE300 Textbook",
            price: "70,000 won",
            seller: "Sophia Kim",
            image: "https://via.placeholder.com/100x100/cccccc/666666?text=CSE300"
        }
    ];

    return (
        <div>
            <Navbar />
            <div className="optionTitleCtn">
                <div className="optionTitle">Post History</div>
            </div>
            <div className="market-items">
                {marketItems.map(item => (
                    <div key={item.id} className="market-item">
                        <div className="item-image">
                            <img src={item.image} alt={item.name} />
                        </div>
                        <div className="item-info">
                            <h3 className="item-name">{item.name}</h3>
                            <p className="item-price">{item.price}</p>
                            <p className="item-seller">{item.seller}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default Option;