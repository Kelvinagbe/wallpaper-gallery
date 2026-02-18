
import type { Metadata } from 'next';



export const metadata: Metadata = {
  title: 'Upload your Wallpaper',
  description: 'Upload your wallpaper',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  
  return (
    <html lang="en">
      <body className={inter.className}>
      
      </body>
    </html>
  );
}