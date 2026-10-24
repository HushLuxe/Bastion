# Bastion

**Gamified MUSD savings on Mezo.** Deposit MUSD, earn yield every second, and unlock
ERC-721 achievement badges as you hit savings milestones.

Bastion turns passive yield into a progress system: every deposit moves a bar, and every
milestone mints a collectible badge whose artwork is generated on-chain.

- **Chain:** Mezo Testnet (`31611`), gas paid in BTC
- **Asset:** canonical MUSD (`0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503`, 18 decimals)
- **Live app:** https://bastion-two-hazel.vercel.app
- **Track:** Track 1 – DeFi

---

## The difference

A yield vault gives you a balance and a rate. Bastion gives you a balance **and a record**:
six milestones, each unlocking an on-chain badge that shows how far you have come.

| Milestone | Condition |
|-----------|-----------|
| First Deposit | first MUSD deposited |
| Saved 100 MUSD | lifetime deposits ≥ 100 MUSD |
| Saved 500 MUSD | lifetime deposits ≥ 500 MUSD |
| Held for 7 Days | position held ≥ 7 days |
| Held for 30 Days | position held ≥ 30 days |
| Earned 10 MUSD in Yield | lifetime yield paid ≥ 10 MUSD |

Badges are ERC-721 tokens minted by the vault. `tokenURI` returns an SVG **data URI**
generated inside the contract, so the artwork needs no hosting, no IPFS and no CDN.

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

| Contract | Address (Mezo Testnet) |
|----------|------------------------|
| `BastionVault` | `0x1f01c11bc7372b4a42bf7a1d64d3862060b1218e` |
| `BastionReceipt` (ERC-20 `bMUSD`) | `0xd3f555153F835C168E5595d311F6AdC204B403cd` |
| `BastionAchievements` (ERC-721) | `0x2eaa9e647194b882c12030C86DdaABDE79e75C2b` |

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
