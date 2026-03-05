'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useEffect, useState } from 'react'
import { getTokenBalance, formatTokenAmount } from '@/lib/solana'
import { GAME_TOKEN } from '@/config/token'

export default function ConnectButton() {
  const { publicKey, disconnect, connected } = useWallet()
  const { setVisible } = useWalletModal()
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    if (!publicKey) { setBalance(null); return }
    getTokenBalance(publicKey.toString()).then(setBalance)
    const interval = setInterval(() => {
      getTokenBalance(publicKey.toString()).then(setBalance)
    }, 30000)
    return () => clearInterval(interval)
  }, [publicKey])

  if (!connected || !publicKey) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="pixel-btn px-5 py-2"
        style={{ background: '#2d5a1b', borderColor: '#1a3a0d', color: '#ccffcc', boxShadow: 'inset 1px 1px 0 #3d8a2b, inset -1px -1px 0 #1a2a10, 3px 3px 0 #0a1a05' }}
      >
        Connect Wallet
      </button>
    )
  }

  const short = `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`

  return (
    <div className="flex items-center gap-3">
      <div style={{ color: '#ffd700', fontFamily: '"Press Start 2P", monospace', fontSize: 11 }}>
        {balance !== null ? `${formatTokenAmount(balance)} ${GAME_TOKEN.symbol}` : '...'}
      </div>
      <button
        onClick={() => disconnect()}
        className="pixel-btn px-4 py-2"
        style={{ fontSize: 12 }}
      >
        {short}
      </button>
    </div>
  )
}
