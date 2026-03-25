export type Ad = {
  id: string;
  type: 'ad';
  adType: 'native' | 'banner';
  title: string;
  subtitle?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaUrl: string;
  brandName: string;
  brandLogoUrl?: string;
  backgroundColor?: string;
  accentColor?: string;
};