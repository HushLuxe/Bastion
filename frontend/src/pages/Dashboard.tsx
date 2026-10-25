// SPDX-License-Identifier: MIT
import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'

import { BadgeThumb } from '../components/BadgeThumb'
import { DepositPanel } from '../components/DepositPanel'
import { MilestoneList } from '../components/MilestoneList'
import { useMilestones, useUserState, useVaultState } from '../hooks/useBastion'
import { MILESTONES } from '../lib/contracts'
import { formatMusd } from '../lib/format'

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
    <div className="shell py-14 lg:py-20">
      <header className="rule-b pb-8">
        <span className="eyebrow">Dossier · {isConnected ? 'your account' : 'not connected'}</span>
        <h1 className="font-display mt-3 text-4xl tracking-[-0.01em] lg:text-5xl">
          {isConnected ? 'Your position' : 'Connect to open your Bastion'}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Everything below is read from the contract — the receipt you hold, the yield that has
          accrued, and the milestones you have unlocked.
        </p>
      </header>

      <div className="grid gap-10 pt-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-10">
          {/* figures */}
          <section className="grid gap-px bg-ink/12 sm:grid-cols-3">
            <Figure label="Position" value={`${formatMusd(user.shares, 2)} MUSD`} note="bMUSD receipt" />
            <Figure
              label="Yield accrued"
              value={`${formatMusd(user.pendingYield, 4)} MUSD`}
              note={`${formatMusd(user.yieldEarned, 4)} paid out`}
              accent
            />
            <Figure
              label="Badges"
              value={`${earned} / ${MILESTONES.length}`}
              note={`${user.depositCount.toString()} deposits`}
            />
          </section>

          {/* milestones */}
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
                Connect a wallet to track your progress and unlock badges.
              </p>
            )}
          </section>

          {/* badges */}
          <section>
            <div className="rule-b mb-5 flex items-baseline justify-between">
              <h2 className="eyebrow">Achievements</h2>
              <span className="text-xs text-ink-faint">Artwork drawn in the contract</span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {milestones.map((milestone) => (
                <div key={milestone.id} className="flex flex-col items-center gap-2 text-center">
                  <BadgeThumb
                    tokenId={user.badgeTokenIds[milestone.id]}
                    earned={milestone.earned}
                    size={72}
                  />
                  <span
                    className={`text-[11px] leading-tight ${
                      milestone.earned ? 'text-ink' : 'text-ink-faint'
                    }`}
                  >
                    {milestone.title}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* vault state */}
          <section>
            <h2 className="eyebrow rule-b mb-1">The vault</h2>
            <dl className="grid gap-px bg-ink/12 sm:grid-cols-2">
              <Row label="MUSD held" value={`${formatMusd(vault.totalAssets, 2)} MUSD`} />
              <Row label="Principal" value={`${formatMusd(vault.totalShares, 2)} MUSD`} />
              <Row label="Yield buffer" value={`${formatMusd(vault.buffer, 2)} MUSD`} />
              <Row label="Demo rate" value={`${formatRate(vault.ratePerSecond)} / second`} />
            </dl>
            {vault.ratePerSecond > 0n && (
              <p className="mt-4 border-l-2 border-verdigris bg-verdigris-wash px-4 py-3 text-xs leading-relaxed text-verdigris-deep">
                Wave 1 ships an owner-set rate so the accrual is visible on camera. The UI labels it
                as a demo rate; in production the same index would point at a real MUSD yield
                source.
              </p>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <DepositPanel shares={user.shares} pendingYield={user.pendingYield} />
        </aside>
      </div>
    </div>
  )
}

function Figure({ label, value, note, accent = false }: { label: string; value: string; note: string; accent?: boolean }) {
  return (
    <div className="bg-paper-2 px-5 py-5">
      <span className="eyebrow block">{label}</span>
      <span
        className={`figure mt-2 block text-2xl font-medium ${accent ? 'text-verdigris' : 'text-ink'}`}
      >
        {value}
      </span>
      <span className="mt-1 block text-xs text-ink-faint">{note}</span>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-paper-2 px-5 py-3">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="figure text-sm">{value}</dd>
    </div>
  )
}

function formatRate(rate: bigint): string {
  const perSecond = Number(rate) / 1e18
  if (perSecond === 0) return '0%'
  return `${(perSecond * 100).toFixed(4)}%`
}
