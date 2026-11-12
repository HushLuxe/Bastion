# Bastion — Gamified MUSD Savings on Mezo

**Live dApp:** https://bastion-two-hazel.vercel.app  
**Pitch Deck:** [assets/deck.pdf](./assets/deck.pdf) · [Online PDF](https://bastion-two-hazel.vercel.app/assets/deck.pdf)  
**Network:** Mezo Testnet (`31611`) · **Asset:** Canonical MUSD · **Gas:** Native BTC  

Bastion turns saving canonical **MUSD** on **Mezo** into an on-chain progression loop of named savings goals, quests, a live saver leaderboard, and 10 non-transferable (soulbound) SVG achievement NFTs — backed by real **Mezo Stability Pool** yield routing.

---

## Why Bastion Is Level 3+ Mezo Integration

Rather than letting deposits sit idle or paying synthetic owner-funded APR, Bastion composes directly with canonical Mezo protocol contracts at the smart-contract level:

1. **Direct Stability Pool Supply (`deposit` / `depositToGoal`)**: Every canonical MUSD deposit into `BastionVault` immediately calls `IStabilityPool.provideToSP(amount, address(0))` against Mezo Testnet's canonical Stability Pool (`0x1CCA7E410eE41739792eA0A24e00349Dd247680e`).
2. **Collateral Gain Harvesting (`harvest(minMusdOut)`)**: When troves are liquidated in Mezo, the Stability Pool streams BTC collateral gains to the vault. Any user or keeper can trigger permissionless `harvest()`, which withdraws pending BTC via `withdrawFromSP(0)` and swaps BTC → MUSD through the canonical Mezo Pools `Router` (`0x9a1ff7FE3a0F69959A3fBa1F1e5ee18e1A9CD7E9`) via volatile route (`BTC Caller -> MUSD`).
3. **Protocol Revenue Model (`10%` Performance Fee on Real Yield)**: Realized MUSD yield is split on-chain: `10%` (`protocolFeeBps = 1000`, capped at 25%) routes to `treasury`, and `90%` increases `accruedPerShare` pro-rata across active `bMUSD` savers. Principal is never taxed, and the UI derives APY strictly from on-chain net realized yield (`realizedApyBps`).
4. **Composable Receipts (`bMUSD`) + P2 Fixes Preserved**:
   - **Yield Carry Preservation:** Settled fractional or unclaimed carry (`state.carry`) is preserved across `deposit`, `depositToGoal`, `withdraw`, `withdrawAll`, `redeem`, `claimYield`, and receipt transfers.
   - **Redeemable Transferred `bMUSD`:** `BastionReceipt.transfer` / `transferFrom` invoke `BastionVault.onShareTransfer(from, to, value)`, settling the sender's yield index and initializing the recipient's index so transferred `bMUSD` accrues yield from transfer time and redeems `1:1` for MUSD via `redeem()`.

---

## Verified Wave 2 Contracts (Mezo Testnet · Chain ID `31611`)

All Bastion Wave 2 contracts are verified on Blockscout Explorer:

| Contract | Address | Blockscout Verified Link |
|---|---|---|
| `BastionVault` | `0x2fB1b2C30fF925b2A544777981c8562A05763d0e` | [View Verified Contract ↗](https://explorer.test.mezo.org/address/0x2fB1b2C30fF925b2A544777981c8562A05763d0e) |
| `BastionReceipt` (`bMUSD`) | `0xa28BE7b55D62282220CF1df013eF29C4f0977Db4` | [View Verified Contract ↗](https://explorer.test.mezo.org/address/0xa28BE7b55D62282220CF1df013eF29C4f0977Db4) |
| `BastionAchievements` | `0x15db5C0F9b04348c7033043Cc2F6663646aB6e6F` | [View Verified Contract ↗](https://explorer.test.mezo.org/address/0x15db5C0F9b04348c7033043Cc2F6663646aB6e6F) |

Canonical Mezo Testnet dependencies used on-chain:
- **MUSD (`Mezo USD`):** `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503`
- **StabilityPool:** `0x1CCA7E410eE41739792eA0A24e00349Dd247680e`
- **Mezo Pools Router:** `0x9a1ff7FE3a0F69959A3fBa1F1e5ee18e1A9CD7E9`
- **PoolFactory:** `0x4947243CC818b627A5D06d14C4eCe7398A23Ce1A`
- **BTCCaller:** `0x7b7C000000000000000000000000000000000000`

---

## Real Non-Deployer On-Chain Usage Evidence (Chain `31611`)

Executed using two non-deployer wallets (`0x222dCAfe7bfba7Da1207BA2F3CDD7e4B42F9B672` and `0x18faF506D79982A23C155D6ED8277051e68617a3`):

1. **Create Savings Goal** (`Emergency Reserve`, `20 MUSD`, `30 days`): `0xb057db7cfa4c25542ee38ddea1a4dec6dcbc89257fddaea5d57c7f7574b9bb7d`
2. **Deposit 20 MUSD → Stability Pool + Mint 5 Soulbound Badges (`First Deposit` + `Bronze/Silver/Gold/Vanguard`)**: `0xbc1f34c101949738b8ce0ec7eb56e40471a73da4fa9ced314afb3189e4a80ad3`
3. **Transfer 5 `bMUSD` Receipt to Second Wallet**: `0x6120a8016ddbef17ddf6ec5af2c35b67f07159708d3b53e8ca031efae2c31080`
4. **Recipient Redeems 5 Transferred `bMUSD` from Stability Pool (`redeem`)**: `0x53b76592cd17ce467a9152a2fae07be534d717ab8611962871cc4a5580b2d836`
5. **Second Saver Creates Goal & Deposits 15 MUSD**: `0xf4141d6d7fc65791a28cd102b5237e156af550bb9aa2267f660903d4a52fe46c`
6. **Partial Withdrawal (2 `bMUSD`)**: `0xaa891a5969a445d6c560c478aba5c1eb1b69958f8e854ec6da4adb2963902a8d`

---

## Gamification & Security Notes (Honest Disclosures)

- **10 Soulbound Badges (`BastionAchievements`):**
  - Core badges (`0..5`): First Deposit, Saved 100 MUSD, Saved 500 MUSD, Held for 7 Days, Held for 30 Days, Earned 10 MUSD in Yield.
  - Goal tier badges (`6..9`): Goal 25% Bronze, Goal 50% Silver, Goal 75% Gold, Goal 100% Vanguard.
- **Emergency Pause / Killswitch Disclosure:** `BastionVault` has an owner-only `setPaused(bool)` circuit breaker. **While `paused == true`, deposits, yield claims, redemptions, and withdrawals are blocked** until unpaused by the owner. In addition, Mezo's Stability Pool prevents withdrawals while undercollateralized troves exist awaiting liquidation.

---

## Repository Structure

```text
Bastion/
├── contracts/          # Solidity 0.8.28 contracts, Foundry tests, fork tests & deploy scripts
├── frontend/           # React 18, TypeScript, Vite, Tailwind, wagmi, viem, Mezo Passport
└── assets/             # Pitch deck (deck.html, deck.pdf, slides/), branding, live screenshots
```

## Running Tests & Local Development

### Smart Contracts (Foundry)

```bash
cd contracts
forge build
forge test -vvv

# Optional: run integration test forked against live Mezo Testnet RPC
MEZO_FORK=1 forge test --match-contract BastionMezoForkTest -vvv
```

### Frontend

```bash
cd frontend
npm install
npm run dev      # local development server
npm run build    # production typecheck + Vite bundle
```

MIT License.
