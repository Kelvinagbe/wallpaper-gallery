import { useState, useRef, useEffect, useCallback } from 'react';

type LogType = 'log' | 'error' | 'success' | 'warning' | 'info';
type SpeedType = 'fast' | 'slow' | 'offline';

interface Log {
  message: string;
  type: LogType;
  time: string;
  icon: string;
}

interface UploadCache {
  imageUrl?: string;
  thumbnailUrl?: string;
  file: { name: string; size: number; type: string };
  title: string;
  description: string;
  userId: string;
  timestamp: number;
}

export const useUpload = (userId: string | null) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [online, setOnline] = useState(true);
  const [speed, setSpeed] = useState<SpeedType>('fast');
  const [canResume, setCanResume] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const countIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cacheRef = useRef<UploadCache | null>(null);

  const CACHE_KEY = 'upload_cache';

  const log = useCallback((message: string, type: LogType = 'log') => {
    const icons = { log: '📝', error: '❌', success: '✅', warning: '⚠️', info: 'ℹ️' };
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { message, type, time, icon: icons[type] }]);
    console.log(`[${time}] ${icons[type]} ${message}`);
  }, []);

  // Progressive counting animation
  const countProgress = useCallback((targetProgress: number, speed: 'slow' | 'normal' | 'fast' = 'normal') => {
    if (countIntervalRef.current) clearInterval(countIntervalRef.current);
    const speeds = { slow: 50, normal: 30, fast: 15 };
    const interval = speeds[speed];
    countIntervalRef.current = setInterval(() => {
      setDisplayProgress(current => {
        if (current >= targetProgress) {
          if (countIntervalRef.current) clearInterval(countIntervalRef.current);
          return targetProgress;
        }
        const diff = targetProgress - current;
        const increment = Math.max(0.5, diff / 10);
        return Math.min(current + increment, targetProgress);
      });
    }, interval);
  }, []);

  useEffect(() => {
    if (progress <= 15) countProgress(progress, 'slow');
    else if (progress <= 70) countProgress(progress, 'normal');
    else countProgress(progress, 'fast');
  }, [progress, countProgress]);

  const saveToCache = useCallback((data: Partial<UploadCache>) => {
    if (!userId) return;
    const cache: UploadCache = { ...cacheRef.current, ...data, userId, timestamp: Date.now() } as UploadCache;
    cacheRef.current = cache;
    try {
      const { file, ...cacheData } = cache;
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ...cacheData, file: file ? { name: file.name, size: file.size, type: file.type } : undefined }));
      log('💾 Progress cached', 'info');
    } catch { log('Failed to cache progress', 'warning'); }
  }, [userId, log]);

  const loadFromCache = useCallback((): UploadCache | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      const data = JSON.parse(cached) as UploadCache;
      if (Date.now() - data.timestamp > 3600000 || data.userId !== userId) {
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
    log('🗑️ Cache cleared', 'info');
  }, [log]);

  const generateThumbnail = useCallback((file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        // Target 250px width for very small file size
        const maxWidth = 250;
        const scale = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scale;
        
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Aggressive compression (50% quality) for ~10-20KB
        canvas.toBlob((blob) => {
          if (blob) {
            log(`Thumbnail: ${(blob.size / 1024).toFixed(2)} KB`, 'info');
            resolve(blob);
          } else reject(new Error('Failed to generate thumbnail'));
        }, 'image/jpeg', 0.5);
        
        URL.revokeObjectURL(img.src);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }, [log]);

  const uploadFile = useCallback(async (file: File, title: string, description: string, isRetry: boolean = false): Promise<{ success: boolean; error?: string }> => {
    if (!userId) { log('User not authenticated', 'error'); return { success: false, error: 'Must be logged in' }; }
    if (!online || speed === 'offline') { log('No internet connection', 'error'); return { success: false, error: 'No internet connection' }; }

    setLogs(isRetry ? logs : []);
    if (!isRetry) { log('🚀 Upload process started', 'info'); setProgress(0); setDisplayProgress(0); }
    else log('🔄 Resuming upload...', 'info');
    
    setUploading(true);
    setError(null);
    log(`📦 File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`, 'info');
    log(`📝 Title: ${title}`, 'info');
    if (speed === 'slow') log('⚠️ Slow connection detected', 'warning');

    const cached = isRetry ? cacheRef.current || loadFromCache() : null;
    let imageUrl = cached?.imageUrl;
    let thumbnailUrl = cached?.thumbnailUrl;

    abortRef.current = new AbortController();
    const timeout = setTimeout(() => abortRef.current?.abort(), 120000);

    try {
      if (!imageUrl) {
        setStatus('Preparing...');
        setProgress(5);

        log('🖼️ Generating thumbnail...', 'info');
        const thumbnailBlob = await generateThumbnail(file);
        log(`✅ Thumbnail generated (${(thumbnailBlob.size / 1024).toFixed(2)} KB)`, 'success');
        setProgress(10);

        saveToCache({ file: { name: file.name, size: file.size, type: file.type }, title, description });

        log('📤 STEP 1: Uploading full image...', 'info');
        setStatus('Uploading full image...');
        setProgress(15);

        const fd = new FormData();
        fd.append('file', file);
        fd.append('userId', userId);
        fd.append('folder', 'wallpapers');

        const blobRes = await fetch('https://ovrica.name.ng/api/blob-upload', {
          method: 'POST',
          body: fd,
          signal: abortRef.current.signal,
          mode: 'cors',
          credentials: 'omit'
        });

        log(`Response: ${blobRes.status}`, blobRes.ok ? 'success' : 'error');

        if (!blobRes.ok) {
          const err = await blobRes.json().catch(() => ({ error: blobRes.statusText }));
          log(`Upload failed: ${err.error}`, 'error');
          throw new Error(err.error || 'Failed to upload to storage');
        }

        const blobData = await blobRes.json();
        if (!blobData.success || !blobData.url) {
          log('No image URL returned', 'error');
          throw new Error('Upload failed: No image URL');
        }

        imageUrl = blobData.url;
        log('✅ Full image uploaded!', 'success');
        log(`🔗 URL: ${imageUrl}`, 'info');
        setProgress(40);
        saveToCache({ imageUrl });

        if (!thumbnailUrl) {
          log('📤 STEP 2: Uploading thumbnail...', 'info');
          setStatus('Uploading thumbnail...');

          const thumbFd = new FormData();
          thumbFd.append('file', thumbnailBlob, `thumb_${file.name}`);
          thumbFd.append('userId', userId);
          thumbFd.append('folder', 'wallpapers/thumbnails');

          const thumbRes = await fetch('https://ovrica.name.ng/api/blob-upload', {
            method: 'POST',
            body: thumbFd,
            signal: abortRef.current.signal,
            mode: 'cors',
            credentials: 'omit'
          });

          if (!thumbRes.ok) {
            log('⚠️ Thumbnail upload failed, using full image', 'warning');
            thumbnailUrl = imageUrl;
          } else {
            const thumbData = await thumbRes.json();
            thumbnailUrl = thumbData.success ? thumbData.url : imageUrl;
          }

          log('✅ Thumbnail processed!', 'success');
          setProgress(70);
          saveToCache({ imageUrl, thumbnailUrl });
        }
      } else {
        log('✅ Using cached URLs', 'success');
        setProgress(70);
      }

      setStatus('Saving to database...');
      log('💾 STEP 3: Saving to database...', 'info');

      const dbRes = await fetch('/api/save-wallpaper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          title: title.trim(),
          description: description.trim() || null,
          image_url: imageUrl,
          thumbnail_url: thumbnailUrl,
        }),
      });

      clearTimeout(timeout);
      log(`Database: ${dbRes.status}`, dbRes.ok ? 'success' : 'error');

      if (!dbRes.ok) {
        const dbErr = await dbRes.json().catch(() => ({ error: dbRes.statusText }));
        log(`Database failed: ${dbErr.error}`, 'error');
        if (!cached?.imageUrl) {
          log('🗑️ Cleanup...', 'warning');
          try {
            await fetch('https://ovrica.name.ng/api/blob-upload', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: imageUrl }),
              mode: 'cors'
            });
            log('Cleanup done', 'warning');
          } catch { log('Cleanup failed', 'warning'); }
        }
        throw new Error(dbErr.error || 'Database save failed');
      }

      const dbData = await dbRes.json();
      if (!dbData.success) {
        log('Database save failed', 'error');
        throw new Error(dbData.error || 'Database save failed');
      }

      log('✅ Database saved!', 'success');
      log(`📋 ID: ${dbData.data?.id}`, 'success');
      setProgress(100);
      setStatus('Complete!');
      log('🎉 Upload complete!', 'success');
      clearCache();
      return { success: true };

    } catch (e: any) {
      clearTimeout(timeout);
      if (countIntervalRef.current) clearInterval(countIntervalRef.current);
      log(`💥 Failed: ${e.message}`, 'error');

      let msg = e.message || 'Upload failed';
      let shouldRetry = false;

      if (e.name === 'AbortError') {
        msg = 'Upload timed out (2 minutes)';
        log('Timeout', 'error');
        shouldRetry = true;
      } else if (e.message.includes('Failed to fetch') || e.message.includes('Network')) {
        msg = 'Network error. Check connection and retry.';
        log('Network error', 'error');
        shouldRetry = true;
      } else if (e.message.includes('database')) shouldRetry = true;

      if (shouldRetry && (cacheRef.current?.imageUrl || cacheRef.current?.thumbnailUrl)) {
        setCanResume(true);
        log('📌 Can resume from cache', 'info');
      }

      setError(msg);
      return { success: false, error: msg };
    } finally {
      setUploading(false);
    }
  }, [userId, online, speed, log, generateThumbnail, saveToCache, loadFromCache, clearCache, logs]);

  const reset = useCallback(() => {
    setProgress(0);
    setDisplayProgress(0);
    setStatus('');
    setError(null);
    setUploading(false);
    setLogs([]);
    setCanResume(false);
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    if (countIntervalRef.current) { clearInterval(countIntervalRef.current); countIntervalRef.current = null; }
    clearCache();
  }, [clearCache]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    if (countIntervalRef.current) clearInterval(countIntervalRef.current);
    setError(null);
    setUploading(false);
    setProgress(0);
    setDisplayProgress(0);
    setLogs([]);
  }, []);

  useEffect(() => {
    const checkSpeed = async () => {
      if (!navigator.onLine) { setSpeed('offline'); setOnline(false); return; }
      try {
        const t = Date.now();
        const r = await fetch('https://www.google.com/favicon.ico', { method: 'HEAD', cache: 'no-cache', signal: AbortSignal.timeout(5000) });
        if (r.ok) { setOnline(true); setSpeed(Date.now() - t > 2000 ? 'slow' : 'fast'); }
      } catch { setSpeed('slow'); }
    };

    const onOnline = () => { setOnline(true); setSpeed('fast'); };
    const onOffline = () => { setOnline(false); setSpeed('offline'); };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    checkSpeed();
    const interval = setInterval(checkSpeed, 30000);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(interval);
      if (countIntervalRef.current) clearInterval(countIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (userId) {
      const cached = loadFromCache();
      if (cached && (cached.imageUrl || cached.thumbnailUrl)) {
        cacheRef.current = cached;
        setCanResume(true);
        log('📦 Found cached data', 'info');
      }
    }
  }, [userId, loadFromCache, log]);

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