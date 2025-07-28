# 🚀 Issue Tracker

This is a full-stack issue tracking system, similar to a simplified Jira, built with a modern technology stack. It allows users to manage projects by creating teams, assigning issues, and tracking their progress on a real-time Kanban-style board.

## 🧩 1. Project Overview

Issue Tracker is designed to provide a seamless and collaborative environment for development teams. It helps in organizing tasks, monitoring progress, and ensuring clear communication through a clean and intuitive interface.

### Core Features

- **Team Management**: Create teams, add members, and manage them with distinct roles (Admin/Member).
- **Real-time Notifications**: Instant notifications for issue assignments and updates via WebSockets.
- **Kanban-Style Board**: A drag-and-drop interface to visualize workflow and update issue statuses (OPEN, IN_PROGRESS, CLOSED).
- **AI-Powered Descriptions**: Integration with Google Gemini to automatically enhance and professionalize issue descriptions from rough notes.

---

## 2. UI Workflow (User Journey)

The user journey is designed to be intuitive, from team setup to daily task management.

1.  **Authentication**: User registers or logs into the application.
2.  **Team Creation**: 
    - The user navigates to the 'Teams' page.
    - Clicks on "Create Team" and provides a team name.
    - The creator is assigned the **Admin** role for that team.
3.  **Inviting Members**:
    - The Team Admin can go to the team management page.
    - They can add user by their username to the team.
4.  **Creating an Issue**:
    - On the dashboard, the user clicks "Create Issue".
    - They must first select a team from a dropdown of teams they belong to.
    - After selecting a team, the 'Assignee' dropdown is populated with members of that team.
    - The user fills in the title, description, and optionally assigns it to a team member.
5.  **AI Description Enhancement**:
    - While creating an issue, the user can type a brief, rough description.
    - By clicking the "Enhance with AI" button, the text is sent to the Google Gemini API, which returns a well-structured and detailed description with markdown support.
6.  **Real-time Notifications**:
    - When an issue is assigned to a user, they receive an instant notification in the UI without needing to refresh the page.
7.  **Kanban Board Interaction**:
    - The main dashboard displays all issues in a Kanban board with columns for each status.
    - The board updates in real-time as new issues are created or statuses change.
    - Users can drag and drop an issue card from one column to another (e.g., 'OPEN' to 'IN_PROGRESS') to update its status.

---

## 3. Project Setup Instructions

Follow these instructions to set up and run the project locally.

### Frontend Setup

- **Technologies**: React.js, Tailwind CSS, WebSockets (Socket.IO client)

1.  **Navigate to the frontend directory**:
    ```bash
    cd frontend
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Create a `.env` file** in the `frontend` root and add the following variables:
    ```env
    REACT_APP_API_BASE_URL=http://127.0.0.1:8000
    REACT_APP_WS_URL=ws://127.0.0.1:8000
    ```
4.  **Run the development server**:
    ```bash
    npm start
    ```

### Backend Setup

- **Technologies**: FastAPI, Pydantic, Motor (async MongoDB driver), MongoDB

1.  **Navigate to the backend directory**:
    ```bash
    cd backend
    ```
2.  **Install Python dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
3.  **Set up MongoDB Database**:
    Before running the backend, you need a running MongoDB instance.

    - **Install MongoDB Community Server**:
      First, download and install MongoDB Community Server from the [official MongoDB website](https://www.mongodb.com/try/download/community). Follow the installation instructions for your operating system to set up the database server.

    - **Manage with MongoDB Compass**:
      For a user-friendly experience when viewing or managing your data, we recommend [MongoDB Compass](https://www.mongodb.com/products/compass). It's a powerful GUI that allows you to interact with your database. After installing MongoDB Server, you can download Compass and connect to your local instance (e.g., `mongodb://localhost:27017`) to get started.

4.  **Create a `.env` file** in the `backend` root and add the following variables:
    ```env
    MONGO_DB_URL="mongodb://localhost:27017/issue_tracker"
    JWT_SECRET_KEY="your-super-secret-jwt-key"
    GOOGLE_API_KEY="your-google-gemini-api-key"
    ```
    can copy from the .env.example file
5.  **Run the backend server**:
    ```bash
    uvicorn main:app --reload
    ```

---

## 4. API Reference (Backend)

Key API endpoints that power the application:

- `POST /teams/create`: Creates a new team with the authenticated user as the admin.
- `POST /teams/invite`: Invites a registered user to a team. (Admin only).
- `POST /issues/create`: Creates a new issue within a specified team.
- `GET /issues`: Fetches issues, can be filtered by team or assignee.
- `PATCH /issues/{issue_id}/status`: Updates the status of a specific issue.
- `GET /notifications`: Fetches all notifications for the authenticated user.
- `WS /ws/notifications/{user_id}`: WebSocket endpoint for pushing real-time notifications to the client.

---

## 5. AI Integration

This project leverages AI to improve user experience and productivity.

- **Google Gemini API**: Used for enhancing issue descriptions. When a user writes a description, they can click a button to have the AI refine it. This turns basic notes into a clear, professional, and actionable description, saving time and improving clarity for the entire team.

This feature is available in the issue creation/editing form and provides a significant quality-of-life improvement.

---

## 6. MongoDB Queries

MongoDB is used as the primary database, accessed via the async `motor` driver.

- **Document Schemas**: Collections for `users`, `teams`, and `issues` with structured, Pydantic-validated schemas.
- **Query Types**:
    - **Insert/Update**: Used for creating and modifying users, teams, and issues.
    - **Aggregation**: Used to perform complex lookups, such as fetching issues for a team and populating assignee details.
- **Indexing**: Indexes are used on fields like `username`, `email`, and `team_id` to ensure fast query performance.
- **Team-Based Filtering**: Most queries for issues are filtered by `team_id` to ensure data isolation and relevance.

---

## 7. Tooling and Stack

- **Frontend**: React, Tailwind CSS, Socket.IO Client
- **Backend**: FastAPI, Pydantic, Motor
- **Database**: MongoDB
- **Realtime**: FastAPI WebSockets
- **AI**: Google Gemini API
- **Authentication**: JWT (JSON Web Tokens)
---

## 8. Known Limitations

- **Simple Role System**: Access control is limited to 'Admin' and 'Member' roles without fine-grained permissions.
- **Security**: The Google Gemini API key is managed via backend environment variables but requires secure storage and rotation policies in a production environment.
- **AI Error Handling**: If the AI enhancement fails, user have option to revert back to their passed text.
- **Scalability**: The current WebSocket implementation manages connections in-memory, which may not be suitable for large-scale, multi-instance deployments without a message broker like Redis.
- **Features**: The system currently has limited features, but future improvements can be made by adding:
  - Comments and attachments to issues
  - Duplicate issue detection using AI
  - Reporter, sprint, and affected version options
  - Option to attach PR links to track code changes related to the issue
---

## ✅ Final Note

### Contributing
Contributions are welcome! Please feel free to submit a pull request or open an issue for any bugs or feature requests.

### Future Roadmap
- [ ] Implement a more granular permission system with roles and scopes.
- [ ] Add support for Markdown formatting in issue descriptions.
- [ ] Integrate a full-text search engine for efficient searching of issues.
- [ ] Improve the UI/UX for mobile devices.
- [ ] Add support for comments and attachments to issues.
- [ ] Implement duplicate issue detection using AI.
- [ ] Add fields for reporter, sprint, and affected version.
- [ ] Allow attaching PR links to track code changes related to the issue.
