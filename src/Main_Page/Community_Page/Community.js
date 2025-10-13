import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../Navbar.js'; // Use your existing Navbar component
import './Community.css';

function Community() {
  const navigate = useNavigate();

  // Example post data (can be replaced with API data)
  const posts = [
    {
      id: 1,
      title: 'Someone help me with this assignment?',
      preview: 'I’m currently doing CSE300...',
      author: 'Jane Doe',
      community: 'CSE Lounge',
      time: '09.15.2025 17:31',
    },
    {
      id: 2,
      title: 'Anyone playing League right now?',
      preview: 'Finished my assignment just before and...',
      author: 'Sophia Kim',
      community: 'League of Legend',
      time: '09.15.2025 03:31',
    },
    {
      id: 3,
      title: 'I’m so burnt out...',
      preview: 'Mid-semester, my grades are...',
      author: 'Bongpal Park',
      community: 'CSE Lounge',
      time: '09.14.2025 22:19',
      img: 'https://placekitten.com/200/200',
    },
  ];

  return (
    <>
      {/* Global Navbar (shared across all main pages) */}
      <Navbar />

      <div className="community-container">
        {/* Sidebar for community list */}
        <aside className="community-sidebar">
          <div className="sidebar-home">Home</div>
          <div className="sidebar-title">Community List</div>
          <button className="sidebar-btn active">CSE Lounge</button>
          <button className="sidebar-btn">League of Legend</button>
          <button className="sidebar-btn">Singer</button>
          <button className="sidebar-btn">Triple Street</button>
          <button className="sidebar-btn">Playboys</button>

          <button
            className="sidebar-create"
            onClick={() => navigate('/community/create')}
          >
            ＋ Create
          </button>
        </aside>

        {/* Main content area with post cards */}
        <main className="community-main">
          {posts.map((p) => (
            <div
              className="post-card"
              key={p.id}
              onClick={() => navigate(`/community/post/${p.id}`)}
            >
              <div>
                <div className="post-title">{p.title}</div>
                <div className="post-preview">{p.preview}</div>
              </div>

              <div className="post-meta">
                {p.img && <img src={p.img} alt="thumb" className="post-img" />}
                <div>
                  {p.community} · {p.author}
                  <br />
                  {p.time}
                </div>
              </div>
            </div>
          ))}
        </main>
      </div>
    </>
  );
}

export default Community;
