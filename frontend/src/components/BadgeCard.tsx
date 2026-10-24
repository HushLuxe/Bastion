// SPDX-License-Identifier: MIT
import { useBadgeArt } from '../hooks/useBastion'
import { LockIcon } from './icons'

/**
 * Achievement badge. Artwork comes from the contract itself: `tokenURI` returns an
 * on-chain SVG data URI, so no hosting and no IPFS is involved.
 */
export function BadgeCard({
  tokenId,
  earned,
  title,
  description,
  size = 'md',
}: {
  tokenId: bigint
  earned: boolean
  title: string
  description: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const uri = useBadgeArt(earned && tokenId > 0n ? tokenId : undefined)

  const frame =
    size === 'lg'
      ? 'h-40 w-40'
      : size === 'sm'
        ? 'h-16 w-16'
        : 'h-24 w-24'

  return (
    <div className="group relative">
      <div
        className={`relative ${frame} overflow-hidden rounded-2xl border ${
          earned
            ? 'border-bastion-amber/45 bg-bastion-stone-2 shadow-[0_20px_50px_-28px_rgba(240,162,2,0.85)]'
            : 'border-bastion-line bg-bastion-stone'
        }`}
      >
        {earned && uri ? (
          <img
            src={uri}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-bastion-muted">
            <LockIcon className={size === 'lg' ? 'h-7 w-7' : 'h-5 w-5'} />
            <span className="font-display text-[10px] tracking-[0.2em] uppercase">Locked</span>
          </div>
        )}
      </div>
      <p
        className={`mt-3 font-display font-semibold ${
          size === 'lg' ? 'text-base' : size === 'sm' ? 'text-xs' : 'text-sm'
        } ${earned ? 'text-bastion-ink' : 'text-bastion-muted'}`}
      >
        {title}
      </p>
      {size !== 'sm' && (
        <p className="mt-1 text-xs leading-relaxed text-bastion-muted">{description}</p>
      )}
    </div>
  )
}
