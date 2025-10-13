function ChatList({ chats, selectedChat, onSelectChat }) {
    return (
        <div className="chat-list-container">
            <div className="chat-list-header">
                <h2 className="chat-list-title">Chatting Room</h2>
            </div>
            <div className="chat-list">
                {chats.map(chat => (
                    <div 
                        key={chat.id}
                        className={`chat-item ${selectedChat.id === chat.id ? 'active' : ''}`}
                        onClick={() => onSelectChat(chat)}
                    >
                        <div className="chat-item-info">
                            <div className="chat-item-name">{chat.name}</div>
                            <div className="chat-item-timestamp">{chat.timestamp}</div>
                        </div>
                        <div className="chat-item-message">{chat.lastMessage}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ChatList;
