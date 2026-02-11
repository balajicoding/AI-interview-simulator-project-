
/**
 * Simulated MongoDB Service
 * Optimized for strict persistence using localStorage.
 */

import { InterviewSession } from '../types';

const STORAGE_KEYS = {
  USER_PROFILE_PREFIX: 'hireai_profile_',
  INTERVIEW_HISTORY_PREFIX: 'hireai_history_',
  AUTH_USERS: 'hireai_auth_users',
  CURRENT_USER_SESSION: 'hireai_current_session'
};

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  headline: string;
  skills: string[];
  bio: string;
  avatar: string;
}

export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
}

export const db = {
  // Utility to hash passwords using SHA-256
  async hashPassword(password: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // Auth Methods
  async getUsers(): Promise<AuthUser[]> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUTH_USERS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Error reading users from storage", e);
      return [];
    }
  },

  async saveUser(user: AuthUser): Promise<void> {
    const users = await this.getUsers();
    const index = users.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase());
    if (index > -1) {
      users[index] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(STORAGE_KEYS.AUTH_USERS, JSON.stringify(users));
  },

  async updatePassword(email: string, newPasswordHash: string): Promise<void> {
    const users = await this.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      user.passwordHash = newPasswordHash;
      localStorage.setItem(STORAGE_KEYS.AUTH_USERS, JSON.stringify(users));
    }
  },

  // Profile Methods
  async getProfile(userId: string): Promise<UserProfile> {
    try {
      const data = localStorage.getItem(`${STORAGE_KEYS.USER_PROFILE_PREFIX}${userId}`);
      if (data) return JSON.parse(data);
      
      // Fallback to searching by email if ID is inconsistent (rare)
      const users = await this.getUsers();
      const authUser = users.find(u => u.id === userId);
      
      return {
        id: userId,
        name: 'Candidate',
        email: authUser?.email || '',
        headline: 'Professional',
        skills: [],
        bio: '',
        avatar: '👤'
      };
    } catch (e) {
      console.error("Profile retrieval failed", e);
      return { id: userId, name: 'User', email: '', headline: '', skills: [], bio: '', avatar: '👤' };
    }
  },

  async updateProfile(profile: UserProfile): Promise<UserProfile> {
    localStorage.setItem(`${STORAGE_KEYS.USER_PROFILE_PREFIX}${profile.id}`, JSON.stringify(profile));
    return profile;
  },

  // Interview History Methods
  async saveInterviewSession(userId: string, session: InterviewSession): Promise<void> {
    const history = await this.getHistory(userId);
    // Avoid duplicate saves
    if (history.some(s => s.id === session.id)) return;
    
    history.unshift(session);
    localStorage.setItem(`${STORAGE_KEYS.INTERVIEW_HISTORY_PREFIX}${userId}`, JSON.stringify(history.slice(0, 50)));
  },

  async getHistory(userId: string): Promise<InterviewSession[]> {
    try {
      const data = localStorage.getItem(`${STORAGE_KEYS.INTERVIEW_HISTORY_PREFIX}${userId}`);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }
};
