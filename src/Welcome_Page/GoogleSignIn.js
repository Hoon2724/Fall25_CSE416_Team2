function GoogleSignIn() {
    return(
        <div>
            <p>Proceeding with Google Sign In...</p>
            <btn onClick={() => window.open('./home', "_self")}>Contemporary</btn>
        </div>
    )
}

export default GoogleSignIn;