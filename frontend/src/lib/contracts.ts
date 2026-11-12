// SPDX-License-Identifier: MIT

/**
 * Bastion Wave 2 contract addresses on Mezo Testnet (chain 31611).
 * Override with VITE_VAULT_ADDRESS / VITE_RECEIPT_ADDRESS / VITE_ACHIEVEMENTS_ADDRESS if needed.
 */

/** Canonical MUSD on Mezo Testnet ("Mezo USD"). */
export const MUSD_ADDRESS = '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503' as const

/** Canonical Mezo protocol contracts (Testnet chain 31611). */
export const STABILITY_POOL_ADDRESS = '0x1CCA7E410eE41739792eA0A24e00349Dd247680e' as const
export const ROUTER_ADDRESS = '0x9a1ff7FE3a0F69959A3fBa1F1e5ee18e1A9CD7E9' as const
export const BORROWER_OPERATIONS_ADDRESS = '0xCdF7028ceAB81fA0C6971208e83fa7872994beE5' as const
export const EXPLORER_URL = 'https://explorer.test.mezo.org' as const

/** Fresh Wave 2 verified deployments on Mezo Testnet (31611). */
export const VAULT_ADDRESS = (import.meta.env.VITE_VAULT_ADDRESS ??
  '0x2fB1b2C30fF925b2A544777981c8562A05763d0e') as `0x${string}`

export const RECEIPT_ADDRESS = (import.meta.env.VITE_RECEIPT_ADDRESS ??
  '0xa28BE7b55D62282220CF1df013eF29C4f0977Db4') as `0x${string}`

export const ACHIEVEMENTS_ADDRESS = (import.meta.env.VITE_ACHIEVEMENTS_ADDRESS ??
  '0x15db5C0F9b04348c7033043Cc2F6663646aB6e6F') as `0x${string}`

export const isDeployed = VAULT_ADDRESS !== '0x0000000000000000000000000000000000000000'

/** Duration presets supported for savings goals (days). */
export const GOAL_DURATION_PRESETS = [7, 30, 90] as const

/** All 10 soulbound achievement badges in exact on-chain badgeId order. */
export const MILESTONES = [
  {
    id: 0,
    key: 'first-deposit',
    title: 'First Deposit',
    short: 'First deposit',
    tier: 'Core',
    description: 'Made your first canonical MUSD deposit routed into the Mezo Stability Pool.',
  },
  {
    id: 1,
    key: 'saved-100',
    title: 'Saved 100 MUSD',
    short: '100 MUSD',
    tier: 'Core',
    description: 'Lifetime MUSD deposits reached 100 MUSD.',
  },
  {
    id: 2,
    key: 'saved-500',
    title: 'Saved 500 MUSD',
    short: '500 MUSD',
    tier: 'Core',
    description: 'Lifetime MUSD deposits reached 500 MUSD.',
  },
  {
    id: 3,
    key: 'held-7',
    title: 'Held for 7 Days',
    short: '7 days',
    tier: 'Core',
    description: 'Maintained a Bastion position for 7 days.',
  },
  {
    id: 4,
    key: 'held-30',
    title: 'Held for 30 Days',
    short: '30 days',
    tier: 'Core',
    description: 'Maintained a Bastion position for 30 days.',
  },
  {
    id: 5,
    key: 'yield-10',
    title: 'Earned 10 MUSD in Yield',
    short: '10 MUSD yield',
    tier: 'Core',
    description: 'Earned 10 MUSD in realized Stability Pool yield.',
  },
  {
    id: 6,
    key: 'goal-bronze',
    title: 'Goal 25% — Bronze',
    short: '25% Bronze',
    tier: 'Bronze',
    description: 'Funded at least 25% of a Bastion savings goal.',
  },
  {
    id: 7,
    key: 'goal-silver',
    title: 'Goal 50% — Silver',
    short: '50% Silver',
    tier: 'Silver',
    description: 'Funded at least 50% of a Bastion savings goal.',
  },
  {
    id: 8,
    key: 'goal-gold',
    title: 'Goal 75% — Gold',
    short: '75% Gold',
    tier: 'Gold',
    description: 'Funded at least 75% of a Bastion savings goal.',
  },
  {
    id: 9,
    key: 'goal-vanguard',
    title: 'Goal 100% — Vanguard',
    short: '100% Vanguard',
    tier: 'Vanguard',
    description: 'Completed 100% of a Bastion savings goal.',
  },
] as const

export const MILESTONE_TARGETS = {
  saved100: 100n * 10n ** 18n,
  saved500: 500n * 10n ** 18n,
  yield10: 10n * 10n ** 18n,
  sevenDays: 7n * 24n * 60n * 60n,
  thirtyDays: 30n * 24n * 60n * 60n,
} as const

export const LEVEL_NAMES = ['Initiate', 'Bronze', 'Silver', 'Gold', 'Vanguard'] as const
