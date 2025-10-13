function Chatroom({ selectedChat, messages }) {
    return (
        <div className="chatroom-container">
            <div className="chatroom-header">
                <h2 className="chatroom-title">{selectedChat.name}</h2>
            </div>
            <div className="chatroom-messages">
                {messages.map(message => (
                    <div key={message.id} className={`message ${message.isOwn ? 'own-message' : 'other-message'}`}>
                        <div className="message-header">
                            <span className="message-sender">{message.sender}</span>
                            <span className="message-timestamp">{message.timestamp}</span>
                        </div>
                        <div className="message-content">{message.message}</div>
                    </div>
                ))}
            </div>
            <div className="chatroom-input">
                <input 
                    type="text" 
                    className="message-input"
                    placeholder="Insert to send..."
                />
                <button className="send-button">Send</button>
            </div>
        </div>
    );
}

export default Chatroom;
