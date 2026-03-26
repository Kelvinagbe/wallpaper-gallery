import './globals.css';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';                          // ← add this
import { AuthProvider } from '@/app/components/AuthProvider';
import { UploadModalProvider } from '@/app/components/UploadModalProvider';
import { TopLoader } from '@/app/components/TopLoader';
import { createClient } from '@/lib/supabase/server';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Wallpaper Gallery',
  description: 'Discover and share amazing wallpapers',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  return (
    <html lang="en">
      <head>
        <Script src="/ads.js" strategy="beforeInteractive" />  {/* ← add this */}
      </head>
      <body className={inter.className}>
        <Suspense fallback={null}>
          <TopLoader />
        </Suspense>
        <AuthProvider initialSession={session}>
          <UploadModalProvider>
            {children}
          </UploadModalProvider>
        </AuthProvider>
      </body>
    </html>
  );
}