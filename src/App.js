import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';

// Welcome / Auth Pages
import Welcome from './Welcome_Page/Welcome.js';
import SignIn from './Welcome_Page/SignIn.js';
import SignUp from './Welcome_Page/SignUp.js';
import GoogleSignIn from './Welcome_Page/GoogleSignIn.js';

// Main Content
import MainContent from './Main_Page/MainContent.js';

// Community Pages
import Community from './Main_Page/Community_Page/Community.js';
import CommunityCreate from './Main_Page/Community_Page/CommunityCreate.js';
import Post from './Main_Page/Community_Page/Post.js';
import PostCreate from './Main_Page/Community_Page/PostCreate.js';

// Other Main Pages
import Chat from './Main_Page/Chat_Page/ChattingPage.js';
import Search from './Main_Page/Market_Page/Search.js';
import SearchResult from './Main_Page/Market_Page/SearchResult.js';
import Item from './Main_Page/Market_Page/Item.js';
import ItemPost from './Main_Page/Market_Page/ItemPost.js';
import Profile from './Main_Page/Profile_Page/Profile.js';

import { BrowserRouter, Routes, Route } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* -------- Welcome & Auth -------- */}
        <Route path='/' element={<Welcome />} />
        <Route path='/signIn' element={<SignIn />} />
        <Route path='/signUp' element={<SignUp />} />
        <Route path='/googleSignIn' element={<GoogleSignIn />} />

        {/* -------- Main Home -------- */}
        <Route path='/home' element={<MainContent />} />

        {/* -------- Community Pages -------- */}
        <Route path='/community' element={<Community />} />
        <Route path='/community/create' element={<CommunityCreate />} />
        <Route path='/community/post/:id' element={<Post />} />
        <Route path='/community/post/create' element={<PostCreate />} />

        {/* -------- Other Features -------- */}
        <Route path='/chat' element={<Chat />} />
        <Route path='/search' element={<Search />} />
        <Route path='/search-result' element={<SearchResult />} />
        <Route path='/item' element={<Item />} />
        <Route path='/item-post' element={<ItemPost />} />
        <Route path='/profile' element={<Profile />} />
<<<<<<< HEAD
        <Route path='/profileEdit' element={<ProfileEdit />} />
        
=======

>>>>>>> 222c76b1a362f291b1af4971cbed0779f5be08ef
      </Routes>
    </BrowserRouter>
  );
}

export default App;
