
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, UserProfile } from '../services/databaseService';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string) => Promise<void>;
  signup: (name: string, email: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('hireai_current_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string) => {
    setLoading(true);
    // Simulate finding user in MongoDB
    const users = await db.getUsers();
    const found = users.find((u: any) => u.email === email);
    
    if (found) {
      const profile = await db.getProfile(found.id);
      setUser(profile);
      localStorage.setItem('hireai_current_user', JSON.stringify(profile));
    } else {
      throw new Error("User not found. Please sign up.");
    }
    setLoading(false);
  };

  const signup = async (name: string, email: string) => {
    setLoading(true);
    const users = await db.getUsers();
    if (users.some((u: any) => u.email === email)) {
      throw new Error("Email already registered.");
    }

    const id = Date.now().toString();
    const newUser = { id, email };
    users.push(newUser);
    localStorage.setItem('hireai_auth_users', JSON.stringify(users));

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
    setLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('hireai_current_user');
  };

  const refreshProfile = async () => {
    if (user) {
      const updated = await db.getProfile(user.id);
      setUser(updated);
      localStorage.setItem('hireai_current_user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
