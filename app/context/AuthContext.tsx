"use client"
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie'; 

interface AuthContextType {
    isAuthenticated: boolean;
    accessToken: string | null;
    setAccessToken: (token: string | null) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [accessToken, setAccessToken] = useState<string | null>(null);

    useEffect(() => {
        const token = Cookies.get('accessToken');
        if (token) {
            setAccessToken(token);
        }
    }, []);

    const isAuthenticated = Boolean(accessToken);

    const updateAccessToken = (token: string | null) => {
        if (token) {
            setAccessToken(token)
        } else {
            setAccessToken(null)
        }
        setAccessToken(token);
    };

    const logout = () => {
        Cookies.remove('accessToken');
        setAccessToken(null);
        window.location.href = 'api/auth/logout'; 
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, accessToken, setAccessToken: updateAccessToken, logout }}>
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
