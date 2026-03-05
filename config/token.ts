// Swap this mint address when your $TOKEN is deployed
export const GAME_TOKEN = {
  mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mainnet
  symbol: 'USDC',
  decimals: 6,
  name: 'USD Coin',
}

export const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com'
