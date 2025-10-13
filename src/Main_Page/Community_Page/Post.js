// src/pages/Community_Page/Post.js
import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import './Post.css';
import logo from '../../Welcome_Page/logo.png';

const MOCK = {
  id: 3,
  title: "I’m so burnt out...",
  community: "CSE Lounge",
  author: "Bongpal Park",
  time: "09.14.2025 22:19",
  image: "https://placekitten.com/320/320",
  body: `Mid-semester, my grades are far below the average.

My motivations are just gone... What should I do..?`,
  comments: [{ id: 1, text: "There are still time! Don’t give up!", author: "Sophia Kim", time: "09.15.2025 00:13" }],
};

export default function Post() {
  const { id } = useParams(); // 실제로는 id로 fetch
  const nav = useNavigate();
  const [comments, setComments] = useState(MOCK.comments);
  const [text, setText] = useState('');

  const addComment = () => {
    if (!text.trim()) return;
    const item = { id: Date.now(), text, author: 'You', time: new Date().toLocaleString() };
    setComments((v) => [item, ...v]);
    setText('');
  };

  return (
    <div className="post-grid">
      <header className="post-topbar">
        <Link to="/home"><img src={logo} alt="logo" className="post-logo" /></Link>
        <div className="post-top-title">Community</div>
      </header>

      <aside className="post-sidebar">
        <div className="post-pill active">CSE Lounge</div>
        <button className="post-pill" onClick={() => nav('/community')}>← Back to list</button>
      </aside>

      <main className="post-main">
        <div className="post-header">
          <div>
            <div className="post-title">{MOCK.title}</div>
            <div className="post-author">{MOCK.author}</div>
          </div>
          <div className="post-meta-right">
            {MOCK.community}<br />{MOCK.time}
          </div>
        </div>

        <img src={MOCK.image} alt="" className="post-image" />

        <div className="post-body">
          {MOCK.body.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>

        <div className="comment-box">
          <input
            className="comment-input"
            placeholder="Comment"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="comment-btn" onClick={addComment}>Post</button>
        </div>

        {comments.map((c) => (
          <div className="comment-item" key={c.id}>
            <div>{c.text}</div>
            <div className="comment-meta">{c.author}<br />{c.time}</div>
          </div>
        ))}
      </main>
    </div>
  );
}
