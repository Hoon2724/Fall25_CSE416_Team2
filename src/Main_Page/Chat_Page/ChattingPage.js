import { useState } from 'react';
import Navbar from '../Navbar.js';
import ChatList from './ChatList.js';
import Chatroom from './Chatroom.js';
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

    return (
        <div className="chatting-page-wrapper">
            <Navbar />
            <div className="chatting-page-container">
                <div className="chat-panel">
                    <ChatList 
                        chats={chatData} 
                        selectedChat={selectedChat}
                        onSelectChat={setSelectedChat}
                    />
                </div>
                <div className="chatroom-panel">
                    <Chatroom 
                        selectedChat={selectedChat}
                        messages={messages}
                    />
                </div>
            </div>
        </div>
    );
}

export default ChattingPage;