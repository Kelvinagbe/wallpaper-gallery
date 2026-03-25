import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json([
    {
      id: 'ad_001',
      type: 'ad',
      adType: 'native',
      title: 'Your Ad Title',
      imageUrl: 'https://your-image.com/ad.jpg',
      ctaLabel: 'Try Free',
      ctaUrl: 'https://yourlink.com',
      brandName: 'YourBrand',
    },
    {
      id: 'ad_002',
      type: 'ad',
      adType: 'banner',
      title: 'Upgrade to Pro',
      subtitle: 'Ad-free + unlimited downloads',
      ctaLabel: 'Get Pro',
      ctaUrl: '/pro',
      brandName: 'YourApp',
      backgroundColor: '#1e1b4b',
      accentColor: '#818cf8',
    },
  ]);
}