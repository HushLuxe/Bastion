// SPDX-License-Identifier: MIT
import { useState } from 'react'
import { erc20Abi } from 'viem'
import { useAccount, usePublicClient, useReadContract, useWriteContract } from 'wagmi'

import { bastionVaultAbi } from '../lib/abi'
import { MUSD_ADDRESS, VAULT_ADDRESS } from '../lib/contracts'
import { formatMusd, parseMusdInput } from '../lib/format'
import { useMusdBalance } from '../hooks/useBastion'
import { ArrowDownLeft, ArrowUpRight, CheckIcon } from './icons'

const QUICK = ['25', '50', '100', '250']

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

  const [amount, setAmount] = useState('50')
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
      setMessage({ tone: 'ok', text: `Deposited ${formatMusd(parsed)} MUSD into Bastion` })
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
      setMessage({ tone: 'ok', text: 'Position withdrawn — principal and yield returned' })
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
    <div className="panel-raised p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">Your position</h2>
        <span className="label-caps">MUSD vault</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Deposited" value={`${formatMusd(shares, 2)} MUSD`} />
        <Stat label="Yield accrued" value={`${formatMusd(pendingYield, 4)} MUSD`} accent />
      </div>

      <div className="mt-5">
        <label className="label-caps mb-2 block" htmlFor="bastion-amount">
          Amount to deposit
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
            className="input-field focus:input-field-focus pr-20 font-mono tabular-nums disabled:opacity-50"
            placeholder="0.0"
          />
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-bastion-muted">
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
              className="rounded-lg border border-bastion-line bg-bastion-stone-2 px-2.5 py-1 font-mono text-[11px] text-bastion-muted transition-colors hover:border-bastion-amber/40 hover:text-bastion-ink disabled:opacity-40"
            >
              {value}
            </button>
          ))}
          <span className="ml-auto font-mono text-[11px] text-bastion-muted">
            wallet {formatMusd(musdBalance, 2)} MUSD
          </span>
        </div>
      </div>

      {message && (
        <div
          className={`mt-4 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs ${
            message.tone === 'ok'
              ? 'border-bastion-green/35 bg-bastion-green/10 text-bastion-green'
              : 'border-bastion-red/35 bg-bastion-red/10 text-bastion-red'
          }`}
        >
          {message.tone === 'ok' && <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="mt-5 space-y-2.5">
        <button
          onClick={deposit}
          disabled={!isConnected || busy || parsed <= 0n}
          className="btn-amber btn-amber-hover flex w-full items-center justify-center gap-2 px-4 py-3 text-sm"
        >
          <ArrowDownLeft className="h-4 w-4" />
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
            className="btn-stone flex items-center justify-center gap-2 px-4 py-3 text-sm"
          >
            <ArrowUpRight className="h-4 w-4" />
            {status === 'withdrawing' ? 'Withdrawing…' : 'Withdraw all'}
          </button>
          <button
            onClick={claimYield}
            disabled={!isConnected || busy || pendingYield === 0n}
            className="btn-stone px-4 py-3 text-sm"
          >
            {status === 'claiming' ? 'Claiming…' : 'Claim yield'}
          </button>
        </div>
      </div>

      {needsApproval && parsed > 0n && isConnected && (
        <p className="mt-3 text-center text-[11px] text-bastion-muted">
          First transaction approves MUSD for the Bastion vault.
        </p>
      )}
    </div>
  )
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-bastion-line-soft bg-bastion-bg-2 px-4 py-3">
      <span className="label-caps block">{label}</span>
      <span
        className={`mt-1 block font-mono text-sm font-medium tabular-nums ${
          accent ? 'text-bastion-amber' : 'text-bastion-ink'
        }`}
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
