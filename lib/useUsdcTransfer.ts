'use client'

import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction } from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { GAME_TOKEN } from '@/config/token'

// Treasury wallet — receives all in-game USDC payments
// Replace with your actual treasury wallet address
const TREASURY_WALLET = process.env.NEXT_PUBLIC_TREASURY_WALLET ?? 'YOUR_TREASURY_WALLET_HERE'

export interface TransferResult {
  signature: string
  success: boolean
}

export function useUsdcTransfer() {
  const { publicKey, sendTransaction, signTransaction } = useWallet()
  const { connection } = useConnection()

  /**
   * Transfer `amount` USDC from the connected wallet to the treasury.
   * Returns the transaction signature for server-side verification.
   */
  const transferUsdc = async (amount: number): Promise<string> => {
    if (!publicKey || !sendTransaction) throw new Error('Wallet not connected')
    if (!TREASURY_WALLET || TREASURY_WALLET === 'YOUR_TREASURY_WALLET_HERE') {
      throw new Error('Treasury wallet not configured')
    }

    const mintPubkey     = new PublicKey(GAME_TOKEN.mint)
    const treasuryPubkey = new PublicKey(TREASURY_WALLET)
    const amountLamports = Math.round(amount * Math.pow(10, GAME_TOKEN.decimals))

    // Get sender's ATA
    const senderAta = await getAssociatedTokenAddress(mintPubkey, publicKey)

    // Get / create receiver's ATA
    const receiverAta = await getAssociatedTokenAddress(mintPubkey, treasuryPubkey)

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: publicKey })

    // Create receiver ATA if it doesn't exist
    try {
      await getAccount(connection, receiverAta)
    } catch {
      tx.add(
        createAssociatedTokenAccountInstruction(
          publicKey,
          receiverAta,
          treasuryPubkey,
          mintPubkey,
        ),
      )
    }

    // SPL transfer instruction
    tx.add(
      createTransferInstruction(
        senderAta,
        receiverAta,
        publicKey,
        amountLamports,
        [],
        TOKEN_PROGRAM_ID,
      ),
    )

    const signature = await sendTransaction(tx, connection)

    // Wait for confirmation
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed')

    return signature
  }

  return { transferUsdc, connected: !!publicKey }
}
