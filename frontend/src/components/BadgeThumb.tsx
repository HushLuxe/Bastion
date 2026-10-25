// SPDX-License-Identifier: MIT
import { useBadgeArt } from '../hooks/useBastion'

/**
 * Achievement badge thumbnail. The artwork comes from the contract: `tokenURI` returns an
 * on-chain SVG data URI, so nothing is hosted anywhere.
 */
export function BadgeThumb({
  tokenId,
  earned,
  size = 56,
}: {
  tokenId: bigint
  earned: boolean
  size?: number
}) {
  const uri = useBadgeArt(earned && tokenId > 0n ? tokenId : undefined)

  return (
    <div
      className="relative shrink-0 overflow-hidden border border-ink/20"
      style={{ width: size, height: size }}
    >
      {earned && uri ? (
        <img src={uri} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="plan-grid-fine flex h-full w-full items-center justify-center bg-paper-3">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-ink/30" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="4" y="10" width="16" height="10" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
        </div>
      )}
    </div>
  )
}
