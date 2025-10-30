
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { authService, LoginCredentials } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: LoginCredentials) => Promise<void>; // Assuming same credentials for simplicity
  logout: () => Promise<void>; // Made logout async to match typical API calls
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start with loading true
  const [error, setError] = useState<string | null>(null);

  const checkUserSession = useCallback(async () => {
    setIsLoading(true);
    try {
      // In a real app, you might verify a token with a backend here
      // For this demo, we'll check if a user was previously "logged in" (e.g., via localStorage if implemented)
      // Since we are using in-memory, this will always result in no user on refresh unless modified.
      // Let's simulate checking a token from localStorage for a more realistic feel.
      const storedUser = localStorage.getItem('authUser');
      if (storedUser) {
        const parsedUser: User = JSON.parse(storedUser);
        // Optionally, validate token with backend here
        setUser(parsedUser);
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error("Failed to check user session:", e);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkUserSession();
  }, [checkUserSession]);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const loggedInUser = await authService.login(credentials);
      setUser(loggedInUser);
      localStorage.setItem('authUser', JSON.stringify(loggedInUser)); // Persist user
    } catch (err) {
      setError((err as Error).message || 'Ошибка входа');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const registeredUser = await authService.register(credentials);
      setUser(registeredUser);
      localStorage.setItem('authUser', JSON.stringify(registeredUser)); // Persist user
    } catch (err) {
      setError((err as Error).message || 'Ошибка регистрации');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.logout();
      setUser(null);
      localStorage.removeItem('authUser'); // Clear persisted user
    } catch (err) {
      setError((err as Error).message || 'Ошибка выхода');
      throw err; 
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};