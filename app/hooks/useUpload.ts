//hooks/useUpload.ts:
import { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

type LogType = 'log' | 'error' | 'success' | 'warning' | 'info';
type SpeedType = 'fast' | 'slow' | 'offline';

interface Log {
  message: string;
  type: LogType;
  time: string;
  icon: string;
}

export const useUpload = (userId: string | null) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [online, setOnline] = useState(true);
  const [speed, setSpeed] = useState<SpeedType>('fast');

  const abortRef = useRef<AbortController | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const log = useCallback((message: string, type: LogType = 'log') => {
    const icons = { log: '📝', error: '❌', success: '✅', warning: '⚠️', info: 'ℹ️' };
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { message, type, time, icon: icons[type] }]);
    console.log(`[${time}] ${icons[type]} ${message}`);
  }, []);

  const animateProgress = useCallback((targetProgress: number, duration: number = 1000) => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    
    setProgress(currentProgress => {
      const startProgress = currentProgress;
      const diff = targetProgress - startProgress;
      const startTime = Date.now();
      
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progressRatio = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progressRatio, 3);
        
        const newProgress = startProgress + (diff * easeOut);
        setProgress(newProgress);
        
        if (progressRatio >= 1) {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
          setProgress(targetProgress);
        }
      }, 16);

      return startProgress;
    });
  }, []);

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
    description: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!userId) {
      log('User not authenticated', 'error');
      return { success: false, error: 'Must be logged in' };
    }

    if (!online || speed === 'offline') {
      log('No internet connection', 'error');
      return { success: false, error: 'No internet connection' };
    }

    setLogs([]);
    log('🚀 Upload process started', 'info');
    setProgress(0);
    setUploading(true);
    setError(null);

    log(`📦 File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`, 'info');
    log(`📝 Title: ${title}`, 'info');

    if (speed === 'slow') {
      log('⚠️ Slow connection detected', 'warning');
    }

    abortRef.current = new AbortController();
    const timeout = setTimeout(() => abortRef.current?.abort(), 120000);

    try {
      setStatus('Preparing...');
      animateProgress(5, 500);

      // Generate thumbnail
      log('🖼️ Generating thumbnail...', 'info');
      const thumbnailBlob = await generateThumbnail(file, 400);
      log(`✅ Thumbnail generated (${(thumbnailBlob.size / 1024).toFixed(2)} KB)`, 'success');
      animateProgress(10, 500);

      // Upload full image
      log('📤 STEP 1: Uploading full image to Vercel Blob...', 'info');
      setStatus('Uploading full image...');
      animateProgress(15, 800);

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

      log('✅ Full image upload successful!', 'success');
      log(`🔗 Image URL: ${blobData.url}`, 'info');
      animateProgress(40, 600);

      // Upload thumbnail
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
      }

      const thumbData = await thumbRes.json();
      const thumbnailUrl = thumbData.success ? thumbData.url : blobData.url;

      log('✅ Thumbnail processed!', 'success');
      animateProgress(70, 800);

      // Save to database
      setStatus('Saving to database...');
      log('💾 STEP 3: Saving to database...', 'info');

      const dbRes = await fetch('/api/save-wallpaper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          title: title.trim(),
          description: description.trim() || null,
          image_url: blobData.url,
          thumbnail_url: thumbnailUrl,
        }),
      });

      clearTimeout(timeout);

      log(`Database response: ${dbRes.status}`, dbRes.ok ? 'success' : 'error');

      if (!dbRes.ok) {
        const dbErr = await dbRes.json().catch(() => ({ error: dbRes.statusText }));
        log(`Database save failed: ${dbErr.error}`, 'error');

        // Cleanup
        log('🗑️ Attempting cleanup of uploaded files...', 'warning');
        try {
          await fetch('https://ovrica.name.ng/api/blob-upload', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: blobData.url }),
            mode: 'cors'
          });
          log('Cleanup successful', 'warning');
        } catch {
          log('Cleanup failed', 'warning');
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

      animateProgress(100, 400);
      setStatus('Complete!');
      log('🎉 Upload completed successfully!', 'success');

      return { success: true };

    } catch (e: any) {
      clearTimeout(timeout);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      log(`💥 Upload failed: ${e.message}`, 'error');

      let msg = e.message || 'Upload failed';
      if (e.name === 'AbortError') {
        msg = 'Upload timed out (2 minutes)';
        log('Timeout after 2 minutes', 'error');
      } else if (e.message.includes('Failed to fetch')) {
        msg = 'Cannot connect to server. Check your internet connection.';
        log('Network error: Failed to fetch', 'error');
      }

      setError(msg);
      return { success: false, error: msg };
    } finally {
      setUploading(false);
    }
  }, [userId, online, speed, log, animateProgress, generateThumbnail]);

  const reset = useCallback(() => {
    setProgress(0);
    setStatus('');
    setError(null);
    setUploading(false);
    setLogs([]);
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setError(null);
    setUploading(false);
    setProgress(0);
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
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  return {
    uploading,
    progress,
    status,
    error,
    logs,
    online,
    speed,
    uploadFile,
    reset,
    cancel,
  };
};