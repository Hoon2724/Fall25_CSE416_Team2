import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import './Profile.css'
import profile from './profile.png';
import Navbar from '../Navbar.js';
import { getCurrentUser, signOut } from '../../lib/api';
import Option from './Option.js';
import UserReviews from './UserReviews.js';

function Profile() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [logoutLoading, setLogoutLoading] = useState(false);

    useEffect(() => {
        const loadUser = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await getCurrentUser();
                if (res.res_code === 200) {
                    setUser(res.user);
                } else {
                    setError(res.res_msg || 'Failed to load profile');
                }
            } catch (e) {
                setError('Network error');
            } finally {
                setLoading(false);
            }
        };
        loadUser();

        // Listen for rating updates
        const handleRatingUpdate = () => {
            loadUser();
        };
        window.addEventListener('ratingUpdated', handleRatingUpdate);

        return () => {
            window.removeEventListener('ratingUpdated', handleRatingUpdate);
        };
    }, []);

    const handleLogout = async () => {
        if (!window.confirm('Are you sure you want to log out?')) {
            return;
        }

        setLogoutLoading(true);
        try {
            const result = await signOut();
            if (result.res_code === 200) {
                // Clear any local state if needed
                setUser(null);
                // Redirect to welcome page
                navigate('/');
            } else {
                alert('Logout failed: ' + (result.res_msg || 'Unknown error'));
            }
        } catch (e) {
            console.error('Logout error:', e);
            alert('Logout error: ' + e.message);
        } finally {
            setLogoutLoading(false);
        }
    };

    if (loading) {
        return (
            <div>
                <Navbar />
                <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div>
                <Navbar />
                <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>
                    {error || 'User not found'}
                </div>
            </div>
        );
    }

    return (
        <div>
            <Navbar />
            <div className="row upperCtn">
                <div className="col-md-3 pfpCtn">
                    <img src={user.profile_image_url || profile} className="pfp" alt="Profile" />
                </div>
                <div className="col-md-6 userInfoCtn">
                    <div className="username">{user.display_name || 'User'}</div>
                    <div className="school">{user.school_verified ? 'SUNY Korea (Verified)' : 'SUNY Korea'}</div>
                    <div className="reputation">Current Reputation: {user.trust_score || 0}/5.0 ({user.total_reviews || 0} reviews)</div> 
                </div>
                <div className="col-md-3 editBtnCtn">
                    <Link to='../profileEdit'>
                        <div className="editBtn">Edit</div>
                    </Link>
                    <div 
                        className="editBtn logoutBtn" 
                        onClick={handleLogout}
                        style={{ 
                            cursor: logoutLoading ? 'not-allowed' : 'pointer',
                            opacity: logoutLoading ? 0.6 : 1
                        }}
                    >
                        {logoutLoading ? 'Logging out...' : 'Logout'}
                    </div>
                </div>
            </div>
            <ul className="optionList">
                <li className="optionItemList">
                    <div className="option">My Item</div>
                    <Option mode="myItem" />
                </li>
                <li className="optionItemList">
                    <div className="option history">Previously viewed items</div>
                    <Option mode="history" />
                </li>
                <li className="optionItem">
                    <Link to='../option/favorite'>
                        <div className="option favPosts">My Favorite Posts</div>
                    </Link>
                </li>
                <li className="optionItem">
                    <Link to='../option/post'>
                        <div className="option myPosts">My Community Posts</div>
                    </Link>
                </li>
                <li className="optionItem">
                    <Link to={`../review/${user.id}`}>
                        <div className="option">My Reviews</div>
                    </Link>
                </li>
            </ul>
        </div>
    )
}

export default Profile;