# Sotto — Demo Video Guide

A shoot-ready script for the 3-minute submission video. Read the **Say** column
near-verbatim; **Do** is exactly what's on screen.

The whole pitch is one idea: **same batch, four kinds of eyes.** If you only get
one clean take, get the payer → recipient cut.

---

## 0 · Before you record

**Setup**
- `cd web && npm run dev` → open **http://localhost:3000** in a clean window
- Browser at **1280×800** (or record full-screen, crop to 16:9), zoom 100%
- Hide the bookmarks bar, close other tabs, turn on Do Not Disturb
- Start in **dark theme** (the hero default)
- Make the cursor large/visible (macOS → Accessibility → Pointer size)

**Recording order matters — the console reseeds on every reload.** Record in this
order so each state is "fresh":

1. **Payer first** — loads *unsettled*, so you can show the payout actually happen.
2. Then **recipient / approver / auditor** — these load already-settled, perfect
   for the privacy split.

Re-record any lens by hard-reloading its URL (resets to seed).

**Tool:** [Screen Studio](https://screen.studio) gives the Vercel/Stripe feel —
auto-zoom on clicks + smooth cursor. Loom or QuickTime work for a quick cut.

---

## 1 · The 3-minute script

| Time | Do (on screen) | Say (voiceover) |
|---|---|---|
| **0:00–0:15** · Hook | Landing hero, still. | "Every blockchain payment is public by default. Pay your whole team in one transaction, and you've just shown every employee what everyone else earns. That's why payroll, grants, and token payouts still run off-chain. Sotto fixes that." |
| **0:15–0:35** · Reveal | Let the **lens-ledger** in the hero cycle through all four lenses once. | "Sotto is a confidential payout rail on Canton. One batch pays everyone at once — but each party sees only what they're allowed to. Same ledger. Four kinds of eyes." |
| **0:35–1:10** · Payer | Go to **`/app?lens=payer`**. Show the batch (6 rows). Click **Pay out batch** → let the spinner run → banner drops, rows flip Queued → Settled, treasury falls. | "This is the payer — the company running payroll. They see the whole batch: six people, every name and amount. One line — Kwame's 32,000 — is over the approval threshold. Watch the payout. Five lines settle on Canton in one atomic transaction: all or nothing. The treasury drops. And the over-threshold payment is held — it can't move without a second signature." |
| **1:10–1:35** · Recipient | Switch to **`/app?lens=recipient&view=batch`**. Point at Amara's settled line; sweep the 5 confidential rows. | "Now the exact same batch, seen by a recipient. Amara sees her 4,200 — and nothing else. The other five aren't blurred or redacted. They never arrived. She can't even learn how many other people got paid. That privacy isn't enforced by my app — it's enforced by the ledger." |
| **1:35–2:05** · Approver + Auditor | **`/app?lens=approver`** (the single 32,000 awaiting). Then **`/app?lens=auditor`** (all 6 receipts). | "The approver is the second signature — they see only the payment that needs them, not the routine lines that already settled. Maker-checker, on-chain. The auditor, named on the mandate, sees every receipt — read-only. Visibility here is granted on purpose, never assumed, and never lets anyone move funds." |
| **2:05–2:40** · Proof | Back to landing, scroll to the **On Canton** section. Let the proof rows sit on screen. | "This isn't a mockup of privacy. On Canton it's real: the batch settles atomically, each disbursement writes a receipt only its recipient and auditor can read, auth is RS256 over JWKS, and a request for someone else's line comes back 403 — refused by the ledger, not by me." |
| **2:40–3:00** · Close | Toggle to **light theme** for a beat, land on the hero. | "Sotto — pay everyone at once, show each person only their line, let an auditor verify all of it. The web console runs on sample data so it's rock-solid to demo; the confidentiality and settlement are real on the Canton backend in this same repo. Confidential payouts, enforced by the ledger. Thanks for watching." |

---

## 2 · 60-second cut (if they cap you)

Hook (0:00–0:10) → Payer payout (0:10–0:30) → Recipient privacy split
(0:30–0:45) → one proof line + close (0:45–1:00). Drop approver/auditor and the
theme toggle. Protect the **payer → recipient** contrast above everything else.

---

## 3 · Recording tips

- **Pause ~1s after each click** before talking — let the settle animation
  breathe; trim it later.
- **Don't narrate the clicking** ("now I'll click here…") — narrate the *meaning*.
- Numbers are the proof: linger on the treasury dropping and Amara's lone line.
- One continuous take per lens; stitch in the edit.
- End on the landing hero, not a dashboard — leave them with the brand.

---

## 4 · The numbers, for reference

| Thing | Value |
|---|---|
| Batch | Lumen Studio · 6 contributors |
| Batch total | 52,550 USDCx |
| Threshold | 25,000 (per payment) |
| Over-threshold line | Kwame Nyong · 32,000 (held for approval) |
| Recipient lens follows | Amara Okafor · 4,200 |
| Treasury seed (payer) | 312,480 → 291,930 after the 5 lines settle → 259,930 if Kwame is approved |
| Auditor / Approver | Hale & Co. (read-only) · Priya Raman (second signer) |

These figures are **seeded sample data** in the web console — deliberately, so the
demo never depends on a live chain. The privacy and settlement *mechanism* is real
on the Canton backend in this repo. Say that out loud in the close; it reads as a
strength.
