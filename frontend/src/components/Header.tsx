// SPDX-License-Identifier: MIT
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { Link, NavLink } from 'react-router-dom'

import { KeepIcon } from './icons'

const NAV = [
  { to: '/', label: 'Bastion' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/achievements', label: 'Achievements' },
]

function navClass({ isActive }: { isActive: boolean }) {
  return `rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
    isActive ? 'text-bastion-amber' : 'text-bastion-muted hover:text-bastion-ink'
  }`
}

export function Header() {
  const { address, isConnected } = useAccount()

  return (
    <header className="sticky top-0 z-40 border-b border-bastion-line-soft bg-bastion-bg/92 backdrop-blur-xl">
      <div className="shell flex items-center gap-4 py-3.5">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-bastion-amber text-bastion-bg shadow-[0_10px_30px_-12px_rgba(240,162,2,0.9)]">
            <KeepIcon className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Bastion</span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {isConnected && (
            <span className="hidden font-mono text-xs text-bastion-muted sm:inline">
              {address?.slice(0, 6)}…{address?.slice(-4)}
            </span>
          )}

          <ConnectButton.Custom>
            {({ account, openConnectModal, openAccountModal, mounted }) => {
              if (!mounted || !account) {
                return (
                  <button
                    onClick={openConnectModal}
                    className="btn-amber btn-amber-hover px-4 py-2 text-sm"
                  >
                    Connect wallet
                  </button>
                )
              }
              return (
                <button
                  onClick={openAccountModal}
                  className="btn-stone px-4 py-2 text-sm"
                >
                  {account.displayName ?? `${account.address.slice(0, 6)}…${account.address.slice(-4)}`}
                </button>
              )
            }}
          </ConnectButton.Custom>
        </div>
      </div>
    </header>
  )
}
