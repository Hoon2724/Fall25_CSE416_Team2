// src/Main_Page/MainContent.js
import { useEffect, useState } from "react";
import Navbar from "./Navbar.js";
import Market from "./Market_Page/Market.js";
import { getLatestItems } from "../lib/api";

function MainContent() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        setErrorMsg("");
        const res = await getLatestItems(30);
        if (res.res_code === 200) {
          setItems(res.items || []);
        } else {
          setItems([]);
          setErrorMsg(res.res_msg || "Failed to load items");
        }
      } catch (err) {
        console.error(err);
        setErrorMsg(err.message || "Failed to load items");
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

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