// SPDX-License-Identifier: MIT

/**
 * Deployed Bastion addresses on Mezo Testnet.
 * Override with VITE_VAULT_ADDRESS / VITE_RECEIPT_ADDRESS / VITE_ACHIEVEMENTS_ADDRESS.
 */

/** Canonical MUSD on Mezo Testnet. */
export const MUSD_ADDRESS = '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503' as const

export const VAULT_ADDRESS = (import.meta.env.VITE_VAULT_ADDRESS ??
  '0xcdf6add60726fb123c26e668e6d4eef06c2c167b') as `0x${string}`

export const RECEIPT_ADDRESS = (import.meta.env.VITE_RECEIPT_ADDRESS ??
  '0x52a6ebf2f1507b27b88654fc1d933a59607ecd24') as `0x${string}`

export const ACHIEVEMENTS_ADDRESS = (import.meta.env.VITE_ACHIEVEMENTS_ADDRESS ??
  '0x767dcd140217501e05e72d72de5c4339b76c1009') as `0x${string}`

export const isDeployed = VAULT_ADDRESS !== '0x0000000000000000000000000000000000000000'

/** The six milestones, in the order the vault assigns badge ids. */
export const MILESTONES = [
  { id: 0, key: 'first-deposit', title: 'First Deposit', short: 'First deposit', description: 'Your first MUSD deposit into Bastion.' },
  { id: 1, key: 'saved-100', title: 'Saved 100 MUSD', short: '100 MUSD', description: 'Lifetime deposits reached 100 MUSD.' },
  { id: 2, key: 'saved-500', title: 'Saved 500 MUSD', short: '500 MUSD', description: 'Lifetime deposits reached 500 MUSD.' },
  { id: 3, key: 'held-7', title: 'Held for 7 Days', short: '7 days', description: 'Your position has been held for seven days.' },
  { id: 4, key: 'held-30', title: 'Held for 30 Days', short: '30 days', description: 'Your position has been held for thirty days.' },
  { id: 5, key: 'yield-10', title: 'Earned 10 MUSD in Yield', short: '10 MUSD yield', description: 'You have earned 10 MUSD in yield.' },
] as const

export const MILESTONE_TARGETS = {
  saved100: 100n * 10n ** 18n,
  saved500: 500n * 10n ** 18n,
  yield10: 10n * 10n ** 18n,
  sevenDays: 7n * 24n * 60n * 60n,
  thirtyDays: 30n * 24n * 60n * 60n,
} as const
