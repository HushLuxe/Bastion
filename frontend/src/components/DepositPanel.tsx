// SPDX-License-Identifier: MIT
import { useState } from 'react'
import { erc20Abi, isAddress } from 'viem'
import { useAccount, usePublicClient, useReadContract, useWriteContract } from 'wagmi'

import type { GoalItem } from '../hooks/useBastion'
import { useMusdBalance } from '../hooks/useBastion'
import { bastionReceiptAbi, bastionVaultAbi } from '../lib/abi'
import { triggerConfetti } from '../lib/confetti'
import {
  BORROWER_OPERATIONS_ADDRESS,
  EXPLORER_URL,
  MUSD_ADDRESS,
  RECEIPT_ADDRESS,
  VAULT_ADDRESS,
} from '../lib/contracts'
import { formatMusd, parseMusdInput } from '../lib/format'

const QUICK = ['5', '10', '25', '50']

export function DepositPanel({
  shares,
  receiptBalance,
  pendingYield,
  pendingCollateralGain,
  paused,
  goals,
  activeGoalId,
  onMutated,
}: {
  shares: bigint
  receiptBalance: bigint
  pendingYield: bigint
  pendingCollateralGain: bigint
  paused: boolean
  goals: GoalItem[]
  activeGoalId: bigint
  onMutated?: () => void
}) {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { balance: musdBalance, refetch: refetchMusd } = useMusdBalance(address)

  const [tab, setTab] = useState<'deposit' | 'withdraw' | 'transfer'>('deposit')
  const [amount, setAmount] = useState('10')
  const [selectedGoalId, setSelectedGoalId] = useState<string>('active')
  const [redeemAmount, setRedeemAmount] = useState('5')
  const [recipient, setRecipient] = useState('')
  const [transferAmount, setTransferAmount] = useState('5')
  const [showObtainGuide, setShowObtainGuide] = useState(false)
  const [status, setStatus] = useState<
    'idle' | 'approving' | 'depositing' | 'withdrawing' | 'redeeming' | 'claiming' | 'harvesting' | 'transferring'
  >('idle')
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string; txHash?: string } | null>(null)

  const parsedDeposit = parseMusdInput(amount)
  const parsedRedeem = parseMusdInput(redeemAmount)
  const parsedTransfer = parseMusdInput(transferAmount)

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: MUSD_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, VAULT_ADDRESS] : undefined,
    query: { enabled: Boolean(address) },
  })

  const approveWrite = useWriteContract()
  const vaultWrite = useWriteContract()

  const busy = status !== 'idle'
  const needsApproval = (allowance ?? 0n) < parsedDeposit

  function afterSuccess(text: string, txHash: string, celebrate = false) {
    setStatus('idle')
    setMessage({ tone: 'ok', text, txHash })
    void refetchMusd()
    void refetchAllowance()
    onMutated?.()
    if (celebrate) triggerConfetti()
  }

  async function deposit() {
    if (!address || !publicClient || parsedDeposit <= 0n) return
    setMessage(null)
    try {
      if (needsApproval) {
        setStatus('approving')
        const hash = await approveWrite.writeContractAsync({
          address: MUSD_ADDRESS,
          abi: erc20Abi,
          functionName: 'approve',
          args: [VAULT_ADDRESS, parsedDeposit],
        })
        await publicClient.waitForTransactionReceipt({ hash })
      }
      setStatus('depositing')
      let hash: `0x${string}`
      if (goals.length > 0) {
        const goalId = selectedGoalId === 'active' ? activeGoalId : BigInt(selectedGoalId)
        hash = await vaultWrite.writeContractAsync({
          address: VAULT_ADDRESS,
          abi: bastionVaultAbi,
          functionName: 'depositToGoal',
          args: [goalId, parsedDeposit],
        })
      } else {
        hash = await vaultWrite.writeContractAsync({
          address: VAULT_ADDRESS,
          abi: bastionVaultAbi,
          functionName: 'deposit',
          args: [parsedDeposit],
        })
      }
      await publicClient.waitForTransactionReceipt({ hash })
      afterSuccess(`Deposited ${formatMusd(parsedDeposit)} MUSD into Stability Pool`, hash, true)
    } catch (error) {
      setStatus('idle')
      setMessage({ tone: 'error', text: shortenError(error) })
    }
  }

  async function redeemPartial() {
    if (!publicClient || parsedRedeem <= 0n) return
    setMessage(null)
    try {
      setStatus('redeeming')
      const hash = await vaultWrite.writeContractAsync({
        address: VAULT_ADDRESS,
        abi: bastionVaultAbi,
        functionName: 'redeem',
        args: [parsedRedeem],
      })
      await publicClient.waitForTransactionReceipt({ hash })
      afterSuccess(`Redeemed ${formatMusd(parsedRedeem)} bMUSD to canonical MUSD`, hash)
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
      afterSuccess('Full principal and yield returned from Stability Pool', hash)
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
      afterSuccess('Accrued Stability Pool yield claimed', hash, true)
    } catch (error) {
      setStatus('idle')
      setMessage({ tone: 'error', text: shortenError(error) })
    }
  }

  async function harvestYield() {
    if (!publicClient) return
    setMessage(null)
    try {
      setStatus('harvesting')
      const hash = await vaultWrite.writeContractAsync({
        address: VAULT_ADDRESS,
        abi: bastionVaultAbi,
        functionName: 'harvest',
        args: [0n],
      })
      await publicClient.waitForTransactionReceipt({ hash })
      afterSuccess('Harvested Stability Pool BTC gains via Mezo Router', hash, true)
    } catch (error) {
      setStatus('idle')
      setMessage({ tone: 'error', text: shortenError(error) })
    }
  }

  async function transferBmUsd() {
    if (!publicClient || !isAddress(recipient) || parsedTransfer <= 0n) return
    setMessage(null)
    try {
      setStatus('transferring')
      const hash = await vaultWrite.writeContractAsync({
        address: RECEIPT_ADDRESS,
        abi: bastionReceiptAbi,
        functionName: 'transfer',
        args: [recipient, parsedTransfer],
      })
      await publicClient.waitForTransactionReceipt({ hash })
      afterSuccess(`Transferred ${formatMusd(parsedTransfer)} redeemable bMUSD`, hash)
    } catch (error) {
      setStatus('idle')
      setMessage({ tone: 'error', text: shortenError(error) })
    }
  }

  return (
    <section className="sheet">
      <header className="rule-b flex items-center justify-between px-5 py-3.5">
        <div className="flex gap-3">
          {(['deposit', 'withdraw', 'transfer'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`eyebrow pb-0.5 transition-colors ${
                tab === t ? 'border-b border-verdigris text-verdigris' : 'text-ink-faint hover:text-ink'
              }`}
            >
              {t === 'withdraw' ? 'Withdraw / Redeem' : t === 'transfer' ? 'bMUSD' : 'Deposit'}
            </button>
          ))}
        </div>
        <span className="figure text-[11px] text-ink-soft">1:1 bMUSD</span>
      </header>

      <div className="space-y-4 px-5 py-5">
        {paused && (
          <div className="border-l-2 border-clay bg-clay/10 px-3 py-2 text-xs text-clay">
            Emergency killswitch active (`paused = true`): deposits, redemptions, and withdrawals are temporarily halted by the vault owner.
          </div>
        )}

        <div className="grid grid-cols-2 gap-px bg-ink/12">
          <Cell label="Redeemable bMUSD" value={`${formatMusd(receiptBalance, 2)} MUSD`} />
          <Cell label="Claimable yield" value={`${formatMusd(pendingYield, 4)} MUSD`} accent />
        </div>

        {tab === 'deposit' && (
          <div className="space-y-4">
            {goals.length > 0 && (
              <div>
                <label className="eyebrow mb-1.5 block" htmlFor="bastion-goal">
                  Savings goal target
                </label>
                <select
                  id="bastion-goal"
                  value={selectedGoalId}
                  onChange={(e) => setSelectedGoalId(e.target.value)}
                  disabled={!isConnected || busy || paused}
                  className="input-field py-2 text-xs"
                >
                  <option value="active">
                    Active goal (#{Number(activeGoalId) + 1}: {goals[Number(activeGoalId)]?.name ?? 'Default'})
                  </option>
                  {goals.map((g) => (
                    <option key={g.id} value={String(g.id)}>
                      #{g.id + 1} · {g.name} ({g.progressPct}%)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="eyebrow mb-1.5 block" htmlFor="bastion-amount">
                Amount (MUSD)
              </label>
              <div className="relative">
                <input
                  id="bastion-amount"
                  type="number"
                  min="0"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={!isConnected || busy || paused}
                  className="input-field focus:input-field-focus pr-16 disabled:opacity-50"
                  placeholder="0.0"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-soft">
                  MUSD
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
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

            <button
              onClick={deposit}
              disabled={!isConnected || busy || paused || parsedDeposit <= 0n || parsedDeposit > musdBalance}
              className="btn-ink w-full px-4 py-3 text-sm"
            >
              {!isConnected
                ? 'Connect wallet to deposit'
                : paused
                  ? 'Vault paused'
                  : status === 'approving'
                    ? 'Approving MUSD…'
                    : status === 'depositing'
                      ? 'Routing to Stability Pool…'
                      : parsedDeposit > musdBalance
                        ? 'Insufficient MUSD balance'
                        : `Deposit ${formatMusd(parsedDeposit)} MUSD`}
            </button>

            <div className="border-t border-ink/10 pt-3">
              <button
                type="button"
                onClick={() => setShowObtainGuide((v) => !v)}
                className="figure text-[11px] text-verdigris underline"
              >
                {showObtainGuide ? 'Hide testnet MUSD guide' : 'Need testnet MUSD? View Mezo CDP guide'}
              </button>
              {showObtainGuide && (
                <div className="mt-2 space-y-1.5 bg-paper p-3 text-[11px] leading-relaxed text-ink-soft">
                  <p>
                    Canonical MUSD (<span className="figure">{MUSD_ADDRESS.slice(0, 10)}…</span>) is borrowed via a BTC trove, not dropped by a token faucet:
                  </p>
                  <p>
                    1. Claim testnet BTC gas at{' '}
                    <a href="https://faucet.test.mezo.org" target="_blank" rel="noreferrer" className="text-verdigris underline">
                      faucet.test.mezo.org
                    </a>
                    .
                  </p>
                  <p>
                    2. Open a BTC trove / mint MUSD on Mezo Borrow (<span className="figure">BorrowerOperations {BORROWER_OPERATIONS_ADDRESS.slice(0, 10)}…</span>).
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'withdraw' && (
          <div className="space-y-4">
            <div>
              <label className="eyebrow mb-1.5 block" htmlFor="bastion-redeem">
                Redeem partial bMUSD
              </label>
              <div className="flex gap-2">
                <input
                  id="bastion-redeem"
                  type="number"
                  min="0"
                  step="1"
                  value={redeemAmount}
                  onChange={(e) => setRedeemAmount(e.target.value)}
                  disabled={!isConnected || busy || paused}
                  className="input-field py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() =>
                    setRedeemAmount((Number(receiptBalance) / 1e18).toFixed(2))
                  }
                  disabled={!isConnected || busy || receiptBalance === 0n}
                  className="btn-outline shrink-0 px-3 py-2 text-xs"
                >
                  Max
                </button>
              </div>
              <p className="mt-1 text-[11px] text-ink-faint">
                Works for both directly deposited shares and transferred bMUSD receipts.
              </p>
            </div>

            <button
              onClick={redeemPartial}
              disabled={!isConnected || busy || paused || parsedRedeem <= 0n || parsedRedeem > receiptBalance}
              className="btn-ink w-full px-4 py-2.5 text-sm"
            >
              {status === 'redeeming' ? 'Redeeming…' : `Redeem ${formatMusd(parsedRedeem)} bMUSD`}
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={withdrawAll}
                disabled={!isConnected || busy || paused || receiptBalance === 0n}
                className="btn-outline px-3 py-2.5 text-xs"
              >
                {status === 'withdrawing' ? 'Withdrawing…' : 'Withdraw all'}
              </button>
              <button
                onClick={claimYield}
                disabled={!isConnected || busy || paused || pendingYield === 0n}
                className="btn-outline px-3 py-2.5 text-xs"
              >
                {status === 'claiming' ? 'Claiming…' : 'Claim yield'}
              </button>
            </div>

            <button
              onClick={harvestYield}
              disabled={!isConnected || busy || paused || pendingCollateralGain === 0n}
              className="btn-outline w-full px-3 py-2 text-xs"
            >
              {status === 'harvesting'
                ? 'Swapping BTC gain → MUSD…'
                : pendingCollateralGain > 0n
                  ? 'Harvest Stability Pool BTC gains → MUSD'
                  : 'No BTC collateral gains queued to harvest'}
            </button>
          </div>
        )}

        {tab === 'transfer' && (
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-ink-soft">
              <span className="figure font-medium text-ink">bMUSD</span> receipt tokens are freely transferable ERC-20s. Recipients accrue yield from transfer time and can redeem transferred <span className="figure">bMUSD</span> 1:1 for MUSD in this vault.
            </p>
            <div>
              <label className="eyebrow mb-1.5 block" htmlFor="bmUSD-recipient">
                Recipient address
              </label>
              <input
                id="bmUSD-recipient"
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value.trim())}
                placeholder="0x..."
                disabled={!isConnected || busy}
                className="input-field py-2 text-xs"
              />
            </div>
            <div>
              <label className="eyebrow mb-1.5 block" htmlFor="bmUSD-transfer">
                Amount (bMUSD)
              </label>
              <input
                id="bmUSD-transfer"
                type="number"
                min="0"
                step="1"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                disabled={!isConnected || busy}
                className="input-field py-2 text-sm"
              />
            </div>
            <button
              onClick={transferBmUsd}
              disabled={
                !isConnected ||
                busy ||
                !isAddress(recipient) ||
                parsedTransfer <= 0n ||
                parsedTransfer > receiptBalance ||
                shares === 0n && receiptBalance === 0n
              }
              className="btn-ink w-full px-4 py-2.5 text-sm"
            >
              {status === 'transferring' ? 'Transferring bMUSD…' : `Send ${formatMusd(parsedTransfer)} bMUSD`}
            </button>
          </div>
        )}

        {message && (
          <div
            className={`border-l-2 px-3 py-2 text-xs ${
              message.tone === 'ok'
                ? 'border-verdigris bg-verdigris-wash text-verdigris-deep'
                : 'border-clay bg-clay/8 text-clay'
            }`}
          >
            <span>{message.text}</span>
            {message.txHash && (
              <a
                href={`${EXPLORER_URL}/tx/${message.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="figure ml-2 underline"
              >
                Explorer ↗
              </a>
            )}
          </div>
        )}

        <p className="border-t border-ink/10 pt-3 text-[11px] leading-relaxed text-ink-faint">
          Note: The vault includes an owner emergency killswitch (`setPaused`). When paused, withdrawals and deposits are disabled until resumed; normal withdrawals also require no active undercollateralized troves in Mezo Stability Pool.
        </p>
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
  if (message.includes('User rejected')) return 'Transaction rejected in wallet'
  if (message.includes('insufficient allowance')) return 'MUSD approval required or insufficient'
  if (message.includes('insufficient balance')) return 'Insufficient MUSD or bMUSD balance'
  if (message.includes('VaultPaused')) return 'Vault is currently paused by the owner killswitch'
  if (message.includes('InsufficientShares')) return 'Not enough bMUSD shares to redeem'
  return message.split('\n')[0].slice(0, 150)
}
