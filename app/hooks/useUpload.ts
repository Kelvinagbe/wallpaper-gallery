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
  file: {
    name: string;
    size: number;
    type: string;
  };
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

  // Update counting speed when progress changes
  useEffect(() => {
    if (progress <= 15) {
      countProgress(progress, 'slow');
    } else if (progress <= 70) {
      countProgress(progress, 'normal');
    } else {
      countProgress(progress, 'fast');
    }
  }, [progress, countProgress]);

  // Save to cache
  const saveToCache = useCallback((data: Partial<UploadCache>) => {
    if (!userId) return;
    
    const cache: UploadCache = {
      ...cacheRef.current,
      ...data,
      userId,
      timestamp: Date.now(),
    } as UploadCache;
    
    cacheRef.current = cache;
    
    try {
      // Don't save File object to localStorage, just metadata
      const { file, ...cacheData } = cache;
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        ...cacheData,
        file: file ? {
          name: file.name,
          size: file.size,
          type: file.type,
        } : undefined
      }));
      log('💾 Progress cached', 'info');
    } catch (e) {
      log('Failed to cache progress', 'warning');
    }
  }, [userId, log]);

  // Load from cache
  const loadFromCache = useCallback((): UploadCache | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const data = JSON.parse(cached) as UploadCache;
      
      // Check if cache is still valid (within 1 hour)
      if (Date.now() - data.timestamp > 3600000) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      
      // Check if same user
      if (data.userId !== userId) {
        return null;
      }
      
      return data;
    } catch {
      return null;
    }
  }, [userId]);

  // Clear cache
  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    cacheRef.current = null;
    setCanResume(false);
    log('🗑️ Cache cleared', 'info');
  }, [log]);

  const generateThumbnail = useCallback((file: File, maxWidth: number = 400): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        const scale = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scale;
        
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to generate thumbnail'));
        }, 'image/jpeg', 0.8);
        
        URL.revokeObjectURL(img.src);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const uploadFile = useCallback(async (
    file: File,
    title: string,
    description: string,
    isRetry: boolean = false
  ): Promise<{ success: boolean; error?: string }> => {
    if (!userId) {
      log('User not authenticated', 'error');
      return { success: false, error: 'Must be logged in' };
    }

    if (!online || speed === 'offline') {
      log('No internet connection', 'error');
      return { success: false, error: 'No internet connection' };
    }

    setLogs(isRetry ? logs : []);
    if (!isRetry) {
      log('🚀 Upload process started', 'info');
      setProgress(0);
      setDisplayProgress(0);
    } else {
      log('🔄 Resuming upload...', 'info');
    }
    
    setUploading(true);
    setError(null);

    log(`📦 File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`, 'info');
    log(`📝 Title: ${title}`, 'info');

    if (speed === 'slow') {
      log('⚠️ Slow connection detected', 'warning');
    }

    // Check for cached progress
    const cached = isRetry ? cacheRef.current || loadFromCache() : null;
    let imageUrl = cached?.imageUrl;
    let thumbnailUrl = cached?.thumbnailUrl;

    abortRef.current = new AbortController();
    const timeout = setTimeout(() => abortRef.current?.abort(), 120000);

    try {
      // Step 1: Upload full image (skip if cached)
      if (!imageUrl) {
        setStatus('Preparing...');
        setProgress(5);

        log('🖼️ Generating thumbnail...', 'info');
        const thumbnailBlob = await generateThumbnail(file, 400);
        log(`✅ Thumbnail generated (${(thumbnailBlob.size / 1024).toFixed(2)} KB)`, 'success');
        setProgress(10);

        // Save file metadata to cache
        saveToCache({
          file: {
            name: file.name,
            size: file.size,
            type: file.type,
          },
          title,
          description,
        });

        log('📤 STEP 1: Uploading full image to Vercel Blob...', 'info');
        setStatus('Uploading full image...');
        setProgress(15);

        const fd = new FormData();
        fd.append('file', file);
        fd.append('userId', userId);
        fd.append('folder', 'wallpapers');

        log('Sending to https://ovrica.name.ng/api/blob-upload', 'info');

        const blobRes = await fetch('https://ovrica.name.ng/api/blob-upload', {
          method: 'POST',
          body: fd,
          signal: abortRef.current.signal,
          mode: 'cors',
          credentials: 'omit'
        });

        log(`Response status: ${blobRes.status}`, blobRes.ok ? 'success' : 'error');

        if (!blobRes.ok) {
          const err = await blobRes.json().catch(() => ({ error: blobRes.statusText }));
          log(`Blob upload failed: ${err.error}`, 'error');
          throw new Error(err.error || 'Failed to upload to storage');
        }

        const blobData = await blobRes.json();

        if (!blobData.success || !blobData.url) {
          log('No image URL returned from blob storage', 'error');
          throw new Error('Upload failed: No image URL');
        }

        imageUrl = blobData.url;
        log('✅ Full image upload successful!', 'success');
        log(`🔗 Image URL: ${imageUrl}`, 'info');
        setProgress(40);

        // Cache the image URL
        saveToCache({ imageUrl });

        // Step 2: Upload thumbnail (skip if cached)
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

          // Cache the thumbnail URL
          saveToCache({ imageUrl, thumbnailUrl });
        }
      } else {
        log('✅ Using cached image URLs', 'success');
        setProgress(70);
      }

      // Step 3: Save to database
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

      log(`Database response: ${dbRes.status}`, dbRes.ok ? 'success' : 'error');

      if (!dbRes.ok) {
        const dbErr = await dbRes.json().catch(() => ({ error: dbRes.statusText }));
        log(`Database save failed: ${dbErr.error}`, 'error');

        // Don't cleanup files if we have them cached - user can retry
        if (!cached?.imageUrl) {
          log('🗑️ Attempting cleanup of uploaded files...', 'warning');
          try {
            await fetch('https://ovrica.name.ng/api/blob-upload', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: imageUrl }),
              mode: 'cors'
            });
            log('Cleanup successful', 'warning');
          } catch {
            log('Cleanup failed', 'warning');
          }
        }

        throw new Error(dbErr.error || 'Failed to save to database');
      }

      const dbData = await dbRes.json();

      if (!dbData.success) {
        log('Database save failed', 'error');
        throw new Error(dbData.error || 'Failed to save to database');
      }

      log('✅ Database save successful!', 'success');
      log(`📋 Record ID: ${dbData.data?.id}`, 'success');

      setProgress(100);
      setStatus('Complete!');
      log('🎉 Upload completed successfully!', 'success');

      // Clear cache on success
      clearCache();

      return { success: true };

    } catch (e: any) {
      clearTimeout(timeout);
      if (countIntervalRef.current) clearInterval(countIntervalRef.current);
      log(`💥 Upload failed: ${e.message}`, 'error');

      let msg = e.message || 'Upload failed';
      let shouldAllowRetry = false;

      if (e.name === 'AbortError') {
        msg = 'Upload timed out (2 minutes)';
        log('Timeout after 2 minutes', 'error');
        shouldAllowRetry = true;
      } else if (e.message.includes('Failed to fetch') || e.message.includes('Network')) {
        msg = 'Network error. Check your connection and retry.';
        log('Network error: Failed to fetch', 'error');
        shouldAllowRetry = true;
      } else if (e.message.includes('database')) {
        shouldAllowRetry = true;
      }

      // Enable resume if we have cached URLs
      if (shouldAllowRetry && (cacheRef.current?.imageUrl || cacheRef.current?.thumbnailUrl)) {
        setCanResume(true);
        log('📌 Upload can be resumed from cache', 'info');
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
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (countIntervalRef.current) {
      clearInterval(countIntervalRef.current);
      countIntervalRef.current = null;
    }
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

  // Network monitoring
  useEffect(() => {
    const checkSpeed = async () => {
      if (!navigator.onLine) {
        setSpeed('offline');
        setOnline(false);
        return;
      }
      try {
        const t = Date.now();
        const r = await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000)
        });
        if (r.ok) {
          setOnline(true);
          setSpeed(Date.now() - t > 2000 ? 'slow' : 'fast');
        }
      } catch {
        setSpeed('slow');
      }
    };

    const onOnline = () => {
      setOnline(true);
      setSpeed('fast');
    };

    const onOffline = () => {
      setOnline(false);
      setSpeed('offline');
    };

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

  // Check for cached data on mount
  useEffect(() => {
    if (userId) {
      const cached = loadFromCache();
      if (cached && (cached.imageUrl || cached.thumbnailUrl)) {
        cacheRef.current = cached;
        setCanResume(true);
        log('📦 Found cached upload data', 'info');
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