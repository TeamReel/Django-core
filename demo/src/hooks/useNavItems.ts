import { useEffect, useState } from 'react';
import { getFavorites, getRecents, type NavStoredItem } from '../utils/navStorage';

function useNavStorage(eventName: string, getter: () => NavStoredItem[]) {
  const [items, setItems] = useState<NavStoredItem[]>(() => getter());

  useEffect(() => {
    const refresh = () => setItems(getter());

    window.addEventListener('storage', refresh);
    window.addEventListener(eventName, refresh as any);

    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(eventName, refresh as any);
    };
  }, [eventName, getter]);

  return items;
}

export function useNavRecents() {
  return useNavStorage('nav:recents', getRecents);
}

export function useNavFavorites() {
  return useNavStorage('nav:favorites', getFavorites);
}
