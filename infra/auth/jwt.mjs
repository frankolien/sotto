// HS256 JWT minter for the dev auth sandbox. Mirrors the `unsafe-jwt-hmac-256`
// service in sandbox-auth.conf. Canton 3.5.1 wants a Standard JWT token: the
// subject is a user id and the scope is `daml_ledger_api`; the user's rights
// (granted via user management) decide which parties the token may act/read as.
//
// In production this whole file is replaced by the IdP — it issues the token and
// Canton validates it against the IdP's JWKS. The token *shape* stays the same.

import crypto from 'node:crypto';

export const SECRET = 'sotto-dev-hs256-secret-change-me-please-0123456789';
export const AUDIENCE = 'https://sotto.dev/ledger-api';

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

/** A signed audience-based token whose `sub` is the Canton user id. ttl in seconds. */
export function token(userId, { ttl = 3600 } = {}) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: userId, aud: AUDIENCE, iat: now, exp: now + ttl };
  const input = `${b64(header)}.${b64(payload)}`;
  const sig = crypto.createHmac('sha256', SECRET).update(input).digest('base64url');
  return `${input}.${sig}`;
}
