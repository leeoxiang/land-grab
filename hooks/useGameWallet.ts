'use client'

// Re-export useWallet so files importing useGameWallet still work unchanged
export { useWallet as useGameWallet } from '@solana/wallet-adapter-react'
