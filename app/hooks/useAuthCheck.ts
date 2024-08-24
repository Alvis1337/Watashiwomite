import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext'; // Adjust the import based on your file structure

const useAuthCheck = () => {
    const { setAccessToken, isAuthenticated } = useAuth();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch('/api/auth/check');
                const data = await response.json();

                if (data.isAuthenticated) {
                    setAccessToken(document.cookie.split('; ').find(row => row.startsWith('authToken='))?.split('=')[1] || null);
                } else {
                    setAccessToken(null);
                }
            } catch (error) {
                console.error('Failed to check authentication status:', error);
                setAccessToken(null);
            }
        };

        checkAuth();
    }, [setAccessToken, isAuthenticated]);
};

export default useAuthCheck;
