// SPDX-License-Identifier: MIT
import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'

import { BadgeCard } from '../components/BadgeCard'
import { DepositPanel } from '../components/DepositPanel'
import { MilestoneList } from '../components/MilestoneList'
import { useMilestones, useUserState, useVaultState } from '../hooks/useBastion'
import { MILESTONES } from '../lib/contracts'
import { formatMusd } from '../lib/format'
import { CoinIcon, LockIcon, TrophyIcon } from '../components/icons'

export function Dashboard() {
  const { address, isConnected } = useAccount()
  const vault = useVaultState()
  const user = useUserState(address)

  const [now, setNow] = useState(() => BigInt(Math.floor(Date.now() / 1000)))
  useEffect(() => {
    const id = setInterval(() => setNow(BigInt(Math.floor(Date.now() / 1000))), 1000)
    return () => clearInterval(id)
  }, [])

  const milestones = useMilestones(user, now)
  const earned = milestones.filter((m) => m.earned).length

  return (
    <div className="shell py-12 sm:py-16">
      <div className="mb-10">
        <span className="label-caps">Dashboard</span>
        <h1 className="font-display mt-3 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
          {isConnected ? 'Your Bastion' : 'Connect to open your Bastion'}
        </h1>
        <p className="mt-3 max-w-xl text-sm text-bastion-muted">
          Everything below is read straight from the contract: your position, the yield you have
          accrued and the milestones you have unlocked.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="panel-raised p-6">
              <div className="flex items-center justify-between">
                <span className="label-caps">Your position</span>
                <CoinIcon className="h-4 w-4 text-bastion-amber" />
              </div>
              <p className="font-mono mt-3 text-3xl font-semibold tabular-nums">
                {formatMusd(user.shares, 2)} <span className="text-bastion-muted">MUSD</span>
              </p>
              <p className="mt-2 text-xs text-bastion-muted">
                {formatMusd(user.receiptBalance, 2)} bMUSD receipt · {user.depositCount.toString()}{' '}
                deposit{user.depositCount === 1n ? '' : 's'}
              </p>
            </div>

            <div className="panel-raised p-6">
              <div className="flex items-center justify-between">
                <span className="label-caps">Yield accrued</span>
                <TrophyIcon className="h-4 w-4 text-bastion-amber" />
              </div>
              <p className="font-mono mt-3 text-3xl font-semibold text-bastion-amber tabular-nums">
                +{formatMusd(user.pendingYield, 4)} <span className="text-bastion-muted">MUSD</span>
              </p>
              <p className="mt-2 text-xs text-bastion-muted">
                {formatMusd(user.yieldEarned, 4)} MUSD paid out so far
              </p>
            </div>
          </div>

          <div className="panel p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold">Milestone progress</h2>
              <span className="font-mono text-xs text-bastion-muted">
                {earned} / {MILESTONES.length} unlocked
              </span>
            </div>
            {isConnected ? (
              <MilestoneList milestones={milestones} />
            ) : (
              <p className="text-sm text-bastion-muted">
                Connect your wallet to see your progress and unlock badges.
              </p>
            )}
          </div>

          <div className="panel p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold">Your badges</h2>
              <span className="text-xs text-bastion-muted">Rendered from the contract</span>
            </div>
            <div className="grid grid-cols-3 gap-5 sm:grid-cols-6">
              {milestones.map((milestone) => (
                <BadgeCard
                  key={milestone.id}
                  tokenId={user.badgeTokenIds[milestone.id]}
                  earned={milestone.earned}
                  title={milestone.title}
                  description={milestone.description}
                  size="sm"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <DepositPanel shares={user.shares} pendingYield={user.pendingYield} />

          <div className="panel p-6">
            <h3 className="font-display text-sm font-semibold">The vault</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <Row label="MUSD held" value={`${formatMusd(vault.totalAssets, 2)} MUSD`} />
              <Row label="Principal" value={`${formatMusd(vault.totalShares, 2)} MUSD`} />
              <Row label="Yield buffer" value={`${formatMusd(vault.buffer, 2)} MUSD`} />
              <Row
                label="Demo rate"
                value={`${formatRate(vault.ratePerSecond)} / second`}
                hint="configured for the Wave 1 demo"
              />
            </dl>
            {vault.ratePerSecond > 0n && (
              <p className="mt-4 flex items-start gap-2 rounded-xl border border-bastion-amber/20 bg-bastion-amber/[0.06] px-3 py-2.5 text-[11px] leading-relaxed text-bastion-amber-soft">
                <LockIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Wave 1 ships a controlled rate so the accrual is visible on camera. In production this
                would route to a real MUSD yield source.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-bastion-muted">
        {label}
        {hint && <span className="ml-1.5 text-[10px] text-bastion-muted/70">({hint})</span>}
      </dt>
      <dd className="font-mono tabular-nums">{value}</dd>
    </div>
  )
}

function formatRate(rate: bigint): string {
  const perSecond = Number(rate) / 1e18
  if (perSecond === 0) return '0%'
  return `${(perSecond * 100).toFixed(4)}%`
}
