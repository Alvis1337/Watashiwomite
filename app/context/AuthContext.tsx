'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();

        if (data.isAuthenticated && data.authToken) {
          setAccessToken(data.authToken);
        } else {
          setAccessToken(null);
        }
      } catch (error) {
        console.error('[AuthContext] Auth check failed:', error);
        setAccessToken(null);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  const isAuthenticated = Boolean(accessToken);

  const updateAccessToken = (token: string | null) => {
    setAccessToken(token);
  };

  const logout = () => {
    setAccessToken(null);
    window.location.href = '/api/auth/logout';
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading: isCheckingAuth, accessToken, setAccessToken: updateAccessToken, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
