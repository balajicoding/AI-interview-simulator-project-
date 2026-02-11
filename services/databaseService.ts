
/**
 * Simulated MongoDB Service
 * In a production app, these functions would perform `fetch` calls 
 * to a FastAPI/Node.js backend connected to MongoDB.
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

const DEFAULT_PROFILE: UserProfile = {
  id: 'user_1',
  name: 'John Doe',
  email: 'john@example.com',
  headline: 'Final Year CS Student',
  skills: ['Java', 'React', 'Python'],
  bio: 'Passionate about building scalable AI-driven applications.',
  avatar: '👨‍💻'
};

export const db = {
  // Profile Methods
  async getProfile(userId: string): Promise<UserProfile> {
    const data = localStorage.getItem(`${STORAGE_KEYS.USER_PROFILE}_${userId}`);
    return data ? JSON.parse(data) : { ...DEFAULT_PROFILE, id: userId };
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

  // Auth Simulation
  async getUsers() {
    const data = localStorage.getItem(STORAGE_KEYS.AUTH_USERS);
    return data ? JSON.parse(data) : [];
  }
};
