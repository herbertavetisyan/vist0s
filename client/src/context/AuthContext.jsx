import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('vistos_token') || null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // In a real app we would validate the token against a /me endpoint
        if (token) {
            try {
                // Mock user details based on existence of token for the UI scaffold
                const mockUser = {
                    id: 'admin-id',
                    firstName: 'System',
                    lastName: 'Admin',
                    email: 'admin@vist.am',
                    tenantName: 'VistOS Demo Bank'
                };
                setUser(mockUser);
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            } catch (err) {
                logout();
            }
        }
        setIsLoading(false);
    }, [token]);

    const login = async (email, password) => {
        try {
            const response = await api.post('/auth/login', { email, password });
            const { token, user } = response.data;

            localStorage.setItem('vistos_token', token);
            setToken(token);
            setUser(user);
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            return true;
        } catch (error) {
            console.error('Login error', error);
            throw new Error(error.response?.data?.error || 'Login failed');
        }
    };

    const logout = () => {
        localStorage.removeItem('vistos_token');
        setToken(null);
        setUser(null);
        delete api.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
