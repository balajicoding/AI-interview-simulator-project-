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

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const generateUserId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString();
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  // Load session on mount
  useEffect(() => {
    const initAuth = async () => {
      const session = db.getSession();
      if (session) {
        try {
          const freshProfile = await db.getProfile(session.userId);
          setUser(freshProfile);
        } catch {
          db.clearSession();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const normalizedEmail = normalizeEmail(email);
      const users = await db.getUsers();
      const found = users.find((u) => normalizeEmail(u.email) === normalizedEmail);

      if (!found) {
        throw new Error('No account found with this email. Please sign up.');
      }

      const hash = await db.hashPassword(password);
      if (hash !== found.passwordHash) {
        throw new Error('Invalid password. Please check your credentials.');
      }

      const profile = await db.getProfile(found.id);
      setUser(profile);
      db.saveSession(profile.id);
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
      const normalizedEmail = normalizeEmail(email);
      const normalizedName = name.trim();
      if (!normalizedName) {
        throw new Error('Name is required.');
      }

      const users = await db.getUsers();
      if (users.some((u) => normalizeEmail(u.email) === normalizedEmail)) {
        throw new Error('This email is already registered. Try signing in.');
      }

      const id = generateUserId();
      const passwordHash = await db.hashPassword(password);

      // 1. Save credentials
      await db.saveUser({ id, email: normalizedEmail, passwordHash });

      // 2. Create and save profile
      const initialProfile: UserProfile = {
        id,
        name: normalizedName,
        email: normalizedEmail,
        headline: 'Professional Candidate',
        skills: [],
        bio: '',
        avatar: 'U'
      };

      await db.updateProfile(initialProfile);

      // 3. Establish session
      setUser(initialProfile);
      db.saveSession(initialProfile.id);

      showNotification('Account created! Welcome to HireAI.', 'success');
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
      showNotification('Password updated! You can now log in with your new password.', 'success');
    } catch {
      showNotification('Failed to reset password. Please check the email and try again.', 'error');
    }
  };

  const logout = () => {
    setUser(null);
    db.clearSession();
    showNotification('You have been signed out.', 'info');
  };

  const refreshProfile = async () => {
    if (!user) return;
    const updated = await db.getProfile(user.id);
    setUser(updated);
    db.saveSession(updated.id);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, resetPassword, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
