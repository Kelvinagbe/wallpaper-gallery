// hooks/useUpload.ts
import { useState, useRef, useCallback, useEffect } from 'react';

type LogType   = 'log' | 'error' | 'success' | 'warning' | 'info';
type SpeedType = 'fast' | 'slow' | 'offline';

interface Log { message: string; type: LogType; time: string; icon: string }
interface UploadCache {
  imageUrl?:    string;
  thumbnailUrl?: string;
  file:         { name: string; size: number; type: string };
  title:        string;
  description:  string;
  userId:       string;
  timestamp:    number;
}

const CACHE_KEY   = 'upload_cache';
const CACHE_TTL   = 3_600_000; // 1 hour
const LOG_ICONS   = { log:'📝', error:'❌', success:'✅', warning:'⚠️', info:'ℹ️' };
const MAX_W       = 1920;
const MAX_H       = 1080;
const THUMB_W     = 400; // ✅ 400px thumbnail instead of 100px — better LCP on detail page
const TIMEOUT_MS  = 120_000;

// ─── Image compression helpers (outside hook — stable references) ─────────────
const compressToBlob = (img: HTMLImageElement, w: number, h: number, quality: number, format = 'image/jpeg'): Promise<Blob> =>
  new Promise((res, rej) => {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
    canvas.toBlob(b => b ? res(b) : rej(new Error('canvas.toBlob returned null')), format, quality);
  });

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((res, rej) => {
    const img = new Image();
    img.onload  = () => res(img);
    img.onerror = () => rej(new Error('Failed to load image'));
    img.src     = url;
  });

