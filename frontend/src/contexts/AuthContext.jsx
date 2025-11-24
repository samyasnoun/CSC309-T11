// frontend/src/contexts/AuthContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);

// Backend base URL (overridable via Vite env var)
const BACKEND_URL =
  import.meta.env?.VITE_BACKEND_URL || "http://localhost:3000";

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  /*
   * On mount / hard reload:
   *  - If a token exists, fetch /user/me and set user.
   *  - If no token, ensure user is null.
   */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      return;
    }

    const controller = new AbortController();

    const loadUser = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/user/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (!res.ok) {
          // Token invalid or expired
          localStorage.removeItem("token");
          setUser(null);
          return;
        }

        const data = await res.json();
        setUser(data.user || null);
      } catch {
        // Network or other error
        setUser(null);
      }
    };

    loadUser();

    return () => controller.abort();
  }, [BACKEND_URL]);

  /*
   * Logout the currently authenticated user.
   * Always navigates to "/".
   */
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/");
  };

  /**
   * Login a user with their credentials.
   *
   * On success:
   *   - Stores token in localStorage (key: "token")
   *   - Fetches /user/me and sets user
   *   - Navigates to "/profile"
   *
   * On failure:
   *   - Returns an error message string (do NOT navigate)
   */
  const login = async (username, password) => {
    try {
      const res = await fetch(`${BACKEND_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({
          message: "Login failed",
        }));
        return err.message || "Login failed";
      }

      const { token } = await res.json();
      if (!token) return "Invalid response from server";

      localStorage.setItem("token", token);

      // Fetch profile
      const meRes = await fetch(`${BACKEND_URL}/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (meRes.ok) {
        const data = await meRes.json();
        setUser(data.user || null);
      } else {
        setUser(null);
      }

      navigate("/profile");
      return "";
    } catch {
      return "Network error during login";
    }
  };

  /**
   * Register a new user.
   *
   * Expects an object:
   *   { username, firstname, lastname, password }
   *
   * On success:
   *   - Navigates to "/success"
   * On failure:
   *   - Returns an error message string
   */
  const register = async ({ username, firstname, lastname, password }) => {
    try {
      const res = await fetch(`${BACKEND_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, firstname, lastname, password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({
          message: "Registration failed",
        }));
        return err.message || "Registration failed";
      }

      navigate("/success");
      return "";
    } catch {
      return "Network error during registration";
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
