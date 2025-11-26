import ReactMarkdown from "react-markdown";
import Navbar from "./Navbar";

import './Help.css'

function Help() {
  const markdown = `
  # How to use CAMAR?
  ## 1. Market
  (i) Uploading an item
   - Click the blue button on the bottom-right corner to open Item Post page
   - Here, you can insert up to 10 pictures of your product
   - The AI will automatically categorize and tag your images. (You can freely edit it)
   - After inserting appropriate informations, click on "Click to post" button to post your item
  
  (ii) Buying an item
   - Click on the item of your choice and click the "Contact" button to chat with the seller
   - After transaction, click on "Complete Transaction" to finish your trade.
   - Do not forget to leave a review for the seller. (You can express your utmost sincere feeling as well)

  (iii) Searching an item
   - Click on the "Magnifying Glass" Icon on the top right corner to open Search page
   - Insert any keyword that defines the item you want to search
   - You can click on the tags on the bottom to view the corresponding items
   - You can also view the history of search keywords you inputted

  ## 2. Community
  (i) Uploading a post
   - Click the "Upload Post" button to open Community Post page
   - Here, you can insert up to 4 pictures or 1 video of your choice
   - After inserting appropriate information, click on "Click to post" button to post your post
  
  (ii) Creating community
   - Click the "Create" button on the sidebar to create a community
   - Input title and short description of your community
   - Click on "Create" button to create your community
  
  (iii) Viewing community post
   - Click on the post you want to see to view the post of your choice
   - You can contact with the writer using the "Contact" button on the top-right corner
   - In the community page, you can click on the community you want on the sidebar to filter out the posts
   - To view all posts, click on "Home"
  
  ## 3. Profile
  (i) Editing name and profile picture
   - Click on the edit button to open Edit Profile page
   - Insert the picture you want to change your profile picture
   - Insert the name you want to change your display name
   - Click "Submit" button on the bottom to save your change
  
  (ii) Various options
   - You can see the list of your items and its status in one view
   - You can see the list of the items you viewed in the past with its status
   - **My Favorite Items**: You can see the list of favorite items you chosen with its status
   - **My Community Posts**: You can see the list of posts you created on the Community page
   - **My Reviews**: You can see the list of reviews you made to other people
  `;

  return (
    <div className="markdownCtn">
      <Navbar />

      <div className="markdownText">
        <ReactMarkdown>
          {markdown}
        </ReactMarkdown>
      </div>
    </div>
  )
}

export default Help;