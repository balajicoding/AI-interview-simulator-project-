
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, UserProfile } from '../services/databaseService';
import { useNotification } from './NotificationContext';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string, newPassword: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  useEffect(() => {
    const savedUser = localStorage.getItem('hireai_current_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const users = await db.getUsers();
      const found = users.find((u) => u.email === email);
      
      if (!found) {
        throw new Error("No account found with this email.");
      }

      const hash = await db.hashPassword(password);
      if (hash !== found.passwordHash) {
        throw new Error("Invalid password. Please try again.");
      }

      const profile = await db.getProfile(found.id);
      setUser(profile);
      localStorage.setItem('hireai_current_user', JSON.stringify(profile));
      showNotification(`Welcome back, ${profile.name}!`, 'success');
    } catch (err: any) {
      showNotification(err.message, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      const users = await db.getUsers();
      if (users.some((u) => u.email === email)) {
        throw new Error("Email already registered.");
      }

      const id = Date.now().toString();
      const passwordHash = await db.hashPassword(password);
      
      await db.saveUser({ id, email, passwordHash });

      const initialProfile: UserProfile = {
        id,
        name,
        email,
        headline: 'New Candidate',
        skills: [],
        bio: '',
        avatar: '👤'
      };
      
      await db.updateProfile(initialProfile);
      setUser(initialProfile);
      localStorage.setItem('hireai_current_user', JSON.stringify(initialProfile));
      showNotification("Account created successfully!", "success");
    } catch (err: any) {
      showNotification(err.message, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string, newPassword: string) => {
    try {
      const newHash = await db.hashPassword(newPassword);
      await db.updatePassword(email, newHash);
      showNotification("Password reset successful.", "success");
    } catch (err: any) {
      showNotification("Failed to reset password.", "error");
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('hireai_current_user');
    showNotification("Signed out successfully.", "info");
  };

  const refreshProfile = async () => {
    if (user) {
      const updated = await db.getProfile(user.id);
      setUser(updated);
      localStorage.setItem('hireai_current_user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, resetPassword, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
