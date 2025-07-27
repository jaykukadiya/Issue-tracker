# Issue Tracker Frontend

A modern React.js frontend for the Mini Issue Tracker application, built with Tailwind CSS and featuring a beautiful, responsive design.

## Features

### 🎨 **Modern UI/UX**
- Clean, professional design with Tailwind CSS
- Responsive layout that works on all devices
- Beautiful gradient backgrounds and smooth animations
- Intuitive navigation with breadcrumbs and clear CTAs

### 🔐 **Authentication**
- User registration and login
- JWT token-based authentication
- Protected routes with automatic redirects
- User profile display in navbar

### 📋 **Issue Management**
- **Dashboard**: Overview with statistics and filters
- **Kanban Board**: Drag-and-drop interface for status updates
- **List View**: Traditional table-style issue listing
- **Create/Edit Issues**: Rich form with AI enhancement
- **Status Management**: Open, In Progress, Closed
- **Priority Levels**: Low, Medium, High, Urgent
- **Tags System**: Flexible tagging for organization
- **Assignment**: Assign issues to team members

### 🤖 **AI Integration**
- **Smart Description Enhancement**: Uses LangChain + Google Gemini
- **One-click Enhancement**: Transform rough descriptions into professional ones
- **Revert Option**: Go back to original description if needed
- **Real-time Processing**: Instant AI enhancement with loading states

### 👥 **Team Management**
- **Invite Members**: Send invitations by email
- **Role Management**: Member and Admin roles
- **Team Overview**: View all team members and their status
- **User Assignment**: Assign issues to specific team members

### 🎯 **Advanced Features**
- **Real-time Updates**: Automatic refresh of issue data
- **Search & Filters**: Find issues by title, status, priority
- **Pagination**: Efficient loading of large issue lists
- **Toast Notifications**: User-friendly success/error messages
- **Loading States**: Smooth loading indicators throughout

## Tech Stack

- **React 18**: Latest React with hooks and functional components
- **React Router 6**: Modern routing with protected routes
- **Tailwind CSS**: Utility-first CSS framework
- **React Beautiful DnD**: Drag-and-drop for Kanban board
- **React Hot Toast**: Beautiful toast notifications
- **Lucide React**: Modern icon library
- **Fetch API**: Native browser API for HTTP requests

## Project Structure

```
frontend/
├── public/
│   └── index.html              # HTML template
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── Login.jsx       # Login page
│   │   │   └── Register.jsx    # Registration page
│   │   ├── dashboard/
│   │   │   └── Dashboard.jsx   # Main dashboard
│   │   ├── issues/
│   │   │   ├── IssueCard.jsx   # Issue card component
│   │   │   ├── IssueForm.jsx   # Create/edit issue form
│   │   │   └── KanbanBoard.jsx # Drag-drop Kanban board
│   │   ├── layout/
│   │   │   └── Navbar.jsx      # Navigation bar
│   │   └── team/
│   │       └── TeamManagement.jsx # Team management
│   ├── contexts/
│   │   └── AuthContext.js      # Authentication context
│   ├── services/
│   │   └── api.js              # API service layer
│   ├── App.jsx                 # Main app component
│   ├── index.js                # React entry point
│   └── index.css               # Global styles
├── package.json                # Dependencies
├── tailwind.config.js          # Tailwind configuration
└── postcss.config.js           # PostCSS configuration
```

## Setup Instructions

### Prerequisites
- Node.js 16+ and npm
- Backend API running on http://localhost:8000

### Installation

1. **Navigate to frontend directory**
   ```bash
   cd d:\projects\issue_tracker\frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - The app will automatically proxy API requests to http://localhost:8000

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## API Integration

The frontend integrates with all backend APIs:

### Authentication APIs
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user
- `POST /auth/refresh` - Refresh token

### Issue APIs
- `GET /issues` - Get issues with filters
- `POST /issues` - Create issue (with AI enhancement)
- `GET /issues/{id}` - Get specific issue
- `PUT /issues/{id}` - Update issue
- `DELETE /issues/{id}` - Delete issue
- `GET /issues/assigned/{user_id}` - Get assigned issues

### Team APIs
- `POST /teams/invite` - Invite team member
- `GET /teams/members` - Get team members

### AI APIs
- `POST /ai/enhance-description` - Enhance description with AI

## Key Features Explained

### 🎨 **Design System**
- **Color Palette**: Primary blue, success green, warning yellow, danger red
- **Typography**: Inter font for modern, clean text
- **Spacing**: Consistent 4px grid system
- **Shadows**: Subtle shadows for depth and hierarchy

### 🔄 **State Management**
- **React Context**: For global authentication state
- **Local State**: Component-level state with hooks
- **API State**: Managed through service layer with error handling

### 📱 **Responsive Design**
- **Mobile-first**: Designed for mobile and scaled up
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Adaptive Layout**: Components adapt to screen size

### 🚀 **Performance**
- **Code Splitting**: Automatic with React Router
- **Lazy Loading**: Components loaded on demand
- **Optimized Images**: Proper image optimization
- **Bundle Size**: Optimized with tree shaking

## Usage Guide

### Getting Started
1. **Register**: Create a new account
2. **Login**: Sign in with your credentials
3. **Dashboard**: View your issues and statistics
4. **Create Issue**: Click "New Issue" to create
5. **AI Enhancement**: Use the AI button to improve descriptions
6. **Kanban Board**: Drag issues between columns
7. **Team**: Invite team members via email

### Best Practices
- Use descriptive issue titles
- Leverage AI enhancement for better descriptions
- Assign issues to appropriate team members
- Use tags for better organization
- Update status regularly via drag-and-drop

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Follow the existing code style
2. Use functional components with hooks
3. Implement proper error handling
4. Add loading states for async operations
5. Ensure responsive design
6. Test on multiple browsers

## License

MIT License
