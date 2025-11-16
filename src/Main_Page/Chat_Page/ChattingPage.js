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

    // Load actual chat data
    useEffect(() => {
        loadCurrentUser();
        loadChatRooms();
    }, []);

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
            // 새 채팅방 생성/업데이트 시 목록 리로드
            setPendingChatId(prev => prev || payload?.new?.id || null);
            loadChatRooms();
        });
        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, []);

    const loadCurrentUser = async () => {
        try {
            const result = await getCurrentUser();
            if (result.res_code === 200) {
                setCurrentUser(result.user);
            }
        } catch (error) {
            console.error('Error loading current user:', error);
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
                    return [...prev, {
                        id: messageData.id,
                        senderId: messageData.senderId,
                        senderName: messageData.senderName,
                        message: messageData.content,
                        timestamp: formatMessageTime(messageData.created_at),
                        isOwn: messageData.senderId === currentUserId
                    }];
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
                // 백업: 누락 시 동기화
                loadMessages(selectedChat.id);
                loadChatRooms();
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
        setChatRoomsError(null);
        try {
            const result = await getChatRooms();
            if (result.res_code === 200) {
                // Transform API data to existing format
                const transformedChats = result.chat_rooms.map(chatRoom => ({
                    id: chatRoom.id,
                    name: chatRoom.item ? chatRoom.item.title : 
                          (chatRoom.buyer.display_name || chatRoom.seller.display_name),
                    lastMessage: chatRoom.last_message || 'No messages yet',
                    timestamp: formatTimestamp(chatRoom.last_message_at),
                    lastMessageAt: chatRoom.last_message_at,
                    unreadCount: chatRoom.unread_count ?? 0,
                    buyer: chatRoom.buyer,
                    seller: chatRoom.seller,
                    item: chatRoom.item
                }));
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

                setSelectedChat(desiredChat || null);

                if (pendingChatId && desiredChat) {
                    setPendingChatId(null);
                }
            }
        } catch (error) {
            console.error('Error loading chat rooms:', error);
            setChatRoomsError('Failed to load chat rooms.');
        } finally {
            setChatRoomsLoading(false);
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
                    isOwn: message.sender.id === currentUser?.id // Compare with current user
                }));
                setMessages(transformedMessages);
                
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
                    setMessages(prev => [...prev, {
                        id: msg.id,
                        senderId: msg.senderId,
                        senderName: msg.senderName,
                        message: msg.content,
                        timestamp: formatMessageTime(msg.created_at),
                        isOwn: true
                    }]);
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