// The asymmetric signing key behind production-shape auth. In dev we generate an
// RS256 keypair on boot and publish its PUBLIC half as a JWKS document at
// /.well-known/jwks.json. Canton (configured `jwt-rs-256-jwks`) fetches that JWKS
// and validates every token's signature against it — the node never holds a
// shared secret, which is the whole point of asymmetric auth.
//
// Swapping in a real IdP (Auth0 / Keycloak / Cognito) is purely config: point
// Canton at THEIR jwks url and let THEM mint the tokens. The token shape, the
// `kid`-based key lookup, and everything downstream are identical — this class is
// the local stand-in for the IdP's signing key, nothing more.
//
// A PEM can be injected (AUTH_RS256_PRIVATE_KEY_PEM) so the key survives a
// backend restart; otherwise it is ephemeral per boot (Canton re-fetches the
// JWKS on a signature miss, so a fresh key self-heals).

import crypto from 'node:crypto';

/** A public RSA key in JWK form — exactly what a JWKS endpoint serves. */
export interface Jwk {
  kty: 'RSA';
  n: string;
  e: string;
  kid: string;
  use: 'sig';
  alg: 'RS256';
}

export class SigningKey {
  private readonly privateKey: crypto.KeyObject;
  private readonly publicKey: crypto.KeyObject;
  /** Stable key id (RFC 7638 thumbprint) — stamped in every token header so a
   * verifier can pick the right JWKS entry. */
  readonly kid: string;

  constructor(pem?: string) {
    if (pem && pem.trim()) {
      this.privateKey = crypto.createPrivateKey(pem);
      this.publicKey = crypto.createPublicKey(this.privateKey);
    } else {
      const pair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
      this.privateKey = pair.privateKey;
      this.publicKey = pair.publicKey;
    }
    const { n, e } = this.publicJwk();
    this.kid = crypto
      .createHash('sha256')
      .update(JSON.stringify({ e, kty: 'RSA', n })) // RFC 7638 canonical form
      .digest('base64url');
  }

  private publicJwk(): { n: string; e: string } {
    const jwk = this.publicKey.export({ format: 'jwk' }) as { n: string; e: string };
    return { n: jwk.n, e: jwk.e };
  }

  /** Sign `input` (the `header.payload` of a JWT) → base64url RS256 signature. */
  sign(input: string): string {
    return crypto.sign('RSA-SHA256', Buffer.from(input), this.privateKey).toString('base64url');
  }

  /** The JWKS document a verifier (Canton, or any OIDC client) fetches. */
  jwks(): { keys: Jwk[] } {
    const { n, e } = this.publicJwk();
    return { keys: [{ kty: 'RSA', n, e, kid: this.kid, use: 'sig', alg: 'RS256' }] };
  }
}
