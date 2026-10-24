# AGENTS.md — Bastion Project Handoff

> **Read this file first.** It contains everything needed to pick up where the
> previous session left off.

## Project: Bastion

Bastion is a **gamified MUSD savings product on Mezo Testnet** (Track 1 — DeFi).
Users deposit MUSD into a vault, earn yield, and unlock **ERC-721 achievement badges**
as they hit savings milestones. The differentiation against a plain yield vault is the
visible progression system: every deposit moves a progress bar, and milestones mint
collectible on-chain NFT artwork.

**Track:** Track 1 – DeFi · **Chain:** Mezo Testnet (chain id `31611`) · **Asset:** MUSD

---

## Workspace

- **Repo root:** `/home/maryjane/Desktop/workspace/job/HushLuxe/Bastion`
- **Git:** initialised on `main`, remote `origin` → `git@github.com:Ryjen1/Bastion.git`
- **Commit identity (repo-local):** `Maryjane Okafor <114498519+Ryjen1@users.noreply.github.com>`
  so commits link to the GitHub account `Ryjen1`
- **Note:** the parent folder `HushLuxe/` contains unrelated projects — keep this repo
  scoped to `HushLuxe/Bastion/` only

## Environment

- Foundry at `/home/maryjane/.foundry/bin` (add to PATH), Node v24, npm 11, Vercel CLI
  logged in, `gh` authenticated as `Ryjen1`
- No OpenZeppelin dependency: ERC-20 / ERC-721 are hand-rolled in `contracts/src/`
- Browser checks: Playwright Core is **not** installed in this repo. A working copy lives
  in `/tmp/opencode` (`npm i playwright-core`); Chromium is at
  `~/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome`

## Mezo Testnet reference (verified on-chain)

| Parameter | Value |
|-----------|-------|
| Chain ID | `31611` (`0x7b7b`) |
| RPC | `https://rpc.test.mezo.org` |
| Explorer | `https://explorer.test.mezo.org` |
| Native coin | Bitcoin (BTC), 18 decimals |
| **MUSD** | `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` (18 decimals) |
| Faucet (BTC + MEZO) | `https://faucet.test.mezo.org/` — asks for a `0x…` address |
| BorrowerOperations | `0xCdF7028ceAB81fA0C6971208e83fa7872994beE5` |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` |
| Wallet SDK | `@mezo-org/passport` (RainbowKit + wagmi) |

**Getting MUSD on testnet (important):** MUSD is a CDP stablecoin, not a faucet drop.
Faucet BTC → open a trove through `BorrowerOperations` → borrow MUSD.
Known parameters: `minNetDebt = 1800 MUSD`, `MCR = 110%`, BTC oracle ≈ **80,515 USD**.
`openTrove(uint256 debt, address upperHint, address lowerHint)` is payable with BTC.

### Funds available (as of handoff)

The **Annex** deployer key at `~/.annex/deployer.key`
(`0xac89fFA908D0bD7A9EE78DfAd4b40362d9971b15`) holds ≈ **275 MUSD** and ≈ **0.005 BTC**
(it borrowed 3,000 MUSD against a 0.045 BTC trove, then spent most of it on the Annex
demo). To bootstrap Bastion: create a **new** deployer key, send it MUSD + a little BTC
from the Annex deployer, and use that key for Bastion only.

---

## Current state

### Done
- Repo scaffold: `contracts/` (Foundry), `frontend/` (Vite + React 18 + TS), `docs/`,
  GitHub Actions CI, `.gitignore`
- `BastionReceipt.sol` — ERC-20 receipt token (`bMUSD`), 1:1 with deposits
- `BastionAchievements.sol` — ERC-721 badges, on-chain SVG `tokenURI`, one badge per
  holder per type, vault-only minting
- `BastionVault.sol` — deposit / withdraw, share accounting, yield index, milestone
  checks (in progress — see below)

### Not done (priority order)
1. **Finish `BastionVault.sol` + tests** (yield accrual model, milestone triggers,
   invariants, reentrancy guard)
2. **Deploy to Mezo Testnet** against canonical MUSD
3. **Frontend**: premium dark dashboard, deposit/withdraw flows, progress bars,
   achievement gallery
4. **Deploy frontend** to Vercel, verify against live contracts
5. **Assets + pitch deck + demo video + submission copy**
6. **Public repo** `Ryjen1/Bastion` + push

---

## Contract architecture (as designed)

### Yield model (simulated, configurable — allowed for Wave 1)

- The vault holds MUSD. Deposits mint receipt shares 1:1.
- A global reward index `accruedPerShare` (wad) advances by
  `ratePerSecond * elapsedSeconds`. The owner sets `ratePerSecond` with `setRate()`.
- `pendingYield(user) = shares * (accruedPerShare - user.yieldDebt) / 1e18`
- Yield is paid from the vault's MUSD buffer (owner funds it with `fundYield()`), so
  payouts are capped by the buffer and can never make the vault insolvent.
- `totalAssets = MUSD balance`; liabilities = principal + accrued-but-unpaid yield.
- A realistic default (8% APR) is invisible in a 2-minute demo, so the demo run uses a
  clearly-labelled **demo rate** (e.g. `0.01% per second`). The UI must label it as a
  demo rate — never present a fake APR as real yield.

### Milestones (6, one badge each)

| id | Badge | Condition |
|----|-------|-----------|
| 0 | First Deposit | lifetime deposits > 0 |
| 1 | Saved 100 MUSD | lifetime deposits ≥ 100 MUSD |
| 2 | Saved 500 MUSD | lifetime deposits ≥ 500 MUSD |
| 3 | Held for 7 Days | `block.timestamp - firstDepositAt ≥ 7 days` |
| 4 | Held for 30 Days | `≥ 30 days` |
| 5 | Earned 10 MUSD in Yield | lifetime yield paid ≥ 10 MUSD |

The vault checks milestones after every state change and calls
`achievements.mintBadge(user, badgeId)`; the badge contract enforces one per holder.

### Rules

1. Name is **Bastion**. Taglines: "Fortify your MUSD", "Savings with strength",
   "Build your Bastion".
2. **Never** mention, link, credit or reference any other savings/vault/gamification
   project (including the internal inspiration repo) anywhere — code, comments, README,
   docs, deck, video, commit messages.
3. MUSD only as the asset; gas in BTC; no backend, no database, no off-chain services.
4. No external project names in the public repo (same rule the Annex project follows).
5. **Do NOT commit unless the user explicitly asks.** Work stays on disk.
6. After finishing a task: update `PLAN.md`, then run `forge build`, `forge test`,
   `npm run build`.

---

## Quick start

```bash
cd /home/maryjane/Desktop/workspace/job/HushLuxe/Bastion

# contracts
cd contracts && forge build && forge test -vvv

# frontend
cd ../frontend && npm install && npm run build

# deploy (once funded)
export PRIVATE_KEY=0x...           # Bastion deployer
export RPC_URL=https://rpc.test.mezo.org
forge script script/DeployBastion.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
```

## Where things live

| Item | Path |
|------|------|
| Contracts | `contracts/src/` |
| Tests | `contracts/test/` |
| Deploy scripts | `contracts/script/` |
| Frontend | `frontend/src/` |
| Deck / docs | `docs/` |
| Submission assets | `assets/` (brand, screenshots, deck PDF, video) |
| Submission form answers | `docs/submission.md` |
| Desktop submission folder | `~/Desktop/annex-submission/` (was built for Annex; create `bastion-submission/`) |

## Deadline

Wave 1 submission deadline: **October 26, 2026, 16:00 UTC** (AKINDO, Mezo Buildathon).
