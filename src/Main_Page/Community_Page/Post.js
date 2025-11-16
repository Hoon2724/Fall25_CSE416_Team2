// src/pages/Community_Page/Post.js
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import './Post.css';
import Navbar from '../Navbar.js';
import logo from '../../Welcome_Page/logo.png';
import { getPostDetails, updatePost, deletePost } from '../../lib/api/posts';
import { createComment } from '../../lib/api/comments';
import { getCommunityPosts } from '../../lib/api/communities';
import { getPostVotes, voteOnPost } from '../../lib/api/votes';
import { createChatFromPostAuthor } from '../../lib/api/chat';
import { supabase } from '../../lib/supabaseClient';

export default function Post() {
  const { id } = useParams(); // 실제로는 id로 fetch
  const nav = useNavigate();
  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [votes, setVotes] = useState({ upvotes: 0, downvotes: 0 });
  const [userVote, setUserVote] = useState(null);
  const [voteLoading, setVoteLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [contactingAuthor, setContactingAuthor] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const loadVotes = async (postId) => {
      try {
        const voteRes = await getPostVotes(postId);
        if (voteRes.res_code === 200 && voteRes.votes) {
          setVotes({
            upvotes: voteRes.votes.upvotes ?? 0,
            downvotes: voteRes.votes.downvotes ?? 0
          });
          setUserVote(voteRes.votes.user_vote);
        } else if (voteRes.res_code === 401) {
          setVotes({ upvotes: 0, downvotes: 0 });
          setUserVote(null);
        }
      } catch (voteErr) {
        console.warn('[Post] Failed to load votes', voteErr);
      }
    };

    const loadPost = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getPostDetails(id);
        if (res.res_code === 200) {
          setPost(res.post);
          setEditTitle(res.post.title || '');
          setEditContent(res.post.content || '');
          setComments(res.post.comments || []);
          // Load recent posts from same community for sidebar navigation
          if (res.post.community?.id) {
            const related = await getCommunityPosts(res.post.community.id, { limit: 5 });
            if (related.res_code === 200) {
              setRelatedPosts((related.posts || []).filter((p) => p.id !== res.post.id));
            }
          }
          await loadVotes(res.post.id);
        } else {
          setError(res.res_msg || 'Failed to load post');
        }
      } catch (e) {
        setError(e.message || 'Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadPost();
    }
  }, [id]);

  useEffect(() => {
    const loadCurrentUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error) {
        setCurrentUserId(data?.user?.id || null);
      }
    };
    loadCurrentUser();
  }, []);

  const handleVote = async (voteType) => {
    if (!post || voteLoading) return;
    setVoteLoading(true);
    try {
      const res = await voteOnPost(post.id, { vote_type: voteType });
      if (res.res_code === 200) {
        const voteRes = await getPostVotes(post.id);
        if (voteRes.res_code === 200 && voteRes.votes) {
          setVotes({
            upvotes: voteRes.votes.upvotes ?? 0,
            downvotes: voteRes.votes.downvotes ?? 0
          });
          setUserVote(voteRes.votes.user_vote);
        }
      } else {
        alert(res.res_msg || 'Failed to cast vote');
      }
    } catch (e) {
      alert(e.message || 'Failed to cast vote');
    } finally {
      setVoteLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!post || !text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await createComment(post.id, { content: text.trim() });
      if (res.res_code === 200) {
        const newComment = {
          id: res.data.id,
          content: res.data.content,
          author: { display_name: res.data.author_display_name || 'You' },
          created_at: res.data.created_at
        };
        setComments((prev) => [newComment, ...prev]);
        setText('');
      } else {
        alert(res.res_msg || 'Failed to add comment');
      }
    } catch (e) {
      alert(e.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = () => {
    if (!post) return;
    setEditTitle(post.title || '');
    setEditContent(post.content || '');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (!post) return;
    setEditTitle(post.title || '');
    setEditContent(post.content || '');
    setIsEditing(false);
  };

  const saveEdit = async () => {
    if (!post || savingEdit) return;
    const trimmedTitle = editTitle.trim();
    const trimmedContent = editContent.trim();
    if (!trimmedTitle) {
      alert('Title is required.');
      return;
    }
    setSavingEdit(true);
    try {
      const res = await updatePost(post.id, {
        title: trimmedTitle,
        content: trimmedContent
      });
      if (res.res_code === 200 && res.post) {
        setPost((prev) => prev ? { ...prev, title: trimmedTitle, content: trimmedContent } : prev);
        setIsEditing(false);
      } else {
        alert(res.res_msg || 'Failed to update post');
      }
    } catch (e) {
      alert(e.message || 'Failed to update post');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!post) return;
    const confirmed = window.confirm('Delete this post? This action cannot be undone.');
    if (!confirmed) return;
    try {
      const res = await deletePost(post.id);
      if (res.res_code === 200) {
        alert('Post deleted.');
        nav('/community', { replace: true, state: { refresh: Date.now() } });
      } else {
        alert(res.res_msg || 'Failed to delete post');
      }
    } catch (e) {
      alert(e.message || 'Failed to delete post');
    }
  };

  const handleContactAuthor = async () => {
    if (!post || contactingAuthor) return;
    setContactingAuthor(true);
    try {
      const res = await createChatFromPostAuthor(post.id);
      console.info('[Post] createChatFromPostAuthor response', res);
      if (res.res_code === 201 || res.res_code === 409) {
        const roomId = res.chat_room?.id;
        if (!roomId) {
          console.error('[Post] Chat room response missing id', res);
          alert('Failed to locate chat room after creation.');
          return;
        }
        nav('/chat', { state: { chatRoomId: roomId } });
      } else if (res.res_code === 401) {
        alert('Please sign in to contact the author.');
      } else {
        alert(res.res_msg || 'Failed to contact author.');
      }
    } catch (error) {
      console.error('[Post] createChatFromPostAuthor error', error);
      alert(error.message || 'Failed to contact author.');
    } finally {
      setContactingAuthor(false);
    }
  };

  const formattedDate = (value) => {
    try {
      return new Date(value).toLocaleString();
    } catch (e) {
      return value;
    }
  };

  return (
    <>
    <Navbar />
    <div className="post-grid">

      <aside className="post-sidebar col">
        <div className="post-pill active">{post?.community?.name || 'Community'}</div>
        <button className="post-pill" onClick={() => nav('/community')}>← Back to list</button>
        {relatedPosts.map((p) => (
          <button
            key={p.id}
            className="post-pill"
            onClick={() => nav(`/community/post/${p.id}`)}
          >
            {p.title}
          </button>
        ))}
      </aside>

      <main className="post-main col">
        {loading && <div className="post-loading">Loading post...</div>}
        {!loading && error && <div className="post-error">{error}</div>}
        {!loading && !error && post && (
          <>
            <div className="post-header">
              <div>
                <div className="post-title">{post.title}</div>
                <div className="post-author">{post.author?.display_name || 'Unknown author'}</div>
              </div>
              <div className="post-meta-right">
                <div className="post-header-actions">
                  {post.author?.id && post.author.id !== currentUserId && (
                    <button
                      className="post-contact-btn"
                      onClick={handleContactAuthor}
                      disabled={contactingAuthor}
                    >
                      {contactingAuthor ? 'Starting chat...' : 'Contact'}
                    </button>
                  )}
                  <button className="post-edit-btn" onClick={startEditing}>
                    Edit
                  </button>
                  <button className="post-delete-btn" onClick={handleDelete}>
                    Delete
                  </button>
                </div>
                {post.community?.name || 'Community'}<br />{formattedDate(post.created_at)}
              </div>
            </div>

            <div className="post-vote-bar">
              <button
                className={`post-vote-btn ${userVote === 'upvote' ? 'active' : ''}`}
                onClick={() => handleVote('upvote')}
                disabled={voteLoading}
              >
                ▲ {votes.upvotes}
              </button>
              <button
                className={`post-vote-btn ${userVote === 'downvote' ? 'active' : ''}`}
                onClick={() => handleVote('downvote')}
                disabled={voteLoading}
              >
                ▼ {votes.downvotes}
              </button>
            </div>

            {post.media && post.media.length > 0 && post.media[0].media_type === 'image' && (
              <img src={post.media[0].media_url} alt="" className="post-image" />
            )}

            {isEditing ? (
              <div className="post-edit-form">
                <input
                  className="post-edit-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Title"
                  maxLength={200}
                />
                <textarea
                  className="post-edit-textarea"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Content"
                  rows={6}
                />
                <div className="post-edit-actions">
                  <button className="post-save-btn" onClick={saveEdit} disabled={savingEdit}>
                    {savingEdit ? 'Saving...' : 'Save'}
                  </button>
                  <button className="post-cancel-btn" onClick={cancelEditing} disabled={savingEdit}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="post-body">
                {post.content?.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            )}

            <div className="comment-box">
              <input
                className="comment-input"
                placeholder="Write a comment"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={submitting}
              />
              <button className="comment-btn" onClick={handleSubmitComment} disabled={submitting || !text.trim()}>
                {submitting ? 'Posting...' : 'Post'}
              </button>
            </div>

            {comments.map((c) => (
              <div className="comment-item" key={c.id}>
                <div>{c.content || c.text}</div>
                <div className="comment-meta">{c.author?.display_name || 'Anonymous'}<br />{formattedDate(c.created_at)}</div>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
    </>
    
  );
}
