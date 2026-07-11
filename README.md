# Sotto

**Confidential payout infrastructure on the Canton Network.**

> *Sotto* is a working placeholder name — one find-and-replace from final.

Sotto lets an organisation pay many people at once — staff, contractors, suppliers, beneficiaries — so that **each recipient sees only their own payment**, **the full payout list stays private** from competitors and the public, **a permissioned auditor can verify the entire batch**, and **the money settles atomically** (all payments clear or none do).

Privacy here is not a feature the app bolts on. It is a property of the rail: it falls directly out of how the Daml contracts declare their signatories and observers on Canton. See [docs/handoff.md](docs/handoff.md) and [docs/sotto-litepaper.pdf](docs/sotto-litepaper.pdf) for the full thesis.

This repository is the **hackathon MVP** for *Build on Canton* (ENCODE Club, kicks off 15 June 2026).

---

## Live on Canton DevNet ✅

Sotto is **deployed and running on the Canton Network DevNet** — not a local sandbox. The
four Daml contracts are uploaded to a live participant, and the backend in this repo drives
the whole payout flow — atomic settle, maker-checker, per-party privacy — against that node
over the real JSON Ledger API.

| | |
|---|---|
| **Network** | Canton **DevNet** |
| **Package ID** | `234ef2a25479923e655f59db3df946705bd3a4476d8b95e03d8cd2ceb73f23fa` — the SHA-256 of the Daml in [`daml/sotto`](daml/sotto); it *is* the `.dar` in this repo, byte-for-byte |
| **Participant** | `PAR::hackcanton-devnet-2::1220…effa668` (operated by NODERS, via 5N Seaport) |
| **Parties** | `payer-sotto`, `recipient-sotto`, `recipient2-sotto`, `approver-sotto`, `auditor-sotto` |
| **Explorer** | [Lighthouse — verify it yourself](https://lighthouse.devnet.cantonloop.com/party/hackcanton-devnet-1%3A%3A122003aa7c491e00a453145c4d2cd3dbf5db8908b4e663c9944baed57fd66effa668/validator) |

**Verified on-chain**, read back through the backend's own API — every figure is Canton's
answer to *that party's* token, not the app's choice:

| after | payer | recipient (Amara) | approver | auditor |
|---|---|---|---|---|
| **settle** | treasury 308,280 · Amara ✓ / Kwame held | **sees only her own 4,200** | **sees only Kwame's line** | sees both lines |
| **approve** | treasury 276,280 · both settled | 4,200 | Kwame settled | both settled |

Treasury math (312,480 → −4,200 → −32,000 = 276,280) is the ledger's. Run it against devnet
yourself with `cd backend && LEDGER_MODE=devnet npm start` (needs devnet credentials in
`backend/.env.local`). The web console points at the backend via `NEXT_PUBLIC_API_URL` and
falls back to seeded data if the node is unreachable — so the demo is always solid.

---

## Judges — start here

1. **Run the web console** (the submission surface):
   ```bash
   cd web && npm install && npm run dev
   ```
   Open **http://localhost:3000**, click **See it live**, then switch the identity
   (Payer / Recipient / Approver / Auditor) to watch the *same* batch project a
   different view to each party.
2. **Get the story fast:** the one-read briefing
   [docs/sotto-canton-briefing.pdf](docs/sotto-canton-briefing.pdf) explains what Canton
   is, what Sotto does, and answers the questions a judge is likely to ask. The on-screen
   demo script is [web/DEMO.md](web/DEMO.md), the pitch outline [docs/DECK.md](docs/DECK.md),
   and reference screenshots are in [docs/shots/](docs/shots/).
3. **See that it's real on Canton:** the privacy and settlement the console shows are
   proven by the Daml model and the backend below — run `dpm test` (last section) to
   watch each party's visibility get *asserted*, not just narrated.

> **Honesty note:** the *public* web console defaults to **seeded sample figures** so the
> demo is rock-solid and never depends on a live chain being up — but the same console runs
> on **live Canton DevNet** when pointed at the backend (see [Live on Canton DevNet](#live-on-canton-devnet-)
> above). The confidentiality and atomic settlement it shows are the *real* mechanism —
> implemented in the Daml model and proven on devnet through the backend in this same repo.

---

## The privacy model (the whole point)

| Contract | Signatory | Observer | What it guarantees |
|---|---|---|---|
| `Holding` (settlement token) | issuer | owner | Only the issuer and the owner see a balance. Recipients never see one another's holdings. |
| `DisbursementReceipt` | payer, issuer | recipient, auditor | Each recipient sees **only their own** payment; the auditor sees **every** receipt in the batch. This asymmetry is the demo. |
| `PayoutMandate` | payer, issuer | auditor | The on-ledger spending authority: cap, threshold, recipient allow-list. Its `Disburse` choice settles a whole batch atomically. |
| `LargePaymentProposal` | payer, issuer | approver, auditor | Maker-checker: a payment over the mandate threshold is held until a second party (the approver) signs, on-ledger. |

## Repository layout

```
sotto/
  daml/
    sotto/         # the four confidential-payout templates (uploaded to participants)
    sotto-tests/   # the runnable demo + privacy assertions (data-depends on sotto)
    multi-package.yaml
  backend/         # REST service over Canton's JSON Ledger API; RS256/JWKS auth, JIT wallets
  web/             # Next.js console + landing — the hackathon submission surface
  frontend/        # Flutter app: one surface, role switcher — the long-term client
  docs/            # litepaper, build handoff, pitch deck outline
```

The Daml is split the way cn-quickstart splits `licensing` / `licensing-tests`: the
templates package carries no `daml-script` dependency, so the DAR uploaded to a
participant stays lean. The scripts (and the privacy proofs) live in `sotto-tests`.

## Surfaces

- **`web/`** — the submission. A premium Next.js 16 + Tailwind v4 console and landing
  page. Dark-first, monochrome + one indigo accent, IBM Plex Mono for ledger figures.
  Four identities (payer/recipient/approver/auditor) each get a real dashboard view of
  one shared batch. Self-contained sample data; light/dark theme; deep-linkable via
  `?lens=` and `?view=`. See [web/README.md](web/README.md).
- **`backend/`** — a thin REST service over Canton's JSON Ledger API. RS256/JWKS auth
  (Canton's `jwt-jwks` token type), just-in-time wallet provisioning per subject, and
  read/write of real `Holding` / `DisbursementReceipt` contracts.
- **`frontend/`** — the Flutter client, the long-term product surface. Same four-lens
  story, mobile-native.

## Signing in — no wallets to connect

Canton isn't MetaMask. There's no browser extension and no seed phrase: a user signs in
with email / SSO (a JWT validated against JWKS), and the backend provisions their Canton
party **just-in-time**. Recipients custody nothing and never manage a key; the treasury
can self-custody via Canton's external signing when an org wants it. The crypto is
invisible — the privacy is the only thing you notice.

## Toolchain

- **Daml SDK via `dpm`** (Digital Asset Package Manager) — the model targets Daml 3.x (Canton 3.x), matching `cn-quickstart`.
- **Node 20** — backend (TypeScript/Express) and the web app (Next.js 16).
- **Docker** — for a local Canton network when the demo moves on-ledger.
- **Flutter** — the long-term mobile surface.

## Quick start — web console (the demo)

Requires Node 20+.

```bash
cd web
npm install
npm run dev        # http://localhost:3000
```

Landing page → **See it live** → switch identity to see one batch through four lenses.
Recording walkthrough: [web/DEMO.md](web/DEMO.md).

## Quick start — Daml model (the proof)

Requires the Daml SDK (`dpm`). Install: `curl https://get.digitalasset.com/install/install.sh | sh`.

```bash
cd daml
dpm build --all                 # build the templates + tests packages
cd sotto-tests && dpm test      # run the demo; inspect per-party visibility
```

Expected: `Sotto/Scripts/Demo.daml:demo: ok, 9 active contracts, 7 transactions.`

> The `demo` script in [daml/sotto-tests/daml/Sotto/Scripts/Demo.daml](daml/sotto-tests/daml/Sotto/Scripts/Demo.daml)
> allocates parties, funds a treasury, runs an atomic batch, shows an over-threshold payment rejected by
> `Disburse` and then approved via the maker-checker `LargePaymentProposal` — then **asserts** that each recipient
> sees only their own receipt, the auditor all of them, recipients see only holdings they own, and the mandate is
> invisible to recipients. That is the entire privacy story, proven before any UI exists.
