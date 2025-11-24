import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

// Backend base URL (overridable via Vite env var)
const BACKEND_URL = (import.meta.env?.VITE_BACKEND_URL) || "http://localhost:3000";

/*
 * This provider should export a `user` context state that is 
 * set (to non-null) when:
 *     1. a hard reload happens while a user is logged in.
 *     2. the user just logged in.
 * `user` should be set to null when:
 *     1. a hard reload happens when no users are logged in.
 *     2. the user just logged out.
 */
export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setUser(null);
            return;
        }

        const controller = new AbortController();
        const loadUser = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/user/me`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    signal: controller.signal,
                });
                if (!res.ok) {
                    // Token invalid/expired
                    localStorage.removeItem('token');
                    setUser(null);
                    return;
                }
                const data = await res.json();
                setUser(data.user || null);
            } catch (_) {
                setUser(null);
            }
        };

        loadUser();
        return () => controller.abort();
    }, [])

    /*
     * Logout the currently authenticated user.
     *
     * @remarks This function will always navigate to "/".
     */
    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        navigate("/");
    };

    /**
     * Login a user with their credentials.
     *
     * @remarks Upon success, navigates to "/profile". 
     * @param {string} username - The username of the user.
     * @param {string} password - The password of the user.
     * @returns {string} - Upon failure, Returns an error message.
     */
    const login = async (username, password) => {
        try {
            const res = await fetch(`${BACKEND_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Login failed' }));
                return err.message || 'Login failed';
            }
            const { token } = await res.json();
            if (!token) return 'Invalid response from server';
            localStorage.setItem('token', token);

            // Fetch user profile to populate context
            const me = await fetch(`${BACKEND_URL}/user/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (me.ok) {
                const data = await me.json();
                setUser(data.user || null);
            } else {
                setUser(null);
            }

            navigate('/profile');
            return '';
        } catch (_) {
            return 'Network error during login';
        }
    };

    /**
     * Registers a new user. 
     * 
     * @remarks Upon success, navigates to "/".
     * @param {Object} userData - The data of the user to register.
     * @returns {string} - Upon failure, returns an error message.
     */
    const register = async (userData) => {
        try {
            const res = await fetch(`${BACKEND_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Registration failed' }));
                return err.message || 'Registration failed';
            }
            navigate('/success');
            return '';
        } catch (_) {
            return 'Network error during registration';
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
