import { Link } from 'react-router-dom';
import Popup from 'reactjs-popup';

import './Profile.css'
import profile from './profile.png';
import Navbar from '../Navbar.js';

function Profile() {
    // example user data
    const user = {
        username: "Wotis Hatt",
        school: "SUNY Korea",
        reputation: 100
    }

    return (
        <div>
            <Navbar />
            <div className="row upperCtn">
                <div className="col-md-3 pfpCtn">
                    <img src={profile} className="pfp"></img>
                </div>
                <div className="col-md-6 userInfoCtn">
                    <div className="username">{user.username}</div>
                    <div className="school">{user.school}</div>
                    <div className="reputation">Current Reputation: {user.reputation}</div>
                </div>
                <div className="col-md-3 editBtnCtn">
                    <Link to='../profileEdit'>
                        <div className="editBtn">Edit</div>
                    </Link>
                </div>
            </div>
            <ul className="nav flex-column optionList">
                <li className="nav-item optionItem">
                    <Link to='../option'>
                        <div className="option postHistory">Post History</div>
                    </Link>
                </li>
                <li className="nav-item optionItem">
                    <Link to='../option'>
                        <div className="option myPosts">My Posts</div>
                    </Link>
                </li>
                <li className="nav-item optionItem">
                    <Link to='../option'>
                        <div className="option favPosts">My Favorite Posts</div>
                    </Link>
                </li>
                <li className="nav-item optionItem">
                    <Link to='../option'>
                        <div className="option myComments">My Comments</div>
                    </Link>
                </li>
            </ul>
        </div>
    )
}

export default Profile;