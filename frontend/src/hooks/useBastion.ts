// SPDX-License-Identifier: MIT
import { useMemo } from 'react'
import { useReadContract, useReadContracts } from 'wagmi'
import { erc20Abi } from 'viem'

import { bastionAchievementsAbi, bastionReceiptAbi, bastionVaultAbi } from '../lib/abi'
import {
  ACHIEVEMENTS_ADDRESS,
  MILESTONES,
  MILESTONE_TARGETS,
  MUSD_ADDRESS,
  RECEIPT_ADDRESS,
  STABILITY_POOL_ADDRESS,
  VAULT_ADDRESS,
} from '../lib/contracts'

const ZERO_ADDR = '0x0000000000000000000000000000000000000000' as `0x${string}`

const stabilityPoolReadAbi = [
  {
    type: 'function',
    name: 'getTotalMUSDDeposits',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

export type VaultState = {
  totalAssets: bigint
  stabilityPoolDeposit: bigint
  pendingCollateralGain: bigint
  totalShares: bigint
  totalDeposited: bigint
  totalNetYield: bigint
  totalProtocolFees: bigint
  protocolFeeBps: bigint
  realizedApyBps: bigint
  lastHarvestAt: bigint
  lastHarvestYield: bigint
  buffer: bigint
  paused: boolean
  owner: `0x${string}`
  treasury: `0x${string}`
  spTotalDeposits: bigint
  isLoading: boolean
  isError: boolean
}

export type GoalItem = {
  id: number
  name: string
  targetAmount: bigint
  savedAmount: bigint
  createdAt: bigint
  deadline: bigint
  durationDays: bigint
  completed: boolean
  progressPct: number
}

export type UserState = {
  shares: bigint
  depositedTotal: bigint
  yieldEarned: bigint
  carry: bigint
  firstDepositAt: bigint
  depositCount: bigint
  pendingYield: bigint
  positionValue: bigint
  receiptBalance: bigint
  badgeBitmap: bigint
  badgeTokenIds: bigint[]
  userLevel: number
  activeGoalId: bigint
  goals: GoalItem[]
  isLoading: boolean
  isError: boolean
}

export type LeaderboardRow = {
  saver: `0x${string}`
  shares: bigint
  depositedTotal: bigint
  yieldEarned: bigint
  badgeCount: bigint
  level: number
}

export type Milestone = {
  id: number
  title: string
  tier: string
  description: string
  earned: boolean
  progress: number
  current: string
  target: string
}

export const WAD = 10n ** 18n

export function useVaultState() {
  const { data, isLoading, isError, refetch } = useReadContracts({
    contracts: [
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'totalAssets' },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'stabilityPoolDeposit' },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'pendingCollateralGain' },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'totalShares' },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'totalDeposited' },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'totalNetYield' },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'totalProtocolFees' },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'protocolFeeBps' },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'realizedApyBps' },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'lastHarvestAt' },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'lastHarvestYield' },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'yieldBuffer' },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'paused' },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'owner' },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'treasury' },
      { address: STABILITY_POOL_ADDRESS, abi: stabilityPoolReadAbi, functionName: 'getTotalMUSDDeposits' },
    ],
    query: { staleTime: 4_000, refetchInterval: 8_000 },
  })

  const state = useMemo<VaultState>(() => {
    return {
      totalAssets: (data?.[0]?.result as bigint | undefined) ?? 0n,
      stabilityPoolDeposit: (data?.[1]?.result as bigint | undefined) ?? 0n,
      pendingCollateralGain: (data?.[2]?.result as bigint | undefined) ?? 0n,
      totalShares: (data?.[3]?.result as bigint | undefined) ?? 0n,
      totalDeposited: (data?.[4]?.result as bigint | undefined) ?? 0n,
      totalNetYield: (data?.[5]?.result as bigint | undefined) ?? 0n,
      totalProtocolFees: (data?.[6]?.result as bigint | undefined) ?? 0n,
      protocolFeeBps: (data?.[7]?.result as bigint | undefined) ?? 1000n,
      realizedApyBps: (data?.[8]?.result as bigint | undefined) ?? 0n,
      lastHarvestAt: (data?.[9]?.result as bigint | undefined) ?? 0n,
      lastHarvestYield: (data?.[10]?.result as bigint | undefined) ?? 0n,
      buffer: (data?.[11]?.result as bigint | undefined) ?? 0n,
      paused: Boolean((data?.[12]?.result as boolean | undefined) ?? false),
      owner: ((data?.[13]?.result as `0x${string}` | undefined) ?? ZERO_ADDR) as `0x${string}`,
      treasury: ((data?.[14]?.result as `0x${string}` | undefined) ?? ZERO_ADDR) as `0x${string}`,
      spTotalDeposits: (data?.[15]?.result as bigint | undefined) ?? 0n,
      isLoading,
      isError,
    }
  }, [data, isLoading, isError])

  return { ...state, refetch }
}

