import { Connection, PublicKey } from '@solana/web3.js'
import { GAME_TOKEN, SOLANA_RPC } from '@/config/token'

const TREASURY_WALLET = process.env.NEXT_PUBLIC_TREASURY_WALLET ?? ''

/**
 * Verify that a transaction signature represents a USDC transfer to the treasury
 * of at least `expectedAmount` USDC from `senderWallet`.
 *
 * Returns true if valid, throws with an error message if not.
 */
export async function verifyUsdcTx(
  signature: string,
  senderWallet: string,
  expectedAmount: number,
): Promise<boolean> {
  if (process.env.DEV_BYPASS_BALANCE === 'true') return true
  if (!TREASURY_WALLET) throw new Error('Treasury wallet not configured on server')

  const connection = new Connection(SOLANA_RPC, 'confirmed')

  const tx = await connection.getParsedTransaction(signature, {
    commitment:        'confirmed',
    maxSupportedTransactionVersion: 0,
  })

  if (!tx) throw new Error('Transaction not found')

  // Check the tx succeeded
  if (tx.meta?.err) throw new Error('Transaction failed on-chain')

  // Verify sender is the expected wallet
  const accountKeys = tx.transaction.message.accountKeys
  const senderKey   = accountKeys.find(k =>
    k.pubkey.toBase58() === senderWallet && k.signer === true,
  )
  if (!senderKey) throw new Error('Sender wallet mismatch in transaction')

  // Find the token transfer to treasury
  const mintPubkey     = new PublicKey(GAME_TOKEN.mint)
  const expectedLamports = Math.round(expectedAmount * Math.pow(10, GAME_TOKEN.decimals))

  const postTokenBalances = tx.meta?.postTokenBalances ?? []
  const preTokenBalances  = tx.meta?.preTokenBalances  ?? []

  // Look for treasury token account receiving the right amount
  const treasuryReceived = postTokenBalances.find(post => {
    const pre = preTokenBalances.find(p => p.accountIndex === post.accountIndex)
    const preAmt  = parseInt(pre?.uiTokenAmount?.amount ?? '0', 10)
    const postAmt = parseInt(post.uiTokenAmount?.amount ?? '0', 10)
    const diff    = postAmt - preAmt
    return (
      post.owner === TREASURY_WALLET &&
      post.mint  === mintPubkey.toBase58() &&
      diff >= expectedLamports
    )
  })

  if (!treasuryReceived) {
    throw new Error(`Transaction doesn't include a USDC transfer of ${expectedAmount} to treasury`)
  }

  return true
}
