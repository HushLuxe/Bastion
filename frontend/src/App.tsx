// SPDX-License-Identifier: MIT
import { Route, Routes } from 'react-router-dom'

import { Background } from './components/Background'
import { Header } from './components/Header'
import { Achievements } from './pages/Achievements'
import { Dashboard } from './pages/Dashboard'
import { Landing } from './pages/Landing'
import { Mark } from './components/Header'

export default function App() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <Background />
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/achievements" element={<Achievements />} />
        </Routes>
      </main>
      <footer className="rule-t mt-10">
        <div className="shell flex flex-col items-center justify-between gap-3 py-8 sm:flex-row">
          <span className="flex items-center gap-2.5 text-xs text-ink-soft">
            <Mark className="h-5 w-5" />
            Bastion — savings with strength. Settled in MUSD on Mezo Testnet.
          </span>
          <span className="figure text-[11px] tracking-[0.14em] text-ink-faint uppercase">
            Non-custodial · on-chain badges · gas in BTC
          </span>
        </div>
      </footer>
    </div>
  )
}
