import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useWebSocketNotifications, useIssueAssignmentNotifications } from './hooks/useWebSocketNotifications';


// Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import IssuesPage from './components/issues/IssuesPage';
import IssueForm from './components/issues/IssueForm';
import TeamManagement from './components/team/TeamManagement';
import Navbar from './components/layout/Navbar';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Public Route Component (redirects to dashboard if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return isAuthenticated ? <Navigate to="/dashboard" /> : children;
};

// WebSocket Provider Component
const WebSocketProvider = ({ children }) => {
  const navigate = useNavigate();
  
  // Initialize WebSocket connection
  useWebSocketNotifications();
  
  // Handle issue assignment notifications
  useIssueAssignmentNotifications((data, action) => {
    if (action === 'click') {
      // Navigate to the assigned issue when notification is clicked
      navigate(`/issues`);
    }
  });
  
  return children;
};

// Layout Component
const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>{children}</main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <WebSocketProvider>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route 
                path="/login" 
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                } 
              />
              <Route 
                path="/register" 
                element={
                  <PublicRoute>
                    <Register />
                  </PublicRoute>
                } 
              />

              {/* Protected Routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/issues" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <IssuesPage />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/issues/new" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <IssueForm mode="create" />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/issues/:id/edit" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <IssueForm mode="edit" />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/team" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <TeamManagement />
                    </Layout>
                  </ProtectedRoute>
                } 
              />

              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/dashboard" />} />
              
              {/* 404 Route */}
              <Route 
                path="*" 
                element={
                  <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                      <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                      <p className="text-gray-600 mb-8">Page not found</p>
                      <a href="/dashboard" className="btn-primary">
                        Go to Dashboard
                      </a>
                    </div>
                  </div>
                } 
              />
            </Routes>
            
            {/* Toast Notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  theme: {
                    primary: '#4ade80',
                  },
                },
                error: {
                  duration: 5000,
                  theme: {
                    primary: '#ef4444',
                  },
                },
              }}
            />
          </div>
        </WebSocketProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;
