// SPDX-License-Identifier: MIT
import { useMemo } from 'react'
import { useReadContract, useReadContracts } from 'wagmi'
import { erc20Abi } from 'viem'

import { bastionAchievementsAbi, bastionReceiptAbi, bastionVaultAbi } from '../lib/abi'
import {
  ACHIEVEMENTS_ADDRESS,
  MILESTONES,
  MILESTONE_TARGETS,
  RECEIPT_ADDRESS,
  VAULT_ADDRESS,
} from '../lib/contracts'

export type VaultState = {
  totalAssets: bigint
  totalShares: bigint
  totalDeposited: bigint
  buffer: bigint
  ratePerSecond: bigint
  paused: boolean
  owner: `0x${string}`
}

export type UserState = {
  shares: bigint
  depositedTotal: bigint
  yieldEarned: bigint
  firstDepositAt: bigint
  depositCount: bigint
  pendingYield: bigint
  positionValue: bigint
  estimatedAnnualYield: bigint
  receiptBalance: bigint
  badgeBitmap: bigint
  badgeTokenIds: bigint[]
}

export type Milestone = {
  id: number
  title: string
  description: string
  earned: boolean
  progress: number
  current: string
  target: string
}

const WAD = 10n ** 18n

export function useVaultState() {
  const { data } = useReadContracts({
    contracts: [
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'totalAssets' },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'totalShares' },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'totalDeposited' },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'yieldBuffer' },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'ratePerSecond' },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'paused' },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'owner' },
    ],
    query: { staleTime: 5_000 },
  })

  return useMemo<VaultState>(() => {
    return {
      totalAssets: (data?.[0]?.result as bigint | undefined) ?? 0n,
      totalShares: (data?.[1]?.result as bigint | undefined) ?? 0n,
      totalDeposited: (data?.[2]?.result as bigint | undefined) ?? 0n,
      buffer: (data?.[3]?.result as bigint | undefined) ?? 0n,
      ratePerSecond: (data?.[4]?.result as bigint | undefined) ?? 0n,
      paused: Boolean((data?.[5]?.result as boolean | undefined) ?? false),
      owner: ((data?.[6]?.result as `0x${string}` | undefined) ?? '0x0') as `0x${string}`,
    }
  }, [data])
}

export function useUserState(address: `0x${string}` | undefined) {
  const zero = '0x0000000000000000000000000000000000000000' as `0x${string}`
  const who = address ?? zero

  const { data } = useReadContracts({
    contracts: [
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'sharesOf', args: [who] },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'depositedTotalOf', args: [who] },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'yieldEarnedOf', args: [who] },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'firstDepositAtOf', args: [who] },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'depositCountOf', args: [who] },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'pendingYield', args: [who] },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'positionValue', args: [who] },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'estimatedAnnualYield', args: [who] },
      { address: RECEIPT_ADDRESS, abi: bastionReceiptAbi, functionName: 'balanceOf', args: [who] },
      { address: VAULT_ADDRESS, abi: bastionVaultAbi, functionName: 'earnedBadges', args: [who] },
    ],
    query: { enabled: Boolean(address), staleTime: 4_000, refetchInterval: 6_000 },
  })

  const badgeTokenIds = useMemo(() => {
    return MILESTONES.map((m) => {
      const result = data?.[10 + m.id]?.result as bigint | undefined
      return result ?? 0n
    })
  }, [data])

  return useMemo<UserState>(() => {
    return {
      shares: (data?.[0]?.result as bigint | undefined) ?? 0n,
      depositedTotal: (data?.[1]?.result as bigint | undefined) ?? 0n,
      yieldEarned: (data?.[2]?.result as bigint | undefined) ?? 0n,
      firstDepositAt: (data?.[3]?.result as bigint | undefined) ?? 0n,
      depositCount: (data?.[4]?.result as bigint | undefined) ?? 0n,
      pendingYield: (data?.[5]?.result as bigint | undefined) ?? 0n,
      positionValue: (data?.[6]?.result as bigint | undefined) ?? 0n,
      estimatedAnnualYield: (data?.[7]?.result as bigint | undefined) ?? 0n,
      receiptBalance: (data?.[8]?.result as bigint | undefined) ?? 0n,
      badgeBitmap: (data?.[9]?.result as bigint | undefined) ?? 0n,
      badgeTokenIds,
    }
  }, [data, badgeTokenIds])
}

export function useMusdBalance(address: `0x${string}` | undefined) {
  const { data } = useReadContract({
    address: '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503',
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  })
  return data ?? 0n
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

/** Progress toward each milestone, derived from on-chain state. */
export function useMilestones(user: UserState, now: bigint): Milestone[] {
  return useMemo(() => {
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
        progress = current > 0n ? 1 : 0
        currentLabel = '0 MUSD'
        targetLabel = '1st deposit'
      } else if (milestone.id === 1 || milestone.id === 2) {
        target = milestone.id === 1 ? MILESTONE_TARGETS.saved100 : MILESTONE_TARGETS.saved500
        current = user.depositedTotal
        progress = Math.min(100, Number((current * 100n) / target))
        currentLabel = `${formatM(current)} MUSD`
        targetLabel = `${formatM(target)} MUSD`
      } else if (milestone.id === 3 || milestone.id === 4) {
        target = milestone.id === 3 ? MILESTONE_TARGETS.sevenDays : MILESTONE_TARGETS.thirtyDays
        current = user.firstDepositAt > 0n ? now - user.firstDepositAt : 0n
        progress = Math.min(100, Number((current * 100n) / target))
        currentLabel = current > 0n ? `${Math.floor(Number(current) / 86400)}d held` : 'not started'
        targetLabel = milestone.id === 3 ? '7 days' : '30 days'
      } else {
        target = MILESTONE_TARGETS.yield10
        current = user.yieldEarned
        progress = Math.min(100, Number((current * 100n) / target))
        currentLabel = `${formatM(current)} MUSD`
        targetLabel = '10 MUSD'
      }

      return {
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        earned,
        progress,
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

export { WAD }
