// hooks/useUpload.ts
import { useState, useRef, useCallback, useEffect } from 'react';

type LogType   = 'log' | 'error' | 'success' | 'warning' | 'info';
type SpeedType = 'fast' | 'slow' | 'offline';
type WallType  = 'mobile' | 'pc';

interface Log { message: string; type: LogType; time: string; icon: string }

const LOG_ICONS = { log: '📝', error: '❌', success: '✅', warning: '⚠️', info: 'ℹ️' } as const;

// ── Hook ─────────────────────────────────────────────────────────
export const useUpload = (userId: string | null) => {
  const [uploading,       setUploading]       = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [status,          setStatus]          = useState('');
  const [error,           setError]           = useState<string | null>(null);
  const [logs,            setLogs]            = useState<Log[]>([]);
  const [online,          setOnline]          = useState(true);
  const [speed,           setSpeed]           = useState<SpeedType>('fast');

  const abortRef = useRef<AbortController | null>(null);
  const animRef  = useRef<number | null>(null);

  // ── Logging ───────────────────────────────────────────────────
  const log = useCallback((message: string, type: LogType = 'log') => {
    setLogs(p => [...p, {
      message, type,
      time: new Date().toLocaleTimeString(),
      icon: LOG_ICONS[type],
    }]);
  }, []);

  // ── Progress animation ────────────────────────────────────────
  const animateProgress = useCallback((target: number) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const step = () => setDisplayProgress(cur => {
      if (cur >= target) return target;
      const next = cur + Math.max(0.5, (target - cur) / 12);
      if (next < target) animRef.current = requestAnimationFrame(step);
      return Math.min(next, target);
    });
    animRef.current = requestAnimationFrame(step);
  }, []);

  const setProgress = useCallback((v: number) => animateProgress(v), [animateProgress]);

  // ── Upload ────────────────────────────────────────────────────
  const uploadFile = useCallback(async (
    file: File,
    title: string,
    description: string,
    _isRetry = false,
    category  = '',
    wallType: WallType = 'mobile',
  ): Promise<{ success: boolean; error?: string; violation?: boolean; details?: string }> => {

    if (!userId)
      return { success: false, error: 'Must be logged in' };

    if (!online || !navigator.onLine)
      return { success: false, error: 'No internet connection' };

    setLogs([]); setUploading(true); setError(null); setProgress(0);
    log(`📦 ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`, 'info');
    log(`📝 ${title}`, 'info');
    if (category)         log(`🏷️  ${category}`, 'info');
    if (speed === 'slow') log('⚠️  Slow connection detected', 'warning');

    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    try {
      // ── Build multipart payload ────────────────────────────────
      const fd = new FormData();
      fd.append('file',        file);
      fd.append('userId',      userId);
      fd.append('title',       title);
      fd.append('description', description);
      fd.append('category',    category);
      fd.append('wallType',    wallType);

      setStatus('Checking content & uploading…');
      log('🔍 Sending to server…', 'info');
      setProgress(10);

      const res = await fetch('/api/upload', { method: 'POST', body: fd, signal });

      setProgress(80);

      const data = await res.json();

      // ── Moderation rejection ───────────────────────────────────
      if (res.status === 422 && data.violation) {
        log(`🚫 ${data.error}`, 'error');
        setError(data.error);
        return { success: false, error: data.error, violation: true, details: data.details };
      }

      // ── Other errors ───────────────────────────────────────────
      if (!res.ok || !data.success) {
        const msg = data.error ?? 'Upload failed';
        log(`💥 ${msg}`, 'error'); setError(msg);
        return { success: false, error: msg };
      }

      setProgress(100); setStatus('Complete!');
      log('🎉 Upload complete!', 'success');
      return { success: true };

    } catch (e: any) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      const isAbort = e.name === 'AbortError';
      const msg = isAbort ? 'Upload cancelled' : e.message?.includes('fetch') ? 'Network error. Check your connection and retry.' : e.message ?? 'Upload failed';
      log(`💥 ${msg}`, 'error'); setError(msg);
      return { success: false, error: msg };
    } finally {
      setUploading(false);
    }
  }, [userId, online, speed, log, setProgress]);

  // ── Reset / cancel ────────────────────────────────────────────
  const reset = useCallback(() => {
    abortRef.current?.abort();
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setUploading(false); setDisplayProgress(0);
    setStatus(''); setError(null); setLogs([]);
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setUploading(false); setDisplayProgress(0);
    setStatus(''); setError(null); setLogs([]);
  }, []);

  // ── Network listener ──────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      if (!navigator.onLine) { setOnline(false); setSpeed('offline'); return; }
      setOnline(true);
      const t = (navigator as any).connection?.effectiveType as string | undefined;
      setSpeed(t === '2g' || t === 'slow-2g' ? 'slow' : 'fast');
    };
    update();
    const conn = (navigator as any).connection;
    window.addEventListener('online',  update);
    window.addEventListener('offline', update);
    conn?.addEventListener?.('change', update);
    return () => {
      window.removeEventListener('online',  update);
      window.removeEventListener('offline', update);
      conn?.removeEventListener?.('change', update);
    };
  }, []);

  return {
    uploading,
    progress: displayProgress,
    status,
    error,
    logs,
    online,
    speed,
    canResume:    false,
    getCachedData: () => null,
    uploadFile,
    reset,
    cancel,
  };
};
