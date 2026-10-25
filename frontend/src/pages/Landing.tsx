// SPDX-License-Identifier: MIT
import { Link } from 'react-router-dom'

import { BadgeThumb } from '../components/BadgeThumb'
import { Mark } from '../components/Header'
import { MILESTONES } from '../lib/contracts'

const SPEC: [string, string][] = [
  ['Vault', 'BastionVault · ERC-20 receipt'],
  ['Asset', 'MUSD — canonical, Mezo Testnet'],
  ['Chain', 'Mezo · 31611 · gas in BTC'],
  ['Yield', 'Reward index, paid from buffer'],
  ['Badges', 'ERC-721 · SVG drawn on-chain'],
  ['Owner', 'Rate, buffer, pause — nothing else'],
]

const DIFFERENCE: [string, string, string][] = [
  ['What you get back', 'A number', 'A number and a record'],
  ['What marks progress', 'Nothing', 'Six on-chain badges'],
  ['What you can keep', 'The balance', 'The balance and the badges'],
  ['How it is shown', 'A rate', 'A ledger you can read'],
]

export function Landing() {
  return (
    <div>
      <section className="shell grid gap-14 border-b border-ink/12 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
        <div className="animate-fade-up">
          <div className="mb-8 inline-flex items-center gap-3 border border-ink/20 px-3 py-1.5">
            <span className="figure text-[10px] tracking-[0.2em] text-verdigris uppercase">
              Mezo Buildathon · Wave 1
            </span>
          </div>

          <h1 className="font-display text-[clamp(2.9rem,7vw,5.2rem)] leading-[0.95] tracking-[-0.02em] text-ink">
            Fortify your MUSD.
            <br />
            <em className="font-normal italic text-verdigris">Earn the badges.</em>
          </h1>

          <p className="mt-8 max-w-xl text-base leading-relaxed text-ink-soft">
            A savings vault for Bitcoin that remembers what you did. Deposit MUSD, earn yield
            every second, and collect an achievement at every milestone — each one minted by the
            contract, with its artwork drawn on-chain.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Link to="/dashboard" className="btn-ink px-6 py-3 text-sm">
              Open the vault
            </Link>
            <Link to="/achievements" className="link-underline text-sm text-ink">
              See the six milestones
            </Link>
          </div>
        </div>

        {/* the specification sheet */}
        <div className="animate-fade-up sheet self-start" style={{ animationDelay: '120ms' }}>
          <div className="rule-b flex items-center justify-between px-5 py-3">
            <span className="eyebrow">Specification</span>
            <Mark className="h-5 w-5" />
          </div>
          <dl>
            {SPEC.map(([term, value]) => (
              <div key={term} className="rule-b grid grid-cols-[7rem_1fr] gap-4 px-5 py-3 last:border-b-0">
                <dt className="eyebrow">{term}</dt>
                <dd className="figure text-[13px] text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="rule-t flex items-center justify-between px-5 py-3">
            <span className="figure text-[11px] text-ink-faint">bastion-two-hazel.vercel.app</span>
            <span className="figure text-[11px] text-verdigris">live on testnet</span>
          </div>
        </div>
      </section>

      <section className="shell py-20 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <span className="eyebrow">The difference</span>
            <h2 className="font-display mt-4 text-4xl leading-[1.05] tracking-[-0.01em] lg:text-5xl">
              A vault gives you a balance.
              <br />
              <em className="font-normal italic text-verdigris">Bastion gives you a record.</em>
            </h2>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-ink-soft">
              MUSD vaults today are cold: you deposit, a number drifts upward, and nothing marks
              what you did. Bastion adds the layer a programmable stablecoin can have and a
              plain vault cannot — a permanent, collectible trail of every milestone you pass.
            </p>
          </div>

          <div className="sheet self-start">
            <div className="rule-b grid grid-cols-[1fr_1fr_1fr] gap-4 px-6 py-3">
              <span className="eyebrow">—</span>
              <span className="eyebrow">A plain vault</span>
              <span className="eyebrow text-verdigris">Bastion</span>
            </div>
            {DIFFERENCE.map(([label, plain, bastion]) => (
              <div key={label} className="rule-b grid grid-cols-[1fr_1fr_1fr] gap-4 px-6 py-4 last:border-b-0">
                <span className="text-sm text-ink-soft">{label}</span>
                <span className="text-sm text-ink-faint">{plain}</span>
                <span className="text-sm font-medium text-ink">{bastion}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-ink/12 bg-paper-2/60 py-20 lg:py-28">
        <div className="shell">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="eyebrow">Milestones</span>
              <h2 className="font-display mt-4 text-4xl tracking-[-0.01em] lg:text-5xl">
                Six of them, drawn like a plan.
              </h2>
            </div>
            <Link to="/achievements" className="link-underline text-sm text-ink">
              Open the index
            </Link>
          </div>

          <div className="mt-12">
            {MILESTONES.map((milestone, index) => (
              <Link
                key={milestone.id}
                to="/achievements"
                className="ledger-row group transition-colors hover:bg-paper-2/60"
              >
                <span className="figure text-xs text-ink-faint">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-medium text-ink">{milestone.title}</span>
                  <span className="mt-0.5 block text-sm text-ink-soft">{milestone.description}</span>
                </span>
                <BadgeThumb tokenId={0n} earned={false} size={44} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="shell py-20 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-3">
          {[
            {
              n: '01',
              t: 'Deposit',
              b: 'Your MUSD goes into the vault and you receive bMUSD receipt shares, one for one. No lock-up, no minimum, no account.',
            },
            {
              n: '02',
              t: 'Accrue',
              b: 'A reward index advances every second. Your yield is paid from MUSD the vault already holds, so a deposit is always fully backed.',
            },
            {
              n: '03',
              t: 'Unlock',
              b: 'Cross a milestone and the vault mints you an ERC-721 badge. The artwork is generated inside the contract — it cannot be edited or taken down.',
            },
          ].map((step) => (
            <div key={step.n} className="border-t border-ink/20 pt-6">
              <span className="figure text-xs text-verdigris">{step.n}</span>
              <h3 className="font-display mt-3 text-2xl">{step.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{step.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* inverted closing block */}
      <section className="sheet-ink">
        <div className="shell flex flex-wrap items-center justify-between gap-8 py-16 lg:py-20">
          <div>
            <span className="eyebrow text-paper/55">Live on Mezo Testnet</span>
            <h2 className="font-display mt-3 text-4xl tracking-[-0.01em] lg:text-5xl">
              Build your Bastion.
            </h2>
            <p className="mt-4 max-w-md text-sm text-paper/60">
              Deposit MUSD, watch the yield accrue, and take the first badge with you.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="border border-paper/25 px-7 py-3.5 text-sm font-medium transition-colors hover:bg-paper hover:text-ink"
          >
            Open the vault
          </Link>
        </div>
      </section>
    </div>
  )
}
