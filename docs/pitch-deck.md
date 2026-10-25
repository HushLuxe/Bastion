# Bastion — Pitch Deck

> 8 slides. The demo does the talking.
> Product name is **Bastion**. No other project is mentioned.

---

## 1 — Title

**Bastion**

*Fortify your MUSD. Earn the badges.*

Gamified MUSD savings on Mezo. Deposit MUSD, earn yield every second, unlock ERC-721
achievement badges as you hit savings milestones.

`Mezo Testnet · 31611` · settled in MUSD · gas in BTC

---

## 2 — The problem

MUSD yield vaults feel cold. You deposit, a number moves slowly, and that is the entire
relationship.

- **No progress.** No milestone, no reward for consistency.
- **No reason to stay.** Engagement and retention are hard to earn for a stablecoin whose
  purpose is to be held.
- **The gap.** Every vault offers yield. None offer a record of how far you have come.

---

## 3 — The solution

A vault with a progression system.

- Deposit MUSD → receive **bMUSD receipt shares**, 1:1, no lock-up.
- **Yield accrues every second**, paid from MUSD the vault already holds.
- Cross a milestone → the vault mints an **ERC-721 achievement badge**.
- The dashboard always shows **progress toward the next badge**.
- Badges are **rendered from the contract**: each one is an SVG generated on-chain.

`6 milestones` · `1:1 receipt` · `ERC-721 badges` · `27 tests`

---

## 4 — Achievements

| Badge | Condition |
|-------|-----------|
| First Deposit | first MUSD deposited |
| Saved 100 MUSD | lifetime deposits ≥ 100 MUSD |
| Saved 500 MUSD | lifetime deposits ≥ 500 MUSD |
| Held for 7 Days | position held ≥ 7 days |
| Held for 30 Days | position held ≥ 30 days |
| Earned 10 MUSD in Yield | lifetime yield paid ≥ 10 MUSD |

One badge per holder, forever. The artwork lives in the contract as an SVG data URI, so it
can never be lost or edited.

---

## 5 — How it works

```
deposit(a)
  ├─ pull a MUSD, mint receipt shares 1:1
  └─ reward index starts accruing

index      += ratePerSecond × elapsed
pending     = shares × (index − snapshot)

withdraw()
  ├─ pay principal + accrued yield
  └─ burn receipt shares
```

- **Buffer-backed payouts.** Yield comes from MUSD held above principal, so payouts are
  always coverable and deposits are always fully backed: `assets ≥ principal`.
- **No owner withdrawal path.** The owner sets the rate, funds the buffer and pauses.
- **Wave 1 note.** The rate is owner-controlled so the demo can show accrual on camera. The
  UI labels it as a demo rate — it is never sold as a real APR.

---

## 6 — The demo (60 seconds)

1. **Connect** any Bitcoin or EVM wallet through Mezo Passport.
2. **Deposit** MUSD — approve once, receive receipt shares.
3. **Watch it accrue** — yield ticks up every second, progress bars move.
4. **Unlock** — the vault mints the badge the moment you cross a milestone.

No account, no lock-up, no custodian.

---

## 7 — What is built today

| Piece | Status |
|-------|--------|
| `BastionVault` — deposit, withdraw, reward index, milestone checks | done — live on testnet |
| `BastionReceipt` (ERC-20 `bMUSD`) — 1:1 claim on the vault | done |
| `BastionAchievements` (ERC-721) — badges with on-chain SVG metadata | done |
| Frontend — landing, dashboard with live yield, badge gallery | done — live |
| Tests — deposit/withdraw, accrual, all six badges, fuzz, invariants | 27 passing |

`0x1f01c11bc7372b4a42bf7a1d64d3862060b1218e` · chain `31611` · asset `MUSD` · gas `BTC`

---

## 8 — Roadmap

**Wave 1** — route the reward index at a genuine MUSD yield source instead of the controlled
demo rate.

**Wave 2** — more milestones: streaks, tiers, seasonal badges, transferable achievement
boosting.

**Beyond** — borrow against a Bastion position, keep earning on the collateral, and let
savings fund themselves.

**The long game:** making MUSD the savings asset that carries its own history.

---

*Bastion — savings with strength. Settled in MUSD on Mezo. Gas in BTC.*
