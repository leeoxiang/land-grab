'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'

/**
 * Drop-in replacement for `useWallet()` from @solana/wallet-adapter-react.
 * Returns a publicKey-like object with .toString() so existing code works unchanged.
 */
export function useGameWallet() {
  const { ready, authenticated } = usePrivy()
  const { wallets } = useWallets()

  // Find the first Solana wallet — address is base58 (44 chars), Ethereum is 0x-prefixed
  const solanaWallet = wallets.find(w => w.address && !w.address.startsWith('0x')) ?? wallets[0]

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
