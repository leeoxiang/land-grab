import { Connection, PublicKey } from '@solana/web3.js'
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token'
import { GAME_TOKEN, SOLANA_RPC } from '@/config/token'

export const connection = new Connection(SOLANA_RPC, 'confirmed')

export async function getTokenBalance(walletAddress: string): Promise<number> {
  try {
    const wallet = new PublicKey(walletAddress)
    const mint   = new PublicKey(GAME_TOKEN.mint)
    const ata    = await getAssociatedTokenAddress(mint, wallet)
    const acct   = await getAccount(connection, ata)
    // Return human-readable amount
    return Number(acct.amount) / Math.pow(10, GAME_TOKEN.decimals)
  } catch {
    return 0
  }
}

export function formatTokenAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
