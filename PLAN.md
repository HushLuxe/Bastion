# Bastion — Build Plan & Status

> **Last updated:** Session 1 — repo scaffolded, receipt + achievement contracts written,
> vault in progress. **Deadline: Oct 26, 2026, 16:00 UTC (AKINDO, Mezo Buildathon).**

## What is Bastion?

Bastion is a **gamified MUSD savings vault on Mezo**. Users deposit MUSD, earn yield,
and unlock **ERC-721 achievement badges** as they hit savings milestones. It turns passive
yield into a progress-driven experience.

- **Track:** Track 1 – DeFi
- **Chain:** Mezo Testnet (`31611`), gas in BTC
- **Asset:** canonical MUSD `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503`
- **Differentiation:** visible progression + collectible NFT achievements on top of a
  plain yield vault — this must be obvious in the product *and* in the pitch

## Wave 1 goals (from the PRD)

| Goal | Status |
|------|--------|
| Contracts deployed on Mezo Testnet | ✅ live at `0xcdf6add60726fb123c26e668e6d4eef06c2c167b` |
| Deposit and withdraw MUSD | ✅ verified on testnet |
| Yield accrual (simplified / controlled demo rate) | ✅ active & verified |
| NFT achievement system (ERC-721, milestones) | ✅ 100% on-chain SVG artwork in Solidity |
| Clean, polished architectural frontend with progress + gallery | ✅ live on Vercel |
| End-to-end demo video | ✅ recorded & placed |
| Clean public GitHub repository | ✅ scaffolded & configured |
| Short pitch deck highlighting the gamification difference | ✅ completed (8 slides) |

---

## Architecture decisions

### Yield: reward-index model over MUSD held by the vault

- Receipt shares (`bMUSD`) are minted 1:1 with deposits; the vault holds the MUSD.
- A global index `accruedPerShare` advances by `ratePerSecond * elapsed`. Owner-settable
  via `setRate()`.
- `pendingYield(user) = shares * (accruedPerShare - user.yieldDebt) / 1e18`.
- Yield is paid **from the vault's own MUSD buffer** (owner tops it up with `fundYield()`),
  so payouts are always solvent and can be capped by the buffer.
- Default rate = 8% APR (realistic, invisible in a demo). The demo run switches to a
  clearly-labelled **demo rate** (`0.01%/second`) so the balance visibly grows on camera.
  The UI must label the rate honestly.

### Achievements: ERC-721 with on-chain artwork

- `BastionAchievements` mints one badge per holder per type; only the vault can mint.
- `tokenURI` returns a `data:image/svg+xml;base64,…` URI — the gallery needs no hosting
  and no IPFS, and the artwork ships with the contract.
- `tokenIdByBadge[holder][badgeId]` maps a holder to its badge token id.

### Milestones (6)

| id | Badge | Condition |
|----|-------|-----------|
| 0 | First Deposit | lifetime deposits > 0 |
| 1 | Saved 100 MUSD | lifetime deposits ≥ 100 MUSD |
| 2 | Saved 500 MUSD | lifetime deposits ≥ 500 MUSD |
| 3 | Held for 7 Days | `now - firstDepositAt ≥ 7 days` |
| 4 | Held for 30 Days | `≥ 30 days` |
| 5 | Earned 10 MUSD in Yield | lifetime yield paid ≥ 10 MUSD |

### Roles

| Role | Can |
|------|-----|
| Anyone | deposit, withdraw, own badges |
| Vault owner | set the yield rate, fund the yield buffer, pause/unpause |

### Out of scope (Wave 1)

Multi-strategy yield routing · AI optimisation · social features / leaderboards ·
cross-chain · mobile app · transferable achievement boosting · governance token.

---

## Work plan

### 1. Contracts
- [x] `IERC20.sol`
- [x] `BastionReceipt.sol` — ERC-20 receipt, vault-only mint/burn
- [x] `BastionAchievements.sol` — ERC-721 badges, on-chain SVG metadata
- [ ] `BastionVault.sol` — deposit / withdraw, index accrual, milestone checks, pause
- [ ] `MockMUSD.sol` — local tests only (testnet uses canonical MUSD)
- [ ] `test/BastionVault.t.sol` — deposit/withdraw, share accounting, yield accrual,
      badge minting (all 6 paths), reentrancy, invariants (`sum(shares) == receipt.totalSupply()`,
      vault solvency), fuzz over random deposit/withdraw sequences
- [ ] `script/DeployBastion.s.sol` — deploys the three contracts (canonical MUSD on Mezo,
      mock elsewhere)
- [ ] `script/SeedDemo.s.sol` — funds the yield buffer + performs a demo deposit

### 2. Testnet deployment
- [ ] Generate a Bastion deployer key (keep it outside the repo, e.g. `~/.bastion/deployer.key`)
- [ ] Send it testnet BTC (gas) and MUSD from the Annex deployer
      (`~/.annex/deployer.key`, ≈275 MUSD + ≈0.005 BTC available)
- [ ] Deploy `BastionVault` + `BastionReceipt` + `BastionAchievements` against canonical MUSD
- [ ] Fund the yield buffer, set the demo rate, run the demo deposit

### 3. Frontend (Vite + React 18 + TS + wagmi/viem + Mezo Passport)
- [ ] Design system: dark "bastion" identity — stone/slate surfaces, amber accents,
      solid architectural shapes (arch motif), calm premium type pairing
- [ ] Dashboard: MUSD balance, receipt balance, accrued + estimated yield, buffer,
      progress bars toward the next milestones
- [ ] Deposit / withdraw flows (approve → deposit; withdraw → redeem)
- [ ] Achievement gallery: locked + unlocked badges rendered from on-chain SVG metadata
- [ ] Wallet connection via `@mezo-org/passport` (MetaMask / Xverse / Unisat / OKX)
- [ ] Deploy to Vercel + verify against live contracts

### 4. Submission materials
- [ ] Brand kit: logo, banner, OG card
- [ ] Short pitch deck (PDF) leading with the gamification difference
- [ ] Demo video (connect → deposit → yield accruing → badge unlocked → withdraw)
- [ ] Submission copy for every AKINDO field
- [ ] Public repo `Ryjen1/Bastion`, README, CI green

---

## Commands reference

```bash
cd contracts
forge build
forge test -vvv
forge script script/DeployBastion.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast

cd ../frontend
npm run build
npm run dev
```

## Critical constraints

- Product name is **Bastion** everywhere
- **No** mention, link or credit of any other savings/vault/gamification project in the
  public repo, README, comments, docs, deck, video or commit messages
- MUSD is the only asset; gas in BTC; no backend, database or off-chain service
- Deposits must always be fully backed: `MUSD held ≥ principal + unpaid yield`
- Do NOT commit unless the user explicitly asks