export function useUserState(address: `0x${string}` | undefined) {
  const who = address ?? ZERO_ADDR

  const badgeContracts = MILESTONES.map((m) => ({
    address: ACHIEVEMENTS_ADDRESS,
    abi: bastionAchievementsAbi,
    functionName: 'tokenIdByBadge' as const,
    args: [who, m.id] as const,
  }))

  const { data, isLoading, isError, refetch } = useReadContracts({
    contracts: [
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'sharesOf', args: [who] },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'depositedTotalOf', args: [who] },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'yieldEarnedOf', args: [who] },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'carryOf', args: [who] },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'firstDepositAtOf', args: [who] },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'depositCountOf', args: [who] },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'pendingYield', args: [who] },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'positionValue', args: [who] },
      { address: RECEIPT_ADDRESS, abi: bastionReceiptAbi, functionName: 'balanceOf', args: [who] },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'earnedBadges', args: [who] },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'userLevelOf', args: [who] },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'activeGoalId', args: [who] },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'getGoalsOf', args: [who] },
    ],
    query: { enabled: Boolean(address), staleTime: 3_000, refetchInterval: 6_000 },
  })

  const { data: badgeData, refetch: refetchBadges } = useReadContracts({
    contracts: badgeContracts,
    query: { enabled: Boolean(address), staleTime: 5_000, refetchInterval: 8_000 },
  })

  const badgeTokenIds = useMemo(() => {
    return MILESTONES.map((_, idx) => {
      const result = badgeData?.[idx]?.result as bigint | undefined
      return result ?? 0n
    })
  }, [badgeData])

  const goals = useMemo<GoalItem[]>(() => {
    const raw =
      (data?.[12]?.result as
        | readonly {
            name: string
            targetAmount: bigint
            savedAmount: bigint
            createdAt: bigint
            deadline: bigint
            highestTier: number | bigint
            completed: boolean
          }[]
        | undefined) ?? []
    return raw.map((g, id) => {
      const pct =
        g.targetAmount > 0n ? Math.min(100, Number((g.savedAmount * 100n) / g.targetAmount)) : 0
      const durationDays =
        g.deadline > g.createdAt ? (g.deadline - g.createdAt) / 86_400n : 0n
      return {
        id,
        name: g.name,
        targetAmount: g.targetAmount,
        savedAmount: g.savedAmount,
        createdAt: g.createdAt,
        deadline: g.deadline,
        durationDays,
        completed: g.completed,
        progressPct: pct,
      }
    })
  }, [data])

  const user = useMemo<UserState>(() => {
    return {
      shares: (data?.[0]?.result as bigint | undefined) ?? 0n,
      depositedTotal: (data?.[1]?.result as bigint | undefined) ?? 0n,
      yieldEarned: (data?.[2]?.result as bigint | undefined) ?? 0n,
      carry: (data?.[3]?.result as bigint | undefined) ?? 0n,
      firstDepositAt: (data?.[4]?.result as bigint | undefined) ?? 0n,
      depositCount: (data?.[5]?.result as bigint | undefined) ?? 0n,
      pendingYield: (data?.[6]?.result as bigint | undefined) ?? 0n,
      positionValue: (data?.[7]?.result as bigint | undefined) ?? 0n,
      receiptBalance: (data?.[8]?.result as bigint | undefined) ?? 0n,
      badgeBitmap: (data?.[9]?.result as bigint | undefined) ?? 0n,
      userLevel: Number((data?.[10]?.result as number | bigint | undefined) ?? 0),
      activeGoalId: (data?.[11]?.result as bigint | undefined) ?? 0n,
      badgeTokenIds,
      goals,
      isLoading,
      isError,
    }
  }, [data, badgeTokenIds, goals, isLoading, isError])

  const refetchAll = async () => {
    await Promise.all([refetch(), refetchBadges()])
  }

  return { ...user, refetch: refetchAll }
}

