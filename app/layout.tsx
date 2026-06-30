import Script from 'next/script'
import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { PwaRegister } from '@/components/PwaRegister'
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
  title: '情侣记账',
  description: '情侣一起记账',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: '情侣记账',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2B2440',
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
        <PwaRegister />
        <Script src="/js/income-watch.js" strategy="afterInteractive" />
        {children}
      </body>
    </html>
  )
}
