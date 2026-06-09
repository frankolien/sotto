---
project: sotto
consumer: claude-code
version: 1.0
date: 2026-06-08
description: Build handoff for the Sotto confidential-payout MVP on Canton Network, written for an AI coding agent scaffolding the project from a cold start.
---

# Sotto — Handoff for Claude Code

A note on the name before anything else: **Sotto is a working placeholder, not a final brand.** It appears throughout this document and in the code, and it is one find-and-replace away from being something else (candidate alternatives floated were Veil, Tacit, Umbra). Treat it as a token, not a commitment.

---

## Level 0 — Elevator Pitch
*Read this if you read nothing else.*

Sotto is a way for any organisation to pay many people at once — staff, contractors, suppliers — so that each person sees only their own payment, the organisation's full payout list stays private from competitors, an auditor can still verify everything, and the money settles in a single step.

*Stop here if you only needed to know what this is.*

---

## Level 1 — Executive Summary
*Read this if you are triaging whether to engage, or deciding what to build first.*

Sotto is a confidential payout rail built on the Canton Network. It lets a payer — a company, marketplace, fund, or aid agency — disburse value to many recipients in one batch where each payment is private to its recipient, the complete batch is provable to a permissioned auditor, and the batch settles atomically. It exists now because the three pieces it needs have only just arrived together: Canton makes transaction privacy a property of the ledger rather than an add-on, a confidential dollar settlement asset (USDCx, from Circle) went live in late 2025, and stablecoin-settled cross-border payouts are growing fast while running almost entirely on transparent rails that leak the payer's data. The gap Sotto fills is that no general-purpose payout rail is confidential by default and auditable by permission at the same time.

