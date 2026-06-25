// Proves the RS256/JWKS round-trip without Canton: mint a token with the private
// key, then validate it the way the node will — fetch the public key from the
// JWKS by `kid` and verify the signature. If this passes, Canton's jwt-rs-256-jwks
// validation will too (same RS256, same JWKS shape).

import crypto from 'node:crypto';

import { Rs256TokenFactory } from '../src/services/auth.ts';
import { SigningKey } from '../src/services/keys.ts';

const AUD = 'https://sotto.dev/ledger-api';
const key = new SigningKey();
const tokens = new Rs256TokenFactory(key, AUD, 3600);

// 1. Mint a token for a Canton user (as the backend does for every ledger call).
const token = tokens.forUser('u-Amara');
const [h, p, sig] = token.split('.');
const header = JSON.parse(Buffer.from(h, 'base64url').toString());
const payload = JSON.parse(Buffer.from(p, 'base64url').toString());

// 2. Publish + read the JWKS, pick the JWK whose kid matches the token header.
const jwks = key.jwks();
const jwk = jwks.keys.find((k) => k.kid === header.kid);
if (!jwk) throw new Error('no JWK matches the token kid — Canton could not validate');

// 3. Verify the signature with ONLY the public JWK (no secret) — what Canton does.
const pub = crypto.createPublicKey({ key: jwk, format: 'jwk' });
const ok = crypto.verify('RSA-SHA256', Buffer.from(`${h}.${p}`), pub, Buffer.from(sig, 'base64url'));

// 4. A tampered token must fail.
const forged = `${h}.${Buffer.from(JSON.stringify({ ...payload, sub: 'u-Attacker' })).toString('base64url')}.${sig}`;
const [fh, fp, fsig] = forged.split('.');
const forgedOk = crypto.verify('RSA-SHA256', Buffer.from(`${fh}.${fp}`), pub, Buffer.from(fsig, 'base64url'));

console.log('alg          :', header.alg, '(expect RS256)');
console.log('kid          :', header.kid.slice(0, 16) + '…');
console.log('sub / aud    :', payload.sub, '/', payload.aud);
console.log('jwks keys    :', jwks.keys.length, '(kty', jwk.kty + ')');
console.log('signature ok :', ok, '(expect true — valid token validates against JWKS)');
console.log('forged ok    :', forgedOk, '(expect false — tampered sub is rejected)');
console.log(ok && !forgedOk ? '\n✅ RS256/JWKS round-trip proven.' : '\n❌ round-trip FAILED.');
process.exit(ok && !forgedOk ? 0 : 1);
