# Campus Secondhand Marketplace (AI-Powered)

## Problem Statement
While existing secondhand platforms (e.g., Carrot, Bungaejangter) are widely used, they are not always suitable for the unique needs of a campus community. Our project addresses this gap with a dedicated **AI-powered marketplace for students**.  

### Problems & Our Solutions
1. **Trust and Safety**  
   - *Problem:* Open platforms make it difficult to verify user identity, leading to potential scams.  
   - *Solution:* By restricting sign-ups to Google accounts, we ensure transactions occur only between verified people, creating a safer environment.  

2. **Convenient Trading Environment**  
   - *Problem:* Meeting strangers off-campus can be inconvenient and time-consuming.  
   - *Solution:* Our platform limits trading to campus and nearby areas, making meetups fast and practical. Trading activity can also align with the academic calendar (start/end of semester).  

3. **Student-Specific Items**  
   - *Problem:* On large platforms, it is difficult to filter for student-related items like textbooks, dorm supplies, or lab equipment.  
   - *Solution:* Our marketplace focuses on categories tailored to students’ needs: textbooks, notes, electronics, dorm essentials, and more.  

4. **Community Building**  
   - *Problem:* General marketplaces lack opportunities for fostering connections within the student body.  
   - *Solution:* Peer-to-peer trading strengthens community ties, helping freshmen, exchange students, and graduating seniors connect while exchanging useful items.  

## AI Integration
Our project differentiates itself by embedding **AI-powered features** to enhance usability and security:  
- **Smart Recommendations:** Personalized suggestions based on user preferences and browsing history.  
- **Automatic Categorization:** Upload an image and the AI classifies it (e.g., "textbook", "electronics", "furniture").  


By combining a **student-focused environment** with **AI enhancements**, our platform provides a safe, efficient, and user-friendly way for students to buy, sell, and exchange items within their campus.  

## Team Members
- Kitae Kim (BackEnd)
- Jaeheon Park (FrontEnd)
- Sanghoon Lee (AI)

## Communication
- We are currently using KakaoTalk group chat and Discord to communicate throughout this project. 
- Weekly meetings are done in Discord and is organized in our Jira(https://cse416team2.atlassian.net/jira/software/projects/SCRUM/boards/1?isEligibleForUserSurvey=true) in SCRUM format.
- Additionally using Google Spreadsheet(https://docs.google.com/spreadsheets/d/10OilRI0bsikwDX0O1x3I6PUfb9UkiAZvtaK7O7FDGDs/edit?usp=sharing) to check our individual tasks and progesses.

## Setup Instruction
fall25-cse-416-team2-git-main-g-newbies-projects.vercel.app

There are no specific instruction regarding the setup for this application. You just need to access the link that is attached above to access our application. After accessing, make sure to sign up first to register your user data to our database.

To access the admin account use the following Google account:  
Email: cse416ad@gmail.com  
Password: admin1234!  

## Project Schedule

**Final Release**
   - FrontEnd: Finalize mobile UI and resolve FrontEnd related issues by the final release.
   - BackEnd: Update notification system and test whole system.
   - AI: Upload more items to verify the AI recommendations’ accuracy.

1. Milestone 1
   - FrontEnd: Implementation of Community Page UI with navigation and post structure.
   - BackEnd: Implement core Supabase API connections for posts, users, and items.
   - AI: Prototype automated category & tag generation I (rule-based + keyword extraction).
2. Milestone 2
   - FrontEnd: Develop Marketplace UI (item list, detail view, filter/sort).
   - BackEnd: Extend API endpoints and integrate AI model connections for automated tagging.
   - AI: Implement similar-item recommendation system using embedding similarity.
3. Milestone 3
   - FrontEnd: Complete Profile UI and Chat UI, integrate Supabase Auth state.
   - BackEnd: Add Google OAuth and multi-auth (email, Google) with Supabase.
   - AI: Improve recommendation accuracy and refine tagging pipeline.
4. Milestone 4
   - FrontEnd: UI refinement, mobile responsiveness, final testing.
   - BackEnd: Finalize API, enable monitoring/logging, connect production Supabase.
   - AI: Integrate final AI tagging + recommendation into live app.
   - *Note: Deploy to Vercel + Supabase, conduct beta testing.*

## Bug Tracking
As mentioned in the Communication section, we are currently using the Google Spreadsheet to list the problems with our application. As of current status, we are recommending everyone to use this Spreadsheet to report bugs.