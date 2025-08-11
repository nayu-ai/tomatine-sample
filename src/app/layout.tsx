import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Tomatine - 心理学アプローチ・ポモドーロタイマー',
  description:
    '心理学に基づく3分ウォームアップ機能付きのポモドーロタイマー。オフライン対応で集中力を最大化。',
  keywords: [
    'ポモドーロ',
    'タイマー',
    '集中',
    'ウォームアップ',
    '心理学',
    'PWA',
    'オフライン',
  ],
  authors: [{ name: 'Tomatine Team' }],
  creator: 'Tomatine',
  publisher: 'Tomatine',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'
  ),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Tomatine - 心理学アプローチ・ポモドーロタイマー',
    description:
      '心理学に基づく3分ウォームアップ機能付きのポモドーロタイマー。オフライン対応で集中力を最大化。',
    url: '/',
    siteName: 'Tomatine',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Tomatine - 心理学アプローチ・ポモドーロタイマー',
      },
    ],
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tomatine - 心理学アプローチ・ポモドーロタイマー',
    description:
      '心理学に基づく3分ウォームアップ機能付きのポモドーロタイマー。オフライン対応で集中力を最大化。',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Tomatine',
  },
  applicationName: 'Tomatine',
  category: 'productivity',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3b82f6' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Tomatine" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>{children}</ErrorBoundary>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && '${process.env.NODE_ENV}' === 'production') {
                window.addEventListener('load', function() {
                  try {
                    navigator.serviceWorker.register('/sw.js')
                      .then(function(registration) {
                        console.log('SW registered: ', registration);
                      })
                      .catch(function(registrationError) {
                        console.warn('SW registration failed: ', registrationError);
                      });
                  } catch (error) {
                    console.warn('SW registration error: ', error);
                  }
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
