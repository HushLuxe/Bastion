# Bastion — AKINDO Wave 2 Submission Package (Team Hackdev)

Everything below is verified against the deployed Wave 2 contracts and live build, and strictly respects AKINDO field character limits.

---

## 1. Product Page — Core Fields

- **Product Name:** `Bastion`
- **Tagline:** `Gamified MUSD savings on Mezo.`
- **Categories (pick up to 3):**
  1. `Gamified Savings`
  2. `DeFi + NFT`
  3. `On-Chain Achievements`
- **Tags:** `Blockchain`, `Solidity`, `DeFi`
- **Project Status:** `Deployed on Testnet (Wave 2 Complete)`
- **Visibility:** `Public` (switch from Hidden before submitting)
- **Live Demo URL:** `https://bastion-two-hazel.vercel.app`
- **Public GitHub Repo:** `https://github.com/HushLuxe/Bastion`
- **Pitch Deck Link:** `https://bastion-two-hazel.vercel.app/assets/deck.pdf` (also attached as `assets/deck.pdf`)

---

## 2. About / Description Copy (Copy-Paste Ready — under 6,000 characters)

### OVERVIEW

Bastion is a gamified canonical MUSD savings protocol on Mezo Testnet (Chain ID 31611) built by Team Hackdev. In Wave 2, Bastion evolved from an isolated reward-rate demo into a Level 3+ composable Mezo primitive: deposited MUSD enters Mezo's canonical Stability Pool to earn real BTC liquidation gains swapped back into MUSD via Mezo Pools, while savers create on-chain goals, climb quest levels, compete on an on-chain leaderboard, and collect 10 soulbound SVG NFT badges.

All three contracts are freshly deployed, verified on Mezo Blockscout, and proven with non-deployer wallets:
- BastionVault (Verified): https://explorer.test.mezo.org/address/0x2fB1b2C30fF925b2A544777981c8562A05763d0e
- BastionReceipt bMUSD (Verified): https://explorer.test.mezo.org/address/0xa28BE7b55D62282220CF1df013eF29C4f0977Db4
- BastionAchievements (Verified): https://explorer.test.mezo.org/address/0x15db5C0F9b04348c7033043Cc2F6663646aB6e6F

### WHAT IT DOES

- Savings Goals: Savers create custom on-chain goals with name, MUSD target, and 7, 30, or 90-day duration presets.
- Real Stability Pool Yield Routing: Deposits via deposit() or depositToGoal() immediately supply canonical MUSD (0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503) into Mezo Stability Pool (0x1CCA7E410eE41739792eA0A24e00349Dd247680e).
- Permissionless Harvest & Revenue Split: harvest(minMusdOut) pulls Stability Pool BTC collateral gains and swaps BTC to MUSD via Mezo Pools Router (0x9a1ff7FE3a0F69959A3fBa1F1e5ee18e1A9CD7E9). Bastion takes a 10% protocol fee (1000 bps) on realized yield for its treasury and streams 90% pro-rata to bMUSD holders. Displayed APY derives strictly from on-chain realized yield.
- 10 Soulbound Badges & Quests: Automatically mints non-transferable on-chain SVG NFTs for 6 lifetime milestones plus 4 goal completion tiers (25% Bronze, 50% Silver, 75% Gold, 100% Vanguard), paired with UI confetti and a live getLeaderboard() view.
- Honest Controls: The vault includes an owner emergency killswitch (setPaused); when active, both deposits and withdrawals pause until resumed.

### THE PROBLEM IT SOLVES

Plain DeFi savings vaults suffer from three issues: passive balances fail to build savings habits, Wave 1 testnet subsidies do not reflect real sustainable yield, and wrapped receipt tokens often lose redemption rights if transferred. Bastion fixes all three by uniting real Mezo Stability Pool yield, sustainable fee economics, transferable redeemable bMUSD, and visible on-chain progression.

### CHALLENGES I RAN INTO

1. Wave 1 Defect Fixes: Audited and fixed both flagged bugs — preserving state.carry across all deposits, withdrawals, claims, and transfers (regression tested), and wiring BastionReceipt transfer hooks (onShareTransfer) so transferred bMUSD receipts accrue yield from transfer time and redeem 1:1.
2. Block Gas Limit Deployment: Deploying BastionVault, BastionReceipt, and BastionAchievements inside one constructor exceeded Mezo Testnet's 10M block gas limit (10.45M gas). Refactoring deployment into three contracts with one-time setVault() wiring brought deployment smoothly on-chain.
3. Mezo Native Precompiles: Mezo's BTCCaller (0x7b7C...0000) reverts in local Foundry forks unless ETH/BTC collateral gains actually arrived. Gating harvest swaps on StabilityPool-only receive() accounting kept deposits and withdrawals gas-efficient while passing live fork integration tests.

