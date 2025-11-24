import { useEffect, useRef, useState } from 'react';
import RatingModal from '../../components/RatingModal';
import { completeTransaction, getItemDetails } from '../../lib/api';
import { supabase } from '../../lib/supabaseClient';

function Chatroom({ selectedChat, messages = [], onSendMessage, loading, error, currentUser }) {
    const canInteract = Boolean(selectedChat);
    const endRef = useRef(null);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [submittingRating, setSubmittingRating] = useState(false);
    const [itemData, setItemData] = useState(null);

    useEffect(() => {
        if (!canInteract) return;
        try {
            if (endRef.current) {
                endRef.current.scrollIntoView({ behavior: loading ? 'auto' : 'smooth', block: 'end' });
            }
        } catch (_) { /* no-op */ }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages, selectedChat, loading]);

    // Load item data if item_id exists but item is null
    useEffect(() => {
        const loadItemData = async () => {
            if (selectedChat && selectedChat.item_id) {
                // Always try to load item data if item_id exists, even if selectedChat.item exists
                // This ensures we have the latest data
                try {
                    const result = await getItemDetails(selectedChat.item_id);
                    if (result.res_code === 200 && result.item) {
                        setItemData(result.item);
                    } else {
                        setItemData(null);
                    }
                } catch (err) {
                    setItemData(null);
                }
            } else {
                setItemData(null);
            }
        };
        loadItemData();
    }, [selectedChat?.item_id]);

    const handleCompleteTransaction = () => {
        // Check both selectedChat.item and itemData
        const item = selectedChat?.item || itemData;
        if (!selectedChat || !item) {
            console.log('[Chatroom] handleCompleteTransaction: missing item', { 
                selectedChat, 
                item: selectedChat?.item, 
                itemData 
            });
            return;
        }
        setShowRatingModal(true);
    };

    const handleRatingSubmit = async (rating, comment) => {
        const item = selectedChat?.item || itemData;
        if (!selectedChat || !item || submittingRating) return;
        
        setSubmittingRating(true);
        try {
            const result = await completeTransaction(selectedChat.id, rating, comment);
            if (result.res_code === 200) {
                alert('Transaction completed! Thank you for your rating.');
                setShowRatingModal(false);
                // Always rate the seller (the person who posted the item)
                const revieweeId = selectedChat.seller?.id;
                // Trigger a custom event to notify other components to refresh
                window.dispatchEvent(new CustomEvent('ratingUpdated', { 
                    detail: { revieweeId }
                }));
            } else {
                alert(result.res_msg || 'Failed to complete transaction');
            }
        } catch (error) {
            console.error('Error completing transaction:', error);
            alert(error.message || 'Failed to complete transaction');
        } finally {
            setSubmittingRating(false);
        }
    };

    const getItemThumbnail = () => {
        // Use itemData if selectedChat.item is null
        const item = selectedChat?.item || itemData;
        
        // Check if item exists and has images
        if (!item) {
            return null;
        }
        if (!item.images || item.images.length === 0) {
            return null;
        }
        // Get first image sorted by sort_order
        const sortedImages = [...item.images].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        return sortedImages[0]?.url || null;
    };

    const getOtherPartyName = () => {
        if (!selectedChat || !currentUser) return 'User';
        // Always show seller's name since we're rating the seller
        return selectedChat.seller?.display_name || 'Seller';
    };

    const thumbnailUrl = getItemThumbnail();
    // Check if this is an item-based chat by checking item_id
    // item_id exists means this chat was created from an item's contact button
    const isItemChat = selectedChat && selectedChat.item_id;
    // Complete Transaction button should only be visible to the buyer (the one who initiated the chat)
    // Compare as strings to handle UUID type differences
    const isBuyer = currentUser && selectedChat && selectedChat.buyer?.id && 
        String(selectedChat.buyer.id) === String(currentUser.id);
    const showCompleteTransaction = isItemChat && isBuyer;
    

    return (
        <div className="chatroom-container">
            <div className="chatroom-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                    {isItemChat && thumbnailUrl ? (
                        <img 
                            src={thumbnailUrl} 
                            alt={(selectedChat.item || itemData)?.title || 'Item'}
                            style={{
                                width: '50px',
                                height: '50px',
                                objectFit: 'cover',
                                borderRadius: '8px',
                                border: '2px solid #ddd'
                            }}
                        />
                    ) : isItemChat ? (
                        <div style={{
                            width: '50px',
                            height: '50px',
                            backgroundColor: '#f0f0f0',
                            borderRadius: '8px',
                            border: '2px solid #ddd',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            color: '#999'
                        }}>
                            No img
                        </div>
                    ) : null}
                    <h2 className="chatroom-title" style={{ margin: 0, flex: 1 }}>
                        {selectedChat ? selectedChat.name : 'Select a chat room'}
                    </h2>
                </div>
                {showCompleteTransaction && (
                    <button
                        className="complete-transaction-btn"
                        onClick={handleCompleteTransaction}
                        disabled={submittingRating}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: submittingRating ? 'not-allowed' : 'pointer',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            opacity: submittingRating ? 0.6 : 1
                        }}
                    >
                        {submittingRating ? 'Processing...' : 'Complete Transaction'}
                    </button>
                )}
            </div>
            <div className="chatroom-messages">
                {!canInteract && (
                    <div className="chatroom-placeholder">Choose a chat room from the list.</div>
                )}
                {canInteract && loading && (
                    <div className="chatroom-placeholder">Loading messages…</div>
                )}
                {canInteract && !loading && error && (
                    <div className="chatroom-error">{error}</div>
                )}
                {canInteract && !loading && !error && messages.length === 0 && (
                    <div className="chatroom-placeholder">No messages yet. Send the first one!</div>
                )}
                {canInteract && !loading && !error && messages.map(message => {
                    const key = message.id != null ? message.id : `${message.senderId}-${message.timestamp}`;
                    return (
                    <div key={key} className={`message ${message.isOwn ? 'own-message' : 'other-message'}`}>
                        <div className="message-header">
                            <span className="message-sender">{message.senderName}</span>
                            <span className="message-timestamp">{message.timestamp}</span>
                        </div>
                        <div className="message-content">{message.message}</div>
                    </div>
                )})}
                <div ref={endRef} />
            </div>
            <div className="chatroom-input">
                <input 
                    type="text" 
                    className="message-input"
                    placeholder="Insert to send..."
                    disabled={!canInteract}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                            onSendMessage && onSendMessage(e.target.value);
                            e.target.value = '';
                        }
                    }}
                />
                <button 
                    className="send-button"
                    disabled={!canInteract}
                    onClick={(e) => {
                        const input = e.target.previousElementSibling;
                        if (input.value.trim()) {
                            onSendMessage && onSendMessage(input.value);
                            input.value = '';
                        }
                    }}
                >
                    Send
                </button>
            </div>
            <RatingModal
                isOpen={showRatingModal}
                onClose={() => setShowRatingModal(false)}
                onSubmit={handleRatingSubmit}
                revieweeName={getOtherPartyName()}
            />
        </div>
    );
}

export default Chatroom;

