# Bastion — Build Plan & Wave 2 Status

> **Last updated:** Wave 2 Final Build Complete — Stability Pool + Mezo Pools Router yield routing, P2 defects resolved, contracts deployed and verified on Blockscout, non-deployer E2E txs verified, full frontend live on Vercel, submission package prepared. **Deadline: Nov 15, 2026, 16:00 WAT (AKINDO, Mezo Buildathon Wave 2).**

## What is Bastion?

Bastion is a **gamified canonical MUSD savings protocol on Mezo**. Savers set named goals (7/30/90-day presets), route MUSD into Mezo's canonical Stability Pool to earn real liquidation yield harvested via Mezo Pools, compete on an on-chain leaderboard, and collect **10 soulbound ERC-721 achievement badges** with on-chain SVG artwork.

- **Track:** Track 1 – DeFi
- **Chain:** Mezo Testnet (`31611`), gas in BTC
- **Asset:** canonical MUSD `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503`
- **Mezo Primitives (L3+):** StabilityPool (`0x1CCA7E410eE41739792eA0A24e00349Dd247680e`), Mezo Pools Router (`0x9a1ff7FE3a0F69959A3fBa1F1e5ee18e1A9CD7E9`), `BTCCaller` (`0x7b7C000000000000000000000000000000000000`)

---

## Wave 2 Deliverables

| Deliverable | Status |
|---|---|
| P1: Stability Pool yield routing + BTC→MUSD harvest + 10% protocol fee (`protocolFeeBps = 1000`) | ✅ Implemented, unit/fuzz & fork tested |
| P2(a): Preserve `state.carry` across deposit, withdraw, redeem, claim & transfers | ✅ Fixed + regression test passing |
| P2(b): Make transferred `bMUSD` (`BastionReceipt`) redeemable 1:1 with accrued yield | ✅ Fixed (`onShareTransfer` hook) + regression + live tx |
| P3: Honest emergency killswitch (`setPaused`) & Stability Pool exit disclosures | ✅ Audited across UI, README, deck & docs |
| P4: Fresh deploy & Blockscout contract verification (`31611`) | ✅ 3/3 contracts verified (`BastionVault`, `BastionReceipt`, `BastionAchievements`) |
| Non-deployer multi-wallet E2E tx evidence | ✅ 9 on-chain transactions recorded (`28 MUSD` in SP) |
| Full E2E Wave 2 frontend (Goals, Quests, Leaderboard, bMUSD redeem/transfer, zero mocks) | ✅ Built & deployed to `https://bastion-two-hazel.vercel.app` |
| Pitch deck (9 slides PDF + HTML + MD) & copy-paste AKINDO `docs/submission.md` | ✅ Rendered (`assets/deck.pdf`) & verified under limits |

---

## Verified Wave 2 Contracts (`31611`)

- `BastionVault`: `0x2fB1b2C30fF925b2A544777981c8562A05763d0e`
- `BastionReceipt`: `0xa28BE7b55D62282220CF1df013eF29C4f0977Db4`
- `BastionAchievements`: `0x15db5C0F9b04348c7033043Cc2F6663646aB6e6F`

## Post-Hackathon Roadmap (Wave 3 & Wave 4)

- **Wave 3:** MUSD/BTCb lending loop strategies with health-factor guards; timelocked admin governance.
- **Wave 4:** "Bastion Everywhere" direct MUSD acquisition via local payment methods in Nigeria and emerging markets + external security audit + Mezo Mainnet deployment.