### TECHNOLOGIES I USED

- Solidity 0.8.28 (EVM london, Foundry) with zero external OpenZeppelin runtime bloat
- Mezo Canonical Primitives: MUSD, StabilityPool, Pools Router & PoolFactory, BTCCaller
- React 18, TypeScript, Vite, Tailwind CSS v4, wagmi, viem, and @mezo-org/passport (Bitcoin + EVM wallets)
- Vercel production hosting and Blockscout verification API

### HOW WE BUILT IT

We designed BastionVault with a strict WAD accumulator accruedPerShare fed exclusively by swapped BTC gains from harvest(), plus treasury fee accounting (protocolFeeBps = 1000). BastionAchievements encodes 10 dynamic SVG badges directly on-chain and enforces soulbound semantics by reverting transfers/approvals. The frontend eliminates all mock data — reading goals, vault Stability Pool balances, realized APY, soulbound SVGs, and saver leaderboards live via multicall, with end-to-end testnet MUSD guidance.

Non-deployer Mezo Testnet (31611) tx evidence:
- Create Goal: 0xb057db7cfa4c25542ee38ddea1a4dec6dcbc89257fddaea5d57c7f7574b9bb7d
- Deposit 20 MUSD -> Stability Pool + Badges: 0xbc1f34c101949738b8ce0ec7eb56e40471a73da4fa9ced314afb3189e4a80ad3
- Transfer 5 bMUSD: 0x6120a8016ddbef17ddf6ec5af2c35b67f07159708d3b53e8ca031efae2c31080
- Redeem Transferred 5 bMUSD: 0x53b76592cd17ce467a9152a2fae07be534d717ab8611962871cc4a5580b2d836
- Second Saver Deposit (15 MUSD): 0xf4141d6d7fc65791a28cd102b5237e156af550bb9aa2267f660903d4a52fe46c
- Partial Withdraw (2 bMUSD): 0xaa891a5969a445d6c560c478aba5c1eb1b69958f8e854ec6da4adb2963902a8d

### WHAT WE LEARNED

Moving from L2 token wrapping to L3+ Mezo Stability Pool composability turned Bastion from a gamified UI wrapper into a real DeFi primitive: every metric, APY readout, badge unlock, and fee dollar flows cleanly from Mezo protocol liquidity without off-chain servers or hardcoded assumptions.

---

## 3. "Updates in this Wave" Text (Copy-Paste Ready — under 3,000 characters)

Bastion Wave 2 resolves every Wave 1 architectural gap and upgrades Mezo integration from Level 2 to Level 3+:

1. Live Mezo Stability Pool Yield Routing & Fee Model (P1): Removed owner-subsidized setRate()/fundYield(). All MUSD deposits now supply directly into Mezo's canonical Stability Pool (0x1CCA7E410eE41739792eA0A24e00349Dd247680e). Permissionless harvest() claims BTC collateral gains and swaps BTC -> MUSD through Mezo Pools Router (0x9a1ff7FE3a0F69959A3fBa1F1e5ee18e1A9CD7E9), taking a 10% protocol fee (1000 bps) on realized yield to fund Bastion's treasury while streaming 90% to savers. Every yield/APY figure in the app and deck derives strictly from realized on-chain yield.
2. Both Reviewer-Named Contract Defects Fixed (P2): Fixed discarded yield carry across state mutations and added an onShareTransfer hook on BastionReceipt so transferred bMUSD accrues yield cleanly and can be redeemed 1:1 by any holder — covered by Foundry unit, fuzz, and live fork tests (15 unit/fuzz + 1 live fork passing).
3. Blockscout Verification & Public Codebase (P4): Freshly deployed and verified BastionVault, BastionReceipt, and BastionAchievements on Mezo Testnet Explorer, with multi-wallet non-deployer E2E transactions recorded and open-sourced at https://github.com/HushLuxe/Bastion.
4. Full End-to-End Frontend & Honest Controls (P3): Shipped savings goal creation (7/30/90-day presets), active goal deposits, confetti unlocks, 10 soulbound badges (6 core + Bronze 25%, Silver 50%, Gold 75%, Vanguard 100%), live Quests & on-chain Leaderboard, bMUSD transfer/redeem panel, canonical testnet MUSD CDP guide, mobile navigation, and explicit disclosure that the owner killswitch (setPaused) halts both deposits and withdrawals. Zero mock data remains.

