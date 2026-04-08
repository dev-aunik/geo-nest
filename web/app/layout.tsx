import { ThemeProvider } from '@/components/theme-provider'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: {
    default: 'GeoNest — Geo API for South Asia, USA & Japan',
    template: '%s | GeoNest',
  },
  description:
    'Administrative hierarchy data for 6 countries. API key in 30 seconds. 133,000+ areas. Free tier available.',
  keywords: ['geo api', 'geographic data', 'administrative boundaries', 'rest api', 'bangladesh', 'india', 'japan'],
  authors: [{ name: 'GeoNest' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://geonest.io',
    siteName: 'GeoNest',
    title: 'GeoNest — Geo API for South Asia, USA & Japan',
    description: 'Administrative hierarchy data for 6 countries.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
