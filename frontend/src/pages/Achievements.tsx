// SPDX-License-Identifier: MIT
import { useAccount } from 'wagmi'

import { BadgeThumb } from '../components/BadgeThumb'
import { useUserState } from '../hooks/useBastion'
import { ACHIEVEMENTS_ADDRESS, EXPLORER_URL, LEVEL_NAMES, MILESTONES } from '../lib/contracts'

export function Achievements() {
  const { address, isConnected } = useAccount()
  const user = useUserState(address)

  const earnedCount = MILESTONES.filter(
    (m) => ((user.badgeBitmap >> BigInt(m.id)) & 1n) === 1n,
  ).length

  return (
    <div className="shell py-14 lg:py-20">
      <header className="rule-b pb-8">
        <span className="eyebrow">Index of achievements · Soulbound ERC-721</span>
        <h1 className="font-display mt-3 text-4xl tracking-[-0.01em] lg:text-5xl">
          The Bastion record
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Each badge is a non-transferable (soulbound) ERC-721 minted by{' '}
          <a
            href={`${EXPLORER_URL}/address/${ACHIEVEMENTS_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="figure text-verdigris underline"
          >
            BastionAchievements ↗
          </a>{' '}
          the moment your on-chain position crosses a core milestone or goal tier (Bronze 25%,
          Silver 50%, Gold 75%, Vanguard 100%). Artwork is encoded as on-chain SVG.
        </p>
      </header>

      {isConnected && (
        <div className="rule-b flex flex-wrap items-center justify-between gap-4 py-5">
          <div className="flex items-center gap-3">
            <span className="eyebrow">Unlocked</span>
            <span className="figure border border-verdigris/30 bg-verdigris-wash px-2.5 py-0.5 text-[11px] text-verdigris uppercase">
              Level {user.userLevel} · {LEVEL_NAMES[user.userLevel] ?? 'Initiate'}
            </span>
          </div>
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
          const tokenId = user.badgeTokenIds[milestone.id]
          return (
            <div
              key={milestone.id}
              className={`grid grid-cols-[2.5rem_4rem_1fr] items-center gap-4 border-b border-ink/12 py-5 sm:grid-cols-[3rem_4.5rem_1fr_auto] ${
                earned ? '' : 'opacity-65'
              }`}
            >
              <span className="figure text-xs text-ink-faint">
                {String(milestone.id + 1).padStart(2, '0')}
              </span>
              <BadgeThumb tokenId={tokenId} earned={earned} size={64} />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-medium text-ink">{milestone.title}</span>
                  <span className="figure border border-ink/15 px-1.5 py-0.5 text-[9px] text-ink-faint uppercase">
                    {milestone.tier}
                  </span>
                </span>
                <span className="mt-0.5 block text-sm text-ink-soft">{milestone.description}</span>
              </span>
              <span
                className={`figure col-span-3 justify-self-start text-[11px] tracking-[0.14em] sm:col-span-1 sm:justify-self-end ${
                  earned ? 'text-verdigris' : 'text-ink-faint'
                }`}
              >
                {earned ? `UNLOCKED #${tokenId.toString()}` : 'LOCKED'}
              </span>
            </div>
          )
        })}
      </div>

      {!isConnected && (
        <p className="mt-8 text-sm text-ink-soft">
          Connect your wallet to see which soulbound badges you have unlocked.
        </p>
      )}
    </div>
  )
}
