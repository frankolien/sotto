// Mints the bearer tokens the Ledger API requires. Canton 3.5 wants a Standard
// JWT: subject = a Canton *user id*, plus an `aud` matching the node's configured
// audience. Authorization comes from that user's rights (granted via user
// management), so a token can only act/read as the parties its user holds.
// (Audience-based, not scope-based — scope tokens are deprecated in 3.5 / gone in 3.7.)
//
// Two issuers, same token SHAPE, chosen by config:
//   * HmacTokenFactory  — dev. A shared HS256 secret both sides know.
//   * Rs256TokenFactory — production shape. Signs with a private key; the node
//     validates against the matching public key via JWKS (no shared secret).
// In real production neither runs here at all — the OIDC provider mints, and
// Canton validates against its JWKS. Nothing downstream changes, because the
// `sub`/`aud` contract is identical.

import crypto from 'node:crypto';

import { SigningKey } from './keys.ts';

const b64 = (obj: unknown): string => Buffer.from(JSON.stringify(obj)).toString('base64url');

/** Issues a bearer token for a Canton user id. */
export interface TokenFactory {
  forUser(userId: string): string;
}

/** Dev issuer: symmetric HS256, shared secret matches the node's auth-service. */
export class HmacTokenFactory implements TokenFactory {
  constructor(
    private readonly secret: string,
    private readonly audience: string,
    private readonly ttlSeconds = 3600,
  ) {}

  forUser(userId: string): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = { sub: userId, aud: this.audience, iat: now, exp: now + this.ttlSeconds };
    const input = `${b64(header)}.${b64(payload)}`;
    const sig = crypto.createHmac('sha256', this.secret).update(input).digest('base64url');
    return `${input}.${sig}`;
  }
}

/** Production-shape issuer: asymmetric RS256. The node holds no secret — it
 * validates against the public key published at /.well-known/jwks.json. The
 * header carries the signing key's `kid` so the verifier picks the right JWK. */
export class Rs256TokenFactory implements TokenFactory {
  constructor(
    private readonly key: SigningKey,
    private readonly audience: string,
    private readonly ttlSeconds = 3600,
  ) {}

  forUser(userId: string): string {
    const header = { alg: 'RS256', typ: 'JWT', kid: this.key.kid };
    const now = Math.floor(Date.now() / 1000);
    const payload = { sub: userId, aud: this.audience, iat: now, exp: now + this.ttlSeconds };
    const input = `${b64(header)}.${b64(payload)}`;
    return `${input}.${this.key.sign(input)}`;
  }
}
