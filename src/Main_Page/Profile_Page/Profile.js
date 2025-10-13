import { Link } from 'react-router-dom';

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
                    <div className="editBtn" onClick={() => console.log("Edit button clicked!")}>Edit</div>
                </div>
            </div>
            <ul className="nav flex-column optionList">
                <li className="nav-item optionItem">
                    <div className="option postHistory" onClick={() => console.log("Post history clicked!")}>Post History</div>
                </li>
                <li className="nav-item optionItem">
                    <div className="option myPosts" onClick={() => console.log("My posts clicked!")}>My Posts</div>
                </li>
                <li className="nav-item optionItem">
                    <div className="option favPosts" onClick={() => console.log("My favorite posts clicked!")}>My Favorite Posts</div>
                </li>
                <li className="nav-item optionItem">
                    <div className="option myComments" onClick={() => console.log("My comments clicked!")}>My Comments</div>
                </li>
            </ul>
        </div>
    )
}

export default Profile;