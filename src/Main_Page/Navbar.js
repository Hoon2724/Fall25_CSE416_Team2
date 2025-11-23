import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';
import logo from '../Welcome_Page/logo.png';
import { supabase } from '../lib/supabaseClient';

function Navbar() {
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const subscribedRef = useRef(false);
    const deduplicationRef = useRef(false);

    // Remove duplicate notifications and calculate unreadCount
    const deduplicatedNotifications = useMemo(() => {
        const seen = new Set();
        return notifications.filter(notif => {
            // Create unique key for each notification
            let key;
            if (notif.payload?.chat_room_id) {
                key = `${notif.type}-${notif.payload.chat_room_id}`;
            } else if (notif.payload?.comment_id) {
                key = `${notif.type}-${notif.payload.comment_id}`;
            } else {
                key = notif.id;
            }
            
            if (seen.has(key)) {
                return false; // Duplicate, filter out
            }
            seen.add(key);
            return true;
        });
    }, [notifications]);

    // Calculate unreadCount from deduplicated notifications array (always in sync)
    const unreadCount = useMemo(() => {
        return Math.min(99, deduplicatedNotifications.filter(notif => !notif.is_read).length);
    }, [deduplicatedNotifications]);

    // Broadcast-only model: no polling
    useEffect(() => {
        setNotificationsLoading(false);
    }, [showNotifications]);

    // Remove duplicates from notifications array (only when duplicates are detected)
    useEffect(() => {
        if (deduplicationRef.current) return; // Already deduplicated in this cycle
        
        const seen = new Set();
        let hasDuplicates = false;
        
        notifications.forEach(notif => {
            let key;
            if (notif.payload?.chat_room_id) {
                key = `${notif.type}-${notif.payload.chat_room_id}`;
            } else if (notif.payload?.comment_id) {
                key = `${notif.type}-${notif.payload.comment_id}`;
            } else {
                key = notif.id;
            }
            
            if (seen.has(key)) {
                hasDuplicates = true;
            } else {
                seen.add(key);
            }
        });
        
        if (hasDuplicates) {
            deduplicationRef.current = true;
            // Remove duplicates, keeping the first occurrence
            setNotifications(prev => {
                const seen = new Set();
                const filtered = prev.filter(notif => {
                    let key;
                    if (notif.payload?.chat_room_id) {
                        key = `${notif.type}-${notif.payload.chat_room_id}`;
                    } else if (notif.payload?.comment_id) {
                        key = `${notif.type}-${notif.payload.comment_id}`;
                    } else {
                        key = notif.id;
                    }
                    
                    if (seen.has(key)) {
                        return false;
                    }
                    seen.add(key);
                    return true;
                });
                // Reset flag after state update
                setTimeout(() => { deduplicationRef.current = false; }, 0);
                return filtered;
            });
        }
    }, [notifications]);

    // Broadcast subscriptions for notifications (subscribe once after mount/login)
    useEffect(() => {
        // Prevent duplicate subscriptions (React Strict Mode in dev)
        if (subscribedRef.current) return;
        
        let channelUser;
        let channelAll;
        async function subscribe() {
            try {
                const { data } = await supabase.auth.getUser();
                const uid = data?.user?.id;
                if (!uid) return;
                
                subscribedRef.current = true;
                // user-specific channel
                channelUser = supabase
                    .channel(`notify:${uid}`)
                    .on('broadcast', { event: 'notify' }, ({ payload }) => {
                        // Create unique notification ID based on payload to prevent duplicates
                        let notificationKey;
                        if (payload?.chat_room_id) {
                            // Chat room notification: use chat_room_id
                            notificationKey = `${payload.type}-${payload.chat_room_id}`;
                        } else if (payload?.comment_id) {
                            // Comment notification: use comment_id (unique per comment)
                            notificationKey = `${payload.type}-${payload.comment_id}`;
                        } else {
                            // Other notifications: use timestamp + random
                            notificationKey = `${payload?.type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
                        }
                        
                        setNotifications(prev => {
                            // Check if notification already exists
                            const exists = prev.some(n => {
                                // Check by notification ID first (most reliable)
                                if (n.id === notificationKey) {
                                    return true;
                                }
                                
                                // Check by payload content
                                if (payload?.chat_room_id && n.payload?.chat_room_id) {
                                    // Chat room notification: check chat_room_id + type
                                    return n.payload.chat_room_id === payload.chat_room_id && 
                                           n.type === payload?.type;
                                } else if (payload?.comment_id && n.payload?.comment_id) {
                                    // Comment notification: check comment_id (unique per comment)
                                    return n.payload.comment_id === payload.comment_id;
                                }
                                
                                return false;
                            });
                            
                            if (exists) {
                                return prev; // Don't add duplicate
                            }
                            
                            const n = {
                                id: notificationKey,
                                type: payload?.type || 'announcement',
                                title: payload?.title || 'Notification',
                                content: payload?.content || '',
                                created_at: new Date().toISOString(),
                                is_read: false,
                                payload
                            };
                            
                            const nextNotifications = [n, ...prev].slice(0, 50);
                            // unreadCount is now calculated from notifications array via useMemo
                            return nextNotifications;
                        });
                    })
                    .subscribe();
                // global announcements
                channelAll = supabase
                    .channel('notify:all')
                    .on('broadcast', { event: 'notify' }, ({ payload }) => {
                        const n = {
                            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                            type: payload?.type || 'announcement',
                            title: payload?.title || 'Announcement',
                            content: payload?.content || '',
                            created_at: new Date().toISOString(),
                            is_read: false,
                            payload
                        };
                        setNotifications(prev => {
                            const nextNotifications = [n, ...prev].slice(0, 50);
                            // unreadCount is now calculated from notifications array via useMemo
                            return nextNotifications;
                        });
                    })
                    .subscribe();
            } catch (e) {
                console.error('Failed to subscribe broadcast notifications', e);
            }
        }
        subscribe();
        return () => {
            subscribedRef.current = false;
            if (channelUser) supabase.removeChannel(channelUser);
            if (channelAll) supabase.removeChannel(channelAll);
        };
    }, []);

    const handleMarkAsRead = (notificationId, e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
    };

    const handleMarkAllAsRead = (e) => {
        e.stopPropagation();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    const handleDelete = (notificationId, e) => {
        e.stopPropagation();
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
    };

    return (
        <nav className="navbar navbar-expand-md">
            <div className="container-fluid">
                <div className="navbar-header navbarLogoCtn">
                    <Link className='nav-link' to='/home'>
                        <img src={logo} className="navbar-brand navbarLogo"></img>
                    </Link>
                </div>
                <ul className="navbar-nav navCtn">
                    <li className="nav-item navCommunity">
                        <Link className='nav-link' to='/community'>Community</Link>
                    </li>
                    <li className="nav-item navChats">
                        <Link className='nav-link' to='/chat'>Chat</Link>
                    </li>
                </ul>
                <ul className="navbar-nav ms-auto iconCtn">
                    <li className="nav-item adminIcon">
                        <Link className='nav-link' to='/admin'><span className="bi bi-file-earmark-person"></span></Link>
                    </li>
                    <li className="nav-item searchIcon">
                        <Link className='nav-link' to='/search'><span className="bi bi-search"></span></Link>
                    </li>
                    <li className="nav-item notifIcon" style={{ position: 'relative', cursor: 'pointer' }}>
                        <span 
                            className="bi bi-bell"
                            onClick={() => setShowNotifications(!showNotifications)}
                        ></span>
                        {unreadCount > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: -5,
                                right: -5,
                                backgroundColor: 'red',
                                color: 'white',
                                borderRadius: '50%',
                                width: 18,
                                height: 18,
                                fontSize: 11,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                        {showNotifications && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: 8,
                                width: 320,
                                maxHeight: 400,
                                backgroundColor: 'white',
                                border: '1px solid #ddd',
                                borderRadius: 8,
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                zIndex: 1000,
                                overflow: 'hidden'
                            }}>
                                <div style={{ padding: 12, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <strong>Notifications</strong>
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={handleMarkAllAsRead}
                                            style={{ padding: '4px 8px', fontSize: 12, backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                                        >
                                            Mark all as read
                                        </button>
                                    )}
                                </div>
                                <div style={{ maxHeight: 350, overflowY: 'auto' }}>
                                    {notificationsLoading ? (
                                        <div style={{ padding: 20, textAlign: 'center' }}>Loading...</div>
                                    ) : deduplicatedNotifications.length === 0 ? (
                                        <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>No notifications</div>
                                    ) : (
                                        deduplicatedNotifications.map(notif => (
                                            <div
                                                key={notif.id}
                                                style={{
                                                    padding: 12,
                                                    borderBottom: '1px solid #eee',
                                                    backgroundColor: notif.is_read ? 'white' : '#f0f7ff',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={(e) => {
                                                    if (!notif.is_read) {
                                                        handleMarkAsRead(notif.id, e);
                                                    }
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: notif.is_read ? 'normal' : 'bold', fontSize: 14 }}>
                                                            {notif.title}
                                                        </div>
                                                        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                                                            {notif.content}
                                                        </div>
                                                        <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>
                                                            {new Date(notif.created_at).toLocaleString()}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => handleDelete(notif.id, e)}
                                                        style={{
                                                            padding: '2px 6px',
                                                            fontSize: 10,
                                                            backgroundColor: '#f44336',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: 3,
                                                            cursor: 'pointer',
                                                            marginLeft: 8
                                                        }}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </li>
                    <li className="nav-item profileIcon">
                        <Link className='nav-link' to='/profile'><span className="bi bi-person"></span></Link>
                    </li>
                </ul>
            </div>
            {showNotifications && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 999
                    }}
                    onClick={() => setShowNotifications(false)}
                />
            )}
        </nav>
    )
}

export default Navbar;