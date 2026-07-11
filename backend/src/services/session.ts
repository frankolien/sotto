// Sotto-level session auth. This is the *application's* login (who is using
// Sotto), distinct from the Canton tokens (which stay server-side — custodial).
// A logged-in principal maps to a role; the backend then acts on the ledger with
// that role's scoped Canton user. So the client never holds a Canton token, and
// the API only ever serves the session's own role.
//
// Dev: passwordless "sign in as" (see the controller). Production validates
// credentials / an OIDC assertion before issue(), and this HMAC becomes the IdP.

import crypto from 'node:crypto';

import { Role, ROLES } from '../models/types.ts';

export interface Principal {
  role: Role;
  /** The workspace this session is scoped to (multi-tenant org routes). Absent for
   * the legacy single-tenant demo session. */
  orgId?: string;
  /** A contributor session is scoped to exactly one party — its own wallet — so a
   * recipient magic link can only ever read that party's payments. */
  party?: string;
}

const b64 = (obj: unknown): string => Buffer.from(JSON.stringify(obj)).toString('base64url');

export class SessionService {
  constructor(
    private readonly secret: string,
    private readonly ttlSeconds = 3600,
  ) {}

  /** Issue a session token for an authenticated principal, optionally scoped to a
   * workspace (org) and — for a contributor magic link — a single party.
   * `ttlOverride` lets a shareable link outlive a normal session. */
  issue(role: Role, orgId?: string, party?: string, ttlOverride?: number): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      role,
      ...(orgId ? { orgId } : {}),
      ...(party ? { party } : {}),
      iat: now,
      exp: now + (ttlOverride ?? this.ttlSeconds),
    };
    const input = `${b64(header)}.${b64(payload)}`;
    const sig = crypto.createHmac('sha256', this.secret).update(input).digest('base64url');
    return `${input}.${sig}`;
  }

  /** Verify a session token's signature + expiry; return the principal or null. */
  verify(token: string): Principal | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [h, p, sig] = parts;
    const expected = crypto.createHmac('sha256', this.secret).update(`${h}.${p}`).digest('base64url');
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
    let payload: { role?: unknown; orgId?: unknown; party?: unknown; exp?: unknown };
    try {
      payload = JSON.parse(Buffer.from(p, 'base64url').toString());
    } catch {
      return null;
    }
    if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (typeof payload.role !== 'string' || !ROLES.has(payload.role as Role)) return null;
    return {
      role: payload.role as Role,
      orgId: typeof payload.orgId === 'string' ? payload.orgId : undefined,
      party: typeof payload.party === 'string' ? payload.party : undefined,
    };
  }
}
