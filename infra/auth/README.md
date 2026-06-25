# Auth POC — enforcing the per-party boundary (Phase 1, §4.1)

This proves the single most important production change: the Ledger API requires a
**bearer token**, and a token can only read/act as the parties its user has been
granted. The privacy stops being "our backend is careful" and becomes "the ledger
refuses."

## Run it

```bash
# 1. Start the auth-enabled node (alt ports 78xx, won't collide with the open demo node)
dpm sandbox -c infra/auth/sandbox-auth.conf --no-tty

# 2. Prove the boundary
node infra/auth/prove.mjs
```

Expected:

```
PASS  no-token → ACS(Alice)  → 401   (API now requires a token at all)
PASS  alice    → ACS(Alice)  → 200   (own party)
PASS  bob      → ACS(Bob)    → 200   (own party)
PASS  bob      → ACS(Alice)  → 403   ← the keystone: Bob CANNOT read Alice
✅ Per-party boundary ENFORCED by the ledger.
```

Contrast — the **open** demo node (6864) returns the payer's ACS to an
**anonymous** caller (HTTP 200). Same operation, the auth node denies it. That gap
is exactly what Phase 1 closes.

## What we learned about Canton 3.5.1 auth (so we don't re-derive it)

- **Enable auth** on the participant's ledger-api:
  ```hocon
  canton.participants.sandbox.ledger-api.auth-services = [
    { type = unsafe-jwt-hmac-256, secret = "...", target-scope = "daml_ledger_api", max-token-life = 86400s }
  ]
  ```
- **Token format is Standard JWT, NOT the legacy `actAs`/`readAs` custom claims.**
  A token carries `sub` (a Canton **user id**) + a `scope` of `daml_ledger_api`
  (or, preferred, an `aud` of `https://daml.com/jwt/aud/participant/<participantId>`).
  Authorization comes from the **user's rights**, not from claims in the token.
- **Therefore every identity must be a user** created via user management with
  scoped rights:
  `POST /v2/users { user:{id}, rights:[{kind:{CanReadAs:{value:{party}}}}] }`.
  `participant_admin` exists by default and is used to bootstrap.
- **Two gotchas that cost us time:**
  - `max-token-life`: 3.5 caps token lifetime (default < 1h) and rejects longer
    tokens as "too long". Set it explicitly for dev.
  - **scope tokens are deprecated in 3.5** (removed in 3.7). They work, but
    production should use **audience-based** tokens (set `target-audience` to the
    participant id instead of `target-scope`).
- The `unsafe-jwt-hmac-256` secret is a shared HMAC key (dev only). **Production**
  swaps it for asymmetric RS256 validated against a JWKS — the token shape is
  identical, so the app code doesn't change. See the next section.

## Asymmetric RS256 + JWKS — production-shape auth (DONE)

The HMAC node above shares a secret with the backend. The production shape is
**asymmetric**: the node holds *no secret*, it validates every token's signature
against a public key it fetches from a JWKS endpoint. We run this for real:

```bash
# 1. Start the backend FIRST in rs256 mode — it generates an RS256 keypair on
#    boot and publishes the public half at /.well-known/jwks.json.
npm --prefix backend run start:rs256
# 2. Start the asymmetric node, which validates against that JWKS.
dpm sandbox -c infra/auth/sandbox-auth-rs256.conf --no-tty
# (Same 78xx ports as the HMAC node — swap configs without touching the backend.)

# Prove the RS256/JWKS round-trip in isolation (valid validates, forged rejected):
npm --prefix backend run prove:rs256
```

Proven live: payer/recipient reads, the privacy boundary (recipient sees treasury
0 + redacted mandate), anonymous → 401, and JIT wallet provisioning all work with
the node validating RS256 tokens purely from the published JWKS.

**Swapping in a real IdP (Auth0/Keycloak/Cognito) is config only:** point the
conf's `url` at the IdP's JWKS and let the IdP mint. Nothing in the app changes.

- **Two more gotchas this cost us (Canton 3.5.1 specifics):**
  - The JWKS auth-service type is **`jwt-jwks`**, *not* the older docs'
    `jwt-rs-256-jwks` (PureConfig kebab-cases the Scala class `JwtJwks`). It reads
    the alg+key from the JWKS itself, so one type covers RS256/ES256.
  - `jwt-jwks` has **no per-service `max-token-life` key** (unlike `unsafe-jwt-hmac-256`).
    Lifetime is governed by a short global cap (~5 min), so the backend mints
    short-lived tokens in rs256 mode (`AUTH_TOKEN_TTL`, default 240s) — invisible,
    since it re-mints one per ledger call. Production raises the global cap.
  - **Startup ordering:** the node validates against the backend's JWKS, so the
    backend must be serving it before its own first authenticated call. `server.ts`
    now listens (publishing the JWKS) *before* bootstrapping for exactly this.

## Files
- `sandbox-auth.conf` — HMAC (dev shared secret) auth node.
- `sandbox-auth-rs256.conf` — asymmetric RS256 + JWKS auth node (production-shape).
- `jwt.mjs` — HS256 token minter mirroring the dev secret (replaced by the IdP in prod).
- `prove.mjs` — bootstraps two scoped users and runs the allow/deny checks.
- `../../backend/scripts/prove-rs256.ts` — proves the RS256/JWKS round-trip (`npm run prove:rs256`).

## Status — §4.1 trust boundary + production-shape auth: DONE
1. ✅ Audience-based tokens (`target-audience`, not deprecated scope).
2. ✅ Backend sends `Authorization: Bearer`, mints **per-user** tokens — the single
   god-identity is retired.
3. ✅ Every Sotto party (payer, each recipient, approver, auditor) maps to a user
   with exactly its own rights; reads are caller-scoped.
4. ✅ Asymmetric **RS256 + JWKS** node (`jwt-jwks`) — swap in a real IdP by URL.
5. ✅ **JIT wallet provisioning** (`POST /api/wallet`) — first login gets a real
   custodial party + scoped user that can hold a token.
