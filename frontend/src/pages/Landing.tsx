// SPDX-License-Identifier: MIT
import { Link } from 'react-router-dom'

import { BadgeCard } from '../components/BadgeCard'
import { ArrowUpRight, ClockIcon, CoinIcon, KeepIcon, TrophyIcon } from '../components/icons'
import { MILESTONES } from '../lib/contracts'

const STEPS = [
  {
    icon: CoinIcon,
    title: 'Deposit MUSD',
    body: 'Your MUSD goes straight into the Bastion vault and you receive bMUSD receipt shares, 1:1, with no lock-up.',
  },
  {
    icon: ClockIcon,
    title: 'Earn yield',
    body: 'Yield accrues every second on your position. The rate is set by the vault owner and backed by MUSD the vault already holds.',
  },
  {
    icon: TrophyIcon,
    title: 'Unlock badges',
    body: 'Cross a milestone and Bastion mints an achievement badge — collectible, on-chain, and rendered straight from the contract.',
  },
]

export function Landing() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="torch-glow absolute inset-x-0 top-0 h-[520px]" />

        <div className="shell relative pt-20 pb-16 sm:pt-28 sm:pb-24">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="animate-fade-up">
              <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-bastion-amber/30 bg-bastion-amber/10 px-3.5 py-1.5 text-[11px] font-medium tracking-[0.18em] text-bastion-amber uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-bastion-amber" />
                Live on Mezo Testnet
              </span>

              <h1 className="font-display text-4xl leading-[1.02] font-bold tracking-[-0.035em] text-bastion-ink sm:text-6xl">
                Fortify your MUSD.
                <br />
                <span className="text-amber-gradient">Earn the badges.</span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-bastion-muted sm:text-lg">
                Bastion turns saving into something you can see. Deposit MUSD, earn yield every
                second, and unlock achievement badges that mark every milestone you pass.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  to="/dashboard"
                  className="btn-amber btn-amber-hover inline-flex items-center gap-2 px-6 py-3.5 text-[15px]"
                >
                  Open your Bastion
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/achievements"
                  className="btn-stone inline-flex items-center gap-2 px-6 py-3.5 text-[15px]"
                >
                  See the achievements
                </Link>
              </div>

              <div className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-bastion-line-soft pt-7">
                <Metric value="6" label="Milestones" />
                <Metric value="100%" label="On-chain badges" />
                <Metric value="1:1" label="Receipt shares" />
              </div>
            </div>

            {/* the gate */}
            <div className="animate-rise relative mx-auto w-full max-w-md">
              <div className="arch relative overflow-hidden border border-bastion-line bg-bastion-stone p-8 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.95)]">
                <div className="torch-glow absolute inset-x-0 top-0 h-40" />
                <div className="relative">
                  <div className="mb-6 flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-bastion-amber/15 text-bastion-amber ring-1 ring-bastion-amber/30">
                      <KeepIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-display text-sm font-semibold">Your Bastion</p>
                      <p className="text-xs text-bastion-muted">MUSD vault · Mezo Testnet</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-xl border border-bastion-line-soft bg-bastion-bg-2 px-4 py-3">
                      <p className="label-caps">Deposited</p>
                      <p className="font-mono mt-1 text-2xl font-semibold tabular-nums">120.00 MUSD</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-bastion-line-soft bg-bastion-bg-2 px-4 py-3">
                        <p className="label-caps">Yield</p>
                        <p className="font-mono mt-1 text-sm font-medium text-bastion-amber tabular-nums">
                          +0.0432 MUSD
                        </p>
                      </div>
                      <div className="rounded-xl border border-bastion-line-soft bg-bastion-bg-2 px-4 py-3">
                        <p className="label-caps">Badges</p>
                        <p className="font-mono mt-1 text-sm font-medium tabular-nums">2 / 6</p>
                      </div>
                    </div>
                    <div className="space-y-2 pt-2">
                      <Progress label="First Deposit" value={100} done />
                      <Progress label="Saved 100 MUSD" value={100} done />
                      <Progress label="Saved 500 MUSD" value={24} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="shell py-20 sm:py-28">
        <div className="max-w-2xl">
          <span className="label-caps">How it works</span>
          <h2 className="font-display mt-4 text-3xl leading-tight font-bold tracking-[-0.03em] sm:text-5xl">
            A vault with a <span className="text-amber-gradient">progress system</span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-bastion-muted">
            A plain vault gives you a balance. Bastion gives you a balance and a record of how far
            you have come — every milestone is a badge you can keep.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div
              key={step.title}
              className="panel animate-fade-up p-7 transition-colors duration-300 hover:border-bastion-amber/30"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-bastion-amber/12 text-bastion-amber ring-1 ring-bastion-amber/25">
                <step.icon className="h-5 w-5" />
              </span>
              <h3 className="font-display mt-5 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-bastion-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="shell pb-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="label-caps">Achievements</span>
            <h2 className="font-display mt-4 text-3xl leading-tight font-bold tracking-[-0.03em] sm:text-5xl">
              Six milestones. <span className="text-amber-gradient">One record.</span>
            </h2>
          </div>
          <Link to="/achievements" className="btn-stone px-5 py-3 text-sm">
            Open the gallery
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
          {MILESTONES.map((milestone) => (
            <div
              key={milestone.id}
              className="panel flex flex-col items-center p-4 text-center"
            >
              <BadgeCard
                tokenId={0n}
                earned={false}
                title={milestone.short}
                description={milestone.description}
                size="sm"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-[11px] tracking-[0.16em] text-bastion-muted uppercase">{label}</p>
    </div>
  )
}

function Progress({ label, value, done = false }: { label: string; value: number; done?: boolean }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className={done ? 'text-bastion-ink' : 'text-bastion-muted'}>{label}</span>
        <span className="font-mono text-[10px] text-bastion-muted">{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-bastion-bg-2">
        <div
          className={`h-full rounded-full ${
            done ? 'bg-gradient-to-r from-bastion-amber-deep to-bastion-amber-soft' : 'bg-bastion-stone-3'
          }`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}
