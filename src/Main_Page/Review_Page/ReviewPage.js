import './ReviewPage.css'

import { useEffect, useState } from 'react';
import Navbar from "../Navbar";
import ReviewList from './ReviewList.js'
import { Link, UNSAFE_WithComponentProps } from 'react-router-dom';
import { getUserItems, getCurrentUser, getOtherUserProfile } from '../../lib/api';

function ReviewPage({ returnPage, revieweeId }) {
  const [user, setUser] = useState(null);
  const [reviewee, setReviewee] = useState(null);
  const [getItems, setItems] = useState([]);
  const [returnTo, setReturnTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            // Get current user first
            const userRes = await getCurrentUser();
            if (userRes.res_code !== 200) {
              setError('Please sign in to view your data');
              setLoading(false);
              return;
            }
            const currentUser = userRes.user;
            setUser(currentUser);

            //Get reviewee
            const revieweeRes = await getOtherUserProfile(revieweeId);
            if (revieweeRes.res_code !== 200) {
              setError('Failed to retrieve reviewee\'s data');
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

  useEffect(() => {
    if(returnPage !== "home")
      setReturnTo("market");
    else
      setReturnTo("home");
  })

  return (
    <div>
      <Navbar />

      <div className="reviewPageCtn">
        <div className="reviewReturnBtn">
          <Link to='../home'>
            <span className="bi bi-arrow-left"></span>
            <div className="returnDesc">Return</div>
          </Link>
        </div>
        <div className="reviewPageTitle">Review of TESTUSER</div>

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