import React, { createContext, useContext, useEffect, useState} from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

// Get the backend URL from environment variables
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

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
        // Check if user is logged in by retrieving token from localStorage
        const token = localStorage.getItem('token');
        
        if (token) {
            // Fetch user data from backend
            fetch(`${BACKEND_URL}/user/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    // Token is invalid, remove it
                    localStorage.removeItem('token');
                    throw new Error('Invalid token');
                }
            })
            .then(data => {
                setUser(data.user);
            })
            .catch(error => {
                console.error('Error fetching user:', error);
                setUser(null);
            });
        } else {
            setUser(null);
        }
    }, [])

    /*
     * Logout the currently authenticated user.
     *
     * @remarks This function will always navigate to "/".
     */
    const logout = () => {
        // Remove token from localStorage
        localStorage.removeItem('token');
        // Set user to null
        setUser(null);
        // Navigate to home
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
            const response = await fetch(`${BACKEND_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                // Return error message
                return data.message || 'Login failed';
            }

            // Store token in localStorage
            localStorage.setItem('token', data.token);

            // Fetch user data
            const userResponse = await fetch(`${BACKEND_URL}/user/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${data.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const userData = await userResponse.json();
            
            if (userResponse.ok) {
                // Update user context state
                setUser(userData.user);
                // Navigate to profile
                navigate("/profile");
            }
        } catch (error) {
            console.error('Login error:', error);
            return 'An error occurred during login';
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
            const response = await fetch(`${BACKEND_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (!response.ok) {
                // Return error message
                return data.message || 'Registration failed';
            }

            // Navigate to success page
            navigate("/success");
        } catch (error) {
            console.error('Registration error:', error);
            return 'An error occurred during registration';
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
