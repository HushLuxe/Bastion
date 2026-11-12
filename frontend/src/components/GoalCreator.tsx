// SPDX-License-Identifier: MIT
import { useState } from 'react'
import { useAccount, usePublicClient, useWriteContract } from 'wagmi'

import type { GoalItem } from '../hooks/useBastion'
import { bastionVaultAbi } from '../lib/abi'
import { EXPLORER_URL, GOAL_DURATION_PRESETS, VAULT_ADDRESS } from '../lib/contracts'
import { formatDate, formatMusd, parseMusdInput } from '../lib/format'

export function GoalCreator({
  goals,
  activeGoalId,
  paused,
  onMutated,
}: {
  goals: GoalItem[]
  activeGoalId: bigint
  paused: boolean
  onMutated?: () => void
}) {
  const { isConnected } = useAccount()
  const publicClient = usePublicClient()
  const writeContract = useWriteContract()

  const [openForm, setOpenForm] = useState(goals.length === 0)
  const [name, setName] = useState('')
  const [target, setTarget] = useState('50')
  const [durationDays, setDurationDays] = useState<number>(30)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string; txHash?: string } | null>(null)

  const parsedTarget = parseMusdInput(target)

  async function handleCreateGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!publicClient || !name.trim() || parsedTarget <= 0n) return
    setBusy(true)
    setNotice(null)
    try {
      const hash = await writeContract.writeContractAsync({
        address: VAULT_ADDRESS,
        abi: bastionVaultAbi,
        functionName: 'createGoal',
        args: [name.trim(), parsedTarget, BigInt(durationDays)],
      })
      await publicClient.waitForTransactionReceipt({ hash })
      setName('')
      setOpenForm(false)
      setNotice({ tone: 'ok', text: 'Savings goal created on-chain.', txHash: hash })
      onMutated?.()
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message.split('\n')[0].slice(0, 140) : String(error),
      })
    } finally {
      setBusy(false)
    }
  }

  async function handleSetActive(goalId: number) {
    if (!publicClient) return
    setBusy(true)
    setNotice(null)
    try {
      const hash = await writeContract.writeContractAsync({
        address: VAULT_ADDRESS,
        abi: bastionVaultAbi,
        functionName: 'setActiveGoal',
        args: [BigInt(goalId)],
      })
      await publicClient.waitForTransactionReceipt({ hash })
      setNotice({ tone: 'ok', text: `Goal #${goalId + 1} set as active deposit target.`, txHash: hash })
      onMutated?.()
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message.split('\n')[0].slice(0, 140) : String(error),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="rule-b flex flex-wrap items-center justify-between gap-3 pb-2">
        <div>
          <h2 className="eyebrow">Savings goals</h2>
          <p className="mt-1 text-xs text-ink-soft">
            Hit 25%, 50%, 75%, and 100% of any goal to mint Bronze, Silver, Gold, and Vanguard soulbound NFTs.
          </p>
        </div>
        {isConnected && (
          <button
            type="button"
            onClick={() => setOpenForm((v) => !v)}
            className="btn-outline px-3 py-1.5 text-xs"
          >
            {openForm ? 'Close form' : '+ New goal'}
          </button>
        )}
      </div>

      {notice && (
        <div
          className={`border-l-2 px-3 py-2 text-xs ${
            notice.tone === 'ok'
              ? 'border-verdigris bg-verdigris-wash text-verdigris-deep'
              : 'border-clay bg-clay/8 text-clay'
          }`}
        >
          <span>{notice.text}</span>
          {notice.txHash && (
            <a
              href={`${EXPLORER_URL}/tx/${notice.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="figure ml-2 underline"
            >
              View tx ↗
            </a>
          )}
        </div>
      )}

      {isConnected && openForm && (
        <form onSubmit={handleCreateGoal} className="sheet space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="eyebrow mb-1.5 block" htmlFor="goal-name">
                Goal name
              </label>
              <input
                id="goal-name"
                type="text"
                maxLength={48}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy || paused}
                placeholder="e.g. BTC Halving Buffer"
                className="input-field text-sm"
              />
            </div>

            <div>
              <label className="eyebrow mb-1.5 block" htmlFor="goal-target">
                Target (MUSD)
              </label>
              <input
                id="goal-target"
                type="number"
                min="1"
                step="1"
                required
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                disabled={busy || paused}
                className="input-field text-sm"
              />
            </div>
          </div>

          <div>
            <span className="eyebrow mb-1.5 block">Duration preset</span>
            <div className="flex flex-wrap gap-2">
              {GOAL_DURATION_PRESETS.map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setDurationDays(days)}
                  disabled={busy}
                  className={`figure border px-3 py-1.5 text-xs transition-colors ${
                    durationDays === days
                      ? 'border-verdigris bg-verdigris text-paper'
                      : 'border-ink/20 bg-paper text-ink-soft hover:border-verdigris'
                  }`}
                >
                  {days} days
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={busy || paused || !name.trim() || parsedTarget <= 0n}
              className="btn-ink px-5 py-2.5 text-xs"
            >
              {busy ? 'Creating on-chain…' : 'Create savings goal'}
            </button>
          </div>
        </form>
      )}

      {!isConnected ? (
        <p className="py-4 text-sm text-ink-soft">
          Connect a wallet to create savings goals or route deposits toward a target.
        </p>
      ) : goals.length === 0 ? (
        <div className="sheet border-l-2 border-verdigris px-5 py-5">
          <p className="font-display text-xl text-ink">
            Every great adventure begins with a single step. Start yours.
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            Create your first MUSD savings goal above — deposits fund your goal automatically and unlock Bronze, Silver, Gold, and Vanguard tiers.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {goals.map((g) => {
            const isActive = BigInt(g.id) === activeGoalId
            return (
              <div
                key={g.id}
                className={`sheet p-4 transition-colors ${
                  isActive ? 'border-verdigris/60 bg-paper-2' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="figure text-[10px] tracking-[0.16em] text-ink-faint uppercase">
                      Goal #{g.id + 1} · {g.durationDays.toString()}d · ends {formatDate(g.deadline)}
                    </span>
                    <h3 className="mt-0.5 truncate text-base font-medium text-ink">{g.name}</h3>
                  </div>
                  {g.completed ? (
                    <span className="figure shrink-0 border border-verdigris/40 bg-verdigris-wash px-2 py-0.5 text-[10px] text-verdigris uppercase">
                      Completed
                    </span>
                  ) : isActive ? (
                    <span className="figure shrink-0 border border-ink/25 px-2 py-0.5 text-[10px] text-ink uppercase">
                      Active
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleSetActive(g.id)}
                      className="figure shrink-0 border border-ink/20 px-2 py-0.5 text-[10px] text-ink-soft hover:border-verdigris hover:text-verdigris uppercase"
                    >
                      Set active
                    </button>
                  )}
                </div>

                <div className="mt-3 flex items-baseline justify-between gap-2 text-xs">
                  <span className="figure text-ink">
                    {formatMusd(g.savedAmount, 2)} / {formatMusd(g.targetAmount, 2)} MUSD
                  </span>
                  <span className="figure font-medium text-verdigris">{g.progressPct}%</span>
                </div>

                <div className="mt-2 h-[5px] w-full bg-ink/10">
                  <div
                    className="h-full bg-verdigris transition-all duration-700"
                    style={{ width: `${Math.max(g.progressPct, g.savedAmount > 0n ? 2 : 0)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
