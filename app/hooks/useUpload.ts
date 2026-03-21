// hooks/useUpload.ts
import { useState, useRef, useCallback, useEffect } from 'react';

type LogType   = 'log' | 'error' | 'success' | 'warning' | 'info';
type SpeedType = 'fast' | 'slow' | 'offline';
type WallType  = 'mobile' | 'pc';

interface Log { message: string; type: LogType; time: string; icon: string }

interface UploadCache {
  imageUrl?:     string;
  thumbnailUrl?: string;
  file:          { name: string; size: number; type: string };
  title:         string;
  description:   string;
  category:      string;
  wallType:      WallType;
  userId:        string;
  timestamp:     number;
}

// ── Constants ────────────────────────────────────────────────────
const CACHE_KEY  = 'upload_cache';
const CACHE_TTL  = 3_600_000;
const LOG_ICONS  = { log: '📝', error: '❌', success: '✅', warning: '⚠️', info: 'ℹ️' } as const;
const MAX_W      = 1920;
const MAX_H      = 1080;
const THUMB_W    = 400;
const TIMEOUT_MS = 120_000;
const BLOB_URL   = 'https://ovrica.name.ng/api/blob-upload';

// ── Moderation ───────────────────────────────────────────────────
interface ModerationResult { safe: boolean; reason?: string; violation?: string; details?: string; }

const moderateImage = async (file: File): Promise<ModerationResult> => {
  const apiUser   = process.env.NEXT_PUBLIC_SIGHTENGINE_USER;
  const apiSecret = process.env.NEXT_PUBLIC_SIGHTENGINE_SECRET;
  if (!apiUser || !apiSecret) return { safe: true };
  try {
    const fd = new FormData();
    fd.append('media', file); fd.append('models', 'nudity-2.0,offensive,gore');
    fd.append('api_user', apiUser); fd.append('api_secret', apiSecret);
    const res  = await fetch('https://api.sightengine.com/1.0/check.json', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok || data.status === 'failure') return { safe: true };

    const n = data.nudity;
    if (n && (n.sexual_activity > 0.5 || n.sexual_display > 0.5 || n.erotica > 0.5 || n.very_suggestive > 0.7))
      return { safe: false, violation: 'nudity', reason: '🚫 Nudity or sexual content detected', details: 'This image violates our Community Guidelines on explicit content. Repeated violations will result in a temporary upload suspension.' };
    if ((data.offensive?.prob ?? 0) > 0.7)
      return { safe: false, violation: 'offensive', reason: '🚫 Offensive content detected', details: 'This image violates our Community Guidelines on hate speech or offensive imagery. Repeated violations will result in a temporary upload suspension.' };
    if ((data.gore?.prob ?? 0) > 0.7)
      return { safe: false, violation: 'gore', reason: '🚫 Graphic violence detected', details: 'This image violates our Community Guidelines on graphic or violent content. Repeated violations will result in a temporary upload suspension.' };
    return { safe: true };
  } catch { return { safe: true }; }
};

// ── Image helpers ────────────────────────────────────────────────
const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = () => rej(new Error('Failed to load image')); img.src = url; });

const toBlob = (img: HTMLImageElement, w: number, h: number, q: number): Promise<Blob> =>
  new Promise((res, rej) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d')?.drawImage(img, 0, 0, w, h);
    c.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/jpeg', q);
  });

const compressMain = async (file: File, log: (m: string) => void): Promise<Blob> => {
  const url = URL.createObjectURL(file);
  try {
    const img   = await loadImage(url);
    const ratio = Math.min(MAX_W / img.width, MAX_H / img.height, 1);
    const w = Math.round(img.width * ratio), h = Math.round(img.height * ratio);
    let q = 0.85, blob = await toBlob(img, w, h, q);
    while (blob.size > 250 * 1024 && q > 0.5) { q = Math.max(q - 0.1, 0.5); blob = await toBlob(img, w, h, q); }
    log(`Main: ${(blob.size / 1024).toFixed(1)}KB (q=${q.toFixed(1)})`);
    return blob;
  } finally { URL.revokeObjectURL(url); }
};

const generateThumb = async (file: File, log: (m: string) => void): Promise<Blob> => {
  const url = URL.createObjectURL(file);
  try {
    const img  = await loadImage(url);
    const h    = Math.round((THUMB_W / img.width) * img.height);
    const blob = await toBlob(img, THUMB_W, h, 0.75);
    log(`Thumb: ${(blob.size / 1024).toFixed(1)}KB`);
    return blob;
  } finally { URL.revokeObjectURL(url); }
};

