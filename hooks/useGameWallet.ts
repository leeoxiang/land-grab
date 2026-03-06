'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'

/**
 * Drop-in replacement for `useWallet()` from @solana/wallet-adapter-react.
 * Returns a publicKey-like object with .toString() so existing code works unchanged.
 */
export function useGameWallet() {
  const { ready, authenticated } = usePrivy()
  const { wallets } = useWallets()

  // Find the first Solana wallet by chainType
  const solanaWallet = wallets.find(w => (w as { chainType?: string }).chainType === 'solana')
    ?? wallets.find(w => w.address && !w.address.startsWith('0x'))

  if (!ready || !authenticated || !solanaWallet?.address) {
    return { publicKey: null, connected: false, ready }
  }

  const address = solanaWallet.address
  return {
    publicKey: {
      toString: () => address,
      toBase58: () => address,
    },
    connected:  true,
    ready,
    walletType: solanaWallet.walletClientType,
  }
}
