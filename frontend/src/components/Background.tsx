// SPDX-License-Identifier: MIT

/** The drawing sheet: a fine plan grid, a heavier module grid and drawing ticks. */
export function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-paper" />
      <div className="plan-grid absolute inset-0" />

      <div className="absolute top-0 left-1/2 h-px w-[92%] -translate-x-1/2 bg-ink/12" />
      <div className="absolute top-0 left-1/2 h-[18px] w-px bg-verdigris/35" />

      {/* corner registration marks */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <g stroke="#15191e" strokeOpacity="0.18" strokeWidth="1">
          <path d="M32 32h48M32 32v48" />
          <path d="M1408 32h-48M1408 32v48" />
          <path d="M32 868h48M32 868v-48" />
          <path d="M1408 868h-48M1408 868v-48" />
        </g>
        <g stroke="#1f5f52" strokeOpacity="0.4" strokeWidth="1">
          <path d="M700 0v28M714 0v28" />
          <path d="M0 300h28M0 314h28" />
        </g>
      </svg>
    </div>
  )
}
