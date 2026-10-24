// SPDX-License-Identifier: MIT

type IconProps = { className?: string }

function base(className?: string) {
  return {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  }
}

/** The Bastion mark: a fortified gate. */
export function KeepIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M4 21V10a8 8 0 0 1 16 0v11" />
      <path d="M4 21h16" />
      <path d="M9 21v-6a3 3 0 0 1 6 0v6" />
      <path d="M4 12h4M16 12h4" />
    </svg>
  )
}

export function CoinIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 9.2c-.5-.7-1.4-1.1-2.5-1.1-1.4 0-2.4.7-2.4 1.8 0 2.4 5 1.2 5 3.7 0 1.2-1.1 2-2.7 2-1.2 0-2.2-.5-2.7-1.3" />
      <path d="M12 6.6v10.8" />
    </svg>
  )
}

export function TrophyIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H5.5A1.5 1.5 0 0 0 4 7.5C4 9 5.5 10 8 10" />
      <path d="M16 6h2.5A1.5 1.5 0 0 1 20 7.5C20 9 18.5 10 16 10" />
      <path d="M12 13v4M9 21h6M10 17h4" />
    </svg>
  )
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M12 3 5 6v5.5c0 4.4 3 8.2 7 9.5 4-1.3 7-5.1 7-9.5V6l-7-3Z" />
      <path d="m9.5 12 1.8 1.8 3.4-3.6" />
    </svg>
  )
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

export function LockIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <rect x="4.5" y="10" width="15" height="10" rx="2" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    </svg>
  )
}

export function WalletIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M3 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2" />
      <path d="M3 8v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" />
      <path d="M21 11h-4a2 2 0 0 0 0 4h4" />
    </svg>
  )
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

export function PlusIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

export function SparkIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="m6.5 6.5 2.5 2.5M15 15l2.5 2.5M17.5 6.5 15 9M9 15l-2.5 2.5" />
    </svg>
  )
}

export function LayersIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </svg>
  )
}

export function ExternalIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M14 4h6v6" />
      <path d="M20 4 10 14" />
      <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
    </svg>
  )
}
