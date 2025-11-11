import './SignUp.css';

import logo from './logo.png';
import googleLogo from './Google.jpeg';
import SUNYLogo from './SUNYLogo.png';

function SignUp() {
    const openGooglePage = () => {
        console.log("Continue with Google clicked");
        window.open('./googleSignIn', "_self");
    }

    return (
        <div className="signUp">
            <div className="logoCtn">
                <img src={logo} className="mainLogo"></img>
            </div>
            <div className="signUpTitleCtn">
                <div className="signUpTitle">Sign Up</div>
            </div>
            <div className="cautionCtn">
                <div className="SUNYLogoCtn">
                    <img src={SUNYLogo} className="SUNYLogo"></img>
                </div>
                <div className="caution">Sign up with Google</div>
                <div className="caution">&#40;SUNY Korea & Stony Brook only&#41;</div>
            </div>
            <div onClick={ openGooglePage } className="row googleBtnCtn">
                <div className="googleLogoCtn">
                    <img src={googleLogo} className="googleLogo"></img>
                </div>
                <div className="googleBtn">Continue with Google</div>
            </div>
        </div>
    )
}

export default SignUp;