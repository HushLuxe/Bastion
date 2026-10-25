# Bastion — AKINDO Submission Copy

> Paste-ready answers for the Mezo Buildathon submission form (Wave 1).
> Product name is **Bastion**. No other project is mentioned anywhere.

---

## Project name

`Bastion`

## Product category

`Gamified MUSD Savings`

## TL;DR

Bastion is a gamified MUSD savings vault on Mezo: you deposit MUSD, earn yield every second,
and unlock ERC-721 achievement badges as you hit savings milestones — turning passive yield
into a visible progression system.

## Track

`Track 1 – DeFi (Borrowing, Lending, Looping, and Yield)`

## Chain deployed on

`Mezo` — Mezo Testnet, chain id `31611`. Settlement in canonical MUSD, gas in BTC.

## Live links

| What | Link |
|------|------|
| Live app | https://bastion-two-hazel.vercel.app |
| BastionVault | `0xcdf6add60726fb123c26e668e6d4eef06c2c167b` — https://explorer.test.mezo.org/address/0xcdf6add60726fb123c26e668e6d4eef06c2c167b |
| Public repo | https://github.com/HushLuxe/Bastion |
| Deck (8 slides, PDF) | https://bastion-two-hazel.vercel.app/assets/deck.pdf |
| Demo video | https://youtu.be/19a2HcCtzNk?si=Cn69Vn6QAkwSRpUT |

### Brand + media assets

| Asset | File | Live URL |
|-------|------|----------|
| Banner (1600×900) | `assets/banner.png` · `assets/banner.svg` | https://bastion-two-hazel.vercel.app/assets/banner.png |
| OG / social card (1200×630) | `assets/og-card.png` · `assets/og-card.svg` | https://bastion-two-hazel.vercel.app/assets/og-card.png |
| Logo mark (512×512, transparent) | `assets/logo-mark.png` · `assets/logo-mark.svg` | https://bastion-two-hazel.vercel.app/assets/logo-mark.png |
| Logo lockup (1440×400, transparent) | `assets/logo-lockup.png` · `assets/logo-lockup.svg` | https://bastion-two-hazel.vercel.app/assets/logo-lockup.png |
| Deck (PDF) + slide images | `assets/deck.pdf` · `assets/slides/` | https://bastion-two-hazel.vercel.app/assets/deck.pdf |
| Screenshots | `assets/screenshots/` | landing, dashboard, gallery, mobile |

---

## What it does

Bastion is a savings vault with a progression system. A user deposits MUSD and immediately
receives **bMUSD receipt shares**, 1:1, with no lock-up and no minimum. From that moment the
position earns yield every second: a global reward index advances with time, and the yield
accrued is paid out in MUSD from a buffer the vault already holds, so a deposit is always
fully backed and payouts are always coverable.

The part a plain vault does not have is the **record**. Six milestones are checked on-chain
after every state change — first deposit, 100 MUSD saved, 500 MUSD saved, seven days held,
thirty days held, and 10 MUSD of yield earned — and each one mints an ERC-721 achievement
badge to the depositor. The dashboard shows progress bars toward the next milestone at all
times, and the gallery shows what has been unlocked.

Badges are not images hosted somewhere: `tokenURI` returns an SVG data URI generated inside
the contract, so each badge is a self-contained collectible that can never be lost, edited or
taken down.

## The problem it solves

MUSD yield vaults feel cold and transactional. You deposit, a number moves slowly, and that
is the entire relationship. There is no sense of progress, no milestone, and no reward for
consistency — which makes engagement and long-term retention hard to earn for a stablecoin
whose whole purpose is to be held and used.

Bastion attacks that with the one thing crypto is good at: programmable assets. The same
vault mechanics become a progression system where saving is visibly rewarded. Each milestone
is a permanent, transferable badge that records what the user actually did with their money,
and the badge gallery turns an abstract balance into a story a user wants to continue.

For Mezo this matters in a specific way: MUSD is a Bitcoin-backed stablecoin, and a vault
that keeps MUSD in productive use — earning yield and carrying a savings history — extends
the stablecoin's utility beyond payments and collateral.

## Challenges I ran into

1. **The vault could not pay its own yield.** The first design accrued yield to depositors
   but had no way to fund it, so payouts either failed or silently zeroed. The fix was to make
   the surplus explicit: the owner funds a buffer with MUSD, payouts are capped by the
   surplus above principal, and any unpaid amount rolls forward to the next interaction
   instead of being forfeited.
2. **Accrual is lazy, but the UI needs it live.** The reward index only updates when someone
   interacts with the vault, so a read-only dashboard would show a frozen yield number. I
   added a projected index that rolls the accrual forward to the current block for reads
   only, while settlement still uses the stored index — the balance ticks up live without
   anyone having to poke the contract.
3. **A circular deployment.** The receipt token and the achievement ledger both need to
   trust the vault, and the vault needs their addresses. Rather than predicting addresses or
   adding a one-time wiring step, the vault deploys its own helpers in its constructor: the
   trust direction is always vault → helpers, and the whole protocol comes up in one
   transaction.
