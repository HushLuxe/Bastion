// SPDX-License-Identifier: MIT
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { Link, NavLink } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'Overview' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/quests', label: 'Quests' },
  { to: '/achievements', label: 'Achievements' },
]

export function Header() {
  const { address, isConnected } = useAccount()

  return (
    <header className="border-b border-ink/15 bg-paper/92 backdrop-blur-sm">
      <div className="shell flex h-16 items-center justify-between gap-3">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <Mark />
          <span className="font-display text-[22px] leading-none tracking-tight">Bastion</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `link-underline eyebrow transition-colors ${
                  isActive ? 'text-verdigris' : 'text-ink-soft hover:text-ink'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {isConnected && (
            <span className="figure hidden text-xs text-ink-soft sm:inline">
              {address?.slice(0, 6)}…{address?.slice(-4)}
            </span>
          )}

          <ConnectButton.Custom>
            {({ account, openConnectModal, openAccountModal, mounted }) => {
              if (!mounted || !account) {
                return (
                  <button onClick={openConnectModal} className="btn-ink shrink-0 px-3 py-2 text-xs sm:px-4 sm:text-sm">
                    Connect wallet
                  </button>
                )
              }
              return (
                <button onClick={openAccountModal} className="btn-outline shrink-0 px-3 py-2 text-xs sm:px-4 sm:text-sm">
                  {account.displayName ?? `${account.address.slice(0, 6)}…${account.address.slice(-4)}`}
                </button>
              )
            }}
          </ConnectButton.Custom>
        </div>
      </div>

      {/* Mobile navigation strip */}
      <nav className="rule-t flex flex-wrap items-center justify-between gap-1 px-4 py-2 md:hidden">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `font-mono px-1.5 py-1 text-[10px] font-medium tracking-[0.1em] uppercase transition-colors ${
                isActive ? 'border-b border-verdigris text-verdigris' : 'text-ink-soft'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}

/** The mark: a plan of the keep, drawn as linework. */
export function Mark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden>
      <rect x="1" y="1" width="30" height="30" stroke="#15191e" strokeOpacity="0.22" />
      <path d="M7 25V14a9 9 0 0 1 18 0v11" stroke="#15191e" strokeWidth="1.8" />
      <path d="M5 25h22" stroke="#1f5f52" strokeWidth="2.2" />
      <path d="M16 25v-6" stroke="#1f5f52" strokeWidth="1.6" />
    </svg>
  )
}