The immediate context is a hackathon — **Build on Canton, run by ENCODE Club, kicking off 15 June 2026**, in its Payments / Neobanking / Agentic Commerce track. Submission requires a public repository, a deck, a three-minute video with a demo, and a live product. Judging weighs technical execution, originality, UX, and real-world applicability. The builder is solo and strong in Flutter, newer to backend and to Daml (Canton's smart-contract language).

What you, Claude Code, are being asked to produce is the **hackathon MVP**: a working confidential-payout demo on a local Canton network, with a Daml model (already drafted — see Level 4), a thin backend over Canton's JSON Ledger API, and a Flutter UI that shows three views — payer, recipient, auditor — proving the privacy live. Not the full product, not the startup, not production money movement. The MVP, scoped tightly enough for one person to finish and demo in roughly three weeks.

*Stop here if you are not the agent or engineer doing the build.*

---

## Level 2 — Product Overview
*Read this if you need to understand what the thing is before you build it.*

The tagline is "confidential payout infrastructure on Canton," and the one-line thesis is that **privacy should be a property of the rail, not a feature of the app.** Every other on-chain payout rail forces a false choice: a transparent chain that is fast and cheap but publishes the entire payout ledger to anyone, or a traditional rail that keeps data private but settles in days, fails in pieces, and cannot prove to an auditor that funds reached the right people. Sotto is the rail where confidentiality is built in and auditability is granted selectively.

The audience, concretely, is the **payer** — and this is load-bearing. The value of privacy here is almost entirely on the paying side, not the receiving side. An individual contractor wants speed and a clean cash-out, not anonymity; a company, a marketplace, or an aid agency very much does not want its salary bands, supplier terms, take-rate, or beneficiary list broadcast. So the customer is an organisation that pays many people and cannot afford to publish that activity. The first commercial wedge is cross-border contractor and marketplace payouts in emerging markets (the builder is in Lagos, which is a genuine edge here); a second, later vertical is aid and grant disbursement, where recipient privacy and donor audit are both mandatory and impossible to satisfy together on a transparent chain. These two are one platform with one technical core; they differ only in go-to-market, and for the hackathon the aid case is the emotional hook in the pitch while the commercial case is the business model.

How the product works, end to end: a payer establishes a **mandate** — an on-ledger spending authority with a cap, an allow-list of recipients, and a threshold above which a second approver must sign off. The payer funds a treasury in the settlement asset, then runs a payout batch against the mandate. The batch settles as a single atomic transaction: every payment clears or none does. Each recipient can see only their own payment; a named auditor sees the entire batch; nobody else — no other recipient, no competitor, no member of the public — sees anything. A payment above the threshold cannot pass through the normal batch path; it is raised as a proposal and held until the approver signs, on the ledger. In production the settlement asset is USDCx and recipients cash out to local currency through off-ramp partners; for the hackathon, settlement uses a self-issued test token (or Canton Coin) on a local network.

What Sotto is **not**, and this matters more than what it is. It is **not a wallet** — it is a payout rail that organisations call, not an app a person opens to hold tokens. It is **not another freelancer receiving app** — that lane (Hurupay, Cleva, Raenest, Yellow Card, Deel) is crowded, payee-side, and on transparent chains; Sotto is payer-side and confidential. It is **not an AI agent** — an earlier framing included one and it was deliberately cut; the "stop a suspicious payment" behaviour is achieved by an on-ledger maker-checker rule, not a model. It is **not an enterprise-payroll clone** — Toku and Cantor8 already ran the first private payroll on Canton for a large enterprise in February 2026; Sotto's room is the SME, marketplace, and non-employment payouts they do not chase. And it is **not, at MVP, a regulated money transmitter** — moving real money is a licensed, compliance-heavy business that the eventual company will reach through partners, not something the demo touches.

*Stop here if you are writing the pitch, the deck, or the marketing site rather than the code.*

---

## Level 3 — Vocabulary and Anti-Patterns
*Read this if you will write code, copy, or commits that need to use the project's language consistently.*

The voice is builder-mode: plain, direct, technically precise, and quietly institutional. Sotto is a serious financial rail, not a crypto novelty, so the register avoids hype and avoids crypto-native slang. When privacy is described, it is described as a property the rail guarantees, never as something the app tries to add.

The canonical glossary, with terms to use and terms to avoid:

| Term | Meaning |
|---|---|
| **Payer** | The organisation disbursing funds (the customer). |
| **Recipient** | A party receiving one payment in a batch. |
| **Auditor** | A permissioned party with read-only visibility into a whole batch. |
| **Approver** | The second signer in the maker-checker flow for over-threshold payments. |
| **Issuer** | The party that issues the settlement token (e.g. the USDCx issuer). |
| **Mandate** | An on-ledger contract encoding a payer's spending authority: cap, allow-list, threshold. |
| **Holding** | The settlement token contract; visible only to its issuer and owner. |
| **DisbursementReceipt** | The per-payment record that gives the auditor a full-batch view while each recipient sees only their own. |
| **Maker-checker** | The control where a payment over the threshold needs a second party's on-ledger sign-off. |
| **Atomic batch** | A payout where all payments settle in one transaction or none do. |
| **Sub-transaction privacy** | Canton's property that only the parties to a contract can see it. |
| **Party / signatory / observer** | Daml's authorization and visibility primitives; signatories authorise and can see, observers can only see. |
| **Global Synchronizer** | Canton's ordering layer, which sequences transactions without seeing their contents. |
| **LocalNet / DevNet** | Canton's local development network and public test network. |
| **cn-quickstart** | Digital Asset's starter repository: a working Daml model, backend, frontend, and LocalNet. |
| **JSON Ledger API** | Canton's HTTP/JSON interface to a participant node — how the backend talks to the ledger. |

Use these words: payout, disbursement, confidential, private-by-default, auditable-by-permission, atomic settlement, mandate, rail. Avoid these: wallet (Sotto is not one), mixer or anonymity (Sotto is auditable, the opposite of a mixer), AI agent (cut from scope), and "blockchain app" as a self-description (it is a payout rail).

The anti-patterns, in the imperative, because each one is a real way this build goes wrong:

Do not mock or simulate the privacy. On Canton it is free — it comes from how the Daml contracts declare signatories and observers — and faking it produces a weaker submission than doing the real thing. Do not bridge real USDC for the demo; USDCx in and out runs through Ethereum and is awkward locally — use a self-issued Daml token or Canton Coin on LocalNet and frame USDCx as the production asset. Do not stand up a real Canton validator; mainnet is invite-only and a real node is heavy — develop and demo on LocalNet. Do not build both a mobile app and a web app; pick one surface and put all three views behind a role switcher. Do not add KYC, off-ramps, or compliance integrations to the MVP. Do not reintroduce an AI agent. Do not let scope drift past what appears in the three-minute video.

*Stop here if you are not the build agent.*

---

## Level 4 — Working Spec: Canton MVP
*Read this if you are the agent or engineer building the hackathon MVP. This is the core of the handoff.*

### Architecture

The system is four conceptual layers stacked on Canton, and they map directly onto the litepaper's architecture (per the litepaper's section four, the protocol is Disclosure, Settlement, and Authorization, with surfaces above and the network below). For the MVP the realised shape is: a **Flutter UI** (the surface) talks over REST to a **thin backend**, which talks over the **JSON Ledger API** to a **Canton participant node running on LocalNet**, on which the **Daml model** holds all the privacy, settlement, and authorization logic. The Flutter app never talks to the ledger directly — there is no Dart/Canton SDK, and it does not need one. The differentiator lives entirely in the Daml; everything else is plumbing and presentation.

### Domain model

The Daml model is already drafted and shipped as `Sotto.daml` (in `/mnt/user-data/outputs/`, see Level 6). It is a v0 written without a compiler in front of it, so the first build task is to compile it in Daml Studio and fix any small syntax issues the compiler surfaces. The model is four templates plus a runnable demo script:

