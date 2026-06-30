import Script from 'next/script'
import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const geistSans = localFont({
  src: '../public/fonts/Geist-Variable.woff2',
  variable: '--font-geist-sans',
  display: 'swap',
})

const geistMono = localFont({
  src: '../public/fonts/GeistMono-Variable.woff2',
  variable: '--font-geist-mono',
  display: 'swap',
})

const pressStart = localFont({
  src: '../public/fonts/PressStart2P-Regular.woff2',
  variable: '--font-pixel',
  display: 'swap',
})

const dotGothic = localFont({
  src: '../public/fonts/DotGothic16-Regular.woff2',
  variable: '--font-pixel-cjk',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'v0 App',
  description: 'Created with v0',
  generator: 'v0.app',
  manifest: '/manifest.json',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${pressStart.variable} ${dotGothic.variable}`}
    >
      <body className="font-sans antialiased" style={{ background: "#2B2440" }}>
        <Script src="/js/income-watch.js" strategy="afterInteractive" />
        {children}
      </body>
    </html>
  )
}
