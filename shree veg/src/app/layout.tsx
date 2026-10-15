import type { Metadata, Viewport } from 'next';
import { Yatra_One, Mukta } from 'next/font/google';
import './globals.css';
import { PwaRegister } from '@/components/pwa-register';

const yatraOne = Yatra_One({
  weight: '400',
  subsets: ['devanagari', 'latin'],
  display: 'swap',
  variable: '--font-yatra',
});

const mukta = Mukta({
  weight: ['400', '600', '700'],
  subsets: ['devanagari', 'latin'],
  display: 'swap',
  variable: '--font-mukta',
});

export const metadata: Metadata = {
  title: 'Shree Pure Veg | Authentic Satvik Dining - Theur Phata, Pune',
  description: 'Pure Vegetarian Restaurant at Theur Phata, Pune-Solapur Highway. Serving pilgrims to Chintamani Ganpati temple and family travelers.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Shree Veg Staff',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#1B2559',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${yatraOne.variable} ${mukta.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="font-body bg-sand text-primary min-h-screen antialiased selection:bg-marigold selection:text-primary">
        <PwaRegister />
        {/* Demo Mode Top Banner */}
        <div className="bg-primary text-sand px-4 py-1.5 text-xs text-center font-medium tracking-wide flex items-center justify-center gap-2 border-b border-brass/30 shadow-sm">
          <span className="inline-block w-2 h-2 rounded-full bg-marigold animate-pulse"></span>
          <span>
            <strong className="text-marigold font-bold">DEMO MODE</strong> — Shree Pure Veg | श्री प्युअर व्हेज • Theur Phata
          </span>
        </div>
        {children}
      </body>
    </html>
  );
}
