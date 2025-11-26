function ChatList({ chats, selectedChat, onSelectChat, loading, error, onDeleteChat }) {
    return (
        <div className="chat-list-container">
            <div className="chat-list-header">
                <h2 className="chat-list-title">Chatting Room</h2>
            </div>
            <div className="chat-list">
                {loading && (
                    <div className="chat-list-placeholder">Loading chat rooms…</div>
                )}
                {!loading && error && (
                    <div className="chat-list-error">{error}</div>
                )}
                {!loading && !error && chats.length === 0 && (
                    <div className="chat-list-placeholder">No chat rooms yet.</div>
                )}
                {!loading && !error && chats.map(chat => (
                    <div 
                        key={chat.id}
                        className={`chat-item ${selectedChat && selectedChat.id === chat.id ? 'active' : ''}`}
                        onClick={() => onSelectChat && onSelectChat(chat)}
                        style={{ position: 'relative' }}
                    >
                        <div className="chat-item-info">
                            <div className="chat-item-name">{chat.name}</div>
                            <div className="chat-item-timestamp">{chat.timestamp}</div>
                        </div>
                        <div className="chat-item-message">{chat.lastMessage}</div>
                        {chat.unreadCount > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: 8,
                                right: 30,
                                backgroundColor: 'red',
                                color: 'white',
                                borderRadius: '50%',
                                width: 18,
                                height: 18,
                                fontSize: 11,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold'
                            }}>
                                {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                            </span>
                        )}
                        {onDeleteChat && (
                            <button
                                className="chat-delete-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm('정말 이 채팅방을 삭제하시겠습니까? 모든 메시지가 삭제됩니다.')) {
                                        onDeleteChat(chat.id);
                                    }
                                }}
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    right: 5,
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: '#dc3545',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    padding: '5px',
                                    zIndex: 10,
                                }}
                            >
                                <span className="bi bi-trash"></span>
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ChatList;