Live Demo URL: https://bastion-two-hazel.vercel.app

---

## 4. Future Milestones (Post-Hackathon)

### Milestone — 3rd Wave (Weeks 1–6 Post-Wave 2): Lending Loop & Capital Efficiency
- Implement optional MUSD / BTCb collateralized lending loops integrated with Mezo Borrow & Pools liquidity (Aave-style health-factor monitoring and automated deleveraging guards).
- Add timelocked governance over fee bps and emergency pause controls ahead of mainnet security review.

### Milestone — 4th Wave (Months 2–4 Post-Wave 2): "Bastion Everywhere" & Mainnet Launch
- Ship local-currency MUSD acquisition rails in Nigeria and key emerging markets so savers can move directly from mobile money / bank transfers into goal-based MUSD vaults without manual CDP management.
- Complete external smart contract audit and deploy Bastion to Mezo Mainnet with sponsored partner savings cohorts.

---

## 5. Demo Video Script (<= 2:00 / ~260 words)

**[0:00 – 0:20] Hook & Wave 2 Upgrade (Landing Page)**  
"This is Bastion — gamified MUSD savings on Mezo. In Wave 1, Bastion proved savers love progress bars and on-chain badges, but relied on manual rates. In Wave 2, we rebuilt Bastion into a Level 3+ Mezo DeFi primitive backed by Mezo's canonical Stability Pool, Pools Router, and verified Blockscout contracts."

**[0:20 – 0:45] Connect Wallet & Create Savings Goal (Dashboard)**  
"On bastion-two-hazel.vercel.app, I connect via Mezo Passport on Testnet 31611. Below my position strip is our live Savings Goals manager. Let's create an 'Emergency Reserve' goal with a 20 MUSD target and 30-day preset — all stored directly inside BastionVault."

**[0:45 – 1:15] Deposit Canonical MUSD → Stability Pool + Confetti & Badges**  
"I enter 20 MUSD and click Deposit. Bastion approves canonical MUSD and calls depositToGoal(), which routes 100% of that principal straight into Mezo's Stability Pool — shown live in our dark telemetry card alongside the 10% protocol fee and derived APY. Confetti triggers automatically as our soulbound NFT badges mint on-chain: First Deposit plus Bronze 25%, Silver 50%, Gold 75%, and Vanguard 100%."

**[1:15 – 1:40] Transfer bMUSD Receipt, Redeem & Leaderboard (Dashboard + Quests)**  
"Next, let's verify our Wave 2 bug fixes: I can switch to the bMUSD tab, send 5 receipt tokens to another wallet, and that recipient can immediately redeem transferred bMUSD 1:1 right back into canonical MUSD from the Stability Pool — with yield carry preserved across every step. Over on Quests, every saver and badge tier syncs straight from getLeaderboard()."

**[1:40 – 2:00] Achievements & Wrap-Up**  
"In Achievements, all 10 badges render directly from on-chain SVG artwork in BastionAchievements. Our contracts are verified on Blockscout, source code is public at HushLuxe/Bastion, and Bastion is ready to fortify MUSD savings across Mezo. Build your Bastion."

---

## 6. Gallery & AKINDO Readiness Checklist

- [ ] Upload screenshots from `assets/screenshots/` (`01-landing.png`, `02-dashboard.png`, `03-quests.png`, `04-achievements.png`, `05-mobile-dashboard.png`)
- [ ] Upload `assets/banner.png` as cover image
- [ ] Upload or link `assets/deck.pdf` (`https://bastion-two-hazel.vercel.app/assets/deck.pdf`)
- [ ] Upload recorded <= 2:00 demo video following script in Section 5
- [ ] Switch AKINDO product visibility from `Hidden` to `Public`
- [ ] Verify Live Demo (`https://bastion-two-hazel.vercel.app`), GitHub (`https://github.com/HushLuxe/Bastion`), Track (`DeFi`), Team (`Hackdev`), Categories, and Tags