| Template | Signatory | Observer | Purpose |
|---|---|---|---|
| `Holding` | issuer | owner | The settlement token. Issuer-only signatory so a batch can pay recipients without each one interactively accepting; owner-as-observer so only issuer and owner can see a holding (this is per-recipient balance privacy). |
| `DisbursementReceipt` | payer, issuer | recipient, auditor | The per-payment audit record. Each recipient sees only their own; the auditor sees every receipt in a batch. This asymmetry is the demo. |
| `PayoutMandate` | payer, issuer | auditor | The on-ledger spending authority. Holds cap, threshold, and the recipient allow-list. Its `Disburse` choice (nonconsuming) checks every line against cap/allow-list/threshold, then settles the whole batch in one transaction — burning the treasury, paying each recipient, returning change, and writing receipts. Atomicity is automatic: any failed check rolls the whole batch back. |
| `LargePaymentProposal` | payer, issuer | approver, auditor | The maker-checker path. A payment over the mandate threshold is raised here and held until the `Approve` choice (controller: approver) settles it, or `Reject` cancels it. |

The privacy is not enforced in application code anywhere — it is a consequence of those signatory and observer lists. That is the single most important thing to preserve: if a future change makes the auditor an observer of `Holding`, or drops the recipient from a receipt, the privacy guarantee breaks. The `demo` script at the bottom of `Sotto.daml` allocates parties, funds a treasury, runs an atomic batch, shows an over-threshold payment being rejected by `Disburse` and then approved via `LargePaymentProposal`. Run it in Daml Studio's Script results pane first — it lets you see, per party, that one recipient cannot see another's payment while the auditor sees both, before any UI exists.

### Repository layout

Scaffold from cn-quickstart and shape the repo as a monorepo:

```
sotto/
  daml/            # Sotto.daml lives here; the Daml project + the model
  backend/         # thin service over the JSON Ledger API (REST -> ledger)
  frontend/        # Flutter app: one surface, role switcher (payer/recipient/auditor)
  README.md        # what it is, how to run it, the demo script
  docs/            # litepaper (md + pdf) and this handoff
```

### Decisions already made (ADRs)

| Decision | Rationale |
|---|---|
| Build a confidential payout **rail**, not a wallet or AI agent | Differentiated, on-thesis for Canton, and legible end-user value; a wallet or agent would be crowded or look like an "AI wrapper." |
| **No AI agent**; use on-ledger maker-checker instead | The over-threshold "halt for approval" behaviour is stronger and more institutional as a Daml rule than as a model decision, and the builder chose not to build AI. |
| Privacy is **real Daml**, never mocked | Canton provides it for free via signatories/observers; faking it is both unnecessary and a hackathon liability under technical-execution judging. |
| **Payer-side privacy** is the value | Privacy is a must-have for the paying organisation and only a nice-to-have for the individual payee. |
| **Self-issued token / Canton Coin** for the demo; USDCx in production | Bridging real USDC runs through Ethereum and is awkward on a local network. |
| **LocalNet** for dev and demo; no real validator | Mainnet is invite-only; a real node needs static IP, OIDC, and container orchestration. |
| **One UI surface** with a role switcher | Solo scope; building mobile and web both is too much for the timeline. |
| **Commercial-first** go-to-market, aid as a later vertical | One technical platform; the company sequences the markets even though the demo can tell both stories. |

### Demo arc (what the three-minute video must show)

Four beats. One, a payer sets a mandate — cap, approved recipients — on one clean screen. Two, the payer runs a payout batch and it settles atomically. Three, the view switches live between payer, recipient, and auditor: the recipient sees only their own payment, the auditor sees the whole batch. Four, a payment over the threshold is held until a second approver signs, then settles. The line to land on beat four is that the guardrail is enforced by the ledger, not by trusting any operator or model.

### Scope

| In scope (build only this) | Out of scope (resist) |
|---|---|
| The four-template Daml model, compiling and green | Real USDCx or any token bridging |
| One payout type — payroll | Off-ramp / local cash-out |
| Three views in one surface, role-switched | KYC / AML / compliance integrations |
| A self-issued test token on LocalNet | Multiple payout types |
| Happy-path batch + over-threshold approval | Mobile and web both |
| A reachable live URL and a 3-minute video | Custom auth beyond what cn-quickstart ships |

### Suggested sequence (about three weeks from 15 June)

Week one is environment and Daml: get cn-quickstart running on LocalNet, get `Sotto.daml` compiling, get the demo script green. This is the hard part — front-load it. Week two is integration and UI: wire the JSON Ledger API into the backend and build the three Flutter views against it. Week three is polish, a deployed live URL, the video, and the deck — and leave buffer, because week three always slips.

*Stop here if you have what you need to start building.*

---

## Level 5 — Technical Recommendations
*Read this for the recommended stack, environments, and delivery logistics.*

