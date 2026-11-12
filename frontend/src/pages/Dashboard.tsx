// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState } from 'react'
import { useAccount } from 'wagmi'

import { BadgeThumb } from '../components/BadgeThumb'
import { DepositPanel } from '../components/DepositPanel'
import { GoalCreator } from '../components/GoalCreator'
import { MilestoneList } from '../components/MilestoneList'
import { useMilestones, useUserState, useVaultState } from '../hooks/useBastion'
import { triggerConfetti } from '../lib/confetti'
import {
  ACHIEVEMENTS_ADDRESS,
  EXPLORER_URL,
  LEVEL_NAMES,
  MILESTONES,
  RECEIPT_ADDRESS,
  STABILITY_POOL_ADDRESS,
  VAULT_ADDRESS,
} from '../lib/contracts'
import { formatMusd, shortAddress } from '../lib/format'

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

  const prevEarnedRef = useRef<number | null>(null)
  useEffect(() => {
    if (!isConnected) {
      prevEarnedRef.current = null
      return
    }
    if (prevEarnedRef.current !== null && earned > prevEarnedRef.current) {
      triggerConfetti()
    }
    prevEarnedRef.current = earned
  }, [earned, isConnected])

  function handleMutated() {
    void vault.refetch()
    void user.refetch()
  }

  const apyPct = (Number(vault.realizedApyBps) / 100).toFixed(2)
  const feePct = (Number(vault.protocolFeeBps) / 100).toFixed(1)

  return (
    <div className="shell py-12 lg:py-18">
      <header className="rule-b pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="eyebrow">
            Dossier · {isConnected ? `Level ${user.userLevel} ${LEVEL_NAMES[user.userLevel] ?? 'Initiate'}` : 'not connected'}
          </span>
          <a
            href={`${EXPLORER_URL}/address/${VAULT_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="figure text-[11px] text-verdigris underline"
          >
            Verified Vault {shortAddress(VAULT_ADDRESS)} ↗
          </a>
        </div>
        <h1 className="font-display mt-3 text-4xl tracking-[-0.01em] lg:text-5xl">
          {isConnected ? 'Your Bastion vault' : 'Connect to open your Bastion'}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Canonical MUSD deposits enter the Mezo Stability Pool immediately to earn liquidation
          BTC gains swapped via Mezo Pools. Progress bars, soulbound badges, and yield are read
          directly from chain state.
        </p>
      </header>

      {vault.isError && (
        <div className="mt-6 border-l-2 border-clay bg-clay/8 px-4 py-3 text-xs text-clay">
          Unable to reach Mezo Testnet RPC. Check your network connection or switch your wallet to Mezo Testnet (chain 31611).
        </div>
      )}

      <div className="grid gap-10 pt-10 lg:grid-cols-[1fr_390px]">
        <div className="min-w-0 space-y-10">
          {/* Position summary */}
          <section className="grid gap-px bg-ink/12 sm:grid-cols-4">
            <Figure
              label="Redeemable bMUSD"
              value={`${formatMusd(user.receiptBalance, 2)}`}
              note="1:1 MUSD claim"
            />
            <Figure
              label="Position value"
              value={`${formatMusd(user.positionValue, 4)}`}
              note={`${formatMusd(user.pendingYield, 4)} unclaimed`}
              accent
            />
            <Figure
              label="Earned yield"
              value={`${formatMusd(user.yieldEarned, 4)}`}
              note={`Carry: ${formatMusd(user.carry, 4)}`}
            />
            <Figure
              label="Badges"
              value={`${earned} / ${MILESTONES.length}`}
              note={`${user.depositCount.toString()} deposits`}
            />
          </section>

          {/* Savings goals */}
          <GoalCreator
            goals={user.goals}
            activeGoalId={user.activeGoalId}
            paused={vault.paused}
            onMutated={handleMutated}
          />

          {/* Milestones */}
          <section>
            <div className="rule-b mb-1 flex items-baseline justify-between">
              <h2 className="eyebrow">Milestone progress</h2>
              <span className="figure text-xs text-ink-faint">
                {earned} of {MILESTONES.length} unlocked
              </span>
            </div>
            {isConnected ? (
              <MilestoneList milestones={milestones} />
            ) : (
              <p className="py-6 text-sm text-ink-soft">
                Connect a wallet to track your progress and mint soulbound NFTs.
              </p>
            )}
          </section>

          {/* On-chain badge collection */}
          <section>
            <div className="rule-b mb-5 flex items-baseline justify-between">
              <h2 className="eyebrow">Soulbound badges</h2>
              <span className="text-xs text-ink-faint">On-chain SVG artwork</span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              {milestones.map((milestone) => (
                <div key={milestone.id} className="flex flex-col items-center gap-2 text-center">
                  <BadgeThumb
                    tokenId={user.badgeTokenIds[milestone.id]}
                    earned={milestone.earned}
                    size={68}
                  />
                  <span
                    className={`text-[11px] leading-tight ${
                      milestone.earned ? 'font-medium text-ink' : 'text-ink-faint'
                    }`}
                  >
                    {milestone.title}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Real Stability Pool & Protocol Revenue Telemetry */}
          <section className="sheet-ink p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-paper/15 pb-3">
              <h2 className="eyebrow text-paper/65">Mezo Stability Pool routing &amp; fee ledger</h2>
              <span className="figure text-xs text-paper/80">
                Realized APY: {apyPct}% (on-chain derived)
              </span>
            </div>

            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="eyebrow text-paper/50">Vault in Stability Pool</dt>
                <dd className="figure mt-1 text-lg text-paper">
                  {vault.isLoading ? '…' : `${formatMusd(vault.stabilityPoolDeposit, 2)} MUSD`}
                </dd>
                <span className="text-[11px] text-paper/50">
                  of {formatMusd(vault.spTotalDeposits, 0)} MUSD pool TVL
                </span>
              </div>
              <div>
                <dt className="eyebrow text-paper/50">Realized net yield / fees</dt>
                <dd className="figure mt-1 text-lg text-paper">
                  {formatMusd(vault.totalNetYield, 4)} MUSD
                </dd>
                <span className="text-[11px] text-paper/50">
                  {feePct}% fee → treasury ({formatMusd(vault.totalProtocolFees, 4)} MUSD)
                </span>
              </div>
              <div>
                <dt className="eyebrow text-paper/50">Pending BTC gains</dt>
                <dd className="figure mt-1 text-lg text-paper">
                  {formatMusd(vault.pendingCollateralGain, 6)} BTC
                </dd>
                <span className="text-[11px] text-paper/50">
                  Last harvest: {vault.lastHarvestAt > 0n ? `${formatMusd(vault.lastHarvestYield, 4)} MUSD` : 'None yet'}
                </span>
              </div>
            </dl>

            <div className="mt-5 flex flex-wrap gap-4 border-t border-paper/15 pt-3 text-[11px] text-paper/65">
              <span>Yield derives solely from Stability Pool BTC liquidation gains swapped via Mezo Pools — zero subsidized APY.</span>
              <span className="flex flex-wrap gap-3">
                <a href={`${EXPLORER_URL}/address/${VAULT_ADDRESS}`} target="_blank" rel="noreferrer" className="underline">
                  Vault ↗
                </a>
                <a href={`${EXPLORER_URL}/address/${RECEIPT_ADDRESS}`} target="_blank" rel="noreferrer" className="underline">
                  bMUSD ↗
                </a>
                <a href={`${EXPLORER_URL}/address/${ACHIEVEMENTS_ADDRESS}`} target="_blank" rel="noreferrer" className="underline">
                  Badges ↗
                </a>
                <a href={`${EXPLORER_URL}/address/${STABILITY_POOL_ADDRESS}`} target="_blank" rel="noreferrer" className="underline">
                  Mezo SP ↗
                </a>
              </span>
            </div>
          </section>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-8 lg:self-start">
          <DepositPanel
            shares={user.shares}
            receiptBalance={user.receiptBalance}
            pendingYield={user.pendingYield}
            pendingCollateralGain={vault.pendingCollateralGain}
            paused={vault.paused}
            goals={user.goals}
            activeGoalId={user.activeGoalId}
            onMutated={handleMutated}
          />
        </aside>
      </div>
    </div>
  )
}

function Figure({
  label,
  value,
  note,
  accent = false,
}: {
  label: string
  value: string
  note: string
  accent?: boolean
}) {
  return (
    <div className="bg-paper-2 px-4 py-4">
      <span className="eyebrow block">{label}</span>
      <span
        className={`figure mt-2 block text-xl font-medium ${accent ? 'text-verdigris' : 'text-ink'}`}
      >
        {value}
      </span>
      <span className="mt-1 block text-xs text-ink-faint">{note}</span>
    </div>
  )
}
