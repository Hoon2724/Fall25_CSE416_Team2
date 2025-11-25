import './ReviewList.css'

import { useEffect, useState } from 'react';
import { getUserReviews } from '../../lib/api/reviews';

function ReviewList({ reviewee }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadReviews = async () => {
      if (!reviewee?.id) return;
      
      setLoading(true);
      setError('');
      try {
        const res = await getUserReviews(reviewee.id);
        if (res.res_code === 200) {
          setReviews(res.reviews || []);
        } else {
          setError(res.res_msg || 'Failed to load reviews');
        }
      } catch (e) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [reviewee]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={i} className="star filled">★</span>);
    }

    if (hasHalfStar) {
      stars.push(<span key="half" className="star half">★</span>);
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<span key={`empty-${i}`} className="star empty">☆</span>);
    }

    return stars;
  };

  return (
    <div className="reviewListCtn">

      {error && (
        <div style={{ color: 'red', margin: '10px 0' }}>{error}</div>
      )}


      {loading ? (
        <div>Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="no-reviews">No reviews yet.</div>
      ) : (
        <>
          <div className="reviews-summary">
            <h3>Reviews ({reviews.length})</h3>
            {reviews.length > 0 && (
              <div className="average-rating">
                Average Rating: {renderStars(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length)} 
                ({(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)})
              </div>
            )}
          </div>
          
          <ul className="nav flex-column reviewItemsList">
            {reviews.map((review) => (
              <li key={review.id} className="nav-item reviewItemsItem">
                <div className="review-card">
                  <div className="review-header">
                    <div className="reviewer-info">
                      {review.reviewer?.profile_image_url && (
                        <img 
                          src={review.reviewer.profile_image_url} 
                          alt={review.reviewer.display_name}
                          className="reviewer-avatar"
                        />
                      )}
                      <div className="reviewer-details">
                        <div className="reviewer-name">{review.reviewer?.display_name || 'Anonymous'}</div>
                        <div className="review-date">{formatDate(review.created_at)}</div>
                      </div>
                    </div>
                    <div className="review-rating">
                      {renderStars(review.rating)}
                      <span className="rating-value">({review.rating})</span>
                    </div>
                  </div>
                  
                  {review.item && (
                    <div className="review-item-info">
                      <strong>Item:</strong> {review.item.title}
                    </div>
                  )}
                  
                  {review.comment && (
                    <div className="review-comment">
                      <p>"{review.comment}"</p>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>

        </>
      )}
    </div>
  )
}

export default ReviewList;