The recommended stack follows the layers above. Smart contracts in **Daml**, run on **Canton LocalNet** via Docker. Scaffold from **cn-quickstart** (Digital Asset's starter) rather than starting cold — it bundles a working Daml model, a backend, a web frontend, LocalNet, and OIDC auth, so the work is reshaping it, not assembling it. The backend talks to the participant node over the **JSON Ledger API**; the lowest-effort path is to extend cn-quickstart's existing **Java/Spring** backend, and the alternative — if a lighter, more familiar service is preferred — is a thin **Node/TypeScript** layer calling the same API. Either is fine; do not rewrite what the quickstart provides without a reason. Auth comes from the quickstart's **OAuth/OIDC (Keycloak)** setup. The frontend is **Flutter** (the builder's strength): one surface, with a role switcher for payer, recipient, and auditor, talking to the backend over REST. The settlement asset for the demo is a self-issued Daml token or **Canton Coin**; USDCx is the production asset, named in the pitch but not integrated.

Environments progress from LocalNet (development and ideally the demo) to DevNet (the public test network) if a hosted, always-on instance is needed for the live-URL requirement. For delivery, the frontend can sit on Vercel, Netlify, or Firebase Hosting; the backend on Fly.io, Render, or Railway; and the live link points either at a participant on DevNet or at a LocalNet hosted on a small VM for the judging window. Getting a reachable live URL is the fiddliest piece of the whole build — budget a dedicated day for it, because "live product" is a hard submission requirement.

The constraints worth holding in mind: there is no Dart or Flutter SDK for Canton, so the mobile/web layer always goes through the backend; mainnet is invite-only, so production access is a partner-or-sponsor decision, not a sign-up; and real USDCx movement depends on Ethereum, which is why it stays out of the local demo.

*Stop here unless you need the source trail or the open questions.*

---

## Level 6 — Source Material and Open Questions
*Read this if you are verifying a claim above, or you are the originating party preparing to brief the consumer.*

### Source material

This handoff was assembled entirely from a single working session (8 June 2026) in which the project was taken from a blank idea to a scoped MVP, plus the two artifacts that session produced, both in `/mnt/user-data/outputs/`. The first is the **litepaper** (`sotto-litepaper.md` and `sotto-litepaper.pdf`), which is the canonical statement of the problem, the architecture, the positioning, and the roadmap; treat it as the source of truth for anything in Levels 1–3. The second is **`Sotto.daml`**, the drafted domain model described in Level 4; treat it as the starting point for the code, not as compiler-verified truth. The market and competitive facts referenced throughout (USDCx being live, Visa as a Canton super-validator, the Toku and Cantor8 private payroll in February 2026, the scale of stablecoin payouts in Sub-Saharan Africa, the crowded freelancer-receiving and B2B-payout landscapes) were established by web research during that session and are cited more fully in the litepaper's references.

### Open questions to resolve

Several decisions were deliberately left open and should be settled early, ideally before or during the first build week. The **final product name** is unresolved — Sotto is a placeholder. The **backend language** is a genuine fork: reuse cn-quickstart's Java/Spring backend for speed, or write a thin Node/TypeScript service for familiarity. The **single UI surface** needs picking — Flutter web is likely easier for a console-heavy, view-switching demo, while mobile leans into the recipient story; one or the other, not both. The **exact cn-quickstart repository and its setup commands** need to be confirmed against the current repo (they were not verified in-session). The **demo settlement token** — Canton Coin versus a self-issued Daml token — should be chosen on whichever is simpler to mint and show on LocalNet. And the **live-URL hosting approach** — a DevNet participant versus a hosted LocalNet on a VM — is unsettled and is the riskiest logistic. Finally, `Sotto.daml` itself is a **v0 awaiting compiler validation**; expect small syntax fixes on first open in Daml Studio.

### Intentionally excluded

This handoff omits, by design, the things that are real for the company but not for the MVP build. The **AI agent** is gone (a deliberate scope cut, noted here only because earlier framings used it). The **aid and grant vertical**, the **off-ramp and compliance partnerships**, the **regulatory and licensing path**, and the **founding-team shape** were all discussed in the originating session but belong to the startup, not the hackathon, and would only dilute a build agent's context — they live in the conversation and the litepaper's roadmap if needed. Real **USDCx integration** is excluded for the local-demo reasons given above.

### What the previous agent was about to do

The session ended at the threshold of building. The immediate next step was to **stand up cn-quickstart on LocalNet** so there is somewhere to compile the model — the previous agent had just offered to pull the exact clone-and-run commands from the repository and walk through getting it green. After that, the planned order was: compile `Sotto.daml` and get the `demo` script passing in Daml Studio, then wire the JSON Ledger API into a thin backend, then build the three Flutter views against it. That is where you are picking up.

*End of handoff.*
