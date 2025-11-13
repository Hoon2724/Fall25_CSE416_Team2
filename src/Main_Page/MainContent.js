// src/Main_Page/MainContent.js
import { useEffect, useState } from "react";
import Navbar from "./Navbar.js";
import Market from "./Market_Page/Market.js";
import { supabase } from "../lib/supabaseClient";

function MainContent() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function fetchItems() {
      try {
        setLoading(true);
        setErrorMsg("");

        // 🔹 item_catalog 뷰에서 최신 상품 30개 가져오기
        const { data, error } = await supabase
          .from("item_catalog")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(30);

        if (error) throw error;
        setItems(data || []);
      } catch (err) {
        console.error(err);
        setErrorMsg(err.message || "Failed to load items");
      } finally {
        setLoading(false);
      }
    }

    fetchItems();
  }, []);

  return (
    <div className="mainContentCtn">
      <Navbar />
      {/* DB에서 불러온 목록 + 상태를 Market으로 전달 */}
      <Market items={items} loading={loading} errorMsg={errorMsg} />
    </div>
  );
}

export default MainContent;