import { useEffect, useRef } from 'react';

export const usePrefetch = (images: string[], priority: 'high' | 'low' = 'low') => {
  const prefetchedRef = useRef(new Set<string>());
  const linksRef = useRef(new Map<string, HTMLLinkElement>());

  useEffect(() => {
    // Filter out already prefetched images
    const newImages = images.filter(src => src && !prefetchedRef.current.has(src));
    
    if (newImages.length === 0) return;

    const prefetchImages = () => {
      newImages.forEach((src) => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.as = 'image';
        link.href = src;

        if (priority === 'high') {
          link.setAttribute('fetchpriority', 'high');
        }

        document.head.appendChild(link);
        prefetchedRef.current.add(src);
        linksRef.current.set(src, link);
      });
    };

    if ('requestIdleCallback' in window) {
      const handle = (window as any).requestIdleCallback(prefetchImages, { timeout: 2000 });
      return () => (window as any).cancelIdleCallback(handle);
    } else {
      const timeout = setTimeout(prefetchImages, 100);
      return () => clearTimeout(timeout);
    }
  }, [images.join(','), priority]); // Use join to create stable dependency

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      linksRef.current.forEach(link => link.remove());
      linksRef.current.clear();
      prefetchedRef.current.clear();
    };
  }, []);
};