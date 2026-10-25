// SPDX-License-Identifier: MIT

type IconProps = { className?: string }

function base(className?: string) {
  return {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  }
}

export function ArrowUpRight({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  )
}

export function ArrowDownLeft({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M17 7 7 17" />
      <path d="M16 17H7V8" />
    </svg>
  )
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="m5 13 4 4L19 7" />
    </svg>
  )
}

export function LockIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <rect x="4.5" y="10" width="15" height="10" rx="1" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    </svg>
  )
}
