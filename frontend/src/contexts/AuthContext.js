import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import ApiService from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);

  const checkAuthStatus = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      try {
        ApiService.setToken(storedToken);
        const userData = await ApiService.getCurrentUser();
        setUser(userData);
        setIsAuthenticated(true);
        setToken(storedToken);
      } catch (error) {
        console.error('Auth check failed:', error);
        logout();
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = async (credentials) => {
    try {
      const response = await ApiService.login(credentials);
      const { access_token } = response;
      
      ApiService.setToken(access_token);
      const userData = await ApiService.getCurrentUser();
      
      setUser(userData);
      setIsAuthenticated(true);
      setToken(access_token);
      toast.success('Login successful!');
      
      return { success: true };
    } catch (error) {
      toast.error(error.message || 'Login failed');
      return { success: false, error: error.message };
    }
  };

  const register = async (userData) => {
    try {
      await ApiService.register(userData);
      toast.success('Registration successful! Please log in.');
      return { success: true };
    } catch (error) {
      toast.error(error.message || 'Registration failed');
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    ApiService.clearToken();
    setUser(null);
    setIsAuthenticated(false);
    setToken(null);
    toast.success('Logged out successfully');
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
