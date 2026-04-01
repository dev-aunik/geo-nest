import type { Metadata } from 'next'
import { LandingPage } from '@/components/landing/LandingPage'

export const metadata: Metadata = {
  title: 'GeoNest — Geo API for South Asia, USA & Japan',
  description:
    'Administrative hierarchy data for 6 countries. API key in 30 seconds. 133,000+ areas. Free tier available.',
}

export default function Home() {
  return <LandingPage />
}
