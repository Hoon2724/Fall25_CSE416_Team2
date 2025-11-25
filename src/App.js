import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';

// Welcome / Auth Pages
import Welcome from './Welcome_Page/Welcome.js';
import SignIn from './Welcome_Page/SignIn.js';
import SignUp from './Welcome_Page/SignUp.js';
import GoogleSignIn from './Welcome_Page/GoogleSignIn.js';
import AuthCallback from './Welcome_Page/AuthCallback.js';

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
import ItemDetail from './Main_Page/Market_Page/ItemDetail.js'; // ✅ 새로 추가
import Profile from './Main_Page/Profile_Page/Profile.js';
import ProfileEdit from './Main_Page/Profile_Page/ProfileEdit.js';
import OptionPage from './Main_Page/Profile_Page/OptionPage.js';
import ReviewPage from './Main_Page/Review_Page/ReviewPage.js'

// Admin Pages
import Admin from './Main_Page/Admin_Page/Admin.js';
import AdminUsers from './Main_Page/Admin_Page/AdminUsers.js'
import AdminItems from './Main_Page/Admin_Page/AdminItems.js'
import AdminPosts from './Main_Page/Admin_Page/AdminPosts.js'

import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* -------- Welcome & Auth -------- */}
        <Route path='/' element={<Welcome />} />
        <Route path='/signIn' element={<SignIn />} />
        <Route path='/signUp' element={<SignUp />} />
        <Route path='/googleSignIn' element={<GoogleSignIn />} />
        <Route path='/auth/callback' element={<AuthCallback />} />

        {/* -------- Main Home -------- */}
        <Route path='/home' element={<ProtectedRoute><MainContent /></ProtectedRoute>} />

        {/* -------- Community Pages -------- */}
        <Route path='/community' element={<ProtectedRoute><Community /></ProtectedRoute>} />
        <Route path='/community/create' element={<ProtectedRoute><CommunityCreate /></ProtectedRoute>} />
        <Route path='/community/post/:id' element={<ProtectedRoute><Post /></ProtectedRoute>} />
        <Route path='/community/post/create' element={<ProtectedRoute><PostCreate /></ProtectedRoute>} />

        {/* -------- Market / Item Pages -------- */}
        <Route path='/item' element={<ProtectedRoute><Item /></ProtectedRoute>} />                  {/* 상품 목록 */}
        <Route path='/item-post' element={<ProtectedRoute><ItemPost /></ProtectedRoute>} />         {/* 상품 등록 */}
        <Route path='/item/:id' element={<ProtectedRoute><ItemDetail /></ProtectedRoute>} />        {/* 상품 상세 + 추천 */}

        {/* -------- Other Features -------- */}
        <Route path='/chat' element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path='/search' element={<ProtectedRoute><Search /></ProtectedRoute>} />
        <Route path='/search-result' element={<ProtectedRoute><SearchResult /></ProtectedRoute>} />
        <Route path='/profile' element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path='/profileEdit' element={<ProtectedRoute><ProfileEdit /></ProtectedRoute>} />
        <Route path='/option/:mode' element={<ProtectedRoute><OptionPage /></ProtectedRoute>} />

        {/* -------- Admin Pages -------- */}
        <Route path='/admin' element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path='/admin/users' element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
        <Route path='/admin/items' element={<ProtectedRoute><AdminItems /></ProtectedRoute>} />
        <Route path='/admin/posts' element={<ProtectedRoute><AdminPosts /></ProtectedRoute>} />

        {/* -------- Review Pages -------- */}
        <Route path='/review/:revieweeId' element={<ProtectedRoute><ReviewPage /></ProtectedRoute>} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
