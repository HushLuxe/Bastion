# Bastion — Mezo Buildathon Wave 2 Pitch Deck

> Rendered deck: `assets/deck.html` → `assets/deck.pdf` & `frontend/public/assets/deck.pdf`

---

## Slide 1 — Bastion: Gamified MUSD Savings on Mezo
- **Tagline:** Fortify your MUSD. Earn the badges.
- **Wave 2 Milestone:** L3+ Mezo Stability Pool yield routing, 10% real-yield protocol fee, 10 soulbound achievement badges, goals + quests + leaderboard, Blockscout-verified contracts.
- **Network:** Mezo Testnet (Chain ID `31611`), canonical MUSD (`0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503`), gas in BTC.

## Slide 2 — The Problem
- **Habit Gap:** Traditional yield vaults show a static number; savers churn without goal visibility or progression rewards.
- **Subsidized / Artificial Yield:** Treasury-funded test APYs fail real-world economics and do not connect to core Mezo DeFi primitives.
- **Broken Receipt Composability:** Non-redeemable transferred receipt tokens break DeFi interoperability.

## Slide 3 — Product & Gamification Loop
- **Savings Goals:** Users define goal name, MUSD target, and 7/30/90-day duration presets on-chain.
- **Milestones & Quests:** Every deposit advances active goals, fires confetti celebrations, updates quest tiers (**Bronze 25% → Silver 50% → Gold 75% → Vanguard 100%**), and updates `getLeaderboard()`.
- **10 Soulbound Badges:** `BastionAchievements` mints non-transferable ERC-721 tokens with on-chain SVG artwork.

## Slide 4 — L3+ Mezo Yield Routing Architecture
1. Saver deposits canonical MUSD via `BastionVault.depositToGoal()` or `deposit()`.
2. Vault approves & calls `StabilityPool.provideToSP(amount)` on canonical `0x1CCA7E410eE41739792eA0A24e00349Dd247680e`.
3. Vault mints transferable `bMUSD` (`BastionReceipt`) 1:1.
4. Any caller invokes permissionless `harvest(minMusdOut)`, which collects Stability Pool BTC collateral gains (`withdrawFromSP(0)`) and swaps BTC → MUSD through Mezo Pools `Router` (`0x9a1ff7FE3a0F69959A3fBa1F1e5ee18e1A9CD7E9`).
5. `realizedApyBps` and displayed yield compute strictly from realized harvested MUSD net of fee — never subsidized or hardcoded.

## Slide 5 — Business Model
- **Protocol Yield Fee:** `10%` (`protocolFeeBps = 1000`, hard-capped at 25%) collected automatically at `harvest()` and sent to `treasury`. Zero tax on user principal.
- **Alignment:** Protocol revenue scales purely with Stability Pool liquidation activity and real TVL.

## Slide 6 — Wave 2 Fixes & Verification
- **P2(a) Yield Carry Preserved:** `state.carry` is accumulated cleanly across deposits, redemptions, withdrawals, claims, and transfers (zero carry truncation).
- **P2(b) Transferable bMUSD Redeemable:** `BastionReceipt` calls `vault.onShareTransfer(from, to, value)`, settling sender carry and initializing receiver index so any `bMUSD` holder can call `redeem()`.
- **P3 Honest Claims:** Emergency killswitch (`setPaused`) halts deposits and withdrawals during emergencies, and normal Stability Pool exits require no active undercollateralized troves — clearly disclosed in UI & docs.
- **P4 Verification & Tests:** All 3 contracts verified on Blockscout; 15 unit/fuzz tests + 1 live Mezo fork test pass.

## Slide 7 — Live Testnet Deployments & Non-Deployer Proof
- **BastionVault:** `0x2fB1b2C30fF925b2A544777981c8562A05763d0e` (Verified)
- **BastionReceipt (`bMUSD`):** `0xa28BE7b55D62282220CF1df013eF29C4f0977Db4` (Verified)
- **BastionAchievements:** `0x15db5C0F9b04348c7033043Cc2F6663646aB6e6F` (Verified)
- Non-deployer wallets verified live goal creation, SP deposit (`20 MUSD` & `15 MUSD`), `bMUSD` transfer (`5 bMUSD`), recipient `redeem()`, and partial withdrawal leaving `28 MUSD` staked in Mezo Stability Pool.

## Slide 8 — Roadmap (Post-Hackathon)
- **Wave 3 (MUSD/BTCb Lending Loop):** Automated collateralized borrow-and-compound loops with health-factor guardrails.
- **Wave 4 ("Bastion Everywhere"):** Direct MUSD onboarding via local payment rails in Nigeria and emerging markets + external audit & Mezo Mainnet launch.

## Slide 9 — Live Links & Team
- **Live Demo:** https://bastion-two-hazel.vercel.app
- **Public GitHub:** https://github.com/HushLuxe/Bastion
- **Team Hackdev:** Maryjane Okafor
