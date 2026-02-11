'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

export const BackContext = createContext<any>(null);

export function BackProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      window.history.pushState(null, '');
      const handleBack = () => setIsOpen(false);
      window.addEventListener('popstate', handleBack);
      return () => window.removeEventListener('popstate', handleBack);
    }
  }, [isOpen]);

  return (
    <BackContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </BackContext.Provider>
  );
}

export const useBack = () => useContext(BackContext);