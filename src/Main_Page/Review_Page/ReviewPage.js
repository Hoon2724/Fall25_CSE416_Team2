import './ReviewPage.css'

import { useEffect, useState } from 'react';
import Navbar from "../Navbar";
import ReviewList from './ReviewList.js'
import { Link, useParams } from 'react-router-dom';
import { getCurrentUser, getOtherUserProfile } from '../../lib/api';

function ReviewPage() {
  const { revieweeId } = useParams();
  const [reviewee, setReviewee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        try {
            //Get reviewee
            const revieweeRes = await getOtherUserProfile(revieweeId);
            if (revieweeRes.res_code !== 200) {
              console.error('Failed to retrieve reviewee\'s data');
              setLoading(false);
              return;
            }
            const currentReviewee = revieweeRes.user;
            setReviewee(currentReviewee);
      } finally {
          setLoading(false);
      }
    };
    loadData();
    }, [revieweeId]);


  return (
    <div>
      <Navbar />

      <div className="reviewPageCtn">
        <div className="returnBtn">
          <Link to='../home'>
            <span className="bi bi-arrow-left"></span>
            <span className="returnDesc">Return</span>
          </Link>
        </div>
        <div className="reviewPageTitle">Reviews of {reviewee?.display_name || 'User'}</div>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <ReviewList reviewee={ reviewee }/>
        )}
      </div>
    </div>
  )
}

export default ReviewPage;