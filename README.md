# Mealtastic

## Links

- **Deployed URL:** [mealtastic.me](https://mealtastic.me)
- **Video URL:** [Youtube Video](https://youtu.be/oQpOkDBTdyM)

## Project Description

Mealtastic is an all-in-one meal-prep management app designed to streamline the cooking experience from planning to execution. It's as a platform where users can discover new recipes, organize their weekly meal plans, and automatically generate shopping lists based on their plans. It also includes a social aspect with our "Cook Rooms" feature, allowing users to join live, interactive cooking sessions via video chat to follow recipes together in real-time. The application also personalizes the experience by accounting for dietary preferences and allergies, ensuring every meal fits the user's wants and needs.

## Development

### Database 
For the database, we decided to use a **PostgreSQL** database server to practice the use of SQL queries since we’ve already used a NoSQL database in the course for all of our other assignments/labs.

### Programming Language
For the sake of gaining experience and adding a layer of challenge we decided to use TypeScript for both frontend and backend.

### Frameworks
For the backend, we’ve decided to continue using Express for simplicity and familiarity. For the frontend, we decided to use Next.js because of our previous experience and because it is the industry's most current and maintained React framework, giving us a lot of flexibility.

### Backend

- **Libraries & Tools:**
    - **`express-memcached`:** Since we’re using an external API as our main source of recipes (outside of users uploading them), we have a memcached server also running to hold recipes that we store in the database that come from spoonacular fetches to make queries and fetching from the backend quick. To access this server we use the memcached express package of course.
    - **`passport` & `passport-google-oauth20`:** Since Google OAuth was needed for this project, the passport package was needed to help handle the user logging in using Google. We provide the passport with the strategy (which comes from the google oauth2.0 passport package and that we initiate by providing our google project credentials and callback url) to use when the user invokes the /auth/google route. The passport also allows us to store the userID in the session (unfortunately since we stuck by the strategy of storing the userID in req.session and not req.user like the passport does we were forced to add some logic in the auth callback route that would copy what was in req.user into req.session so our authentication wouldn’t break everywhere else).
    - **`express-validator`:** Used to sanitize and validate all incoming request bodies, queries, and params to ensure data integrity.
    - **`pg` (node-postgres):** Used as our PostgreSQL client for connecting to the database, executing queries, and managing connection pools.
- **Built-In WebAPIs:**
    - **WebRTC:** We used the native WebRTC API to build the P2P mesh network for the Cook Rooms. We handled the connection creation, signaling (offers/answers), and ICE candidates manually without external libraries.
- **Folder Structure:**
In the `src` folder we separated the app, routing, config, middleware and controllers by feature to make the project more modular: 
    - **`app.ts`:** contains application configuration and server startup.
    - **`db.ts`:** configures the PostgreSQL connection pool that is used throughout the backend.
    - **`config/`:** contains the configuration of the memcached object and declaration of the functions to be used for getting and setting key value pairs in the cache. It also contains the configuration of the passport object that will be used for google authentication.
    - **`routes/`:** contains the files that define the API endpoints and attaches middleware.
    - **`middleware/`:** contains the files that define authentication checks and input validation logic.
    - **`controllers/`:** contains the files for request handling logic and response creation.
    - **`queries/`:** contains files that define SQL query definitions separated by feature.

### Frontend

- **Component Library & Styling:** We implemented **Shadcn UI** combined with **Tailwind CSS**. This provided us with accessible, pre-built UI components (e.g. Cards, Dialogs, and Forms) that we could easily customize to match our styles. We also used **Lucide React** to create icons (e.g. ChefHat, Plus, Chevron, etc..). 
- **Global State Management:** We used **Zustand** for global state management, specifically handling authentication states to ensure user sessions were synchronized across the application without prop drilling.
- **WebRTC Client Logic:** The most complex frontend component is the `RoomPage`.  We used the native WebRTC APIs to handle the connections. The frontend handles the negotiation process (creating offers/answers) and manages the ICE candidate exchange via long-polling. 
-  **Folder Structure:**  the frontend is organized within the `src` directory, following Next.js App Router conventions: 
	- **`app/`:** contains the application routes and pages. Standard Next.js App Router.
	- **`components/`:** divided into feature-specific subdirectories (e.g., `recipes/`, `layout/`) and a `ui/` folder for Shadcn components. 
	- **`lib/`:** core non-UI logic 
		- **`api/`:** centralized API fetch functions for communicating with the backend. 
		- **`hooks/`:** custom React hooks for reusable state logic. 
	- **`store/`:** global store for Zustand
	- **`types/`:** shared TypeScript interfaces and types

## Deployment

We deployed the application using Docker, similar to the assignments but changed for a TypeScript/Next.js environment:
1.  we’re using typescript for both our frontend and backend which needs to be built before being ran
2.  we’re using react.js for our frontend which is it’s own server (compared to the backend being a server and just serving static files for frontend)
3.  we’re using psql as our db and memcached for caching both of which will be containers

In total, we have 6 services running:

- **Proxy Layer:** Identically to HW3, we used `nginx-proxy` and `acme-companion` to for reverse proxying and automating SSL certificate generation for our custom domain, **mealtastic.me**.
- **Frontend Service:** Unlike a static build (like in previous assignments), our Frontend is a running Next.js server container (virtual port 3000) to support SSR features.
- **Backend Service:** The Node/Express server runs on virtual port 3001, communicating internally with the database and cache.
- **Data Services:** `PostgreSQL` (port 5432) and `Memcached` (port 11211) run as internal containers, accessible only to the backend.

**Build Process:**
As mentioned previously there are two steps for running the frontend and backend:
1.  **Builder Stage:** copies `package.json` and all the source files (typescript files), installs all dependencies, and runs the TypeScript compilation build script to get JavaScript files we can run for production.
2.  **Runner Stage:** copies`package.json` and only the necessary compiled files and production dependencies from the builder stage to execute the run command for both the frontend and backend servers.

## Challenges

1.  **WebRTC and Long Polling:**
    For the project, we decided to include a P2P mesh chatroom that allows users to cook together. The flow of a P2P mesh is straightforward in theory, but implementing the signaling via Long Polling instead of WebSockets was a major hurdle. We had to carefully manage race conditions where ICE candidates would arrive before the remote description was set. We solved this by implementing a queuing system (`pendingCandidates` ref) to store candidates and flush them only once the connection state was ready.

2.  **Working with 3rd Party APIs (Spoonacular) & Rate Limits:**  
    We relied on the Spoonacular API for our recipe data. However, the free tier has strict daily rate limits. To prevent our application from breaking or running out of requests during development and demos, we implemented a caching layer using Memcached. This allowed us to store API responses for popular searches and recipes, significantly reducing the number of outgoing calls to Spoonacular and improving response times for the user. 

3.  **End-To-End Integration of The Meal Planner**
    The Meal Planner was the hardest feature to build because it connects everything else in the app. It linked the Recipe search, the automatic planning algorithm, and the Shopping List generator into one screen. We had to write a lot of logic to handle these different actions so users could generate a full week, swap a single meal, or export to their calendar on this single page.
    
## Contributions

- **Jean Luc:** Backend Architecture, Authentication (Backend), Shopping List (Backend/Frontend), Rooms (Backend/Frontend), Deployment (Environment Setup, Domain & SSL).
- **Andy:** Frontend Architecture, Authentication (Frontend), Recipes (Frontend + some Backend), Meal Planner (Frontend), Preferences (Full Stack), Rooms (Frontend UI & Integration), Deployment (CI/CD GitHub Actions).
- **Ramim:** Meal Planner (Backend), Shopping List (Backend).

## One more thing?
