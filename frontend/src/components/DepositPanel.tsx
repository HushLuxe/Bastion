// SPDX-License-Identifier: MIT
import { useState } from 'react'
import { erc20Abi } from 'viem'
import { useAccount, usePublicClient, useReadContract, useWriteContract } from 'wagmi'

import { bastionVaultAbi } from '../lib/abi'
import { MUSD_ADDRESS, VAULT_ADDRESS } from '../lib/contracts'
import { formatMusd, parseMusdInput } from '../lib/format'
import { useMusdBalance } from '../hooks/useBastion'

const QUICK = ['5', '10', '25', '50']

export function DepositPanel({
  shares,
  pendingYield,
}: {
  shares: bigint
  pendingYield: bigint
}) {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const musdBalance = useMusdBalance(address)

  const [amount, setAmount] = useState('10')
  const [status, setStatus] = useState<'idle' | 'approving' | 'depositing' | 'withdrawing' | 'claiming'>('idle')
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  const parsed = parseMusdInput(amount)

  const { data: allowance } = useReadContract({
    address: MUSD_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, VAULT_ADDRESS] : undefined,
    query: { enabled: Boolean(address) },
  })

  const approveWrite = useWriteContract()
  const vaultWrite = useWriteContract()

  const busy = status !== 'idle'
  const needsApproval = (allowance ?? 0n) < parsed

  async function deposit() {
    if (!address || !publicClient) return
    setMessage(null)
    try {
      if (needsApproval) {
        setStatus('approving')
        const hash = await approveWrite.writeContractAsync({
          address: MUSD_ADDRESS,
          abi: erc20Abi,
          functionName: 'approve',
          args: [VAULT_ADDRESS, parsed],
        })
        await publicClient.waitForTransactionReceipt({ hash })
      }
      setStatus('depositing')
      const hash = await vaultWrite.writeContractAsync({
        address: VAULT_ADDRESS,
        abi: bastionVaultAbi,
        functionName: 'deposit',
        args: [parsed],
      })
      await publicClient.waitForTransactionReceipt({ hash })
      setStatus('idle')
      setMessage({ tone: 'ok', text: `Deposited ${formatMusd(parsed)} MUSD` })
    } catch (error) {
      setStatus('idle')
      setMessage({ tone: 'error', text: shortenError(error) })
    }
  }

  async function withdrawAll() {
    if (!publicClient) return
    setMessage(null)
    try {
      setStatus('withdrawing')
      const hash = await vaultWrite.writeContractAsync({
        address: VAULT_ADDRESS,
        abi: bastionVaultAbi,
        functionName: 'withdrawAll',
      })
      await publicClient.waitForTransactionReceipt({ hash })
      setStatus('idle')
      setMessage({ tone: 'ok', text: 'Principal and yield returned' })
    } catch (error) {
      setStatus('idle')
      setMessage({ tone: 'error', text: shortenError(error) })
    }
  }

  async function claimYield() {
    if (!publicClient) return
    setMessage(null)
    try {
      setStatus('claiming')
      const hash = await vaultWrite.writeContractAsync({
        address: VAULT_ADDRESS,
        abi: bastionVaultAbi,
        functionName: 'claimYield',
      })
      await publicClient.waitForTransactionReceipt({ hash })
      setStatus('idle')
      setMessage({ tone: 'ok', text: 'Yield claimed' })
    } catch (error) {
      setStatus('idle')
      setMessage({ tone: 'error', text: shortenError(error) })
    }
  }

  return (
    <section className="sheet">
      <header className="rule-b flex items-center justify-between px-6 py-4">
        <h2 className="eyebrow">Deposit</h2>
        <span className="figure text-xs text-ink-soft">MUSD → bMUSD 1:1</span>
      </header>

      <div className="space-y-5 px-6 py-5">
        <div className="grid grid-cols-2 gap-px bg-ink/12">
          <Cell label="Position" value={`${formatMusd(shares, 2)} MUSD`} />
          <Cell label="Yield accrued" value={`${formatMusd(pendingYield, 4)} MUSD`} accent />
        </div>

        <div>
          <label className="eyebrow mb-2 block" htmlFor="bastion-amount">
            Amount
          </label>
          <div className="relative">
            <input
              id="bastion-amount"
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={!isConnected || busy}
              className="input-field focus:input-field-focus pr-20 disabled:opacity-50"
              placeholder="0.0"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-soft">
              MUSD
            </span>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {QUICK.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAmount(value)}
                disabled={!isConnected || busy}
                className="figure border border-ink/15 bg-paper px-2.5 py-1 text-[11px] text-ink-soft transition-colors hover:border-verdigris hover:text-verdigris disabled:opacity-40"
              >
                {value}
              </button>
            ))}
            <span className="figure ml-auto text-[11px] text-ink-faint">
              wallet {formatMusd(musdBalance, 2)}
            </span>
          </div>
        </div>

        {message && (
          <div
            className={`border-l-2 px-3 py-2 text-xs ${
              message.tone === 'ok'
                ? 'border-verdigris bg-verdigris-wash text-verdigris-deep'
                : 'border-clay bg-clay/8 text-clay'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-2.5">
          <button
            onClick={deposit}
            disabled={!isConnected || busy || parsed <= 0n}
            className="btn-ink w-full px-4 py-3 text-sm"
          >
            {!isConnected
              ? 'Connect wallet to deposit'
              : status === 'approving'
                ? 'Approving MUSD…'
                : status === 'depositing'
                  ? 'Depositing…'
                  : `Deposit ${formatMusd(parsed)} MUSD`}
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={withdrawAll}
              disabled={!isConnected || busy || shares === 0n}
              className="btn-outline px-4 py-3 text-sm"
            >
              {status === 'withdrawing' ? 'Withdrawing…' : 'Withdraw all'}
            </button>
            <button
              onClick={claimYield}
              disabled={!isConnected || busy || pendingYield === 0n}
              className="btn-outline px-4 py-3 text-sm"
            >
              {status === 'claiming' ? 'Claiming…' : 'Claim yield'}
            </button>
          </div>
        </div>

        {needsApproval && parsed > 0n && isConnected && (
          <p className="text-center text-[11px] text-ink-faint">
            The first transaction approves MUSD for the Bastion vault.
          </p>
        )}
      </div>
    </section>
  )
}

function Cell({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-paper-2 px-4 py-3">
      <span className="eyebrow block">{label}</span>
      <span
        className={`figure mt-1 block text-sm font-medium ${accent ? 'text-verdigris' : 'text-ink'}`}
      >
        {value}
      </span>
    </div>
  )
}

function shortenError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('User rejected')) return 'Transaction rejected'
  if (message.includes('insufficient allowance')) return 'MUSD approval failed'
  if (message.includes('insufficient balance')) return 'Not enough MUSD'
  if (message.includes('VaultPaused')) return 'The vault is paused'
  if (message.includes('InsufficientShares')) return 'No shares to withdraw'
  return message.split('\n')[0].slice(0, 150)
}
