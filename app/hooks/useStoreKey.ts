import { useState, useEffect, useCallback } from 'react';
import { subscribeStore } from '../utils/userStore';

type StoreKeyName = 'profile' | 'settings' | 'liked' | 'saved' | 'recent' | 'password';

export function useStoreKey<T>(key: StoreKeyName, reader: () => T): T {
  const [value, setValue] = useState<T>(reader);

  const refresh = useCallback(() => setValue(reader()), [reader]);

  useEffect(() => {
    const unsub = subscribeStore((changedKey) => {
      if (changedKey === key) refresh();
    });
    // Refresh immediately in case store changed between render and effect
    refresh();
    return unsub;
  }, [key, refresh]);

  return value;
}