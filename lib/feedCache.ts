// lib/feedCache.ts
import type { Wallpaper } from '@/app/types';
import type { Filter } from '@/app/types';

export const feedCache: {
  wallpapers: Wallpaper[];
  page: number;
  filter: Filter;
  scrollY: number;
  hasMore: boolean;
  populated: boolean;
} = {
  wallpapers: [],
  page: 0,
  filter: 'all',
  scrollY: 0,
  hasMore: true,
  populated: false,
};

export const saveFeedScroll = () => {
  feedCache.scrollY = window.scrollY;
};