// SPDX-License-Identifier: MIT
import { useAccount } from 'wagmi'

import { BadgeThumb } from '../components/BadgeThumb'
import { useUserState } from '../hooks/useBastion'
import { MILESTONES } from '../lib/contracts'

export function Achievements() {
  const { address, isConnected } = useAccount()
  const user = useUserState(address)

  const earnedCount = MILESTONES.filter(
    (m) => ((user.badgeBitmap >> BigInt(m.id)) & 1n) === 1n,
  ).length

  return (
    <div className="shell py-14 lg:py-20">
      <header className="rule-b pb-8">
        <span className="eyebrow">Index of achievements</span>
        <h1 className="font-display mt-3 text-4xl tracking-[-0.01em] lg:text-5xl">
          The Bastion record
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Each badge is an ERC-721 minted by the vault the moment your on-chain state crosses a
          milestone. The artwork is generated on-chain — every badge is a self-contained SVG held
          in the contract, so it can never be lost or edited.
        </p>
      </header>

      {isConnected && (
        <div className="rule-b flex flex-wrap items-center justify-between gap-4 py-5">
          <span className="eyebrow">Unlocked</span>
          <span className="figure text-lg">
            {earnedCount} <span className="text-ink-faint">/ {MILESTONES.length}</span>
          </span>
          <div className="h-[3px] w-full max-w-sm bg-ink/12">
            <div
              className="h-full bg-verdigris transition-all duration-700"
              style={{ width: `${(earnedCount / MILESTONES.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-2">
        {MILESTONES.map((milestone) => {
          const earned = ((user.badgeBitmap >> BigInt(milestone.id)) & 1n) === 1n
          return (
            <div
              key={milestone.id}
              className={`grid grid-cols-[3rem_4.5rem_1fr_auto] items-center gap-4 border-b border-ink/12 py-5 ${
                earned ? '' : 'opacity-60'
              }`}
            >
              <span className="figure text-xs text-ink-faint">
                {String(milestone.id + 1).padStart(2, '0')}
              </span>
              <BadgeThumb tokenId={user.badgeTokenIds[milestone.id]} earned={earned} size={64} />
              <span className="min-w-0">
                <span className="block text-base font-medium text-ink">{milestone.title}</span>
                <span className="mt-0.5 block text-sm text-ink-soft">{milestone.description}</span>
              </span>
              <span
                className={`figure justify-self-end text-[11px] tracking-[0.14em] ${
                  earned ? 'text-verdigris' : 'text-ink-faint'
                }`}
              >
                {earned ? 'UNLOCKED' : 'LOCKED'}
              </span>
            </div>
          )
        })}
      </div>

      {!isConnected && (
        <p className="mt-8 text-sm text-ink-soft">
          Connect your wallet to see which badges you have unlocked.
        </p>
      )}
    </div>
  )
}
