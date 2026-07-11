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
  forUser(userId: string): string | Promise<string>;
  /** Override the userId a command is submitted under. Local factories submit as
   * the requested user; the devnet factory has a single external identity, so it
   * pins every command to that token's subject. Absent → use the requested user. */
  userId?(requestedUser: string): string;
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

/** DevNet issuer: the token is minted by an EXTERNAL OIDC provider (Keycloak on
 * the hackathon node), not by us. We obtain it via the OAuth2 password grant and
 * cache it, refreshing shortly before it expires. Unlike the local factories there
 * is no per-user token: one identity (the operator's Keycloak account) was granted
 * `actAs` on every sotto party, so `forUser` ignores its argument and the command
 * `userId` is pinned to that token's subject. This is the shape real production
 * uses — the app holds no signing key; the IdP mints and Canton validates. */
function jwtExp(jwt: string): number {
  try {
    const p = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());
    return typeof p.exp === 'number' ? p.exp : 0;
  } catch {
    return 0;
  }
}

export class DevnetTokenFactory implements TokenFactory {
  private token = '';
  private expiresAtEpoch = 0;
  private inflight: Promise<void> | null = null;

  constructor(
    private readonly tokenUrl: string,
    private readonly clientId: string,
    private readonly username: string,
    private readonly password: string,
    private readonly scope: string,
    private readonly subjectUserId: string,
    // Optional pre-minted token: seed the cache with it (expiry read from the JWT)
    // and only fall back to the password grant once it lapses.
    initialToken = '',
  ) {
    if (initialToken) {
      this.token = initialToken;
      this.expiresAtEpoch = jwtExp(initialToken) - 30;
    }
  }

  private async refresh(): Promise<void> {
    if (!this.username || !this.password) {
      throw new Error('devnet token expired and no DEVNET_USERNAME/DEVNET_PASSWORD set to refresh it');
    }
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: this.clientId,
      username: this.username,
      password: this.password,
      scope: this.scope,
    });
    const res = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      throw new Error(`devnet token grant → ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const json = (await res.json()) as { access_token: string; expires_in?: number };
    this.token = json.access_token;
    // Refresh 30s early so a call never rides an about-to-expire token.
    this.expiresAtEpoch = Math.floor(Date.now() / 1000) + (json.expires_in ?? 300) - 30;
  }

  async forUser(_userId: string): Promise<string> {
    if (!this.token || Math.floor(Date.now() / 1000) >= this.expiresAtEpoch) {
      // Collapse concurrent refreshes into one in-flight grant.
      this.inflight ??= this.refresh().finally(() => { this.inflight = null; });
      await this.inflight;
    }
    return this.token;
  }

  /** Every command is submitted under the token's single subject user. */
  userId(_requestedUser: string): string {
    return this.subjectUserId;
  }
}
