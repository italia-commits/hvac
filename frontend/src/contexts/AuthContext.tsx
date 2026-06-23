import { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'company_admin' | 'manager' | 'technician' | 'dispatcher';
  companyId: string;
  companyName?: string;
  avatar?: string;
}

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const data = response.data;

    if (data.requiresTwoFactor) {
      return { requiresTwoFactor: true, tempToken: data.tempToken };
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return {};
  };

  const verifyTwoFactor = async (code: string, tempToken: string) => {
    const response = await api.post('/auth/2fa/verify', { code, tempToken });
    const data = response.data;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (data: { name: string; email: string; password: string; companyName: string }) => {
    await api.post('/auth/register', data);
  };

  const logout = () => {
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