import './SignIn.css';

import logo from './logo.png';
import googleLogo from './Google.jpeg';

function SignIn() {
    const openGooglePage = () => {
        console.log("Continue with Google clicked");
        window.open('./googleSignIn', "_self");
    }

    return (
        <div className="signIn">
            <div className="signInLogoCtn">
                <img src={logo} className="signInMainLogo"></img>
            </div>
            <div className="signInTitleCtn">
                <div className="signInTitle">Sign In</div>
            </div>
            <div onClick={ openGooglePage } className="googleBtnCtn">
                <div className="googleLogoCtn">
                    <img src={googleLogo} className="googleLogo"></img>
                </div>
                <div className="googleBtn">Continue with Google</div>
            </div>
        </div>
    )
}

export default SignIn;