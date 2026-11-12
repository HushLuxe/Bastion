// SPDX-License-Identifier: MIT
import { Link } from 'react-router-dom'

import { BadgeThumb } from '../components/BadgeThumb'
import { Mark } from '../components/Header'
import { useVaultState } from '../hooks/useBastion'
import {
  ACHIEVEMENTS_ADDRESS,
  EXPLORER_URL,
  MILESTONES,
  RECEIPT_ADDRESS,
  STABILITY_POOL_ADDRESS,
  VAULT_ADDRESS,
} from '../lib/contracts'
import { formatMusd, shortAddress } from '../lib/format'

const DIFFERENCE: [string, string, string][] = [
  ['Where MUSD sits', 'Idle or subsidized', 'Mezo Stability Pool (L3+)'],
  ['Real yield source', 'Treasury / hardcoded APR', 'Harvested BTC gains via Mezo Router'],
  ['Revenue model', 'None', '10% protocol fee on realized yield'],
  ['Transferred receipt', 'Broken / unredeemable', '1:1 redeemable by any bMUSD holder'],
  ['What marks progress', 'Plain balance', 'Goals, quests, leaderboard + 10 badges'],
]

export function Landing() {
  const vault = useVaultState()
  const apyPct = (Number(vault.realizedApyBps) / 100).toFixed(2)

  return (
    <div>
      <section className="shell grid gap-14 border-b border-ink/12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
        <div className="animate-fade-up min-w-0">
          <div className="mb-7 inline-flex items-center gap-3 border border-ink/20 px-3 py-1.5">
            <span className="figure text-[10px] tracking-[0.2em] text-verdigris uppercase">
              Mezo Buildathon · Wave 2
            </span>
          </div>

          <h1 className="font-display text-[clamp(2.8rem,6.5vw,5rem)] leading-[0.95] tracking-[-0.02em] text-ink">
            Fortify your MUSD.
            <br />
            <em className="font-normal italic text-verdigris">Earn the badges.</em>
          </h1>

          <p className="mt-7 max-w-xl text-base leading-relaxed text-ink-soft">
            Gamified MUSD savings on Mezo. Create named savings goals, route canonical MUSD directly
            into the Mezo Stability Pool, swap BTC liquidation gains back to MUSD via Mezo Pools,
            and unlock soulbound on-chain achievement NFTs.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-5">
            <Link to="/dashboard" className="btn-ink px-6 py-3 text-sm">
              Launch app
            </Link>
            <Link to="/quests" className="btn-outline px-5 py-3 text-sm">
              Quests &amp; leaderboard
            </Link>
            <Link to="/achievements" className="link-underline text-sm text-ink">
              10 soulbound badges
            </Link>
          </div>
        </div>

        {/* Live verified protocol specification */}
        <div className="animate-fade-up sheet min-w-0 self-start" style={{ animationDelay: '120ms' }}>
          <div className="rule-b flex items-center justify-between px-5 py-3">
            <span className="eyebrow">Live Protocol State</span>
            <Mark className="h-5 w-5" />
          </div>
          <dl>
            <SpecRow label="BastionVault" value={shortAddress(VAULT_ADDRESS)} href={`${EXPLORER_URL}/address/${VAULT_ADDRESS}`} />
            <SpecRow label="bMUSD Receipt" value={shortAddress(RECEIPT_ADDRESS)} href={`${EXPLORER_URL}/address/${RECEIPT_ADDRESS}`} />
            <SpecRow label="Badges ERC-721" value={shortAddress(ACHIEVEMENTS_ADDRESS)} href={`${EXPLORER_URL}/address/${ACHIEVEMENTS_ADDRESS}`} />
            <SpecRow label="Stability Pool" value={shortAddress(STABILITY_POOL_ADDRESS)} href={`${EXPLORER_URL}/address/${STABILITY_POOL_ADDRESS}`} />
            <SpecRow label="Vault TVL" value={`${formatMusd(vault.totalAssets, 2)} MUSD`} />
            <SpecRow label="Realized APY" value={`${apyPct}% (on-chain derived · 10% fee)`} />
          </dl>
          <div className="rule-t flex items-center justify-between px-5 py-3">
            <span className="figure text-[11px] text-ink-faint">Mezo Testnet · 31611</span>
            <span className="figure text-[11px] text-verdigris">verified on Blockscout</span>
          </div>
        </div>
      </section>

      <section className="shell py-16 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="min-w-0">
            <span className="eyebrow">Architecture</span>
            <h2 className="font-display mt-4 text-4xl leading-[1.05] tracking-[-0.01em] lg:text-5xl">
              Real Mezo yield.
              <br />
              <em className="font-normal italic text-verdigris">Gamified progression.</em>
            </h2>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-ink-soft">
              Every MUSD deposit goes straight to Mezo&apos;s Stability Pool — zero subsidized admin
              rates. BTC collateral gains are permissionlessly harvested through Mezo Pools Router,
              sharing 90% with savers pro-rata and sending 10% to the Bastion treasury.
            </p>
          </div>

          <div className="sheet min-w-0 self-start">
            <div className="rule-b hidden grid-cols-[1fr_1fr_1fr] gap-4 px-6 py-3 sm:grid">
              <span className="eyebrow">Dimension</span>
              <span className="eyebrow">Wave 1 / Plain</span>
              <span className="eyebrow text-verdigris">Bastion Wave 2</span>
            </div>
            {DIFFERENCE.map(([label, plain, bastion]) => (
              <div
                key={label}
                className="rule-b grid gap-1.5 px-4 py-3.5 last:border-b-0 sm:grid-cols-[1fr_1fr_1fr] sm:gap-4 sm:px-6 sm:py-4"
              >
                <span className="eyebrow sm:font-sans sm:text-sm sm:tracking-normal sm:normal-case sm:text-ink-soft">
                  {label}
                </span>
                <span className="text-xs text-ink-faint sm:text-sm">
                  <span className="sm:hidden">Before: </span>
                  {plain}
                </span>
                <span className="text-sm font-medium text-ink">{bastion}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-ink/12 bg-paper-2/60 py-16 lg:py-24">
        <div className="shell">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="eyebrow">Milestones &amp; Goal Tiers</span>
              <h2 className="font-display mt-4 text-4xl tracking-[-0.01em] lg:text-5xl">
                Ten soulbound badges, drawn on-chain.
              </h2>
            </div>
            <Link to="/achievements" className="link-underline text-sm text-ink">
              Inspect badge gallery
            </Link>
          </div>

          <div className="mt-10">
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

      <section className="sheet-ink">
        <div className="shell flex flex-wrap items-center justify-between gap-8 py-14 lg:py-18">
          <div>
            <span className="eyebrow text-paper/55">Mezo Testnet · Emergency Pause Note</span>
            <h2 className="font-display mt-3 text-4xl tracking-[-0.01em] lg:text-5xl">
              Build your Bastion.
            </h2>
            <p className="mt-4 max-w-lg text-sm text-paper/65">
              Non-custodial bMUSD shares backed 1:1 in Mezo Stability Pool. An owner emergency
              killswitch (<span className="figure">setPaused</span>) can pause deposits and
              withdrawals during emergencies.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="border border-paper/25 px-7 py-3.5 text-sm font-medium transition-colors hover:bg-paper hover:text-ink"
          >
            Open Bastion dashboard
          </Link>
        </div>
      </section>
    </div>
  )
}

function SpecRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="rule-b grid grid-cols-[8rem_1fr] gap-4 px-5 py-3 last:border-b-0">
      <dt className="eyebrow">{label}</dt>
      <dd className="figure text-[13px] text-ink">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="text-verdigris underline">
            {value} ↗
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  )
}
