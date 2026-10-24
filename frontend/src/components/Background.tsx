// SPDX-License-Identifier: MIT

/** Ambient backdrop: masonry courses, an amber torch glow and a heavy vignette. */
export function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-bastion-bg" />
      <div className="masonry absolute inset-0 opacity-70" />
      <div className="animate-breathe absolute top-[-320px] left-1/2 h-[720px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(240,162,2,0.13),transparent_68%)] blur-3xl" />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-bastion-bg to-transparent" />
    </div>
  )
}
