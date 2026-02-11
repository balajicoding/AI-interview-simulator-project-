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

const MAX_HISTORY_ITEMS = 50;

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

export interface StoredSession {
  userId: string;
  issuedAt: number;
}

const safeStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Failed to read storage key "${key}"`, error);
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`Failed to write storage key "${key}"`, error);
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove storage key "${key}"`, error);
    }
  }
};

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function sanitizeProfile(input: Partial<UserProfile> & { id: string }): UserProfile {
  return {
    id: input.id,
    name: isNonEmptyString(input.name) ? input.name.trim() : 'Candidate',
    email: isNonEmptyString(input.email) ? normalizeEmail(input.email) : '',
    headline: typeof input.headline === 'string' ? input.headline.trim() : '',
    skills: Array.isArray(input.skills) ? input.skills.filter(isNonEmptyString).map((s) => s.trim()).slice(0, 30) : [],
    bio: typeof input.bio === 'string' ? input.bio.trim() : '',
    avatar: isNonEmptyString(input.avatar) ? input.avatar : 'U'
  };
}

function isValidAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as AuthUser;
  return isNonEmptyString(candidate.id) && isNonEmptyString(candidate.email) && isNonEmptyString(candidate.passwordHash);
}

function isValidInterviewSession(value: unknown): value is InterviewSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as InterviewSession;
  return (
    isNonEmptyString(session.id) &&
    typeof session.startTime === 'number' &&
    Array.isArray(session.answers) &&
    Array.isArray(session.questions) &&
    !!session.config &&
    typeof session.currentQuestionIndex === 'number' &&
    (session.status === 'idle' || session.status === 'ongoing' || session.status === 'completed')
  );
}

function isValidStoredSession(value: unknown): value is StoredSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as StoredSession;
  return isNonEmptyString(session.userId) && typeof session.issuedAt === 'number';
}

export const db = {
  // Utility to hash passwords using SHA-256
  async hashPassword(password: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  },

  // Auth Methods
  async getUsers(): Promise<AuthUser[]> {
    const rawUsers = parseJson<unknown[]>(safeStorage.getItem(STORAGE_KEYS.AUTH_USERS), []);
    const validUsers = rawUsers.filter(isValidAuthUser).map((user) => ({
      ...user,
      email: normalizeEmail(user.email)
    }));

    if (validUsers.length !== rawUsers.length) {
      safeStorage.setItem(STORAGE_KEYS.AUTH_USERS, JSON.stringify(validUsers));
    }

    return validUsers;
  },

  async saveUser(user: AuthUser): Promise<void> {
    const users = await this.getUsers();
    const normalizedUser: AuthUser = {
      id: user.id,
      email: normalizeEmail(user.email),
      passwordHash: user.passwordHash
    };

    const index = users.findIndex((u) => normalizeEmail(u.email) === normalizedUser.email);
    if (index > -1) {
      users[index] = normalizedUser;
    } else {
      users.push(normalizedUser);
    }

    safeStorage.setItem(STORAGE_KEYS.AUTH_USERS, JSON.stringify(users));
  },

  async updatePassword(email: string, newPasswordHash: string): Promise<void> {
    const users = await this.getUsers();
    const normalizedEmail = normalizeEmail(email);
    const user = users.find((u) => normalizeEmail(u.email) === normalizedEmail);
    if (!user) {
      throw new Error('Account not found.');
    }

    user.passwordHash = newPasswordHash;
    safeStorage.setItem(STORAGE_KEYS.AUTH_USERS, JSON.stringify(users));
  },

  // Profile Methods
  async getProfile(userId: string): Promise<UserProfile> {
    try {
      const key = `${STORAGE_KEYS.USER_PROFILE_PREFIX}${userId}`;
      const parsedProfile = parseJson<Partial<UserProfile> | null>(safeStorage.getItem(key), null);
      if (parsedProfile) {
        const sanitized = sanitizeProfile({ ...parsedProfile, id: userId });
        safeStorage.setItem(key, JSON.stringify(sanitized));
        return sanitized;
      }

      const users = await this.getUsers();
      const authUser = users.find((u) => u.id === userId);
      const fallbackProfile = sanitizeProfile({
        id: userId,
        name: 'Candidate',
        email: authUser?.email || '',
        headline: 'Professional Candidate',
        skills: [],
        bio: '',
        avatar: 'U'
      });

      safeStorage.setItem(key, JSON.stringify(fallbackProfile));
      return fallbackProfile;
    } catch (error) {
      console.error('Profile retrieval failed', error);
      return sanitizeProfile({ id: userId, name: 'User', email: '', headline: '', skills: [], bio: '', avatar: 'U' });
    }
  },

  async updateProfile(profile: UserProfile): Promise<UserProfile> {
    const sanitizedProfile = sanitizeProfile(profile);
    safeStorage.setItem(`${STORAGE_KEYS.USER_PROFILE_PREFIX}${sanitizedProfile.id}`, JSON.stringify(sanitizedProfile));
    return sanitizedProfile;
  },

  // Interview History Methods
  async saveInterviewSession(userId: string, session: InterviewSession): Promise<void> {
    const history = await this.getHistory(userId);
    if (history.some((s) => s.id === session.id)) return;

    history.unshift(session);
    safeStorage.setItem(
      `${STORAGE_KEYS.INTERVIEW_HISTORY_PREFIX}${userId}`,
      JSON.stringify(history.slice(0, MAX_HISTORY_ITEMS))
    );
  },

  async getHistory(userId: string): Promise<InterviewSession[]> {
    const key = `${STORAGE_KEYS.INTERVIEW_HISTORY_PREFIX}${userId}`;
    const rawHistory = parseJson<unknown[]>(safeStorage.getItem(key), []);
    const validHistory = rawHistory
      .filter(isValidInterviewSession)
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, MAX_HISTORY_ITEMS);

    if (validHistory.length !== rawHistory.length) {
      safeStorage.setItem(key, JSON.stringify(validHistory));
    }

    return validHistory;
  },

  // Session Methods
  getSession(): StoredSession | null {
    const raw = parseJson<unknown>(safeStorage.getItem(STORAGE_KEYS.CURRENT_USER_SESSION), null);

    // Backward compatibility: older versions stored the whole profile in session.
    if (raw && typeof raw === 'object' && 'id' in (raw as Record<string, unknown>) && !('userId' in (raw as Record<string, unknown>))) {
      const legacyId = (raw as Record<string, unknown>).id;
      if (isNonEmptyString(legacyId)) {
        const migrated: StoredSession = { userId: legacyId, issuedAt: Date.now() };
        safeStorage.setItem(STORAGE_KEYS.CURRENT_USER_SESSION, JSON.stringify(migrated));
        return migrated;
      }
    }

    if (!isValidStoredSession(raw)) {
      safeStorage.removeItem(STORAGE_KEYS.CURRENT_USER_SESSION);
      return null;
    }

    return raw;
  },

  saveSession(userId: string): void {
    const session: StoredSession = { userId, issuedAt: Date.now() };
    safeStorage.setItem(STORAGE_KEYS.CURRENT_USER_SESSION, JSON.stringify(session));
  },

  clearSession(): void {
    safeStorage.removeItem(STORAGE_KEYS.CURRENT_USER_SESSION);
  }
};
