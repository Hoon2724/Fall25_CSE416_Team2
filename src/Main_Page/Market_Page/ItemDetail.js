import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import Navbar from "../Navbar";
import "./ItemDetail.css";

function ItemDetail() {
  const { id } = useParams(); // URL에서 아이템 ID 가져오기
  const [item, setItem] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate(); // ✅ 페이지 이동용

  useEffect(() => {
    async function fetchItemAndSimilar() {
      try {
        setLoading(true);
        setErrorMsg("");

        // 1️⃣ 아이템 기본 정보 가져오기
        const { data: itemData, error: itemErr } = await supabase
          .from("item_catalog")
          .select("*")
          .eq("id", id)
          .single();

        if (itemErr) throw itemErr;
        setItem(itemData);

        // 2️⃣ 유사 상품 추천 (RPC 호출)
        const { data: simData, error: simErr } = await supabase.rpc(
          "search_similar_to_item_by_id",
          { self_id: id, k: 6 }
        );
        if (simErr) throw simErr;
        setSimilar(simData || []);
      } catch (err) {
        console.error(err);
        setErrorMsg(err.message || "Error loading item details");
      } finally {
        setLoading(false);
      }
    }

    fetchItemAndSimilar();
  }, [id]);

  if (loading) return <p className="loading">Loading...</p>;
  if (errorMsg) return <p className="error">{errorMsg}</p>;
  if (!item) return <p>Item not found.</p>;

  return (
    <div className="item-detail-wrapper">
      <Navbar />
      <div className="item-detail-container">
        <div className="item-detail-content">

          {/* ✅ 상품 상세 */}
          <div className="item-main">
            <h2>{item.title}</h2>
            <img
              src={item.image_url || "https://placehold.co/400x300"}
              alt={item.title}
              className="item-main-image"
            />
            <p className="item-desc">{item.description}</p>
            <p><b>Category:</b> {item.category || "N/A"}</p>
            <p><b>Price:</b> {item.price ? `${item.price}₩` : "N/A"}</p>
            <p><b>Tags:</b> {item.tags?.join(", ") || "N/A"}</p>
          </div>

          {/* ✅ 비슷한 상품 추천 */}
          <div className="similar-section">
            <h3>🧠 Similar Items</h3>
            <div className="similar-grid">
              {similar.length === 0 && <p>No similar items found.</p>}
              {similar.map((sim) => (
                <div
                  key={sim.id}
                  className="similar-card"
                  onClick={() => navigate(`/item/${sim.id}`)} // ✅ 클릭 시 이동
                  style={{ cursor: "pointer" }}
                >
                  <img
                    src={sim.image_url || "https://placehold.co/200x150"}
                    alt={sim.title}
                    className="similar-img"
                  />
                  <div className="similar-info">
                    <p className="similar-title">{sim.title}</p>
                    <p className="similar-price">
                      {sim.price ? `${sim.price}₩` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default ItemDetail;
