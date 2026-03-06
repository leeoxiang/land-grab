'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana'
import { ConnectionProvider } from '@solana/wallet-adapter-react'
import { SOLANA_RPC } from '@/config/token'

const solanaConnectors = toSolanaWalletConnectors({ shouldAutoConnect: true })

export default function PrivyWalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ['email', 'wallet', 'google', 'discord', 'twitter'],
        appearance: {
          theme:       'dark',
          accentColor: '#2d5a1b',
          logo:        '/favicon.ico',
        },
        embeddedWallets: {
          solana: { createOnLogin: 'users-without-wallets' },
        },
        externalWallets: {
          solana: { connectors: solanaConnectors },
        },
      }}
    >
      {/* Keep ConnectionProvider for RPC access (token balance checks etc.) */}
      <ConnectionProvider endpoint={SOLANA_RPC}>
        {children}
      </ConnectionProvider>
    </PrivyProvider>
  )
}
