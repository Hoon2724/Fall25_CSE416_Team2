// src/pages/Community_Page/PostCreate.js
import React, { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './PostCreate.css';
import logo from '../../Welcome_Page/logo.png';

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function PostCreate() {
  const nav = useNavigate();
  const [title, setTitle] = useState('');
  const [community, setCommunity] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]); // File[]
  const [video, setVideo] = useState(null); // File | null
  const imgInput = useRef(null);
  const vidInput = useRef(null);

  const contentWords = useMemo(() => wordCount(content), [content]);
  const contentOK = contentWords <= 50;
  const mediaOK = (video && images.length === 0) || (!video && images.length <= 4);
  const valid = title.trim() && community.trim() && contentOK && mediaOK;

  const onPickImages = (e) => {
    const files = Array.from(e.target.files || []);
    if (video) { alert('이미 동영상을 선택했습니다. 사진 대신/또는 동영상 하나만 올릴 수 있어요.'); return; }
    const next = [...images, ...files].slice(0, 4);
    setImages(next);
  };

  const onPickVideo = (e) => {
    const file = (e.target.files || [])[0];
    if (!file) return;
    if (images.length > 0) { alert('사진을 이미 추가했습니다. 동영상은 사진 없이 1개만 가능합니다.'); return; }
    setVideo(file);
  };

  const clearMedia = () => { setImages([]); setVideo(null); if (imgInput.current) imgInput.current.value=''; if (vidInput.current) vidInput.current.value=''; };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!valid) return;
    // TODO: API 연결(FormData 업로드)
    alert('Post created (mock)!');
    nav('/community');
  };

  return (
    <div className="pc-wrap">
      <header className="pc-topbar">
        <Link to="/home"><img src={logo} alt="logo" className="pc-logo" /></Link>
        <div className="pc-top-title">Community</div>
      </header>

      <div className="pc-title">New Post</div>

      <form className="pc-form" onSubmit={onSubmit}>
        <label className="pc-label">Title</label>
        <input className="pc-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />

        <label className="pc-label">Community</label>
        <select className="pc-input" value={community} onChange={(e) => setCommunity(e.target.value)}>
          <option value="">Select a community</option>
          <option>CSE Lounge</option>
          <option>League of Legend</option>
          <option>Singer</option>
          <option>Triple Street</option>
          <option>Playboys</option>
        </select>

        <label className="pc-label">Content (max 50 words)</label>
        <textarea className="pc-textarea" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write something..." />
        <div className={`pc-helper ${!contentOK ? 'over' : ''}`}>{contentWords}/50 words</div>

        <div className="pc-media">
          <div className="pc-media-title">Media (max 4 photos or 1 video)</div>

          <div className="pc-media-grid">
            <div className="pc-media-block">
              <button type="button" className="pc-plus" onClick={() => imgInput.current?.click()} disabled={!!video || images.length >= 4}>＋</button>
              <div className="pc-media-caption">Press to add photos</div>
              <input ref={imgInput} type="file" accept="image/*" multiple hidden onChange={onPickImages} />
            </div>

            <div className="pc-media-block">
              <button type="button" className="pc-plus" onClick={() => vidInput.current?.click()} disabled={images.length > 0 || !!video}>＋</button>
              <div className="pc-media-caption">Press to add a video</div>
              <input ref={vidInput} type="file" accept="video/*" hidden onChange={onPickVideo} />
            </div>
          </div>

          <div className="pc-preview">
            {images.map((f, i) => (
              <img key={i} className="pc-thumb" src={URL.createObjectURL(f)} alt={`p${i}`} />
            ))}
            {video && <div className="pc-video-name">🎬 {video.name}</div>}
            {(images.length > 0 || video) && <button type="button" className="pc-clear" onClick={clearMedia}>Clear media</button>}
          </div>
        </div>

        <button type="submit" className="pc-submit" disabled={!valid}>Click to post</button>
      </form>
    </div>
  );
}
