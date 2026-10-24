// SPDX-License-Identifier: MIT

import { defineChain } from 'viem'

/**
 * Mezo Testnet.
 * Chain id 31611 (0x7b7b), native coin BTC (18 decimals), gas paid in BTC.
 */
const rpcUrl = import.meta.env.VITE_RPC_URL || 'https://rpc.test.mezo.org'

export const mezoTestnet = defineChain({
  id: 31611,
  name: 'Mezo Testnet',
  nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
  blockExplorers: { default: { name: 'Mezo Testnet Explorer', url: 'https://explorer.test.mezo.org' } },
  contracts: {
    multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11', blockCreated: 3669328 },
  },
  testnet: true,
})

export const MEZO_EXPLORER = 'https://explorer.test.mezo.org'

export function explorerTx(hash: `0x${string}`) {
  return `${MEZO_EXPLORER}/tx/${hash}`
}

export function explorerAddress(address: `0x${string}`) {
  return `${MEZO_EXPLORER}/address/${address}`
}
