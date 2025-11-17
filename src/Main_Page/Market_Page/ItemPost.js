import { useState } from "react";
import Navbar from "../Navbar.js";
import "./ItemPost.css";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

function ItemPost() {
  const [imageUrls, setImageUrls] = useState([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  /** 🔸 파일 이름을 Supabase key용으로 안전하게 변환 (한글/특수문자 → _) */
  function sanitizeFileName(name) {
    return (name || "image")
      .normalize("NFKD")        // 유니코드 분해
      .replace(/[^\w.-]+/g, "_"); // 영문/숫자/언더바/점/하이픈만 남기기
  }

  /** 🔸 jfif → jpeg 변환 */
  async function toJpegBlob(file) {
    const dataUrl = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });

    const img = await new Promise((res, rej) => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = rej;
      el.src = dataUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const blob = await new Promise((res) =>
      canvas.toBlob(res, "image/jpeg", 0.92)
    );

    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    const safeBase = sanitizeFileName(baseName);
    const newName = safeBase + ".jpg";

    return new File([blob], newName, { type: "image/jpeg" });
  }

  /** 🔸 Supabase Storage 업로드 후 공개 URL 반환 */
  async function uploadAndGetPublicUrl(file) {
    const userId = "guest";

    // 파일 이름 sanitize
    const safeName = sanitizeFileName(file.name || "image.jpg");
    const path = `user-${userId}/${Date.now()}-${safeName}`;

    const ext = file.name.split(".").pop()?.toLowerCase();
    let contentType = file.type || "application/octet-stream";
    if (ext === "jfif" || contentType === "" || contentType === "image/pjpeg") {
      contentType = "image/jpeg";
    }

    const { data, error } = await supabase.storage
      .from("items")
      .upload(path, file, { upsert: true, contentType });

    if (error) {
      console.error("[upload error]", error);
      throw new Error(error.message || "Upload failed");
    }

    const { data: pub } = supabase.storage
      .from("items")
      .getPublicUrl(data.path);
    console.log("[upload ok]", pub?.publicUrl);
    return pub.publicUrl;
  }

  /** 🔸 classify-image Edge Function 호출 */
  async function classifyImage(imageUrl) {
    const { data, error } = await supabase.functions.invoke("classify-image", {
      body: { imageUrl },
    });
    if (error) throw error;
    return data;
  }

  /** 🔸 파일 선택 시 */
  async function onSelectFiles(e) {
    const picked = Array.from(e.target.files || []).slice(0, 10);
    if (!picked.length) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const urls = [];
      for (let f of picked) {
        const ext = f.name.split(".").pop()?.toLowerCase();
        if (ext === "jfif" || f.type === "" || f.type === "image/pjpeg") {
          f = await toJpegBlob(f);
        }
        const u = await uploadAndGetPublicUrl(f);
        urls.push(u);
      }
      setImageUrls(urls);

      // 대표 이미지 한 장으로 자동 분류
      try {
        const res = await classifyImage(urls[0]);
        setCategory(res?.category || "");
        setTags((res?.hashtags || []).map((h) => h.replace(/^#/, "")));
      } catch (err) {
        console.warn("classify failed", err);
        setErrorMsg("Image classify failed (upload succeeded).");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Upload failed");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  /** 🔸 게시물 등록 */
  async function onPost() {
    setLoading(true);
    setErrorMsg("");
    try {
      if (!title.trim()) throw new Error("Title is required.");

      const cleanPrice =
        price && String(price).trim() !== ""
          ? Number(String(price).replace(/[^0-9.]/g, ""))
          : null;

      const { data: itemRow, error: itemErr } = await supabase
        .from("items")
        .insert({
          title: title.trim(),
          description: desc?.trim() || null,
          category: category?.trim() || null,
          price: cleanPrice,
        })
        .select("id")
        .single();
      if (itemErr) throw itemErr;

      const itemId = itemRow.id;

      // 이미지 저장
      if (imageUrls.length) {
        const rows = imageUrls.map((url, i) => ({
          item_id: itemId,
          url,
          sort_order: i,
        }));
        const { error: imgErr } = await supabase
          .from("item_images")
          .insert(rows);
        if (imgErr) throw imgErr;
      }

      // 태그 저장
      if (tags.length) {
        const rows = tags.map((t) => ({
          item_id: itemId,
          tag: t.replace(/^#/, ""),
        }));
        const { error: tagErr } = await supabase
          .from("item_tags")
          .insert(rows);
        if (tagErr) throw tagErr;
      }

      // ✅ 태그 저장 이후 Embedding 생성
      await supabase.functions.invoke("item-embed", {
        body: {
          item_id: itemId,
          title,
          description: desc,
          tags,
        },
      });

      alert("Successful posting!");
      setTitle("");
      setDesc("");
      setPrice("");
      setCategory("");
      setTags([]);
      setImageUrls([]);
      navigate(`../home`);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Error on posting item");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="item-creation-wrapper">
      <Navbar />
      <div className="item-creation-container">
        <div className="item-creation-content">
          {/* 이미지 업로드 */}
          <div className="image-upload-section">
            <label className="image-upload-area">
              <input
                type="file"
                accept="image/*,.jfif,.jpg,.jpeg,.png"
                multiple
                hidden
                onChange={onSelectFiles}
              />
              <div className="upload-icon">+</div>
              <p className="upload-text">Select to insert images (up to 10)</p>
            </label>
            {imageUrls.length > 0 && (
              <div className="preview-grid">
                {imageUrls.map((u) => (
                  <img key={u} src={u} className="preview-thumb" alt="preview" />
                ))}
              </div>
            )}
          </div>

          {/* 입력 폼 */}
          <div className="form-section">
            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter item title"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Enter description"
                rows="4"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Price</label>
              <input
                className="form-input"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Enter price (e.g., 40000)"
              />
            </div>

            {/* 항상 수정 가능한 Category */}
            <div className="form-group">
              <label className="form-label">Category (auto, editable)</label>
              <input
                type="text"
                className="form-input"
                placeholder="auto category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            {/* 항상 수정 가능한 Tags */}
            <div className="form-group">
              <label className="form-label">
                Tags (auto, comma separated)
              </label>
              <input
                className="form-input"
                value={tags.join(", ")}
                onChange={(e) =>
                  setTags(
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
                placeholder="tag1, tag2"
              />
            </div>

            {/* 등록 버튼 */}
            <div className="post-section">
              <button
                className="post-button"
                onClick={onPost}
                disabled={loading}
              >
                {loading ? "Processing..." : "Click to post"}
              </button>
              {errorMsg && <p className="error-text">{errorMsg}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ItemPost;
