# Sotto — Pitch Deck Outline

~10 slides for *Build on Canton* (ENCODE Club). Each slide: what's **on the slide**
(keep it sparse — one idea, big type) and a **say** note (what you talk to). Mirrors
the structure of the demo video so the deck and the screen-share reinforce each other.

Design to match the web app: near-black background, one indigo accent (#6e5bf6),
IBM Plex Mono for any numbers, lots of negative space. No bullet soup.

---

## 1 · Title

**On slide:** `Sotto` · the mark (ring + dot) · "Confidential payouts on a public
ledger." · your name + "Build on Canton".

**Say:** One line. "Sotto makes blockchain payouts private — by default, enforced by
the ledger."

---

## 2 · The problem

**On slide:** "Every blockchain payment is public by default." Below it, a faded
batch where *every* salary is visible to *everyone*.

**Say:** Pay your whole team in one on-chain transaction and you've published the
payroll. So payroll, grants, supplier runs, and token distributions still happen
off-chain — or leak. Privacy is the thing keeping real money off public rails.

---

## 3 · The insight

**On slide:** "Same batch. Four kinds of eyes." The four lens labels: Payer ·
Recipient · Approver · Auditor.

**Say:** A payout isn't one audience — it's four. The payer needs to see everything.
Each recipient should see only their own line. An approver signs only the big ones.
An auditor verifies all of it, read-only. The trick is serving all four from **one**
ledger without leaking across them.

---

## 4 · The product

**On slide:** A clean shot of the console (payer view, full batch). Caption: "One
batch in. Four private views out."

**Say:** Sotto is that rail. One company funds a treasury, defines a mandate, drops
in a batch — and the ledger projects the right view to each party. This is the web
console; there's a mobile client too.

---

## 5 · The demo (live / recorded)

**On slide:** Just the words "Live demo" — or embed the 3-min video. Don't compete
with the screen.

**Say:** Drive the payer → recipient cut. *Show*, don't tell: 6 visible rows collapse
to 1 the instant you switch to the recipient. Then the payout settling atomically and
the over-threshold line held. (Follow `DEMO.md`.)

---

## 6 · How it works — the privacy model

**On slide:** The four-contract table, trimmed to Contract → Who sees it:

| Contract | Who sees it |
|---|---|
| `Holding` | issuer + owner only |
| `DisbursementReceipt` | its recipient + the auditor |
| `PayoutMandate` | payer + auditor (atomic `Disburse`) |
| `LargePaymentProposal` | adds the approver (maker-checker) |

**Say:** This is the whole thing. Privacy isn't a filter in my app — it's the
signatory/observer declaration on each Daml contract. The recipient endpoint can't
return someone else's line because the ledger **never disclosed it to them**. It's
machine-checked: a Daml script asserts each party sees exactly their slice, before any
UI exists.

---

## 7 · Why Canton

**On slide:** "Sub-transaction privacy + atomic settlement — in one L1." Logos/wordmarks:
Daml · Canton.

**Say:** Most chains force a choice: public and atomic, or private and siloed. Canton
gives sub-transaction privacy *and* atomic multi-party settlement natively — so a batch
clears all-or-nothing while each party sees only their part. No other L1 makes this the
default. That's why Sotto is on Canton, not bolted onto a public chain with mixers.

---

## 8 · What's real today

**On slide:** Three ticks — "Daml model: 4 templates, privacy proven in script" ·
"Backend: REST over Canton's JSON Ledger API, RS256/JWKS auth, JIT wallets" · "Clients:
web console + Flutter app."

**Say:** The model compiles and its privacy is asserted green. The backend reads and
writes real Holding contracts over the JSON Ledger API with RS256/JWKS auth and
just-in-time wallet provisioning. The web console you saw runs on seeded figures so the
demo is rock-solid — the *mechanism* underneath is the real Canton path in this repo.

---

## 9 · Where it goes — market

**On slide:** "Payments & neobanking (primary) · RWA & tokenized deposits (secondary)."
One line of TAM-ish framing.

**Say:** First wedge: confidential payroll and contractor payouts for orgs that already
want stablecoin rails but can't expose comp. Then supplier settlement, grant
disbursement, and tokenized-deposit payouts — anywhere many private payments must settle
together and be auditable without being public.

---

## 10 · Close / ask

**On slide:** "Sotto — pay everyone at once, show each person only their line, let an
auditor verify all of it." · repo / demo link · contact.

**Say:** Confidential payouts, enforced by the ledger. Web is the submission; mobile is
the long-term surface. Here's the repo and the live demo — thanks.

---

### Notes
- **Slide count discipline:** 10 max. If pitch time is short, cut 7 (why-Canton folds
  into 6) and 9 (market) — never cut 2, 3, 5, 6.
- **One accent color, one font for numbers.** Let the product screenshots carry the
  polish; the deck just frames them.
- Keep the **honesty line** (slide 8) in — judges trust a team that says which parts are
  seeded and which are real.
