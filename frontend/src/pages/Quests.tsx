// SPDX-License-Identifier: MIT
import { useAccount } from 'wagmi'

import { MilestoneList } from '../components/MilestoneList'
import { useLeaderboard, useMilestones, useUserState, useVaultState } from '../hooks/useBastion'
import { EXPLORER_URL, LEVEL_NAMES } from '../lib/contracts'
import { formatMusd, shortAddress } from '../lib/format'

const QUEST_TIERS = [
  { level: 1, tier: 'Bronze', threshold: '25% goal funded', reward: 'Bronze Quest Badge (#7)', desc: 'Make your first commitment toward a named savings goal.' },
  { level: 2, tier: 'Silver', threshold: '50% goal funded', reward: 'Silver Quest Badge (#8)', desc: 'Cross the halfway mark of your MUSD target.' },
  { level: 3, tier: 'Gold', threshold: '75% goal funded', reward: 'Gold Quest Badge (#9)', desc: 'Three-quarters fortified inside the Mezo Stability Pool.' },
  { level: 4, tier: 'Vanguard', threshold: '100% goal complete', reward: 'Vanguard Badge (#10)', desc: 'Complete your savings goal and achieve top rank.' },
] as const

export function Quests() {
  const { address, isConnected } = useAccount()
  const vault = useVaultState()
  const user = useUserState(address)
  const { rows: leaderboard, isLoading: lbLoading } = useLeaderboard(25)

  const now = BigInt(Math.floor(Date.now() / 1000))
  const milestones = useMilestones(user, now)
  const earnedCount = milestones.filter((m) => m.earned).length

  return (
    <div className="shell py-14 lg:py-20">
      <header className="rule-b pb-8">
        <span className="eyebrow">Quests &amp; leaderboard · Mezo Testnet</span>
        <h1 className="font-display mt-3 text-4xl tracking-[-0.01em] lg:text-5xl">
          Levels &amp; on-chain standings
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Deposits into Bastion advance your quest tiers automatically and mint soulbound badges at
          25%, 50%, 75%, and 100% of any goal. Every ranking row below is read directly from{' '}
          <span className="figure">BastionVault.getLeaderboard()</span>.
        </p>
      </header>

      <div className="grid gap-10 pt-10 lg:grid-cols-[1fr_420px]">
        <div className="min-w-0 space-y-10">
          {/* Quest tiers */}
          <section>
            <div className="rule-b mb-4 flex items-baseline justify-between">
              <h2 className="eyebrow">Quest progression</h2>
              <span className="figure text-xs text-verdigris">
                {isConnected
                  ? `Level ${user.userLevel} · ${LEVEL_NAMES[user.userLevel] ?? 'Initiate'} (${earnedCount}/10 badges)`
                  : 'Connect wallet for your level'}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {QUEST_TIERS.map((q) => {
                const reached = isConnected && user.userLevel >= q.level
                return (
                  <div
                    key={q.tier}
                    className={`sheet p-5 ${reached ? 'border-verdigris/60' : 'opacity-85'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="eyebrow text-verdigris">Level {q.level} · {q.tier}</span>
                      <span
                        className={`figure text-[10px] tracking-[0.14em] uppercase ${
                          reached ? 'text-verdigris' : 'text-ink-faint'
                        }`}
                      >
                        {reached ? 'Unlocked' : q.threshold}
                      </span>
                    </div>
                    <h3 className="font-display mt-2 text-2xl text-ink">{q.reward}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-ink-soft">{q.desc}</p>
                  </div>
                )
              })}
            </div>
          </section>

          {/* All 10 on-chain quest milestones */}
          <section>
            <div className="rule-b mb-2 flex items-baseline justify-between">
              <h2 className="eyebrow">All milestone quests</h2>
              <span className="figure text-xs text-ink-faint">10 on-chain badges</span>
            </div>
            {isConnected ? (
              <MilestoneList milestones={milestones} />
            ) : (
              <p className="py-6 text-sm text-ink-soft">
                Connect your wallet to see live per-quest completion percentages.
              </p>
            )}
          </section>
        </div>

        {/* Live on-chain leaderboard */}
        <aside className="min-w-0 space-y-4">
          <section className="sheet">
            <header className="rule-b flex items-center justify-between px-5 py-3.5">
              <h2 className="eyebrow">On-chain saver leaderboard</h2>
              <span className="figure text-[11px] text-verdigris">
                TVL {formatMusd(vault.totalAssets, 2)} MUSD
              </span>
            </header>

            {lbLoading ? (
              <p className="px-5 py-6 text-xs text-ink-soft">Reading savers from Mezo Testnet…</p>
            ) : leaderboard.length === 0 ? (
              <p className="px-5 py-6 text-xs text-ink-soft">
                No active savers recorded yet. Make the first deposit on the Dashboard to claim #1.
              </p>
            ) : (
              <div className="divide-y divide-ink/10">
                {leaderboard.map((row, idx) => {
                  const isYou = address?.toLowerCase() === row.saver.toLowerCase()
                  return (
                    <div
                      key={row.saver}
                      className={`flex items-center justify-between gap-3 px-5 py-3.5 ${
                        isYou ? 'bg-verdigris-wash' : ''
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="figure w-5 text-xs text-ink-faint">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <a
                              href={`${EXPLORER_URL}/address/${row.saver}`}
                              target="_blank"
                              rel="noreferrer"
                              className="figure truncate text-xs font-medium text-ink hover:text-verdigris"
                            >
                              {shortAddress(row.saver)}
                            </a>
                            {isYou && (
                              <span className="figure bg-verdigris px-1.5 py-0.5 text-[9px] text-paper uppercase">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-ink-soft">
                            Lvl {row.level} ({LEVEL_NAMES[row.level] ?? 'Initiate'}) ·{' '}
                            {row.badgeCount.toString()} badges
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="figure text-xs font-medium text-ink">
                          {formatMusd(row.shares, 2)} bMUSD
                        </div>
                        <div className="figure text-[10px] text-verdigris">
                          {formatMusd(row.yieldEarned, 4)} yield
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
