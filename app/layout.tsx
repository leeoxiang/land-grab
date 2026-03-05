import type { Metadata } from 'next'
import './globals.css'
import SolanaWalletProvider from '@/components/WalletProvider'

export const metadata: Metadata = {
  title: 'Land Grab — Solana Farming Game',
  description: 'Claim plots, grow crops, raise animals, and raid your neighbours. A competitive farming game on Solana.',
  openGraph: {
    title:       'Land Grab — Solana Farming Game',
    description: 'Claim plots, grow crops, raise animals, and raid your neighbours.',
    type:        'website',
    siteName:    'Land Grab',
  },
  twitter: {
    card:        'summary',
    title:       'Land Grab — Solana Farming Game',
    description: 'Claim plots, grow crops, raise animals, and raid your neighbours.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=block" rel="stylesheet" />
      </head>
      <body className="bg-gray-950">
        <SolanaWalletProvider>{children}</SolanaWalletProvider>
      </body>
    </html>
  )
}
