// SPDX-License-Identifier: MIT
import { Route, Routes } from 'react-router-dom'

import { Background } from './components/Background'
import { Header } from './components/Header'
import { Achievements } from './pages/Achievements'
import { Dashboard } from './pages/Dashboard'
import { Landing } from './pages/Landing'
import { KeepIcon } from './components/icons'

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
      <footer className="border-t border-bastion-line-soft px-5 py-8">
        <div className="shell flex flex-col items-center justify-between gap-3 text-xs text-bastion-muted sm:flex-row">
          <span className="flex items-center gap-2">
            <KeepIcon className="h-3.5 w-3.5 text-bastion-amber" />
            Bastion — savings with strength. Settled in MUSD on Mezo Testnet.
          </span>
          <span className="flex items-center gap-2">
            Non-custodial · on-chain badges · gas in BTC
          </span>
        </div>
      </footer>
    </div>
  )
}
