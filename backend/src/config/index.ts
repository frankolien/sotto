// Centralised runtime configuration, read once from the environment.

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load backend/.env.local (gitignored) so secrets — the devnet Keycloak
// username/password especially — never live in the shell history or in git.
// A dependency-free dotenv: existing process.env always wins.
const envFile = resolve(import.meta.dirname, '../../.env.local');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!m || line.trimStart().startsWith('#')) continue;
    if (process.env[m[1]] !== undefined) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

export interface DevnetConfig {
  tokenUrl: string;
  clientId: string;
  username: string;
  password: string;
  scope: string;
  audience: string;
  userId: string; // the token subject = participant user id (granted actAs on the parties)
  accessToken: string; // optional pre-minted token; else the password grant mints one
  namespace: string; // the party-id namespace suffix on the hackathon node
  parties: {
    payer: string;
    recipient: string;
    recipient2: string;
    approver: string;
    auditor: string;
  };
}

export interface AppConfig {
  port: number;
  ledgerMode: 'local' | 'devnet';
  ledgerJsonApi: string;
  sottoDar: string;
  orgStore: string;
  auth: {
    // 'hmac' = dev shared secret; 'rs256' = production-shape asymmetric + JWKS.
    mode: 'hmac' | 'rs256';
    secret: string;
    // PEM for the RS256 private key (rs256 mode). Empty → generate one per boot.
    privateKeyPem: string;
    audience: string;
    adminUser: string;
    tokenTtlSeconds: number;
  };
  devnet: DevnetConfig;
  session: {
    secret: string;
    ttlSeconds: number;
  };
}

const authMode: 'hmac' | 'rs256' = process.env.AUTH_MODE === 'rs256' ? 'rs256' : 'hmac';
const ledgerMode: 'local' | 'devnet' = process.env.LEDGER_MODE === 'devnet' ? 'devnet' : 'local';
// The jwt-jwks auth-service enforces a short GLOBAL token-life cap (~5m) with no
// per-service override, so rs256 mode mints short-lived tokens by default (the
// backend re-mints one per ledger call anyway, so this is invisible). HMAC mode
// keeps the per-service max-token-life=86400s from its conf, so 1h is fine there.
const defaultTokenTtl = authMode === 'rs256' ? 240 : 3600;

// The hackathon DevNet node (5N/NODERS "hackcanton-01"), used when LEDGER_MODE=devnet.
const DEVNET_JSON_API = 'https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services';
const devnetNamespace =
  process.env.DEVNET_NAMESPACE ?? '122003aa7c491e00a453145c4d2cd3dbf5db8908b4e663c9944baed57fd66effa668';
const party = (hint: string): string => `${hint}::${devnetNamespace}`;

export const config: AppConfig = {
  port: Number(process.env.PORT ?? 8080),
  ledgerMode,
  // Devnet defaults to the hackathon node's JSON Ledger API; local defaults to the
  // AUTH-enabled sandbox (:7864). LEDGER_JSON_API overrides either.
  ledgerJsonApi:
    process.env.LEDGER_JSON_API ?? (ledgerMode === 'devnet' ? DEVNET_JSON_API : 'http://localhost:7864'),
  sottoDar:
    process.env.SOTTO_DAR ??
    resolve(import.meta.dirname, '../../../daml/sotto/.daml/dist/sotto-0.1.0.dar'),
  // Durable multi-tenant org store (gitignored). Swap for Postgres later.
  orgStore: process.env.ORG_STORE ?? resolve(import.meta.dirname, '../../data/orgs.json'),
  auth: {
    mode: authMode,
    secret: process.env.AUTH_SECRET ?? 'sotto-dev-hs256-secret-change-me-please-0123456789',
    privateKeyPem: process.env.AUTH_RS256_PRIVATE_KEY_PEM ?? '',
    audience: process.env.AUTH_AUDIENCE ?? 'https://sotto.dev/ledger-api',
    adminUser: process.env.AUTH_ADMIN_USER ?? 'participant_admin',
    tokenTtlSeconds: Number(process.env.AUTH_TOKEN_TTL ?? defaultTokenTtl),
  },
  devnet: {
    tokenUrl:
      process.env.DEVNET_TOKEN_URL ??
      'https://keycloak.naas.noders.services/realms/noders-appsfactory/protocol/openid-connect/token',
    clientId: process.env.DEVNET_CLIENT_ID ?? 'web-app-ui-hackcanton-01-devnet',
    username: process.env.DEVNET_USERNAME ?? '',
    password: process.env.DEVNET_PASSWORD ?? '',
    scope: process.env.DEVNET_SCOPE ?? 'openid daml_ledger_api offline_access',
    audience: process.env.DEVNET_AUDIENCE ?? 'https://hackcanton-01.devnet.naas.noders.services',
    userId: process.env.DEVNET_USER_ID ?? 'bd4ac60c-7507-4838-a626-cfcb46a3ca8b',
    accessToken: process.env.DEVNET_ACCESS_TOKEN ?? '',
    namespace: devnetNamespace,
    parties: {
      payer: process.env.DEVNET_PARTY_PAYER ?? party('payer-sotto'),
      recipient: process.env.DEVNET_PARTY_RECIPIENT ?? party('recipient-sotto'),
      recipient2: process.env.DEVNET_PARTY_RECIPIENT2 ?? party('recipient2-sotto'),
      approver: process.env.DEVNET_PARTY_APPROVER ?? party('approver-sotto'),
      auditor: process.env.DEVNET_PARTY_AUDITOR ?? party('auditor-sotto'),
    },
  },
  session: {
    secret: process.env.SESSION_SECRET ?? 'sotto-session-dev-secret-change-me-please-987654321',
    ttlSeconds: Number(process.env.SESSION_TTL ?? 3600),
  },
};
