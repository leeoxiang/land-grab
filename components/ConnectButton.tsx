'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useEffect, useState } from 'react'
import { useGameWallet } from '@/hooks/useGameWallet'
import { getTokenBalance, formatTokenAmount } from '@/lib/solana'
import { GAME_TOKEN } from '@/config/token'

export default function ConnectButton() {
  const { ready, authenticated, login, logout } = usePrivy()
  const { publicKey, connected } = useGameWallet()
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    if (!publicKey) { setBalance(null); return }
    const addr = publicKey.toString()
    getTokenBalance(addr).then(setBalance)
    const id = setInterval(() => getTokenBalance(addr).then(setBalance), 30_000)
    return () => clearInterval(id)
  }, [publicKey])

  if (!ready) return null

  if (!authenticated || !connected || !publicKey) {
    return (
      <button
        onClick={login}
        className="pixel-btn px-5 py-2"
        style={{
          background: '#2d5a1b', borderColor: '#1a3a0d', color: '#ccffcc',
          boxShadow: 'inset 1px 1px 0 #3d8a2b, inset -1px -1px 0 #1a2a10, 3px 3px 0 #0a1a05',
        }}
      >
        Connect
      </button>
    )
  }

  const addr  = publicKey.toString()
  const short = `${addr.slice(0, 4)}...${addr.slice(-4)}`

  return (
    <div className="flex items-center gap-3">
      <div style={{ color: '#ffd700', fontFamily: '"Press Start 2P", monospace', fontSize: 11 }}>
        {balance !== null ? `${formatTokenAmount(balance)} ${GAME_TOKEN.symbol}` : '...'}
      </div>
      <button
        onClick={() => logout()}
        className="pixel-btn px-4 py-2"
        style={{ fontSize: 12 }}
      >
        {short}
      </button>
    </div>
  )
}
