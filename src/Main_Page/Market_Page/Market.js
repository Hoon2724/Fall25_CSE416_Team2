// src/Main_Page/Market_Page/Market.js
import { useNavigate } from "react-router-dom";
import "./Market.css";

function Market({ items = [], loading, errorMsg }) {
  const navigate = useNavigate();

  if (loading) {
    return <div className="market-container">Loading items...</div>;
  }

  if (errorMsg) {
    return <div className="market-container error-text">{errorMsg}</div>;
  }

  if (!items.length) {
    return <div className="market-container">No items yet.</div>;
  }

  return (
    <div className="market-container">
      <h2 className="market-title">Latest Items</h2>
      <div className="itemUploadButton d-flex justify-content-center align-items-center">
        <div className="itemUploadBtn d-flex justify-content-center align-items-center" onClick={() => navigate(`/item-post`)}>
            <div className="post-text">List your item</div>
        </div>
      </div>
      <div className="market-items">
        {items.map((item) => (
          <div
            key={item.id}
            className="market-item"
            onClick={() => navigate(`/item/${item.id}`)} // ✅ 상세 페이지로 이동
            style={{ cursor: "pointer" }}
          >
            <div className="market-image-wrapper">
              <img
                src={
                  item.image_url ||
                  "https://placehold.co/300x200?text=No+Image"
                }
                alt={item.title}
                className="market-image"
              />
            </div>

            <div className="item-info">
              <div className="item-name">{item.title}</div>
              <div className="item-price">
                {item.price != null ? `${item.price}₩` : ""}
              </div>
              <div className="market-item-meta">
                <span className="market-item-category">
                  {item.category || "etc"}
                </span>
                {item.tags && item.tags.length > 0 && (
                  <div className="market-tags">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="market-tag-chip">
                        #{tag + " "}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="item-seller">
                Seller:{" "}
                {item.seller_display_name ||
                  item.seller?.display_name ||
                  item.seller_name ||
                  "Unknown seller"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Market;