4. **Badge artwork on-chain.** Rendering six distinct badges without a host meant generating
   SVG in Solidity, including a base64 encoder for the data URI. It is more Solidity than I
   expected, but it removes hosting, IPFS and broken images from the product entirely.
5. **MUSD on testnet is not a faucet drop.** It is a CDP stablecoin, so getting any means
   opening a trove against BTC through BorrowerOperations first (minimum net debt 1,800
   MUSD, 110% MCR) — and the whole demo budget has to be planned around that.
6. **A demo rate has to be honest.** At a realistic APR nothing visibly moves on camera. The
   rate is owner-controlled so the demo can show accrual, but the UI labels it as a demo rate
   and never presents it as a real APR — the distinction is stated in the contract, the
   frontend and the deck.

## Technologies I used

Solidity `0.8.28` (EVM `london`, optimizer 200 runs, via-ir) · Foundry with forge-std —
unit, fuzz and invariant runs, `forge fmt`, CI on GitHub Actions · viem · wagmi v2 ·
`@mezo-org/passport` (RainbowKit) · `@tanstack/react-query` · React 18 · TypeScript · Vite ·
Tailwind CSS v4 · Vercel for the live app and asset hosting · Python (`edge-tts` + `ffmpeg`)
for the narrated demo video · hand-written SVG/CSS for the brand kit, the hero art and the
on-chain badge artwork.

No OpenZeppelin dependency — the ERC-20 receipt and the ERC-721 achievements are implemented
directly, which keeps the contract surface small and auditable. There is no backend, no
database and no indexer: every balance, badge and payout is read from or written to the chain.

## How we built it

We started from the property that makes the vault safe rather than the feature that makes it
interesting: `assets ≥ principal` at every moment. Deposits are pulled as MUSD and held by the
vault; receipt shares are minted 1:1 so a holder always has a claim on exactly what they put
in. Yield is paid from a separate buffer funded by the owner, so accrual can never touch
principal.

The yield itself is a reward index. `accruedPerShare` advances by `ratePerSecond × elapsed
seconds`; a user's pending yield is their shares × the index delta, plus anything carried
forward from an earlier interaction the buffer could not cover. Deposits and withdrawals both
settle pending yield first, so the accounting stays exact no matter the order of operations.

Milestones are just predicates over on-chain state — lifetime deposits, time held, lifetime
yield paid — evaluated after every state change, with the achievement contract enforcing one
badge per holder per type.

We then wrote the tests that define the product: deposit and withdrawal behaviour, share
accounting against the receipt supply, yield accrual and the payout cap, all six badge
conditions, no duplicate badges, the pause switch, the reentrancy guard, and fuzz runs over
random deposit/withdraw sequences asserting that `receipt.totalSupply() == totalShares` and
that the vault always backs principal. 27 tests, all green.

The frontend reads everything through batched multicalls — vault totals, the user's position,
pending yield and the badge bitmap — and renders the badges directly from the contract's own
SVG data URIs. Deployment is a single forge script against canonical MUSD, plus a demo script
that funds the buffer, sets the demo rate and makes the first deposit.

## What we learned

1. **The differentiator should be in the data model, not the UI.** The badges fell out
   naturally once the vault tracked lifetime deposits, first-deposit time and lifetime yield
   anyway. If the state is not there, no amount of interface work creates the feature.
2. **Simulated economics still need to be honest.** We built a controllable yield rate for
   the demo, and the important part was not the rate — it was labelling it everywhere. A
   mechanism that is clearly a stand-in is fine; one that looks like a real yield product is
   not.
3. **Put the artwork in the contract when the artwork is the product.** Generating the badge
   SVGs on-chain was more Solidity than expected, and it removed hosting, IPFS pinning and
   broken images from the roadmap entirely.
4. **Accrual that only updates on interaction is a UX bug, not a maths bug.** The reward
   index was correct; the dashboard was wrong. Reading a projected index while settling on
   the stored one is a small change that makes the product feel alive.
5. **A vault without a withdrawal story is a custody product.** The moment a user can leave
   with principal plus yield at any time, the vault is a tool rather than a promise — and
   that is also what makes the progression system worth engaging with.

## What's next for Bastion

1. **Routing to Live Yield Sources:** Upgrade the reward index engine from the demo buffer to route underlying MUSD into genuine Mezo DeFi yield protocols and lending markets.
2. **Dynamic & Evolving NFT Visuals:** Evolve the ERC-721 badge artwork into a dynamic, living on-chain fortress that visibly expands and adds architectural detail as the user's savings balance and duration grow.
3. **Savings Streaks & Tier Multipliers:** Introduce consecutive-deposit streaks and badge-based yield multipliers ("Yield Crests"), rewarding long-term capital retention with higher yield splits.
4. **Collateralized Bastion Borrowing:** Allow users to use their interest-bearing `bMUSD` receipt shares and unlocked milestone rank as borrowing collateral without forfeiting their yield or progression status.
