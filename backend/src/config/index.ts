// Centralised runtime configuration, read once from the environment.

import { resolve } from 'node:path';

export interface AppConfig {
  port: number;
  ledgerJsonApi: string;
  sottoDar: string;
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
  session: {
    secret: string;
    ttlSeconds: number;
  };
}

const authMode: 'hmac' | 'rs256' = process.env.AUTH_MODE === 'rs256' ? 'rs256' : 'hmac';
// The jwt-jwks auth-service enforces a short GLOBAL token-life cap (~5m) with no
// per-service override, so rs256 mode mints short-lived tokens by default (the
// backend re-mints one per ledger call anyway, so this is invisible). HMAC mode
// keeps the per-service max-token-life=86400s from its conf, so 1h is fine there.
const defaultTokenTtl = authMode === 'rs256' ? 240 : 3600;

export const config: AppConfig = {
  port: Number(process.env.PORT ?? 8080),
  // Defaults to the AUTH-enabled node (infra/auth/sandbox-auth.conf, :7864).
  // The old open node was :6864; point back with LEDGER_JSON_API to compare.
  ledgerJsonApi: process.env.LEDGER_JSON_API ?? 'http://localhost:7864',
  sottoDar:
    process.env.SOTTO_DAR ??
    resolve(import.meta.dirname, '../../../daml/sotto/.daml/dist/sotto-0.1.0.dar'),
  auth: {
    // AUTH_MODE=rs256 swaps the dev HMAC for asymmetric RS256 + a published JWKS
    // (run the node with infra/auth/sandbox-auth-rs256.conf). Default stays hmac
    // so the existing sandbox keeps working untouched.
    mode: authMode,
    // Dev HMAC secret — must match infra/auth/sandbox-auth.conf.
    secret: process.env.AUTH_SECRET ?? 'sotto-dev-hs256-secret-change-me-please-0123456789',
    // Inject a stable RS256 key (PEM) to survive restarts; empty = ephemeral.
    privateKeyPem: process.env.AUTH_RS256_PRIVATE_KEY_PEM ?? '',
    audience: process.env.AUTH_AUDIENCE ?? 'https://sotto.dev/ledger-api',
    adminUser: process.env.AUTH_ADMIN_USER ?? 'participant_admin',
    tokenTtlSeconds: Number(process.env.AUTH_TOKEN_TTL ?? defaultTokenTtl),
  },
  session: {
    // Signs the Sotto app-session token (the user's login), separate from the
    // Canton tokens above. Replaced by the OIDC session/IdP in production.
    secret: process.env.SESSION_SECRET ?? 'sotto-session-dev-secret-change-me-please-987654321',
    ttlSeconds: Number(process.env.SESSION_TTL ?? 3600),
  },
};
