// userStore.ts
export type UserProfile = {
  id: string;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const get = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const set = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Store: failed to write "${key}"`, e);
  }
};

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS = {
  profile: {
    name: 'John Doe',
    username: '@johndoe',
    bio: 'Digital Artist & Photographer',
    avatar: 'https://i.pravatar.cc/150?img=60',
    verified: true,
  } as UserProfile,
  
  settings: {
    theme: 'dark',
    notifications: true,
    soundEffects: true,
    autoDownload: false,
    language: 'English',
  } as UserSettings,
  
  password: {
    hasPassword: true,
    lastChanged: null,
  } as PasswordData,
};

// ─── Profile ──────────────────────────────────────────────────────────────────

export const getProfile = (): UserProfile => {
  const profile = get('user_profile', DEFAULTS.profile);
  if (profile.verified === undefined) {
    profile.verified = true;
    set('user_profile', profile);
  }
  return profile;
};

export const saveProfile = (profile: UserProfile) => set('user_profile', profile);

export const updateProfile = (partial: Partial<UserProfile>): UserProfile => {
  const updated = { ...getProfile(), ...partial };
  saveProfile(updated);
  return updated;
};

// ─── Settings ─────────────────────────────────────────────────────────────────

export const getSettings = () => get('user_settings', DEFAULTS.settings);
export const saveSettings = (settings: UserSettings) => set('user_settings', settings);
export const updateSettings = (partial: Partial<UserSettings>) => {
  const updated = { ...getSettings(), ...partial };
  saveSettings(updated);
  return updated;
};

// ─── Liked ────────────────────────────────────────────────────────────────────

export const getLiked = () => get<LikedWallpaper[]>('user_liked', []);

export const likeWallpaper = (wp: Omit<LikedWallpaper, 'likedAt'>) => {
  const list = getLiked();
  if (!list.find(w => w.id === wp.id)) {
    set('user_liked', [{ ...wp, likedAt: Date.now() }, ...list]);
  }
};

export const unlikeWallpaper = (id: string) => 
  set('user_liked', getLiked().filter(w => w.id !== id));

export const isLiked = (id: string) => getLiked().some(w => w.id === id);
export const clearLiked = () => localStorage.removeItem('user_liked');

// ─── Saved ────────────────────────────────────────────────────────────────────

export const getSaved = () => get<SavedWallpaper[]>('user_saved', []);

export const saveWallpaper = (wp: Omit<SavedWallpaper, 'savedAt'>) => {
  const list = getSaved();
  if (!list.find(w => w.id === wp.id)) {
    set('user_saved', [{ ...wp, savedAt: Date.now() }, ...list]);
  }
};

export const unsaveWallpaper = (id: string) => 
  set('user_saved', getSaved().filter(w => w.id !== id));

export const isSaved = (id: string) => getSaved().some(w => w.id === id);
export const clearSaved = () => localStorage.removeItem('user_saved');

// ─── Recent ───────────────────────────────────────────────────────────────────

export const getRecent = () => get<RecentWallpaper[]>('user_recent', []);

export const addRecent = (wp: Omit<RecentWallpaper, 'viewedAt'>) => {
  const list = getRecent().filter(w => w.id !== wp.id);
  set('user_recent', [{ ...wp, viewedAt: Date.now() }, ...list].slice(0, 50));
};

export const clearRecent = () => localStorage.removeItem('user_recent');

// ─── Password ─────────────────────────────────────────────────────────────────

export const getPasswordData = () => get('user_password', DEFAULTS.password);

export const updatePassword = (newPassword: string) => {
  // NOTE: In production, hash and validate the password here
  set('user_password', { hasPassword: true, lastChanged: Date.now() });
};

// ─── Clear All ────────────────────────────────────────────────────────────────

export const clearAllUserData = () => {
  ['user_profile', 'user_settings', 'user_liked', 'user_saved', 'user_recent', 'user_password']
    .forEach(key => localStorage.removeItem(key));
};

// ─── Store Event (Optional - only if you use subscribeStore) ─────────────────

type StoreListener = (key: string) => void;
const listeners = new Set<StoreListener>();

export const subscribeStore = (fn: StoreListener) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};