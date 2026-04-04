'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function RouterRefresher() {
  const router = useRouter();

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        router.refresh(); // clears RSC cache, unfreeze router
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [router]);

  return null;
}