
/**
 * Simulated MongoDB Service
 * Updated to handle hashed passwords and account recovery.
 */

import { InterviewSession } from '../types';

const STORAGE_KEYS = {
  USER_PROFILE: 'hireai_user_profile',
  INTERVIEW_HISTORY: 'hireai_interview_history',
  AUTH_USERS: 'hireai_auth_users',
  CURRENT_USER: 'hireai_current_user'
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

  // Profile Methods
  async getProfile(userId: string): Promise<UserProfile> {
    const data = localStorage.getItem(`${STORAGE_KEYS.USER_PROFILE}_${userId}`);
    return data ? JSON.parse(data) : {
      id: userId,
      name: 'User',
      email: '',
      headline: 'Candidate',
      skills: [],
      bio: '',
      avatar: '👤'
    };
  },

  async updateProfile(profile: UserProfile): Promise<UserProfile> {
    localStorage.setItem(`${STORAGE_KEYS.USER_PROFILE}_${profile.id}`, JSON.stringify(profile));
    return profile;
  },

  // Interview History Methods
  async saveInterviewSession(userId: string, session: InterviewSession): Promise<void> {
    const history = await this.getHistory(userId);
    history.unshift(session);
    localStorage.setItem(`${STORAGE_KEYS.INTERVIEW_HISTORY}_${userId}`, JSON.stringify(history.slice(0, 50)));
  },

  async getHistory(userId: string): Promise<InterviewSession[]> {
    const data = localStorage.getItem(`${STORAGE_KEYS.INTERVIEW_HISTORY}_${userId}`);
    return data ? JSON.parse(data) : [];
  },

  // Auth Methods
  async getUsers(): Promise<AuthUser[]> {
    const data = localStorage.getItem(STORAGE_KEYS.AUTH_USERS);
    return data ? JSON.parse(data) : [];
  },

  async saveUser(user: AuthUser) {
    const users = await this.getUsers();
    const index = users.findIndex(u => u.email === user.email);
    if (index > -1) {
      users[index] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(STORAGE_KEYS.AUTH_USERS, JSON.stringify(users));
  },

  async updatePassword(email: string, newPasswordHash: string): Promise<void> {
    const users = await this.getUsers();
    const user = users.find(u => u.email === email);
    if (user) {
      user.passwordHash = newPasswordHash;
      localStorage.setItem(STORAGE_KEYS.AUTH_USERS, JSON.stringify(users));
    }
  }
};