const compressMain = async (file: File, log: (m: string) => void): Promise<Blob> => {
  const url = URL.createObjectURL(file);
  try {
    const img  = await loadImage(url);
    const ratio = Math.min(MAX_W / img.width, MAX_H / img.height, 1);
    const w = Math.round(img.width * ratio), h = Math.round(img.height * ratio);
    // Iteratively reduce quality until under 250KB
    let quality = 0.85;
    let blob    = await compressToBlob(img, w, h, quality);
    while (blob.size > 250 * 1024 && quality > 0.5) {
      quality = Math.max(quality - 0.1, 0.5);
      blob    = await compressToBlob(img, w, h, quality);
    }
    log(`Main image: ${(blob.size / 1024).toFixed(1)} KB (q=${quality.toFixed(1)})`);
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
};

const generateThumbnail = async (file: File, log: (m: string) => void): Promise<Blob> => {
  const url = URL.createObjectURL(file);
  try {
    const img  = await loadImage(url);
    const h    = Math.round((THUMB_W / img.width) * img.height);
    const blob = await compressToBlob(img, THUMB_W, h, 0.75);
    log(`Thumbnail: ${(blob.size / 1024).toFixed(1)} KB`);
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useUpload = (userId: string | null) => {
  const [uploading,       setUploading]       = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [status,          setStatus]          = useState('');
  const [error,           setError]           = useState<string | null>(null);
  const [logs,            setLogs]            = useState<Log[]>([]);
  const [online,          setOnline]          = useState(true);
  const [speed,           setSpeed]           = useState<SpeedType>('fast');
  const [canResume,       setCanResume]       = useState(false);

  const abortRef         = useRef<AbortController | null>(null);
  const progressRef      = useRef(0);     // ✅ real progress stored in ref, not state
  const animFrameRef     = useRef<number | null>(null);
  const cacheRef         = useRef<UploadCache | null>(null);

  // ── Logging ─────────────────────────────────────────────────────────────────
  const log = useCallback((message: string, type: LogType = 'log') => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { message, type, time, icon: LOG_ICONS[type] }]);
  }, []);

  // ── Smooth progress animation via rAF (replaces setInterval) ─────────────────
  const animateProgress = useCallback((target: number) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const step = () => {
      setDisplayProgress(cur => {
        if (cur >= target) return target;
        const next = cur + Math.max(0.5, (target - cur) / 12);
        if (next < target) animFrameRef.current = requestAnimationFrame(step);
        return Math.min(next, target);
      });
    };
    animFrameRef.current = requestAnimationFrame(step);
  }, []);

  const setProgress = useCallback((val: number) => {
    progressRef.current = val;
    animateProgress(val);
  }, [animateProgress]);

  // ── Cache ───────────────────────────────────────────────────────────────────
  const saveToCache = useCallback((data: Partial<UploadCache>) => {
    if (!userId) return;
    const next = { ...cacheRef.current, ...data, userId, timestamp: Date.now() } as UploadCache;
    cacheRef.current = next;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(next));
      log('Progress cached', 'info');
    } catch { log('Failed to cache progress', 'warning'); }
  }, [userId, log]);

  const loadFromCache = useCallback((): UploadCache | null => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as UploadCache;
      if (Date.now() - data.timestamp > CACHE_TTL || data.userId !== userId) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      return data;
    } catch { return null; }
  }, [userId]);

  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    cacheRef.current = null;
    setCanResume(false);
  }, []);

  // ── Upload ──────────────────────────────────────────────────────────────────
  const uploadFile = useCallback(async (
    file: File, title: string, description: string, isRetry = false
  ): Promise<{ success: boolean; error?: string }> => {
    if (!userId)                      return { success: false, error: 'Must be logged in' };
    if (!online || speed === 'offline') return { success: false, error: 'No internet connection' };

    // ✅ Functional update — no stale closure on logs
    setLogs(isRetry ? (prev => prev) : []);
    setUploading(true);
    setError(null);
    setProgress(0);
    setStatus('Preparing...');

    log(`📦 File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`, 'info');
    log(`📝 Title: ${title}`, 'info');
    if (speed === 'slow') log('⚠️ Slow connection detected', 'warning');

    const cached = isRetry ? (cacheRef.current || loadFromCache()) : null;
    let imageUrl    = cached?.imageUrl;
    let thumbnailUrl = cached?.thumbnailUrl;

    abortRef.current = new AbortController();
    const timeout = setTimeout(() => abortRef.current?.abort(), TIMEOUT_MS);

    try {
      if (!imageUrl) {
        log('🖼️ Compressing main image...', 'info');
        const compressed = await compressMain(file, m => log(m, 'info'));
        log(`✅ Compressed: ${(compressed.size / 1024).toFixed(1)} KB`, 'success');
        setProgress(8);

        log('🖼️ Generating thumbnail...', 'info');
        const thumb = await generateThumbnail(file, m => log(m, 'info'));
        setProgress(10);

        saveToCache({ file: { name: file.name, size: file.size, type: file.type }, title, description });

        // Upload main image
        log('📤 Uploading image...', 'info');
        setStatus('Uploading image...');
        setProgress(15);

        const fd = new FormData();
        fd.append('file', compressed, file.name);
        fd.append('userId', userId);
        fd.append('folder', 'wallpapers');

        const blobRes = await fetch('https://ovrica.name.ng/api/blob-upload', { method:'POST', body:fd, signal:abortRef.current.signal, mode:'cors', credentials:'omit' });
        if (!blobRes.ok) {
          const err = await blobRes.json().catch(() => ({ error: blobRes.statusText }));
          throw new Error(err.error || 'Image upload failed');
        }
        const blobData = await blobRes.json();
        if (!blobData.success || !blobData.url) throw new Error('No image URL returned');

        imageUrl = blobData.url;
        log(`✅ Image uploaded`, 'success');
        setProgress(40);
        saveToCache({ imageUrl });

        // Upload thumbnail
        if (!thumbnailUrl) {
          log('📤 Uploading thumbnail...', 'info');
          setStatus('Uploading thumbnail...');
          const tfd = new FormData();
          tfd.append('file', thumb, `thumb_${file.name}`);
          tfd.append('userId', userId);
          tfd.append('folder', 'wallpapers/thumbnails');

          const thumbRes = await fetch('https://ovrica.name.ng/api/blob-upload', { method:'POST', body:tfd, signal:abortRef.current.signal, mode:'cors', credentials:'omit' });
          if (!thumbRes.ok) {
            log('⚠️ Thumbnail upload failed, using main image', 'warning');
            thumbnailUrl = imageUrl;
          } else {
            const thumbData = await thumbRes.json();
            thumbnailUrl = thumbData.success ? thumbData.url : imageUrl;
          }
          log('✅ Thumbnail done', 'success');
          setProgress(70);
          saveToCache({ imageUrl, thumbnailUrl });
        }
      } else {
        log('✅ Using cached URLs', 'success');
        setProgress(70);
      }

      // Save to DB
      setStatus('Saving to database...');
      log('💾 Saving to database...', 'info');

      const dbRes = await fetch('/api/save-wallpaper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, title: title.trim(), description: description.trim() || null, image_url: imageUrl, thumbnail_url: thumbnailUrl }),
        signal: abortRef.current.signal,
      });

      clearTimeout(timeout);

      if (!dbRes.ok) {
        const dbErr = await dbRes.json().catch(() => ({ error: dbRes.statusText }));
        // Rollback: delete uploaded blob if we just uploaded it
        if (!cached?.imageUrl) {
          try { await fetch('https://ovrica.name.ng/api/blob-upload', { method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ url: imageUrl }), mode:'cors' }); } catch { /* ignore */ }
        }
        throw new Error(dbErr.error || 'Database save failed');
      }

      const dbData = await dbRes.json();
      if (!dbData.success) throw new Error(dbData.error || 'Database save failed');

      setProgress(100);
      setStatus('Complete!');
      log('🎉 Upload complete!', 'success');
      clearCache();
      return { success: true };

    } catch (e: any) {
      clearTimeout(timeout);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      const isAbort   = e.name === 'AbortError';
      const isNetwork = e.message?.includes('Failed to fetch') || e.message?.includes('Network');
      const isDB      = e.message?.includes('database') || e.message?.includes('Database');

      const msg = isAbort   ? 'Upload timed out (2 minutes)' :
                  isNetwork ? 'Network error. Check connection and retry.' : e.message || 'Upload failed';

      log(`💥 ${msg}`, 'error');
      setError(msg);

      if ((isAbort || isNetwork || isDB) && (cacheRef.current?.imageUrl || cacheRef.current?.thumbnailUrl)) {
        setCanResume(true);
        log('📌 Can resume from cache', 'info');
      }

      return { success: false, error: msg };
    } finally {
      setUploading(false);
    }
  }, [userId, online, speed, log, saveToCache, loadFromCache, clearCache, setProgress]);

  // ── Reset / Cancel ──────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    abortRef.current?.abort();
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setUploading(false); setDisplayProgress(0); setStatus(''); setError(null); setLogs([]); setCanResume(false);
    clearCache();
  }, [clearCache]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setUploading(false); setDisplayProgress(0); setStatus(''); setError(null); setLogs([]);
  }, []);

  // ── Network detection ────────────────────────────────────────────────────────
  // ✅ Uses navigator.connection API — no external fetch to google.com every 30s
  useEffect(() => {
    const update = () => {
      if (!navigator.onLine) { setOnline(false); setSpeed('offline'); return; }
      setOnline(true);
      const conn = (navigator as any).connection;
      const type = conn?.effectiveType as string | undefined;
      setSpeed(type === '2g' || type === 'slow-2g' ? 'slow' : 'fast');
    };

    update();
    window.addEventListener('online',  update);
    window.addEventListener('offline', update);
    (navigator as any).connection?.addEventListener?.('change', update);

    return () => {
      window.removeEventListener('online',  update);
      window.removeEventListener('offline', update);
      (navigator as any).connection?.removeEventListener?.('change', update);
    };
  }, []);

  // ── Resume check on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const cached = loadFromCache();
    if (cached && (cached.imageUrl || cached.thumbnailUrl)) {
      cacheRef.current = cached;
      setCanResume(true);
      log('📦 Found resumable upload', 'info');
    }
  }, [userId]); // ✅ removed loadFromCache and log from deps — stable functions but avoids loop

  return {
    uploading,
    progress: displayProgress,
    status,
    error,
    logs,
    online,
    speed,
    canResume,
    uploadFile,
    reset,
    cancel,
    getCachedData: () => cacheRef.current,
  };
};
