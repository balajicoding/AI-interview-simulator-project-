
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

const SESSION_KEY = 'hireai_current_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  // Load session on mount
  useEffect(() => {
    const initAuth = async () => {
      const savedSession = localStorage.getItem(SESSION_KEY);
      if (savedSession) {
        try {
          const sessionData = JSON.parse(savedSession);
          // Re-verify profile with "DB" to ensure data consistency
          const freshProfile = await db.getProfile(sessionData.id);
          setUser(freshProfile);
        } catch (e) {
          localStorage.removeItem(SESSION_KEY);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const users = await db.getUsers();
      const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      
      if (!found) {
        throw new Error("No account found with this email. Please sign up.");
      }

      const hash = await db.hashPassword(password);
      if (hash !== found.passwordHash) {
        throw new Error("Invalid password. Please check your credentials.");
      }

      const profile = await db.getProfile(found.id);
      setUser(profile);
      localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
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
      if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error("This email is already registered. Try signing in.");
      }

      const id = Date.now().toString();
      const passwordHash = await db.hashPassword(password);
      
      // 1. Save Credentials
      await db.saveUser({ id, email, passwordHash });

      // 2. Create and Save Profile
      const initialProfile: UserProfile = {
        id,
        name,
        email,
        headline: 'Professional Candidate',
        skills: [],
        bio: '',
        avatar: '👤'
      };
      
      await db.updateProfile(initialProfile);

      // 3. Establish Session
      setUser(initialProfile);
      localStorage.setItem(SESSION_KEY, JSON.stringify(initialProfile));
      
      showNotification("Account created! Welcome to HireAI.", "success");
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
      showNotification("Password updated! You can now log in with your new password.", "success");
    } catch (err: any) {
      showNotification("Failed to reset password. Please try again.", "error");
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
    showNotification("You have been signed out.", "info");
  };

  const refreshProfile = async () => {
    if (user) {
      const updated = await db.getProfile(user.id);
      setUser(updated);
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
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
