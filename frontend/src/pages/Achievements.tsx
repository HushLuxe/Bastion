// SPDX-License-Identifier: MIT
import { useAccount } from 'wagmi'

import { BadgeCard } from '../components/BadgeCard'
import { useUserState } from '../hooks/useBastion'
import { MILESTONES } from '../lib/contracts'

export function Achievements() {
  const { address, isConnected } = useAccount()
  const user = useUserState(address)
  const earnedCount = MILESTONES.filter((m) => ((user.badgeBitmap >> BigInt(m.id)) & 1n) === 1n).length

  return (
    <div className="shell py-12 sm:py-16">
      <div className="mb-10 max-w-2xl">
        <span className="label-caps">Achievements</span>
        <h1 className="font-display mt-3 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
          The Bastion record
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-bastion-muted">
          Every badge is an ERC-721 minted by the vault when you cross a milestone. The artwork is
          generated on-chain — each badge is a self-contained SVG stored in the contract, so it
          can never be lost or edited.
        </p>
      </div>

      {isConnected && (
        <div className="panel mb-10 flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <span className="label-caps">Unlocked</span>
            <p className="font-display mt-1 text-2xl font-bold">
              {earnedCount} <span className="text-bastion-muted">/ {MILESTONES.length}</span>
            </p>
          </div>
          <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-bastion-bg-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-bastion-amber-deep to-bastion-amber-soft transition-all duration-700"
              style={{ width: `${(earnedCount / MILESTONES.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {MILESTONES.map((milestone) => {
          const earned = ((user.badgeBitmap >> BigInt(milestone.id)) & 1n) === 1n
          return (
            <div
              key={milestone.id}
              className={`panel flex flex-col items-center p-8 text-center transition-colors duration-300 ${
                earned ? 'border-bastion-amber/35' : ''
              }`}
            >
              <BadgeCard
                tokenId={user.badgeTokenIds[milestone.id]}
                earned={earned}
                title={milestone.title}
                description={milestone.description}
                size="lg"
              />
            </div>
          )
        })}
      </div>

      {!isConnected && (
        <p className="mt-10 text-sm text-bastion-muted">
          Connect your wallet to see which badges you have unlocked.
        </p>
      )}
    </div>
  )
}
