import { useState, useEffect } from 'react';
import Navbar from '../Navbar.js';
import ChatList from './ChatList.js';
import Chatroom from './Chatroom.js';
import { getChatRooms, getMessages, sendMessage, getCurrentUser } from '../../lib/api';
import './ChattingPage.css';

function ChattingPage() {
    // 더미 채팅 데이터
    const chatData = [
        {
            id: 1,
            name: "Jane Doe",
            lastMessage: "Thank you for the discount!",
            timestamp: "09.15.2025 12:31",
            isActive: true
        },
        {
            id: 2,
            name: "Bongpal Park",
            lastMessage: "Hey, are you still selling it?",
            timestamp: "09.12.2025 11:29",
            isActive: false
        },
        {
            id: 3,
            name: "Sophia Kim",
            lastMessage: "I hope you have a nice day",
            timestamp: "07.21.2025 09:57",
            isActive: false
        },
        {
            id: 4,
            name: "Gildong Hong",
            lastMessage: "Let's meet at CSE Lounge at 5 pm!",
            timestamp: "07.19.2025 17:35",
            isActive: false
        },
        {
            id: 5,
            name: "Geojit Zeul",
            lastMessage: "Sorry, but I think I am going to cancel...",
            timestamp: "06.01.2025 07:51",
            isActive: false
        },
        {
            id: 6,
            name: "Jason Anon",
            lastMessage: "What? That's absurd. I demand a...",
            timestamp: "05.29.2025 03:51",
            isActive: false
        }
    ];

    // 더미 채팅방 메시지 데이터
    const messages = [
        {
            id: 1,
            sender: "Jane Doe",
            message: "Hey, are you selling the book?",
            timestamp: "09.11.2025 12:31",
            isOwn: false
        },
        {
            id: 2,
            sender: "Wotis Hatt",
            message: "Yes! I am still looking for a buyer",
            timestamp: "09.11.2025 13:30",
            isOwn: true
        },
        {
            id: 3,
            sender: "Jane Doe",
            message: "Great! I want to buy it.",
            timestamp: "09.11.2025 13:31",
            isOwn: false
        },
        {
            id: 4,
            sender: "Wotis Hatt",
            message: "Sorry for the late reply! The book is actually pretty old, so I will discount it",
            timestamp: "09.12.2025 09:19",
            isOwn: true
        },
        {
            id: 5,
            sender: "Jane Doe",
            message: "Thank you for the discount!",
            timestamp: "09.12.2025 09:30",
            isOwn: false
        }
    ];

    const [selectedChat, setSelectedChat] = useState(chatData[0]);
    const [actualChatData, setActualChatData] = useState([]);
    const [actualMessages, setActualMessages] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    // 실제 채팅 데이터 로드
    useEffect(() => {
        loadCurrentUser();
        loadChatRooms();
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

    // 선택된 채팅방 변경 시 메시지 로드
    useEffect(() => {
        if (selectedChat && selectedChat.id) {
            loadMessages(selectedChat.id);
        }
    }, [selectedChat]);

    const loadChatRooms = async () => {
        try {
            const result = await getChatRooms();
            if (result.res_code === 200) {
                // API 데이터를 기존 형식으로 변환
                const transformedChats = result.chat_rooms.map(chatRoom => ({
                    id: chatRoom.id,
                    name: chatRoom.item ? chatRoom.item.title : 
                          (chatRoom.buyer.display_name || chatRoom.seller.display_name),
                    lastMessage: chatRoom.last_message || '메시지가 없습니다',
                    timestamp: formatTimestamp(chatRoom.last_message_at),
                    isActive: false,
                    // API 데이터를 위해 추가 정보 저장
                    apiData: chatRoom
                }));
                setActualChatData(transformedChats);
                
                // 첫 번째 채팅방을 기본 선택
                if (transformedChats.length > 0) {
                    setSelectedChat(transformedChats[0]);
                }
            }
        } catch (error) {
            console.error('Error loading chat rooms:', error);
            // API 실패 시 더미 데이터 사용
            setActualChatData(chatData);
        }
    };

    const loadMessages = async (chatRoomId) => {
        try {
            const result = await getMessages(chatRoomId, { page: 1, limit: 50 });
            if (result.res_code === 200) {
                // API 메시지를 기존 형식으로 변환
                const transformedMessages = result.messages.map(message => ({
                    id: message.id,
                    sender: message.sender.display_name,
                    message: message.content,
                    timestamp: formatMessageTime(message.created_at),
                    isOwn: message.sender.id === currentUser?.id // 현재 사용자와 비교
                }));
                setActualMessages(transformedMessages);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            // API 실패 시 더미 메시지 사용
            setActualMessages(messages);
        }
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleDateString('ko-KR', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        }) + ' ' + date.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    const formatMessageTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleDateString('ko-KR', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        }) + ' ' + date.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    const handleSendMessage = async (messageContent) => {
        if (!selectedChat || !messageContent.trim()) return;

        try {
            const result = await sendMessage({
                chat_room_id: selectedChat.id,
                content: messageContent.trim()
            });

            if (result.res_code === 201) {
                // 새 메시지를 기존 형식으로 변환하여 추가
                const newMessage = {
                    id: result.message.id,
                    sender: currentUser?.display_name || '나',
                    message: result.message.content,
                    timestamp: formatMessageTime(result.message.created_at),
                    isOwn: true
                };
                
                setActualMessages(prev => [...prev, newMessage]);
                
                // 채팅방 목록의 마지막 메시지도 업데이트
                setActualChatData(prev => prev.map(chat => 
                    chat.id === selectedChat.id 
                        ? { ...chat, lastMessage: messageContent, timestamp: formatTimestamp(new Date()) }
                        : chat
                ));
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    return (
        <div className="chatting-page-wrapper">
            <Navbar />
            <div className="chatting-page-container">
                <div className="chat-panel">
                    <ChatList 
                        chats={actualChatData.length > 0 ? actualChatData : chatData} 
                        selectedChat={selectedChat}
                        onSelectChat={setSelectedChat}
                    />
                </div>
                <div className="chatroom-panel">
                    <Chatroom 
                        selectedChat={selectedChat}
                        messages={actualMessages.length > 0 ? actualMessages : messages}
                        onSendMessage={handleSendMessage}
                    />
                </div>
            </div>
        </div>
    );
}

export default ChattingPage;