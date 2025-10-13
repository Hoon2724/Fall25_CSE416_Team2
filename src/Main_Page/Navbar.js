import { Link } from 'react-router-dom';

import './Navbar.css';
import logo from '../Welcome_Page/logo.png';

function Navbar() {
    return (
        <nav className="navbar navbar-expand-md">
            <div className="container-fluid">
                <div className="navbar-header logoCtn">
                    <Link className='nav-link' to='/home'>
                        <img src={logo} className="navbar-brand logo"></img>
                    </Link>
                </div>
                <ul className="navbar-nav navCtn">
                    <li className="nav-item navCommunity">
                        <Link className='nav-link' to='/community'>Community</Link>
                    </li>
                    <li className="nav-item navChats">
                        <Link className='nav-link' to='/chat'>Chat</Link>
                    </li>
                </ul>
                <ul className="navbar-nav ms-auto align-items-center iconCtn">
                    <li className="nav-item searchIcon">
                        <Link className='nav-link' to='/search'><span className="bi bi-search"></span></Link>
                    </li>
                    <li className="nav-item notifIcon" onClick={() => console.log("Notification Icon clicked!")}>
                        <span className="bi bi-bell"></span>
                    </li>
                    <li className="nav-item profileIcon">
                        <Link className='nav-link' to='/profile'><span className="bi bi-person"></span></Link>
                    </li>
                </ul>
            </div>
        </nav>
    )
}

export default Navbar;