export function useLeaderboard(limit = 25) {
  const { data, isLoading, isError, refetch } = useReadContract({
    address: VAULT_ADDRESS,
    abi: bastionVaultAbi,
    functionName: 'getLeaderboard',
    args: [0n, BigInt(limit)],
    query: { staleTime: 5_000, refetchInterval: 10_000 },
  })

  const rows = useMemo<LeaderboardRow[]>(() => {
    const raw =
      (data as
        | readonly {
            user: `0x${string}`
            shares: bigint
            depositedTotal: bigint
            yieldEarned: bigint
            badgesEarned: bigint
            level: number | bigint
          }[]
        | undefined) ?? []
    return [...raw]
      .filter((r) => r && r.user)
      .map((r) => ({
        saver: r.user,
        shares: r.shares ?? 0n,
        depositedTotal: r.depositedTotal ?? 0n,
        yieldEarned: r.yieldEarned ?? 0n,
        badgeCount: r.badgesEarned ?? 0n,
        level: Number(r.level ?? 0),
      }))
      .sort((a, b) => {
        if (b.shares !== a.shares) return b.shares > a.shares ? 1 : -1
        if (b.depositedTotal !== a.depositedTotal) return b.depositedTotal > a.depositedTotal ? 1 : -1
        return Number(b.badgeCount - a.badgeCount)
      })
  }, [data])

  return { rows, isLoading, isError, refetch }
}

export function useMusdBalance(address: `0x${string}` | undefined) {
  const { data, refetch } = useReadContract({
    address: MUSD_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address), staleTime: 4_000, refetchInterval: 8_000 },
  })
  return { balance: data ?? 0n, refetch }
}

/** Badge metadata straight from the contract: on-chain SVG artwork + copy. */
export function useBadgeArt(tokenId: bigint | undefined) {
  const { data: uri } = useReadContract({
    address: ACHIEVEMENTS_ADDRESS,
    abi: bastionAchievementsAbi,
    functionName: 'tokenURI',
    args: tokenId && tokenId > 0n ? [tokenId] : undefined,
    query: { enabled: Boolean(tokenId && tokenId > 0n), staleTime: 600_000 },
  })
  return uri as string | undefined
}

/** Progress toward all 10 milestones (6 core + 4 goal tiers), derived purely from chain state. */
export function useMilestones(user: UserState, now: bigint): Milestone[] {
  return useMemo(() => {
    const maxGoalPct = user.goals.reduce((best, g) => Math.max(best, g.progressPct), 0)

    return MILESTONES.map((milestone) => {
      const earned = ((user.badgeBitmap >> BigInt(milestone.id)) & 1n) === 1n
      let current = 0n
      let target = 1n
      let progress = 0
      let currentLabel = ''
      let targetLabel = ''

      if (milestone.id === 0) {
        current = user.depositedTotal
        target = 1n
        progress = current > 0n ? 100 : 0
        currentLabel = current > 0n ? `${formatM(current)} MUSD` : '0 MUSD'
        targetLabel = '1st deposit'
      } else if (milestone.id === 1 || milestone.id === 2) {
        target = milestone.id === 1 ? MILESTONE_TARGETS.saved100 : MILESTONE_TARGETS.saved500
        current = user.depositedTotal
        progress = Math.min(100, Number((current * 100n) / target))
        currentLabel = `${formatM(current)} MUSD`
        targetLabel = `${formatM(target)} MUSD`
      } else if (milestone.id === 3 || milestone.id === 4) {
        target = milestone.id === 3 ? MILESTONE_TARGETS.sevenDays : MILESTONE_TARGETS.thirtyDays
        current = user.firstDepositAt > 0n && now > user.firstDepositAt ? now - user.firstDepositAt : 0n
        progress = Math.min(100, Number((current * 100n) / target))
        currentLabel = current > 0n ? `${Math.floor(Number(current) / 86400)}d held` : 'not started'
        targetLabel = milestone.id === 3 ? '7 days' : '30 days'
      } else if (milestone.id === 5) {
        target = MILESTONE_TARGETS.yield10
        current = user.yieldEarned
        progress = Math.min(100, Number((current * 100n) / target))
        currentLabel = `${formatM(current)} MUSD`
        targetLabel = '10 MUSD'
      } else {
        const tierTarget =
          milestone.id === 6 ? 25 : milestone.id === 7 ? 50 : milestone.id === 8 ? 75 : 100
        progress = Math.min(100, Math.round((maxGoalPct / tierTarget) * 100))
        currentLabel = `${maxGoalPct}% goal`
        targetLabel = `${tierTarget}% goal`
      }

      return {
        id: milestone.id,
        title: milestone.title,
        tier: milestone.tier,
        description: milestone.description,
        earned,
        progress: earned ? 100 : progress,
        current: currentLabel,
        target: targetLabel,
      }
    })
  }, [user, now])
}

function formatM(value: bigint): string {
  const asNumber = Number(value) / 1e18
  if (asNumber >= 1000) return `${(asNumber / 1000).toFixed(1)}K`
  return asNumber.toFixed(2)
}
