// userStore.ts
// All user data is stored in localStorage.
// To switch to a real DB later, replace the get/set functions below
// with API calls — the rest of the app won't need to change.

export type UserProfile = {
  name: string;
  username: string;
  bio: string;
  avatar: string;
};

export type UserSettings = {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  soundEffects: boolean;
  autoDownload: boolean;
  language: string;
};

export type LikedWallpaper = {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
  uploadedBy: string;
  likedAt: number;
};

export type SavedWallpaper = {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
  uploadedBy: string;
  savedAt: number;
};

export type RecentWallpaper = {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
  uploadedBy: string;
  viewedAt: number;
};

export type PasswordData = {
  hasPassword: boolean;
  lastChanged: number | null;
};

const KEYS = {
  profile: 'user_profile',
  settings: 'user_settings',
  liked: 'user_liked',
  saved: 'user_saved',
  recent: 'user_recent',
  password: 'user_password',
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.warn(`userStore: failed to write key "${key}"`);
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    console.warn(`userStore: failed to remove key "${key}"`);
  }
}

const DEFAULT_PROFILE: UserProfile = {
  name: 'John Doe',
  username: '@johndoe',
  bio: 'Digital Artist & Photographer',
  avatar: 'https://i.pravatar.cc/150?img=60',
};

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  notifications: true,
  soundEffects: true,
  autoDownload: false,
  language: 'English',
};

const DEFAULT_PASSWORD: PasswordData = {
  hasPassword: true,
  lastChanged: null,
};

// ─── Profile ─────────────────────────────────────────────────────────────────

export const getProfile = (): UserProfile =>
  read<UserProfile>(KEYS.profile, DEFAULT_PROFILE);

export const saveProfile = (profile: UserProfile): void =>
  write(KEYS.profile, profile);

export const updateProfile = (partial: Partial<UserProfile>): UserProfile => {
  const current = getProfile();
  const updated = { ...current, ...partial };
  saveProfile(updated);
  return updated;
};

// ─── Settings ────────────────────────────────────────────────────────────────

export const getSettings = (): UserSettings =>
  read<UserSettings>(KEYS.settings, DEFAULT_SETTINGS);

export const saveSettings = (settings: UserSettings): void =>
  write(KEYS.settings, settings);

export const updateSettings = (partial: Partial<UserSettings>): UserSettings => {
  const current = getSettings();
  const updated = { ...current, ...partial };
  saveSettings(updated);
  return updated;
};

// ─── Liked ───────────────────────────────────────────────────────────────────

export const getLiked = (): LikedWallpaper[] =>
  read<LikedWallpaper[]>(KEYS.liked, []);

export const likeWallpaper = (wallpaper: Omit<LikedWallpaper, 'likedAt'>): void => {
  const current = getLiked();
  const already = current.find(w => w.id === wallpaper.id);
  if (already) return;
  write(KEYS.liked, [{ ...wallpaper, likedAt: Date.now() }, ...current]);
};

export const unlikeWallpaper = (id: string): void => {
  const current = getLiked();
  write(KEYS.liked, current.filter(w => w.id !== id));
};

export const isLiked = (id: string): boolean =>
  getLiked().some(w => w.id === id);

export const clearLiked = (): void => remove(KEYS.liked);

// ─── Saved ───────────────────────────────────────────────────────────────────

export const getSaved = (): SavedWallpaper[] =>
  read<SavedWallpaper[]>(KEYS.saved, []);

export const saveWallpaper = (wallpaper: Omit<SavedWallpaper, 'savedAt'>): void => {
  const current = getSaved();
  const already = current.find(w => w.id === wallpaper.id);
  if (already) return;
  write(KEYS.saved, [{ ...wallpaper, savedAt: Date.now() }, ...current]);
};

export const unsaveWallpaper = (id: string): void => {
  const current = getSaved();
  write(KEYS.saved, current.filter(w => w.id !== id));
};

export const isSaved = (id: string): boolean =>
  getSaved().some(w => w.id === id);

export const clearSaved = (): void => remove(KEYS.saved);

// ─── Recent ──────────────────────────────────────────────────────────────────

const MAX_RECENT = 50;

export const getRecent = (): RecentWallpaper[] =>
  read<RecentWallpaper[]>(KEYS.recent, []);

export const addRecent = (wallpaper: Omit<RecentWallpaper, 'viewedAt'>): void => {
  const current = getRecent().filter(w => w.id !== wallpaper.id);
  const updated = [{ ...wallpaper, viewedAt: Date.now() }, ...current].slice(0, MAX_RECENT);
  write(KEYS.recent, updated);
};

export const clearRecent = (): void => remove(KEYS.recent);

// ─── Password ────────────────────────────────────────────────────────────────

export const getPasswordData = (): PasswordData =>
  read<PasswordData>(KEYS.password, DEFAULT_PASSWORD);

export const updatePassword = (_newPassword: string): void => {
  write(KEYS.password, { hasPassword: true, lastChanged: Date.now() });
};

// ─── Clear All ───────────────────────────────────────────────────────────────

export const clearAllUserData = (): void => {
  Object.values(KEYS).forEach(remove);
};