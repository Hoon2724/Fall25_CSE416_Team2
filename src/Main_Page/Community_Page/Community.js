import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../Navbar.js'; // Use your existing Navbar component
import './Community.css';
import { getCommunities, getCommunityPosts } from '../../lib/api';

function Community() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedCommunityId, setSelectedCommunityId] = useState('all');
  const [communities, setCommunities] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCommunities = async () => {
      setLoadingCommunities(true);
      try {
        const res = await getCommunities();
        if (res.res_code === 200) {
          setCommunities(res.communities || []);
        } else {
          setError(res.res_msg || 'Failed to load communities');
        }
      } catch (e) {
        setError(e.message || 'Failed to load communities');
      } finally {
        setLoadingCommunities(false);
      }
    };

    loadCommunities();
  }, []);

  useEffect(() => {
    const loadPosts = async () => {
      setLoadingPosts(true);
      setError('');
      try {
        const res = await getCommunityPosts(selectedCommunityId === 'all' ? null : selectedCommunityId);
        if (res.res_code === 200) {
          setPosts(res.posts || []);
        } else {
          setError(res.res_msg || 'Failed to load posts');
          setPosts([]);
        }
      } catch (e) {
        setError(e.message || 'Failed to load posts');
        setPosts([]);
      } finally {
        setLoadingPosts(false);
      }
    };

    loadPosts();
  }, [selectedCommunityId, location.key, location.state?.refresh]);

  const changeCommunity = (communityId) => {
    setSelectedCommunityId(communityId);
  };

  const renderPostPreview = (content) => {
    if (!content) return '';
    const trimmed = content.replace(/\n+/g, ' ').trim();
    return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
  };

  return (
    <>
      {/* Global Navbar (shared across all main pages) */}
      <Navbar />

      <div className="community-container">
        {/* Sidebar for community list */}
        <aside className="community-sidebar">
          <div
            className={`sidebar-home ${selectedCommunityId === 'all' ? 'active' : ''}`}
            onClick={() => changeCommunity('all')}
          >
            Home
          </div>
          <div className="sidebar-title">Community List</div>
          {loadingCommunities && <div className="sidebar-loading">Loading...</div>}
          {!loadingCommunities && communities.map((community) => (
            <button
              key={community.id}
              className={`sidebar-btn ${selectedCommunityId === community.id ? 'active' : ''}`}
              onClick={() => changeCommunity(community.id)}
            >
              {community.name}
            </button>
          ))}

          <button
            className="sidebar-create"
            onClick={() => navigate('/community/create')}
          >
            ＋ Create
          </button>
        </aside>

        {/* Main content area with post cards */}
        <main className="community-main">
          <div className="postButton">
            <div className="postBtn" onClick={() => navigate(`./post/create`)}>
                <div>Upload post</div>
            </div>
          </div>
          {loadingPosts && <div className="community-loading">Loading posts...</div>}
          {!loadingPosts && error && <div className="community-error">{error}</div>}
          {!loadingPosts && !error && posts.length === 0 && (
            <div className="community-empty">No posts yet. Be the first to share something!</div>
          )}
          {!loadingPosts && !error && posts.map((p) => (
            <div
              className="communityPost"
              key={p.id}
              onClick={() => navigate(`/community/post/${p.id}`)}
            >
              <div>
                <div className="commPostTitle">{p.title}</div>
                <div className="commPostPreview">{renderPostPreview(p.content)}</div>
              </div>

              <div className="commPostMeta">
                {p.media && p.media.length > 0 && p.media[0].media_type === 'image' && (
                  <img src={p.media[0].media_url} alt="thumb" className="commPostImg" />
                )}
                <div>
                  {(p.community && p.community.name) || 'Community'} · {(p.author && p.author.display_name) || 'Unknown'}
                  <br />
                  {new Date(p.created_at).toLocaleString()}
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
