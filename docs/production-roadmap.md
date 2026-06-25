# Sotto — Production & Compliance Roadmap

_From demo to a real confidential-payout rail on Canton._
**Status:** planning · **Custody model:** Hybrid (custodial first, self-custody path) · **Last updated:** 2026-06-10

---

## 0. How to read this

This is the map of the whole mountain. It is deliberately honest: most of the
distance between what we have and a real product is **not application code** —
it is identity, persistence, a real asset, custody, and a stack of regulatory
work that no amount of Flutter or Daml fixes.

The document is organised as:

1. Where we actually are (no varnish)
2. What "real" looks like — the target architecture
3. The privacy & custody model in production (the heart of it)
4. Technical workstreams, each mapped to the code that changes
5. Asset & money movement
6. Compliance & legal
7. Security
8. Infrastructure & operations
9. Product surface
10. Team & cost drivers
11. Phased roadmap with go/no-go gates
12. Open questions & decisions log

If you read nothing else, read **§3** (why one backend can't impersonate everyone),
**§6** (the licensing wall) and **§11** (the phase gates).

---

## 1. Where we actually are

### Real, and worth keeping
- **The Daml model** (`daml/sotto`): `Holding`, `PayoutMandate` (Disburse),
  `LargePaymentProposal` (Approve/Reject), `DisbursementReceipt`. Privacy is
  expressed correctly through signatory/observer lists. This is production-shaped.
- **Canton's per-party privacy** is genuinely enforced — a recipient sees only
  their own line, the auditor sees the batch, the approver sees only the
  over-threshold line. Verified on a real Canton 3.5.1 ledger.
- **The flows**: atomic batch settlement, over-threshold maker-checker, the
  editable roster, real distinct approver/auditor parties.

### Demo scaffolding that must be replaced
| Area | Today (demo) | Why it can't ship |
|---|---|---|
| **Trust boundary** | One Node backend holds `actAs` for issuer/payer/approver and reads every party's ACS (`backend/src/services/ledger.service.ts`) | Only works because the sandbox has **auth wide open**. It can see and sign for everyone — it _is_ the privacy leak. See §3. |
| **State** | In-memory maps (`lineStatus`, `mandateCid`, `proposalCid`) | Lost on restart; not the source of truth; can't scale or audit. |
| **Ledger** | `dpm sandbox` — in-memory, single node, no auth, no persistence | Restart = total data loss; not a network; not secured. |
| **Asset** | Issuer mints `Holding` for free, nothing behind it | No value, no backing, no on/off ramp. |
| **Identity** | Parties allocated by name-hint; "switch view" god-switcher | No real users, no KYC, no keys, no accounts. |
| **Disclosure hack** | Approve uses `readAs [payer]` so the approver can read the treasury Holding | A demo shortcut; production needs **explicit disclosure** of that one contract (§4.3). |

---

## 2. Target architecture

```
                       ┌─────────────────────────────────────────────┐
   Mobile / web        │                Sotto Platform                │
   (per-party app) ──► │  IAM / OAuth ── API gateway ── per-party     │
                       │                                services      │
                       │       │                          │          │
                       │       ▼                          ▼          │
                       │  Read model (PQS → Postgres)   Command       │
                       │  per-party scoped queries      submission    │
                       └───────┬──────────────────────────┬──────────┘
                               │                           │  JWT (actAs scoped)
                       ┌───────▼───────────────────────────▼──────────┐
                       │   Canton participant node(s)  + key custody  │
                       │   (HSM / MPC)        topology / parties       │
                       └───────────────┬───────────────────────────────┘
                                       │  Canton synchronizer (TestNet → Global Synchronizer)
                       ┌───────────────▼───────────────────────────────┐
                       │  Asset issuer (stablecoin / Canton Coin)       │
                       │  + fiat on/off ramp partner                    │
                       └────────────────────────────────────────────────┘
```

Key shifts from the demo:
- **IAM in front of the Ledger API.** OAuth/OIDC (Auth0/Keycloak/Cognito) issues
  JWTs; Canton **user management** maps each user → their party with scoped
  `actAs`/`readAs` rights. No more open auth.
- **Read model = Participant Query Store (PQS/Scribe)** streaming the ledger into
  Postgres, replacing in-memory maps. Every read is a per-party query.
- **Command submission is per-party.** The payer's app submits as the payer; the
  approver's app submits as the approver. The platform never holds a single
  super-identity that can act for all.
- **Keys live in an HSM or MPC custody system**, not in a process.
- **The asset is issued by someone** (a regulated stablecoin issuer, Canton Coin,
  or tokenized deposits) — Sotto is the _rail_, not the mint.

---

## 3. The privacy & custody model in production (the heart of it)

Canton's privacy is **per-participant**: a participant node only learns about
contracts where one of *its hosted parties* is a stakeholder. That single fact
defines the whole custody spectrum, and it's why the demo's one-backend design
is not just untidy — it's wrong for the privacy claim.

- **Custodial tenant** → Sotto hosts that tenant's party on Sotto's participant.
  Sotto (the operator) can technically see those parties' contracts. Privacy
  holds _between tenants and from the public network_, but the **custodian is
  trusted**. This is fine and normal (it's how a bank sees your balance) — but it
  makes Sotto a regulated custodian (§6).
- **Self-custody counterparty** → they run their **own** participant and host
  their own party. Sotto literally **cannot** see their contracts unless they're a
  stakeholder. This is true cryptographic privacy and the strongest version of the
  pitch.

**Hybrid (our choice):** custodial by default so we can ship and give a clean UX;
offer self-custody to large/sophisticated counterparties (other studios,
enterprises, the auditor, regulators) who want to hold their own keys. Concretely:

- Sotto runs a participant node and hosts custodial parties (most recipients, the
  payer for SMB tenants).
- A self-custody counterparty connects their participant to the same
  synchronizer and we allocate _their_ party on _their_ node.
- The Daml model doesn't change — it already speaks in parties. Only the
  **topology** (who hosts which party) changes per tenant.

**Operational consequence:** the "switch view" role-switcher is a demo affordance
and must be removed from the real product. Each authenticated user gets exactly
one lens — their own party. The four-lens story becomes a _sales demo / sandbox
mode_, not the production app.

---

## 4. Technical workstreams (mapped to the codebase)

### 4.1 Identity, auth & per-party submission  ⟵ highest priority
> **Status: DONE for Phase 1 (2026-06-10).** The real backend now runs against the
> auth-enabled node with per-user bearer tokens — no single god-identity:
> - `custodian` user (acts/reads payer+issuer, the bounded operator side),
>   `approver`, `auditor`, and one `rcpt-<…>` per recipient, each scoped to only
>   its own party via user-management rights.
> - Full flow verified end-to-end (bootstrap, settle, per-role reads, approve).
> - Boundary enforced: the Sotto recipient user's token gets **403** reading the
>   payer's ACS, **200** reading its own.
> - **§4.3 explicit disclosure also landed**: Approve discloses the single treasury
>   contract to the approver instead of a broad `readAs [payer]`.
>
> Code: `backend/src/services/{auth,canton,ledger}.service.ts`, `config/index.ts`.
>
> **Update (2026-06-11):** tokens migrated scope→**audience-based** (3.7-proof);
> **app login/session layer** added — `POST /api/login` issues a Sotto session
> (`services/session.ts`), `requireSession`/`requireRole` middleware scope every
> route to the logged-in principal. No god endpoint: `GET /api/state` serves only
> the session's role; settle/configure/reset are payer-gated, approve/reject
> approver-gated (maker-checker enforced at the API too — a payer gets 403 trying
> to approve). The Flutter `HttpLedgerRepository` signs in as the viewed role and
> carries the bearer token; switching role is a real re-login. Verified: no
> session → 401, recipient session sees only its own line, payer can't approve.
> **Update (2026-06-13):** dedicated **sign-in screen** added — the app now opens
> on "sign in as…" (`AppPhase.signIn`, `features/auth/`), each sign-in is a real
> scoped session, and Account has Sign out.
>
> **Update (2026-06-16): asymmetric RS256 + JWKS — production-shape auth, PROVEN
> LIVE.** Swapped the dev HMAC for the real shape: the node holds **no secret** and
> validates every token's signature against a public key it fetches from a JWKS.
> - `services/keys.ts` (`SigningKey`) generates an RS256 keypair on boot and
>   publishes the public half at `GET /.well-known/jwks.json`; `auth.ts` is now a
>   `TokenFactory` interface with `HmacTokenFactory` (dev) + `Rs256TokenFactory`.
>   Mode switch: `AUTH_MODE=rs256` (`npm run start:rs256`).
> - Node config `infra/auth/sandbox-auth-rs256.conf` (`type = jwt-jwks`, points at
>   our JWKS). Ran the whole stack against it: payer/recipient reads, the privacy
>   boundary (recipient sees treasury 0 + redacted mandate), anonymous → 401.
> - Round-trip proof `npm run prove:rs256`: a valid token validates against the
>   JWKS, a token with a tampered `sub` is rejected.
> - **The only thing left for a real IdP (Auth0/Keycloak/Cognito) is config** —
>   point the conf's `url` at their JWKS and let them mint. App code unchanged.
>
> **Update (2026-06-16): JIT wallet provisioning — the wallet half of onboarding.**
> Auth proves *who you are*; a wallet is a *party + its Holdings*, bound to the
> login by `CanActAs`/`CanReadAs` rights. `LedgerService.provisionWallet(subject)`
> (+ `POST /api/wallet`, payer-gated) allocates a real custodial party + scoped
> user on demand — the "embedded wallet on sign-up." Proven: the provisioned
> user's own token reads its party (200) and is denied the payer's (403); stable
> across calls (persisted on-ledger). A self-custody counterparty instead brings a
> party id it controls (§3). Login is still passwordless — real credentials are the
> only remaining IdP piece.

- Put OAuth/OIDC in front; integrate Canton **user management** (user ↔ party,
  scoped rights).
- Replace the single backend identity. Today `LedgerService` submits as
  `[issuer]`, `[payer, issuer]`, `[approver]` from one process. Split into
  per-party command paths authorised by the caller's JWT.
- Remove the god-view: `stateFor(role)` querying any party becomes "query the
  caller's own party only," enforced by the token, not by our code.
- **Files:** `backend/src/services/{canton,ledger}.service.ts`, new
  `auth/` middleware; `frontend` gains a real login + token store.

### 4.2 Persistence & read model
- Stand up **PQS (Scribe)** → Postgres; derive batch/line/mandate status from the
  ledger projection, not `lineStatus`/`mandateCid`/`proposalCid` maps.
- Idempotent command submission (command dedup IDs already exist —
  `nextCommandId`), retries, and an outbox for at-least-once semantics.
- **Files:** replace the in-memory maps in `ledger.service.ts` with repository
  classes over Postgres + PQS views.

### 4.3 Daml hardening
- ~~**Explicit disclosure** for the approver-reads-treasury case instead of
  `readAs [payer]`.~~ **DONE (2026-06-10)** — Approve discloses the single treasury
  `Holding` (createdEventBlob) to the approver; no broad payer read.
- Add lifecycle the demo skips: mandate **revocation/expiry**, partial batch
  **cancellation**, **idempotency keys** on Disburse (`batchRef` exists — make it
  enforced unique), explicit **rejection reasons**, and **versioning/upgrades**
  (Daml smart-contract upgrades) so deployed templates can evolve.
- Property-based / model tests beyond the happy path; an external Daml audit.
- **Files:** `daml/sotto/daml/Sotto.daml`, `daml/sotto-tests`.

### 4.4 Real network deployment
- Deploy a persistent participant node; connect to **Canton TestNet**, later the
  **Global Synchronizer**. (Heavy infra/bandwidth lift — gated, see §8 + §11.)
- Topology/identity management for parties; HA participant; backups of node keys
  + DB.

### 4.5 Asset integration — see §5.

### 4.6 Product/API surface — see §9.

---

## 5. Asset & money movement

Sotto should **not** mint its own money unless it intends to become a licensed
issuer (very heavy). Options, in rough order of pragmatism:

| Option | What it is | Trade-off |
|---|---|---|
| **Regulated stablecoin on Canton** | Integrate a CN-issued, fiat-backed stablecoin via the **Canton Network Token Standard** | Cleanest "real money"; depends on issuer availability + their compliance |
| **Tokenized deposits** | A partner bank issues on-ledger claims on real deposits | Strong regulatory footing; needs a banking partner |
| **Canton Coin** | The network's native asset | Real and available, but price-volatile; not a unit of account for payouts |
| **Issue our own token** | Sotto becomes the issuer | Maximum control, maximum regulatory load — avoid for v1 |

**On/off ramp:** fiat ↔ token requires the issuer's mint/redeem plus a banking or
PSP partner, KYC at the ramp, and settlement-finality handling. The recipient's
"Cash out to local currency" button (currently a no-op flash) becomes a real
redemption flow against the issuer/ramp partner.

**Recommendation:** Phase 1 uses a **test asset on the token standard** (no real
value, no licensing). Phase 2 swaps in a **regulated stablecoin or tokenized
deposit** via a partner — _not_ a self-issued token.

---

## 6. Compliance & legal (the real wall)

Moving other people's money is licensed activity. Under **hybrid-custodial**, Sotto
holds value for custodial tenants → Sotto is a **custodian / money transmitter**.
This is the longest-lead, highest-cost workstream. Start it in parallel with
Phase 1 — it gates Phase 2.

- **Licensing** (jurisdiction-dependent — pick one to start):
  - **US:** FinCEN MSB registration + state **money-transmitter licenses** (or
    operate under a partner's licenses / a BaaS provider initially).
  - **EU:** **EMI** authorisation and/or **CASP** under **MiCA**; if the asset is
    an e-money token, MiCA EMT rules apply to the issuer.
  - **UK:** FCA — EMI / Payment Institution + cryptoasset registration.
  - Fastest route to a pilot is often **partnering with an already-licensed
    entity** rather than holding the license yourself on day one.
- **KYC / KYB:** verified onboarding for payer orgs and recipients; vendor
  integration (e.g., Persona/Onfido/Sumsub).
- **AML:** transaction monitoring, **sanctions/PEP screening**, SAR/STR filing, a
  named compliance officer, written AML program.
- **Travel Rule:** originator/beneficiary data on transfers above thresholds.
- **Audit & reporting:** **SOC 2 Type II**, financial audit, regulator reporting.
  Sotto's _auditor party_ is a product feature, but regulatory reporting is
  separate and additional.
- **Data protection:** GDPR/CCPA. Tension with an immutable ledger →
  keep **PII off-ledger**, parties pseudonymous on-ledger, so erasure is possible
  without rewriting history.

---

## 7. Security

- **Key custody:** participant namespace keys and (custodial) party keys in an
  **HSM** (Cloud HSM / YubiHSM) or **MPC** custody (Fireblocks-style). Documented
  key ceremony, rotation, dual control, and break-glass.
- **Separation of duties:** the maker-checker exists in the Daml model; add an
  operational one for admin/treasury actions.
- **External signing:** support participant external signing so self-custody
  parties never expose keys to Sotto.
- **SDLC:** secret management, dependency scanning, SAST/DAST, signed builds.
- **Assurance:** threat model, third-party pen test, bug bounty, Daml audit.

---

## 8. Infrastructure & operations

- **Node ops:** run participant node(s) + PQS + DB; connect to the synchronizer.
  Active-passive HA participant; **DR** with tested restore of node keys + DB
  (lose the keys = lose the parties — this is existential, treat backups
  accordingly).
- **Observability:** node metrics, ledger lag, command latency/failure SLOs,
  alerting, on-call.
- **Bandwidth reality:** standing up real Canton infra is a heavy download/ops
  lift; the ~3.8 Mbps link that defeated cn-quickstart will defeat a casual
  TestNet bring-up too. Plan to do node bring-up on a **cloud VM**, not the dev
  laptop. This is why §11 Phase 1 starts with re-architecture _on the existing
  node_ and treats network bring-up as its own gated task.

---

## 9. Product surface

- Real **auth** (SSO/OIDC), durable sessions (fixes "re-onboards every restart" —
  the app holds no persistence today).
- **KYC onboarding** flow; multi-tenant orgs; RBAC.
- **Notifications** (email/push/webhooks) for "you've been paid," "approval
  needed," "payout settled."
- **Admin console**, immutable audit log, support tooling.
- **Off-ramp UX** wired to the ramp partner.
- The four-lens demo becomes an explicit **sandbox/demo mode**, separate from the
  single-lens production app.

---

## 10. Team & cost drivers

- **People:** Daml/Canton engineer, backend, mobile, DevOps/SRE, security,
  **compliance officer**, **legal counsel**, product.
- **Cost drivers:** licensing (legal + **capital requirements**, e.g. EMI minimum
  capital), SOC 2 + financial audits, node infra, custody tooling (HSM/MPC),
  compliance vendors (KYC/AML/screening), insurance. The regulated-entity
  scaffolding typically dwarfs the engineering cost.

---

## 11. Phased roadmap with go/no-go gates

### Phase 0 — Demo (done)
Sandbox, fake asset, four-lens story. ✅ — this is the hackathon artifact.

### Phase 1 — Real architecture, no real money
_Goal: it's a real system, just without value at risk → minimal regulatory load._
- Per-party auth + Canton user management (§4.1)
- Persistence + PQS read model (§4.2)
- Daml hardening incl. explicit disclosure (§4.3)
- Deploy a persistent participant on **TestNet**; test asset on the token standard
- Remove the god-view; single-lens production app + separate demo mode
- **Gate → Phase 2:** security review passed; no in-memory source-of-truth;
  privacy verified across *separate* participants; legal counsel engaged.

### Phase 2 — Regulated pilot, real money, limited
_Goal: real value, few customers, under a real (or partner) license._
- License path chosen (own or partner/BaaS); KYC/AML live; sanctions screening
- Custodial-only; **regulated stablecoin / tokenized deposit**; on/off ramp partner
- HSM/MPC custody; SOC 2 Type I; pen test
- **Gate → Phase 3:** license/partner in place; clean pen test; AML program
  signed off; capital + insurance in place.

### Phase 3 — GA & self-custody
- Scale to the **Global Synchronizer**; self-custody option for large
  counterparties; SOC 2 Type II; multi-jurisdiction; full ops/on-call.

---

## 12. Open questions & decisions log

| # | Decision | Status |
|---|---|---|
| 1 | Custody model | **Hybrid** (custodial first, self-custody path) — decided 2026-06-10 |
| 2 | First build focus | **This roadmap** — decided 2026-06-10 |
| 3 | Target jurisdiction for first license | _open_ — drives §6 entirely |
| 4 | Own license vs partner/BaaS for Phase 2 | _open_ — biggest lead-time item |
| 5 | Asset for Phase 2 (stablecoin vs tokenized deposit) | _open_ — depends on issuer availability |
| 6 | Cloud vs self-hosted participant; which cloud | _open_ — gates §8 bring-up |
| 7 | Custody tooling (HSM vs MPC vendor) | _open_ |

---

### Immediate next step (when you're ready to build)
Phase 1, workstream §4.1 — **the trust boundary**: real auth + per-party
submission, killing the one-backend-sees-all design. It runs on the node we
already have, needs no big downloads, and is the single change that turns the
privacy story from "demonstrated" into "enforced in production." Everything else
in Phase 1 builds on it.
