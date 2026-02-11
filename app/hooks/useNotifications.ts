import { useState, useEffect } from 'react';

export type Notification = {
  id: string;
  type: 'like' | 'follow';
  user: {
    name: string;
    avatar: string;
  };
  message: string;
  time: string;
  thumbnail?: string;
  read: boolean;
  timestamp: number;
};

const NOTIFICATIONS_KEY = 'user_notifications';
const MAX_NOTIFICATIONS = 50;

type NotificationListener = () => void;
const listeners = new Set<NotificationListener>();

const emit = () => listeners.forEach(fn => fn());

export const subscribeNotifications = (fn: NotificationListener) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

function getNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotifications(notifications: Notification[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    emit();
  } catch {
    console.warn('Failed to save notifications');
  }
}

export function addNotification(
  type: 'like' | 'follow',
  user: { name: string; avatar: string },
  wallpaper?: { id: string; thumbnail: string; title: string }
): void {
  const notifications = getNotifications();
  
  const message = type === 'like' 
    ? `liked your wallpaper${wallpaper?.title ? ` "${wallpaper.title}"` : ''}`
    : 'started following you';

  const newNotification: Notification = {
    id: `${Date.now()}-${Math.random()}`,
    type,
    user,
    message,
    time: 'Just now',
    thumbnail: wallpaper?.thumbnail,
    read: false,
    timestamp: Date.now(),
  };

  const updated = [newNotification, ...notifications].slice(0, MAX_NOTIFICATIONS);
  saveNotifications(updated);
}

export function markAsRead(id: string): void {
  const notifications = getNotifications();
  const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
  saveNotifications(updated);
}

export function markAllAsRead(): void {
  const notifications = getNotifications();
  const updated = notifications.map(n => ({ ...n, read: true }));
  saveNotifications(updated);
}

export function clearNotifications(): void {
  localStorage.removeItem(NOTIFICATIONS_KEY);
  emit();
}

function formatTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const load = () => {
      const data = getNotifications();
      // Update relative times
      const updated = data.map(n => ({ ...n, time: formatTime(n.timestamp) }));
      setNotifications(updated);
    };

    load();
    const unsub = subscribeNotifications(load);
    const interval = setInterval(load, 60000); // Update times every minute

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  return {
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
}