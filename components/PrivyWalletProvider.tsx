'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { ConnectionProvider } from '@solana/wallet-adapter-react'
import { SOLANA_RPC } from '@/config/token'

export default function PrivyWalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ['email', 'wallet', 'google', 'discord', 'twitter'],
        appearance: {
          theme:           'dark',
          accentColor:     '#2d5a1b',
          logo:            '/favicon.ico',
          walletChainType: 'solana-only',
          walletList:      ['phantom'],
        },
        embeddedWallets: {
          solana:   { createOnLogin: 'users-without-wallets' },
          ethereum: { createOnLogin: 'off' },
        },
      } as Parameters<typeof PrivyProvider>[0]['config']}
    >
      <ConnectionProvider endpoint={SOLANA_RPC}>
        {children}
      </ConnectionProvider>
    </PrivyProvider>
  )
}
