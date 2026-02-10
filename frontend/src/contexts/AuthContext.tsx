import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface User {
  id: string;
  email: string;
  full_name?: string;
  is_verified: boolean;
}

interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load tokens from localStorage on mount
  useEffect(() => {
    const storedTokens = localStorage.getItem('auth_tokens');
    if (storedTokens) {
      const parsedTokens = JSON.parse(storedTokens);
      setTokens(parsedTokens);
      fetchCurrentUser(parsedTokens.access_token);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Save tokens to localStorage when they change
  useEffect(() => {
    if (tokens) {
      localStorage.setItem('auth_tokens', JSON.stringify(tokens));
    } else {
      localStorage.removeItem('auth_tokens');
    }
  }, [tokens]);

  const fetchCurrentUser = async (accessToken: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch current user:', error);
      setTokens(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    const response = await axios.post(`${API_BASE_URL}/auth/login`, formData);
    const { access_token, refresh_token, user: userData } = response.data;

    setTokens({ access_token, refresh_token });
    setUser(userData);
  };

  const register = async (email: string, password: string, fullName?: string) => {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, {
      email,
      password,
      full_name: fullName
    });
    const { access_token, refresh_token, user: userData } = response.data;

    setTokens({ access_token, refresh_token });
    setUser(userData);
  };

  const logout = () => {
    // Optionally call backend to revoke refresh token
    if (tokens?.refresh_token) {
      axios.post(`${API_BASE_URL}/auth/logout`, {
        refresh_token: tokens.refresh_token
      }).catch(err => console.error('Logout error:', err));
    }

    setTokens(null);
    setUser(null);
  };

  const getAccessToken = () => tokens?.access_token || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        getAccessToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
