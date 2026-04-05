import type { Ad } from '@/app/types';

export const ADS: Ad[] = [
 
];

export const BANNER_ADS = ADS.filter(a => a.adType === 'banner');
export const NATIVE_ADS = ADS.filter(a => a.adType === 'native');
