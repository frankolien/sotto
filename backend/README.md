# Sotto backend

A thin REST service over Canton's **JSON Ledger API v2**. It maps the four Sotto
templates onto real Canton parties and exposes the payout flow (login → state →
settle → approve/reject) to the web console. Every read is a real ACS query *as that
party*, so what a role sees is the ledger's decision, not the service's.

It runs in one of two modes, chosen by `LEDGER_MODE`.

## `LEDGER_MODE=devnet` — live on Canton DevNet

Points at the hackathon devnet participant. The parties are **pre-allocated by the node
operator** and the DAR is **already uploaded**, so the backend allocates nothing — it binds
the fixed parties and establishes the mandate. Auth is the operator's **OIDC (Keycloak)**:
one account, granted `actAs` on all five sotto parties, so a single token serves every call
and each command is submitted `actAs` the party for the requested role.

Put credentials in `backend/.env.local` (gitignored):

```ini
LEDGER_MODE=devnet
PORT=8090

# Auto-refreshing auth (recommended): the backend mints + refreshes its own tokens
# via the OAuth2 password grant.
DEVNET_USERNAME=you@example.com      # your Keycloak / wallet login
DEVNET_PASSWORD=your-password

# — or — hand it a pre-minted token instead of username/password (no auto-refresh):
# DEVNET_ACCESS_TOKEN=eyJ...
```

Sensible defaults are baked in for the rest (override via env if the node changes):
`LEDGER_JSON_API`, `DEVNET_TOKEN_URL`, `DEVNET_CLIENT_ID`, `DEVNET_SCOPE`,
`DEVNET_AUDIENCE`, `DEVNET_USER_ID`, `DEVNET_NAMESPACE`.

```bash
cd backend && npm install && npm start   # boots, establishes the mandate on devnet
```

Verify the privacy split live:

```bash
# payer's view (treasury + both lines) vs a recipient's (only their own)
TOKEN=$(curl -s localhost:8090/api/login -H 'content-type: application/json' -d '{"role":"payer"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
curl -s localhost:8090/api/state -H "authorization: Bearer $TOKEN" | python3 -m json.tool
```

## `LEDGER_MODE=local` (default) — a local Canton sandbox

Uploads the DAR, allocates parties + scoped users, and mints its own tokens. `AUTH_MODE=hmac`
(dev shared secret, the default) or `AUTH_MODE=rs256` (asymmetric + a published JWKS the node
validates against — the production token shape). See [`../infra/auth`](../infra/auth).

```bash
cd backend && npm start            # against infra/auth/sandbox-auth.conf on :7864
npm run start:rs256                # RS256 + JWKS variant
```

## API

`POST /api/login {role}` → session token · `GET /api/state` · `POST /api/settle` ·
`POST /api/approve/:lineId` · `POST /api/reject/:lineId` · `POST /api/reset` ·
`GET /api/health`. Roles: `payer`, `recipient`, `approver`, `auditor`.
