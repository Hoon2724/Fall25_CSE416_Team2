import './Welcome.css';

import logo from './logo.png';

function Welcome() {
    const openSignInPage = () => {
        console.log("Sign In Clicked");
        window.open('./signIn', "_self");
    }

    const openSignUpPage = () => {
        console.log("Sign Up Clicked");
        window.open('./signUp', "_self");
    }

    return (
        <div className="welcomeSignIn row align-items-center">
            <div className="welcomeLogoCtn col-lg-7">
                <img src={logo} className="welcomeMainLogo"></img>
            </div>
            <div className="welcomeOptionCtn col-lg-5">
                <div className="welcomeTitle">Welcome!</div>
                <div className="welcomeDesc">~The perfect help for your college life~</div>
                <div className="signUpBtnCtn">
                    <div onClick={ openSignUpPage } className="signUpBtn">Sign Up</div>
                </div>
                {/* <div className="signUpDesc">Only SUNY Korea or Stony Brook email will be accepted.</div> */}
                <hr />
                <div className="signInBtnCtn">
                    <div onClick={ openSignInPage } className="signInBtn">Sign In</div>
                </div>
            </div>
                
        </div>
    )
}

export default Welcome;