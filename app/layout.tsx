import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CineGlow — AI Movie Recommendations',
  description: 'Discover your next favorite movie with CineGlow — an AI-powered movie recommendation engine using content-based filtering on the TMDB 5000 dataset.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
