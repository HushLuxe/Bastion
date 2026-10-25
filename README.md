# Bastion

**Gamified MUSD savings on Mezo.** Deposit MUSD, earn yield every second, and unlock
ERC-721 achievement badges as you hit savings milestones.

Bastion turns passive yield into a progress system: every deposit moves a bar, and every
milestone mints a collectible badge whose artwork is generated on-chain.

- **Chain:** Mezo Testnet (`31611`), gas paid in BTC
- **Asset:** canonical MUSD (`0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503`, 18 decimals)
- **Live app:** https://bastion-two-hazel.vercel.app
- **Demo video:** https://youtu.be/19a2HcCtzNk?si=Cn69Vn6QAkwSRpUT
- **Track:** Track 1 – DeFi

---

## The difference

A yield vault gives you a balance and a rate. Bastion gives you a balance **and a verifiable on-chain record**:
six milestones, each unlocking an on-chain collectible badge that marks your savings journey.

| Milestone | Condition | Reward |
|-----------|-----------|--------|
| **First Deposit** | First MUSD deposited | Minted immediately upon first deposit |
| **Saved 100 MUSD** | Lifetime deposits ≥ 100 MUSD | Unlocks Tier II Ingot Linework Badge |
| **Saved 500 MUSD** | Lifetime deposits ≥ 500 MUSD | Unlocks Tier III Fortress Keep Badge |
| **Held for 7 Days** | Position held ≥ 7 days | Unlocks Hourglass Badge |
| **Held for 30 Days** | Position held ≥ 30 days | Unlocks Monthly Bastion Badge |
| **Earned 10 MUSD in Yield** | Lifetime yield paid ≥ 10 MUSD | Unlocks Sprouting Yield Coin Badge |

### On-chain SVG artwork
Badges are true **ERC-721 tokens (`BSTN`)** minted by the vault. `tokenURI` returns a self-contained SVG **data URI** generated directly in Solidity inside `BastionAchievements.sol`. 
- **Zero off-chain dependencies:** No IPFS, no central CDN, and no risk of broken image links.
- **Architectural blueprint aesthetic:** Each badge is rendered as a precision technical elevation drawing with milestone-specific geometric linework and emerald/parchment styling.
- **Immediate minting:** The vault evaluates milestone conditions after state changes and mints newly earned badges to the user in the same transaction. Users can inspect their unlocked collection and track live progress to locked milestones in the app's **Achievements Gallery** (`/achievements`).

---

## How it works

```
deposit MUSD ──► vault mints bMUSD receipt shares 1:1
              ──► reward index starts accruing yield every second
              ──► crossing a milestone mints an achievement badge
withdraw ─────► principal + accrued yield returned, receipt burned
```

**Yield model (Wave 1).** The vault holds the deposited MUSD and a separate *yield buffer*.
A global reward index advances by `ratePerSecond × elapsed`, and a user's pending yield is
their shares × the index delta. Yield is paid from the buffer, so payouts are always
coverable and deposits are always fully backed: `assets ≥ principal` at every step.

The rate is owner-controlled (`setRate`). Wave 1 ships a deliberately visible **demo rate**
so accrual can be shown on camera; production would point the same mechanism at a real MUSD
yield source. The UI labels the rate as a demo rate — it is never presented as a real APR.

**Milestones.** After every state change the vault re-checks each of the six conditions and
mints whatever the user has newly earned. The achievement contract enforces one badge per
holder per type.

---

## Contracts

| Contract | Address (Mezo Testnet) | Explorer |
|----------|------------------------|----------|
| `BastionVault` | `0xcdf6add60726fb123c26e668e6d4eef06c2c167b` | [View on Explorer](https://explorer.test.mezo.org/address/0xcdf6add60726fb123c26e668e6d4eef06c2c167b) |
| `BastionReceipt` (ERC-20 `bMUSD`) | `0x52a6ebf2f1507b27b88654fc1d933a59607ecd24` | [View on Explorer](https://explorer.test.mezo.org/address/0x52a6ebf2f1507b27b88654fc1d933a59607ecd24) |
| `BastionAchievements` (ERC-721 `BSTN`) | `0x767dcd140217501e05e72d72de5c4339b76c1009` | [View on Explorer](https://explorer.test.mezo.org/address/0x767dcd140217501e05e72d72de5c4339b76c1009) |

The vault deploys its own receipt token and achievement ledger, so the whole protocol comes
up in one transaction and the trust direction is always vault → helpers.

### Roles

| Role | Can |
|------|-----|
| Anyone | deposit, withdraw, own badges |
| Vault owner | set the yield rate, fund the yield buffer, pause/unpause |

There is no upgrade path and no way for the owner to take user funds: the owner can only
change the rate, add buffer, or pause. Withdrawals are always available to depositors.

---

## Repository layout

```
Bastion/
├── contracts/                 Foundry project
│   ├── src/
│   │   ├── BastionVault.sol           deposit/withdraw, reward index, milestones
│   │   ├── BastionReceipt.sol         ERC-20 receipt token (bMUSD)
│   │   ├── BastionAchievements.sol    ERC-721 badges with on-chain SVG metadata
│   │   ├── MockMUSD.sol               local test networks only
│   │   └── IERC20.sol
│   ├── test/BastionVault.t.sol        27 tests
│   └── script/                        deploy + demo seed scripts
├── frontend/                Vite + React 18 + TypeScript + wagmi/viem
├── docs/                    pitch deck, submission copy, notes
└── README.md
```

---

## Running it

```bash
# contracts
cd contracts
forge build
forge test -vvv

# frontend
cd ../frontend
npm install
cp .env.example .env      # optional: override the deployed addresses
npm run dev
```

### Deploy to Mezo Testnet

```bash
export PRIVATE_KEY=0x...          # funded with test BTC and MUSD
export RPC_URL=https://rpc.test.mezo.org

cd contracts
forge script script/DeployBastion.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast

export BASTION_ADDRESS=0x...
export BUFFER_AMOUNT=40000000000000000000     # 40 MUSD of yield buffer
export DEPOSIT_AMOUNT=120000000000000000000   # demo deposit
export RATE_PER_SECOND=10000000000000         # 0.001% per second (demo rate)
forge script script/SeedDemo.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
```

MUSD is a CDP stablecoin: faucet BTC from <https://faucet.test.mezo.org/>, then open a
trove through `BorrowerOperations` (`0xCdF7028ceAB81fA0C6971208e83fa7872994beE5`) to borrow
MUSD.

---

## Tests

27 Foundry tests cover deposit and withdrawal, receipt share accounting, yield accrual and
the payout cap, all six badge conditions, one-badge-per-type enforcement, ownership, pause,
the reentrancy guard, and fuzz runs over random deposit/withdraw sequences asserting that
`receipt.totalSupply() == vault.totalShares()` and that the vault always backs principal.

```
forge test -vvv    # 27 passed
```

---

## Tech stack

Solidity `0.8.28` (EVM `london`, optimizer 200 runs, via-ir) · Foundry · viem · wagmi v2 ·
`@mezo-org/passport` (RainbowKit) · `@tanstack/react-query` · React 18 · TypeScript · Vite ·
Tailwind CSS v4 · Vercel · GitHub Actions.

No backend, no database, no indexer: every balance, price, badge and payout is read from or
written to the chain.
