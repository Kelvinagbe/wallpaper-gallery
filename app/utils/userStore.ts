// userStore.ts
// All user data is stored in localStorage.
// To switch to a real DB later, replace the get/set functions below
// with API calls — the rest of the app won't need to change.

export type UserProfile = {
  name: string;
  username: string;
  bio: string;
  avatar: string;
  verified: boolean;
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

// ─── Store Event Bus ──────────────────────────────────────────────────────────
// Emits whenever a key is mutated so React components can re-render.
// Subscribe via the useStoreKey() hook.

type StoreKey = keyof typeof KEYS;
type StoreListener = (key: StoreKey) => void;

const listeners = new Set<StoreListener>();

const emit = (key: StoreKey) => {
  listeners.forEach(fn => fn(key));
};

export const subscribeStore = (fn: StoreListener) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

// ─── Low-level helpers ────────────────────────────────────────────────────────

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T, storeKey: StoreKey): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    emit(storeKey);
  } catch {
    console.warn(`userStore: failed to write key "${key}"`);
  }
}

function remove(key: string, storeKey?: StoreKey): void {
  try {
    localStorage.removeItem(key);
    if (storeKey) emit(storeKey);
  } catch {
    console.warn(`userStore: failed to remove key "${key}"`);
  }
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_PROFILE: UserProfile = {
  name: 'John Doe',
  username: '@johndoe',
  bio: 'Digital Artist & Photographer',
  avatar: 'https://i.pravatar.cc/150?img=60',
  verified: true, // ← Added verified field
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

// ─── Profile ──────────────────────────────────────────────────────────────────

export const getProfile = (): UserProfile =>
  read<UserProfile>(KEYS.profile, DEFAULT_PROFILE);

export const saveProfile = (profile: UserProfile): void =>
  write(KEYS.profile, profile, 'profile');

export const updateProfile = (partial: Partial<UserProfile>): UserProfile => {
  const current = getProfile();
  const updated = { ...current, ...partial };
  saveProfile(updated);
  return updated;
};

// ─── Settings ─────────────────────────────────────────────────────────────────

export const getSettings = (): UserSettings =>
  read<UserSettings>(KEYS.settings, DEFAULT_SETTINGS);

export const saveSettings = (settings: UserSettings): void =>
  write(KEYS.settings, settings, 'settings');

export const updateSettings = (partial: Partial<UserSettings>): UserSettings => {
  const current = getSettings();
  const updated = { ...current, ...partial };
  saveSettings(updated);
  return updated;
};

// ─── Liked ────────────────────────────────────────────────────────────────────

export const getLiked = (): LikedWallpaper[] =>
  read<LikedWallpaper[]>(KEYS.liked, []);

export const likeWallpaper = (wallpaper: Omit<LikedWallpaper, 'likedAt'>): void => {
  const current = getLiked();
  if (current.find(w => w.id === wallpaper.id)) return;
  write(KEYS.liked, [{ ...wallpaper, likedAt: Date.now() }, ...current], 'liked');
};

export const unlikeWallpaper = (id: string): void => {
  write(KEYS.liked, getLiked().filter(w => w.id !== id), 'liked');
};

export const isLiked = (id: string): boolean =>
  getLiked().some(w => w.id === id);

export const clearLiked = (): void => remove(KEYS.liked, 'liked');

// ─── Saved ────────────────────────────────────────────────────────────────────

export const getSaved = (): SavedWallpaper[] =>
  read<SavedWallpaper[]>(KEYS.saved, []);

export const saveWallpaper = (wallpaper: Omit<SavedWallpaper, 'savedAt'>): void => {
  const current = getSaved();
  if (current.find(w => w.id === wallpaper.id)) return;
  write(KEYS.saved, [{ ...wallpaper, savedAt: Date.now() }, ...current], 'saved');
};

export const unsaveWallpaper = (id: string): void => {
  write(KEYS.saved, getSaved().filter(w => w.id !== id), 'saved');
};

export const isSaved = (id: string): boolean =>
  getSaved().some(w => w.id === id);

export const clearSaved = (): void => remove(KEYS.saved, 'saved');

// ─── Recent ───────────────────────────────────────────────────────────────────

const MAX_RECENT = 50;

export const getRecent = (): RecentWallpaper[] =>
  read<RecentWallpaper[]>(KEYS.recent, []);

export const addRecent = (wallpaper: Omit<RecentWallpaper, 'viewedAt'>): void => {
  const current = getRecent().filter(w => w.id !== wallpaper.id);
  const updated = [{ ...wallpaper, viewedAt: Date.now() }, ...current].slice(0, MAX_RECENT);
  write(KEYS.recent, updated, 'recent');
};

export const clearRecent = (): void => remove(KEYS.recent, 'recent');

// ─── Password ─────────────────────────────────────────────────────────────────

export const getPasswordData = (): PasswordData =>
  read<PasswordData>(KEYS.password, DEFAULT_PASSWORD);

export const updatePassword = (_newPassword: string): void => {
  write(KEYS.password, { hasPassword: true, lastChanged: Date.now() }, 'password');
};

// ─── Clear All ────────────────────────────────────────────────────────────────

export const clearAllUserData = (): void => {
  (Object.keys(KEYS) as StoreKey[]).forEach(k => remove(KEYS[k], k));
};