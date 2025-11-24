import { useState } from 'react';
import './RatingModal.css';

function RatingModal({ isOpen, onClose, onSubmit, revieweeName }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

  const handleStarClick = (e, value) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    
    // If click is on the left half, use 0.5 less; if right half, use the full value
    if (clickX < width / 2 && value > 0.5) {
      setRating(value - 0.5);
    } else {
      setRating(value);
    }
  };

  const handleStarHover = (e, value) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const width = rect.width;
    
    if (hoverX < width / 2 && value > 0.5) {
      setHoverRating(value - 0.5);
    } else {
      setHoverRating(value);
    }
  };

  const handleStarLeave = () => {
    setHoverRating(0);
  };

  const handleSubmit = () => {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }
    onSubmit(rating, comment);
    setRating(0);
    setComment('');
    setHoverRating(0);
  };

  const handleCancel = () => {
    setRating(0);
    setComment('');
    setHoverRating(0);
    onClose();
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="rating-modal-overlay" onClick={handleCancel}>
      <div className="rating-modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="rating-modal-title">Rate {revieweeName}</h3>
        <p className="rating-modal-subtitle">Please leave a rating for your transaction partner</p>
        
        <div className="rating-stars-container">
          {[1, 2, 3, 4, 5].map((starValue) => {
            const fullStars = Math.floor(displayRating);
            const hasHalfStar = displayRating % 1 >= 0.5 && Math.floor(displayRating) === starValue - 1;
            const isFull = starValue <= fullStars;
            const isHalf = hasHalfStar && starValue === fullStars + 1;
            
            return (
              <div
                key={starValue}
                className="star-wrapper"
                onClick={(e) => handleStarClick(e, starValue)}
                onMouseMove={(e) => handleStarHover(e, starValue)}
                onMouseLeave={handleStarLeave}
              >
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill={isFull ? "#ffc107" : isHalf ? "url(#half-gradient)" : "none"}
                  stroke={isFull || isHalf ? "#ffc107" : "#ddd"}
                  strokeWidth="1"
                  style={{ cursor: 'pointer' }}
                >
                  <defs>
                    <linearGradient id="half-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="50%" stopColor="#ffc107" />
                      <stop offset="50%" stopColor="transparent" />
                    </linearGradient>
                  </defs>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
            );
          })}
        </div>

        {/* Quick selection buttons for common ratings */}
        <div className="rating-quick-select">
          <span style={{ fontSize: '0.9rem', color: '#666', marginRight: '10px' }}>Quick select:</span>
          {[1, 2, 3, 4, 5].map((value) => {
            const isSelected = rating === value;
            return (
              <button
                key={value}
                className={`quick-rating-btn ${isSelected ? 'selected' : ''}`}
                onClick={() => setRating(value)}
              >
                {value}★
              </button>
            );
          })}
        </div>

        <div className="rating-display">
          {rating > 0 && <span className="rating-value">{rating.toFixed(1)} / 5.0</span>}
        </div>

        <textarea
          className="rating-comment"
          placeholder="Optional: Leave a comment..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
        />

        <div className="rating-modal-actions">
          <button className="rating-cancel-btn" onClick={handleCancel}>
            Cancel
          </button>
          <button className="rating-submit-btn" onClick={handleSubmit}>
            Submit Rating
          </button>
        </div>
      </div>
    </div>
  );
}

export default RatingModal;

