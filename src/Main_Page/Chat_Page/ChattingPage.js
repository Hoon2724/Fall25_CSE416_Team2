import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../Navbar.js';
import ChatList from './ChatList.js';
import Chatroom from './Chatroom.js';
import { 
    getChatRooms, 
    getMessages, 
    getCurrentUser, 
    markMessagesAsRead,
    subscribeChatRooms,
    createMessageChannel,
    sendMessageHybrid
} from '../../lib/api';
import { supabase } from '../../lib/supabaseClient';
import './ChattingPage.css';

function ChattingPage() {
    const [selectedChat, setSelectedChat] = useState(null);
    const [chatRooms, setChatRooms] = useState([]);
    const [messages, setMessages] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [chatRoomsLoading, setChatRoomsLoading] = useState(true);
    const [chatRoomsError, setChatRoomsError] = useState(null);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [messagesError, setMessagesError] = useState(null);
    const [pendingChatId, setPendingChatId] = useState(null);
    const location = useLocation();
    const messageChannelRef = useRef(null);
    const roomsReloadTimerRef = useRef(null);
    const roomsLoadingRef = useRef(false);

    // Load current user once and also react to auth state changes
    useEffect(() => {
        loadCurrentUser();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session?.user) {
                setCurrentUser(null);
            } else {
                // refresh profile when session becomes ready
                loadCurrentUser();
            }
        });
        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    // After user is ready, load chat rooms
    useEffect(() => {
        if (currentUser) {
            loadChatRooms();
        }
    }, [currentUser]);

    useEffect(() => {
        const targetChatRoomId = location.state?.chatRoomId;
        if (targetChatRoomId) {
            setPendingChatId(targetChatRoomId);
        }
    }, [location.state]);

    useEffect(() => {
        if (pendingChatId) {
            loadChatRooms();
        }
    }, [pendingChatId]);

    useEffect(() => {
        const unsubscribe = subscribeChatRooms((payload) => {
            // 내 채팅방만 처리 (타 계정의 UPDATE 이벤트 무시)
            const rec = payload?.new || payload?.old || {};
            if (currentUser && rec.buyer_id && rec.seller_id) {
                const mine = (rec.buyer_id === currentUser.id) || (rec.seller_id === currentUser.id);
                if (!mine) return;
            }
            const changedId = payload?.new?.id || payload?.old?.id || null;
            // 현재 보고있는 방의 업데이트라면 무시 (이미 UI에서 반영됨)
            if (changedId && selectedChat && selectedChat.id === changedId) {
                return;
            }
            if (changedId) setPendingChatId(prev => prev || changedId);
            // 디바운스 + 로딩 중 가드
            if (roomsLoadingRef.current) return;
            if (roomsReloadTimerRef.current) clearTimeout(roomsReloadTimerRef.current);
            roomsReloadTimerRef.current = setTimeout(() => {
                loadChatRooms();
            }, 150);
        });
        return () => {
            if (roomsReloadTimerRef.current) {
                clearTimeout(roomsReloadTimerRef.current);
                roomsReloadTimerRef.current = null;
            }
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [currentUser, selectedChat]);

    const loadCurrentUser = async () => {
        try {
            const result = await getCurrentUser();
            if (result.res_code === 200) {
                setCurrentUser(result.user);
            } else {
                setCurrentUser(null);
            }
        } catch (error) {
            console.error('Error loading current user:', error);
            setCurrentUser(null);
        }
    };

    // Load messages when selected chat room changes
    useEffect(() => {
        if (selectedChat && selectedChat.id) {
            loadMessages(selectedChat.id);
        }
    }, [selectedChat]);

    // 메시지 리얼타임 채널 (broadcast + postgres 백업) 생성
    useEffect(() => {
        if (!selectedChat || !selectedChat.id) {
            if (messageChannelRef.current?.cleanup) {
                messageChannelRef.current.cleanup();
            }
            messageChannelRef.current = null;
            return;
        }

        // 기존 채널 정리
        if (messageChannelRef.current?.cleanup) {
            messageChannelRef.current.cleanup();
        }

        const { cleanup, sendBroadcast } = createMessageChannel(
            selectedChat.id,
            currentUser?.id || null,
            // onBroadcastMessage
            (messageData, currentUserId) => {
                setMessages(prev => {
                    const exists = prev.some(m => m.id === messageData.id);
                    if (exists) return prev;
                    const next = [...prev, {
                        id: messageData.id,
                        senderId: messageData.senderId,
                        senderName: messageData.senderName,
                        message: messageData.content,
                        timestamp: formatMessageTime(messageData.created_at),
                        isOwn: messageData.senderId === currentUserId,
                        createdAt: new Date(messageData.created_at).getTime()
                    }];
                    // keep ascending by createdAt so newest is at bottom
                    return next.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
                });

                if (selectedChat && selectedChat.id === messageData.chat_room_id) {
                    const now = new Date().toISOString();
                    setChatRooms(prev => prev.map(chat => 
                        chat.id === messageData.chat_room_id 
                            ? { 
                                ...chat, 
                                lastMessage: messageData.content, 
                                timestamp: formatTimestamp(now),
                                lastMessageAt: now
                            }
                            : chat
                    ));
                }
            },
            // onBackupInsert
            () => {
                // 백업: 누락 시 동기화 (채팅방 목록 전체 리로드는 루프를 유발할 수 있으니 생략)
                loadMessages(selectedChat.id);
            }
        );

        messageChannelRef.current = { cleanup, sendBroadcast };

        return () => {
            if (messageChannelRef.current?.cleanup) {
                messageChannelRef.current.cleanup();
            }
            messageChannelRef.current = null;
        };
    }, [selectedChat, currentUser]);

    const loadChatRooms = async () => {
        setChatRoomsLoading(true);
        roomsLoadingRef.current = true;
        setChatRoomsError(null);
        try {
            const result = await getChatRooms();
            if (result.res_code === 200) {
                // Transform API data to existing format
                const transformedChats = result.chat_rooms.map(chatRoom => {
                    // Determine chat room name
                    let chatName;
                    if (chatRoom.item) {
                        // Item-based chat: show item title
                        chatName = chatRoom.item.title;
                    } else {
                        // Community contact chat: show the other person's name
                        // If current user is buyer, show seller's name; if seller, show buyer's name
                        const isCurrentUserBuyer = currentUser && chatRoom.buyer.id === currentUser.id;
                        chatName = isCurrentUserBuyer 
                            ? (chatRoom.seller.display_name || 'Unknown User')
                            : (chatRoom.buyer.display_name || 'Unknown User');
                    }
                    
                    return {
                        id: chatRoom.id,
                        name: chatName,
                        lastMessage: chatRoom.last_message || 'No messages yet',
                        timestamp: formatTimestamp(chatRoom.last_message_at),
                        lastMessageAt: chatRoom.last_message_at,
                        unreadCount: chatRoom.unread_count ?? 0,
                        buyer: chatRoom.buyer,
                        seller: chatRoom.seller,
                        item: chatRoom.item
                    };
                });
                setChatRooms(transformedChats);

                let desiredChat = null;
                if (pendingChatId) {
                    desiredChat = transformedChats.find((chat) => chat.id === pendingChatId) || null;
                }
                if (!desiredChat && selectedChat) {
                    desiredChat = transformedChats.find((chat) => chat.id === selectedChat.id) || null;
                }
                if (!desiredChat && transformedChats.length > 0) {
                    desiredChat = transformedChats[0];
                }

                // Only update selectedChat if it actually changed
                const currentId = selectedChat?.id || null;
                const nextId = desiredChat?.id || null;
                if (currentId !== nextId) {
                    setSelectedChat(desiredChat || null);
                }

                if (pendingChatId && desiredChat) {
                    setPendingChatId(null);
                }
            }
        } catch (error) {
            console.error('Error loading chat rooms:', error);
            setChatRoomsError('Failed to load chat rooms.');
        } finally {
            setChatRoomsLoading(false);
            roomsLoadingRef.current = false;
        }
    };

    const loadMessages = async (chatRoomId) => {
        if (!chatRoomId) return;
        setMessagesLoading(true);
        setMessagesError(null);
        try {
            const result = await getMessages(chatRoomId, { page: 1, limit: 50 });
            if (result.res_code === 200) {
                // Transform API messages to existing format
                const transformedMessages = result.messages.map(message => ({
                    id: message.id,
                    senderId: message.sender.id,
                    senderName: message.sender.display_name,
                    message: message.content,
                    timestamp: formatMessageTime(message.created_at),
                    isOwn: message.sender.id === currentUser?.id, // Compare with current user
                    createdAt: new Date(message.created_at).getTime()
                }));
                // Deduplicate with existing messages by id
                setMessages(prev => {
                    const byId = new Map();
                    [...prev, ...transformedMessages].forEach(m => {
                        if (m && m.id != null) byId.set(m.id, m);
                    });
                    const arr = Array.from(byId.values());
                    arr.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
                    return arr;
                });
                
                // Mark messages as read when loading chat room
                if (currentUser) {
                    try {
                        await markMessagesAsRead(chatRoomId);
                    } catch (e) {
                        console.error('Error marking messages as read:', e);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            setMessagesError('Failed to load messages.');
        } finally {
            setMessagesLoading(false);
        }
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        }) + ' ' + date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    const formatMessageTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        }) + ' ' + date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    const handleSendMessage = async (messageContent) => {
        if (!selectedChat || !messageContent?.trim() || !currentUser) return;

        await sendMessageHybrid(
            { chatRoomId: selectedChat.id, content: messageContent, currentUser },
            { 
                onOptimistic: (msg) => {
                    setMessages(prev => {
                        const next = [...prev, {
                        id: msg.id,
                        senderId: msg.senderId,
                        senderName: msg.senderName,
                        message: msg.content,
                        timestamp: formatMessageTime(msg.created_at),
                        isOwn: true,
                        createdAt: new Date(msg.created_at).getTime()
                    }];
                        next.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
                        return next;
                    });
                },
                onAfterPersist: (msg) => {
                    const now = new Date().toISOString();
                    setChatRooms(prev => prev.map(chat => 
                        chat.id === selectedChat.id 
                            ? { 
                                ...chat, 
                                lastMessage: msg.content, 
                                timestamp: formatTimestamp(now),
                                lastMessageAt: now
                            }
                            : chat
                    ));
                    setSelectedChat(prev => prev ? { 
                        ...prev, 
                        lastMessage: msg.content, 
                        timestamp: formatTimestamp(now),
                        lastMessageAt: now
                    } : prev);
                }
            },
            messageChannelRef.current?.sendBroadcast
        );
    };

    useEffect(() => {
        if (!currentUser) return;
        setMessages(prev => prev.map(message => ({
            ...message,
            isOwn: message.senderId === currentUser.id
        })));
    }, [currentUser]);

    const sortedChatRooms = useMemo(() => {
        return [...chatRooms].sort((a, b) => {
            const aDate = a.lastMessageAt ? new Date(a.lastMessageAt) : new Date(0);
            const bDate = b.lastMessageAt ? new Date(b.lastMessageAt) : new Date(0);
            return bDate - aDate;
        });
    }, [chatRooms]);

    return (
        <div className="chatting-page-wrapper">
            <Navbar />
            <div className="chatting-page-container">
                <div className="chat-panel">
                    <ChatList 
                        chats={sortedChatRooms} 
                        selectedChat={selectedChat}
                        onSelectChat={setSelectedChat}
                        loading={chatRoomsLoading}
                        error={chatRoomsError}
                    />
                </div>
                <div className="chatroom-panel">
                    <Chatroom 
                        selectedChat={selectedChat}
                        messages={messages}
                        onSendMessage={handleSendMessage}
                        loading={messagesLoading}
                        error={messagesError}
                    />
                </div>
            </div>
        </div>
    );
}

export default ChattingPage;