// ── Blob upload helper ───────────────────────────────────────────
const blobUpload = async (blob: Blob, filename: string, userId: string, folder: string, signal: AbortSignal): Promise<string> => {
  const fd = new FormData();
  fd.append('file', blob, filename); fd.append('userId', userId); fd.append('folder', folder);
  const res = await fetch(BLOB_URL, { method: 'POST', body: fd, signal, mode: 'cors', credentials: 'omit' });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: res.statusText })); throw new Error(e.error || 'Upload failed'); }
  const data = await res.json();
  if (!data.success || !data.url) throw new Error('No URL returned');
  return data.url;
};

// ── Hook ─────────────────────────────────────────────────────────
export const useUpload = (userId: string | null) => {
  const [uploading,        setUploading]        = useState(false);
  const [displayProgress,  setDisplayProgress]  = useState(0);
  const [status,           setStatus]           = useState('');
  const [error,            setError]            = useState<string | null>(null);
  const [logs,             setLogs]             = useState<Log[]>([]);
  const [online,           setOnline]           = useState(true);
  const [speed,            setSpeed]            = useState<SpeedType>('fast');
  const [canResume,        setCanResume]        = useState(false);

  const abortRef    = useRef<AbortController | null>(null);
  const animRef     = useRef<number | null>(null);
  const cacheRef    = useRef<UploadCache | null>(null);

  const log = useCallback((message: string, type: LogType = 'log') => {
    setLogs(p => [...p, { message, type, time: new Date().toLocaleTimeString(), icon: LOG_ICONS[type] }]);
  }, []);

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

  const saveCache = useCallback((patch: Partial<UploadCache>) => {
    if (!userId) return;
    const next = { ...cacheRef.current, ...patch, userId, timestamp: Date.now() } as UploadCache;
    cacheRef.current = next;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch { }
  }, [userId]);

  const loadCache = useCallback((): UploadCache | null => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw) as UploadCache;
      if (Date.now() - d.timestamp > CACHE_TTL || d.userId !== userId) { localStorage.removeItem(CACHE_KEY); return null; }
      return d;
    } catch { return null; }
  }, [userId]);

  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    cacheRef.current = null;
    setCanResume(false);
  }, []);

  // ── uploadFile ───────────────────────────────────────────────────
  const uploadFile = useCallback(async (
    file: File, title: string, description: string,
    isRetry = false, category = '', wallType: WallType = 'mobile',
  ): Promise<{ success: boolean; error?: string; violation?: boolean; details?: string }> => {
    if (!userId)               return { success: false, error: 'Must be logged in' };
    if (!online || !navigator.onLine) return { success: false, error: 'No internet connection' };

    if (!isRetry) setLogs([]);
    setUploading(true); setError(null); setProgress(0); setStatus('Preparing...');
    log(`📦 ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`, 'info');
    log(`📝 ${title}`, 'info');
    if (category)            log(`🏷️ ${category}`, 'info');
    if (speed === 'slow')    log('⚠️ Slow connection', 'warning');

    const cached     = isRetry ? (cacheRef.current || loadCache()) : null;
    let imageUrl     = cached?.imageUrl;
    let thumbnailUrl = cached?.thumbnailUrl;

    abortRef.current  = new AbortController();
    const { signal }  = abortRef.current;
    const timeout     = setTimeout(() => abortRef.current?.abort(), TIMEOUT_MS);

    try {
      // ── Moderation ────────────────────────────────────────────
      if (!isRetry && !imageUrl) {
        setStatus('Checking content...'); log('🔍 Checking content...', 'info');
        const mod = await moderateImage(file);
        if (!mod.safe) {
          try { await fetch('/api/report-violation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, reason: mod.violation || 'policy' }) }); } catch { }
          const err = Object.assign(new Error(mod.reason || 'Content moderation failed'), { details: mod.details, violation: true });
          throw err;
        }
        log('✅ Content check passed', 'success'); setProgress(5);
      }

      // ── Compress + upload ─────────────────────────────────────
      if (!imageUrl) {
        log('🖼️ Compressing...', 'info');
        const [compressed, thumb] = await Promise.all([
          compressMain(file, m => log(m, 'info')),
          generateThumb(file, m => log(m, 'info')),
        ]);
        setProgress(20);
        saveCache({ file: { name: file.name, size: file.size, type: file.type }, title, description, category, wallType });

        setStatus('Uploading image...'); log('📤 Uploading image...', 'info'); setProgress(25);
        imageUrl = await blobUpload(compressed, file.name, userId, 'wallpapers', signal);
        log('✅ Image uploaded', 'success'); setProgress(50);
        saveCache({ imageUrl });

        setStatus('Uploading thumbnail...'); log('📤 Uploading thumbnail...', 'info');
        try {
          thumbnailUrl = await blobUpload(thumb, `thumb_${file.name}`, userId, 'wallpapers/thumbnails', signal);
        } catch { thumbnailUrl = imageUrl; log('⚠️ Thumbnail failed, using main', 'warning'); }
        log('✅ Thumbnail done', 'success'); setProgress(75);
        saveCache({ imageUrl, thumbnailUrl });
      } else {
        log('✅ Using cached URLs', 'success'); setProgress(75);
      }

      // ── Save to DB ────────────────────────────────────────────
      setStatus('Saving...'); log('💾 Saving to database...', 'info');
      const dbRes = await fetch('/api/save-wallpaper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:       userId,
          title:         title.trim(),
          description:   description.trim() || null,
          category:      category.trim()    || null,
          type:          wallType,
          image_url:     imageUrl,
          thumbnail_url: thumbnailUrl,
        }),
        signal,
      });

      clearTimeout(timeout);

      if (!dbRes.ok) {
        const e = await dbRes.json().catch(() => ({ error: dbRes.statusText }));
        if (!cached?.imageUrl) {
          try { await fetch(BLOB_URL, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: imageUrl }), mode: 'cors' }); } catch { }
        }
        throw new Error(e.error || 'Database save failed');
      }

      const dbData = await dbRes.json();
      if (!dbData.success) throw new Error(dbData.error || 'Database save failed');

      setProgress(100); setStatus('Complete!');
      log('🎉 Upload complete!', 'success');
      clearCache();
      return { success: true };

    } catch (e: any) {
      clearTimeout(timeout);
      if (animRef.current) cancelAnimationFrame(animRef.current);

      const isAbort   = e.name === 'AbortError';
      const isNetwork = e.message?.includes('fetch') || e.message?.includes('Network');
      const isDB      = e.message?.includes('atabase');
      const msg       = isAbort ? 'Upload timed out' : isNetwork ? 'Network error. Check connection and retry.' : e.message || 'Upload failed';

      log(`💥 ${msg}`, 'error'); setError(msg);

      if ((isAbort || isNetwork || isDB) && (cacheRef.current?.imageUrl || cacheRef.current?.thumbnailUrl)) {
        setCanResume(true); log('📌 Can resume from cache', 'info');
      }

      return { success: false, error: msg, violation: !!(e as any).violation, details: (e as any).details };
    } finally { setUploading(false); }
  }, [userId, online, speed, log, saveCache, loadCache, clearCache, setProgress]);

  // ── Reset / cancel ───────────────────────────────────────────
  const reset = useCallback(() => {
    abortRef.current?.abort();
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setUploading(false); setDisplayProgress(0); setStatus(''); setError(null); setLogs([]); setCanResume(false);
    clearCache();
  }, [clearCache]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setUploading(false); setDisplayProgress(0); setStatus(''); setError(null); setLogs([]);
  }, []);

  // ── Network listener ─────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      if (!navigator.onLine) { setOnline(false); setSpeed('offline'); return; }
      setOnline(true);
      const t = (navigator as any).connection?.effectiveType as string | undefined;
      setSpeed(t === '2g' || t === 'slow-2g' ? 'slow' : 'fast');
    };
    update();
    const conn = (navigator as any).connection;
    window.addEventListener('online', update); window.addEventListener('offline', update);
    conn?.addEventListener?.('change', update);
    return () => {
      window.removeEventListener('online', update); window.removeEventListener('offline', update);
      conn?.removeEventListener?.('change', update);
    };
  }, []);

  // ── Resume check ─────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const cached = loadCache();
    if (cached?.imageUrl || cached?.thumbnailUrl) {
      cacheRef.current = cached; setCanResume(true); log('📦 Found resumable upload', 'info');
    }
  }, [userId]);

  return {
    uploading, progress: displayProgress, status, error,
    logs, online, speed, canResume,
    uploadFile, reset, cancel,
    getCachedData: () => cacheRef.current,
  };
};
