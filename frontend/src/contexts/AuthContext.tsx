import { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api';
import type { User } from '../lib/api-types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ requiresTwoFactor?: boolean; tempToken?: string }>;
  verifyTwoFactor: (code: string, tempToken: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; companyName: string }) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
  requiresTwoFactor?: boolean;
  tempToken?: string;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore from localStorage and verify token
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
        // Silently verify the token is still valid
        api.get('/auth/me').catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        });
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    const data = response.data;

    if (data.requiresTwoFactor) {
      return { requiresTwoFactor: true, tempToken: data.tempToken };
    }

    const accessToken = data.accessToken;
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(accessToken);
    setUser(data.user);
    return {};
  };

  const verifyTwoFactor = async (code: string, tempToken: string) => {
    const response = await api.post<LoginResponse>('/auth/login/2fa', { code, tempToken });
    const data = response.data;
    const accessToken = data.accessToken;
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(accessToken);
    setUser(data.user);
  };

  const register = async (regData: { name: string; email: string; password: string; companyName: string }) => {
    await api.post('/auth/register', regData);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore - we clear locally regardless
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const forgotPassword = async (email: string) => {
    await api.post('/auth/forgot-password', { email });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        verifyTwoFactor,
        register,
        logout,
        forgotPassword,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}