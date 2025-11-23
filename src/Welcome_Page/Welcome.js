import './Welcome.css';

import logo from './logo.png';

function Welcome() {
    const openSignInPage = () => {
        console.log("Sign In Clicked");
        window.open('./signIn', "_self");
    }

    return (
        <div className="welcomeSignIn row align-items-center">
            <div className="welcomeLogoCtn col-lg-7">
                <img src={logo} className="welcomeMainLogo"></img>
            </div>
            <div className="welcomeOptionCtn col-lg-5">
                <div className="welcomeTitle">Welcome!</div>
                <div className="welcomeDesc">~The perfect help for your college life~</div>
                <div className="signInBtnCtn">
                    <div onClick={ openSignInPage } className="signInBtn">Sign In</div>
                </div>
            </div>
                
        </div>
    )
}

export default Welcome;