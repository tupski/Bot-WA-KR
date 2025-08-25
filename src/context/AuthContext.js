import React, { createContext, useContext, useState, useEffect } from 'react';
import AuthService from '../services/AuthService';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const user = await AuthService.loadUserFromStorage();
      console.log('AuthContext: Current user loaded:', user);
      setCurrentUser(user);
    } catch (error) {
      console.error('AuthContext: Auth check error:', error);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials, userType = 'admin') => {
    try {
      let result;
      if (userType === 'admin') {
        result = await AuthService.loginAdmin(credentials.username, credentials.password);
      } else {
        result = await AuthService.loginFieldTeam(credentials.username, credentials.password);
      }

      if (result.success) {
        setCurrentUser(result.user);
        return { success: true, user: result.user };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      return { success: false, message: 'Terjadi kesalahan saat login' };
    }
  };

  const logout = async () => {
    try {
      const result = await AuthService.logout();
      if (result.success) {
        setCurrentUser(null);
        return { success: true };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('AuthContext: Logout error:', error);
      return { success: false, message: 'Terjadi kesalahan saat logout' };
    }
  };

  const value = {
    currentUser,
    loading,
    login,
    logout,
    checkAuthState,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
