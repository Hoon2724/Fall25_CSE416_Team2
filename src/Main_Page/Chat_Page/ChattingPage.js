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
            // Determine event type: INSERT (new), UPDATE (changed), DELETE (removed)
            const hasNew = !!payload?.new;
            const hasOld = !!payload?.old;
            const isInsert = hasNew && !hasOld;
            const isDelete = !hasNew && hasOld;
            
            // Only reload if a new chat room is created or deleted
            // Ignore UPDATE events (last_message changes, etc.) - we handle those locally
            if (!isInsert && !isDelete) {
                return; // Ignore UPDATE events
            }
            
            const rec = payload?.new || payload?.old || {};
            if (currentUser && rec.buyer_id && rec.seller_id) {
                const mine = (rec.buyer_id === currentUser.id) || (rec.seller_id === currentUser.id);
                if (!mine) return;
            }
            
            // Only reload if it's a new chat room (INSERT) or deleted (DELETE)
            if (roomsLoadingRef.current) return;
            if (roomsReloadTimerRef.current) clearTimeout(roomsReloadTimerRef.current);
            roomsReloadTimerRef.current = setTimeout(() => {
                loadChatRooms();
            }, 300);
        });
        return () => {
            if (roomsReloadTimerRef.current) {
                clearTimeout(roomsReloadTimerRef.current);
                roomsReloadTimerRef.current = null;
            }
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [currentUser]);

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
            // Clear previous messages when switching chat rooms
            setMessages([]);
            loadMessages(selectedChat.id);
        } else {
            // Clear messages when no chat is selected
            setMessages([]);
        }
    }, [selectedChat?.id]);

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
                const isOwnMessage = messageData.senderId === currentUserId;
                const isCurrentChat = selectedChat && selectedChat.id === messageData.chat_room_id;
                
                // If message is not from current user and not in current chat, increment unreadCount
                if (!isOwnMessage && !isCurrentChat) {
                    setChatRooms(prevRooms => 
                        prevRooms.map(chat => 
                            chat.id === messageData.chat_room_id 
                                ? { ...chat, unreadCount: (chat.unreadCount || 0) + 1 }
                                : chat
                        )
                    );
                }
                
                // Only add message if it belongs to the currently selected chat room
                if (!isCurrentChat) {
                    return;
                }
                setMessages(prev => {
                    const exists = prev.some(m => m.id === messageData.id);
                    if (exists) return prev;
                    const next = [...prev, {
                        id: messageData.id,
                        senderId: messageData.senderId,
                        senderName: messageData.senderName,
                        message: messageData.content,
                        timestamp: formatMessageTime(messageData.created_at),
                        isOwn: isOwnMessage,
                        createdAt: new Date(messageData.created_at).getTime()
                    }];
                    // keep ascending by createdAt so newest is at bottom
                    return next.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
                });

                // Update lastMessage only if it's different (avoid unnecessary updates)
                if (selectedChat && selectedChat.id === messageData.chat_room_id) {
                    const now = new Date().toISOString();
                    setChatRooms(prev => {
                        const chat = prev.find(c => c.id === messageData.chat_room_id);
                        if (chat && chat.lastMessage !== messageData.content) {
                            return prev.map(c => 
                                c.id === messageData.chat_room_id 
                                    ? { 
                                        ...c, 
                                        lastMessage: messageData.content, 
                                        timestamp: formatTimestamp(now),
                                        lastMessageAt: now
                                    }
                                    : c
                            );
                        }
                        return prev; // No change, return same array
                    });
                }
            },
            // onBackupInsert
            (payload) => {
                // 백업: 누락 시 동기화 (채팅방 목록 전체 리로드는 루프를 유발할 수 있으니 생략)
                if (payload?.new) {
                    const messageData = payload.new;
                    const isOwnMessage = messageData.sender_id === currentUser?.id;
                    const isCurrentChat = selectedChat && selectedChat.id === messageData.chat_room_id;
                    
                    // If message is not from current user and not in current chat, increment unreadCount
                    if (!isOwnMessage && !isCurrentChat) {
                        setChatRooms(prevRooms => 
                            prevRooms.map(chat => 
                                chat.id === messageData.chat_room_id 
                                    ? { ...chat, unreadCount: (chat.unreadCount || 0) + 1 }
                                    : chat
                            )
                        );
                    }
                }
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
                        const isCurrentUserBuyer = currentUser && chatRoom.buyer?.id === currentUser.id;
                        chatName = isCurrentUserBuyer 
                            ? (chatRoom.seller?.display_name || 'Unknown User')
                            : (chatRoom.buyer?.display_name || 'Unknown User');
                    }
                    
                    return {
                        id: chatRoom.id,
                        item_id: chatRoom.item_id,
                        name: chatName,
                        lastMessage: chatRoom.last_message || 'No messages yet',
                        timestamp: formatTimestamp(chatRoom.last_message_at),
                        lastMessageAt: chatRoom.last_message_at,
                        created_at: chatRoom.created_at,
                        unreadCount: chatRoom.unread_count ?? 0,
                        buyer: chatRoom.buyer,
                        seller: chatRoom.seller,
                        item: chatRoom.item
                    };
                });
                // Sort chat rooms by created_at (oldest first, at the bottom)
                // API already returns sorted by created_at ascending, so just set directly
                setChatRooms(transformedChats);

                // CRITICAL: Only update selectedChat in these VERY SPECIFIC cases:
                // 1. pendingChatId exists (user explicitly navigated to a chat via route)
                // 2. No chat is currently selected AND this is the FIRST load (initial state)
                // NEVER update selectedChat for any other reason - user must click to change
                
                if (pendingChatId) {
                    // User explicitly navigated to a specific chat via route
                    const desiredChat = transformedChats.find((chat) => chat.id === pendingChatId) || null;
                    if (desiredChat) {
                        setSelectedChat(desiredChat);
                        setPendingChatId(null);
                    }
                } else if (!selectedChat && transformedChats.length > 0) {
                    // Only auto-select on initial load when no chat is selected
                    // This should only happen once when the page first loads
                    setSelectedChat(transformedChats[0]);
                }
                // If selectedChat already exists, DO NOTHING - don't check if it exists, don't update it
                // This prevents flickering when other users interact with their chats
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
                // Replace messages completely (don't merge with previous chat room's messages)
                setMessages(transformedMessages.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)));
                
                // Mark messages as read when loading chat room
                if (currentUser) {
                    try {
                        await markMessagesAsRead(chatRoomId);
                        // Update unreadCount to 0 for this chat room
                        setChatRooms(prevRooms => 
                            prevRooms.map(chat => 
                                chat.id === chatRoomId 
                                    ? { ...chat, unreadCount: 0 }
                                    : chat
                            )
                        );
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
                    // Update lastMessage only if it's different
                    const now = new Date().toISOString();
                    setChatRooms(prevRooms => {
                        const chat = prevRooms.find(c => c.id === selectedChat.id);
                        if (chat && chat.lastMessage !== msg.content) {
                            return prevRooms.map(c => 
                                c.id === selectedChat.id 
                                    ? { 
                                        ...c, 
                                        lastMessage: msg.content, 
                                        timestamp: formatTimestamp(now),
                                        lastMessageAt: now
                                    }
                                    : c
                            );
                        }
                        return prevRooms; // No change, return same array
                    });
                    // Don't update selectedChat - it causes unnecessary re-renders
                }
            },
            messageChannelRef.current?.sendBroadcast
        );
    };

    // Remove this useEffect - isOwn is already calculated when messages are loaded/added

    // Keep chat rooms sorted by created_at (oldest first, at the bottom)
    // API already returns them in this order, so no need to re-sort
    const sortedChatRooms = chatRooms;

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
                        currentUser={currentUser}
                    />
                </div>
            </div>
        </div>
    );
}

export default ChattingPage;