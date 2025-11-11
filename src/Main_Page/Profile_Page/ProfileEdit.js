import { Link } from 'react-router-dom';

import './ProfileEdit.css';
import Navbar from '../Navbar.js';

function ProfileEdit() {
    return (
        <div>
            <Navbar />
            <div className="profileEditCtn">
                <div className="profileTitleCtn">
                    <div className="profileTitle">Edit Profile</div>
                </div>
                <form className="pfpEdit">
                    <label for="newProfilePic" className="form-label">Insert new profile image</label>
                    <input type="file" className="form-control" id="newProfilePic"></input>
                </form>
                <form className="nameEdit">
                    <label for="newUsername" className="form-label">Name</label>
                    <input type="text" className="form-control" id="newUsername"></input>
                </form>
            </div>
            <Link to='../profile'>
                <button className="btn btn-primary fixed-bottom">Submit</button>
            </Link>
        </div>
    )
}

export default ProfileEdit;