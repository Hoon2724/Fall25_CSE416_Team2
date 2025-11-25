import React, { useState, useEffect } from 'react';
import { getUserReviews } from '../../lib/api/reviews';
import './UserReviews.css';

function UserReviews({ userId }) {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadReviews = async () => {
            if (!userId) return;
            
            setLoading(true);
            setError('');
            try {
                const res = await getUserReviews(userId);
                if (res.res_code === 200) {
                    setReviews(res.reviews);
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
    }, [userId]);

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

    if (loading) {
        return <div className="reviews-loading">Loading reviews...</div>;
    }

    if (error) {
        return <div className="reviews-error">{error}</div>;
    }

    if (reviews.length === 0) {
        return <div className="reviews-empty">No reviews written yet.</div>;
    }

    return (
        <div className="user-reviews">
            <div className="reviews-header">
                <h3>My Reviews ({reviews.length})</h3>
            </div>
            <div className="reviews-list">
                {reviews.map((review) => (
                    <div key={review.id} className="review-item">
                        <div className="review-header">
                            <div className="review-info">
                                {review.item && (
                                    <div className="review-item-details">
                                        <h4 className="review-item-title">{review.item.title}</h4>
                                        <div className="review-rating">
                                            {renderStars(review.rating)}
                                            <span className="rating-value">({review.rating})</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="review-date">
                                {formatDate(review.created_at)}
                            </div>
                        </div>
                        
                        {review.comment && (
                            <div className="review-comment">
                                <p>"{review.comment}"</p>
                            </div>
                        )}
                        
                        {review.reviewee && (
                            <div className="review-reviewee">
                                <span className="reviewee-label">Reviewed:</span>
                                <div className="reviewee-info">
                                    {review.reviewee.profile_image_url && (
                                        <img 
                                            src={review.reviewee.profile_image_url} 
                                            alt={review.reviewee.display_name}
                                            className="reviewee-avatar"
                                        />
                                    )}
                                    <span className="reviewee-name">{review.reviewee.display_name}</span>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default UserReviews;
