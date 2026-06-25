import { createApp } from './app.ts';
import { config } from './config/index.ts';
import { LedgerController } from './controllers/ledger.controller.ts';
import { HmacTokenFactory, Rs256TokenFactory, TokenFactory } from './services/auth.ts';
import { CantonService } from './services/canton.service.ts';
import { SigningKey } from './services/keys.ts';
import { LedgerService } from './services/ledger.service.ts';
import { SessionService } from './services/session.ts';

async function main(): Promise<void> {
  // The Ledger-API token issuer. RS256 mode publishes a JWKS the node validates
  // against (no shared secret); HMAC mode is the dev shared-secret fallback.
  let tokens: TokenFactory;
  let jwks: (() => unknown) | undefined;
  if (config.auth.mode === 'rs256') {
    const key = new SigningKey(config.auth.privateKeyPem);
    tokens = new Rs256TokenFactory(key, config.auth.audience, config.auth.tokenTtlSeconds);
    jwks = () => key.jwks();
    console.log(`Auth: RS256 asymmetric — JWKS at /.well-known/jwks.json (kid ${key.kid.slice(0, 10)}…).`);
  } else {
    tokens = new HmacTokenFactory(config.auth.secret, config.auth.audience, config.auth.tokenTtlSeconds);
    console.log('Auth: HMAC256 (dev shared secret).');
  }

  const canton = new CantonService(config.ledgerJsonApi, tokens);
  const ledger = new LedgerService(canton, config.auth.adminUser);
  const sessions = new SessionService(config.session.secret, config.session.ttlSeconds);

  // Listen FIRST, then bootstrap. In RS256 mode the node validates our tokens
  // against the JWKS we publish, so that endpoint must be reachable before the
  // first authenticated ledger call init() makes — otherwise bootstrap deadlocks.
  // (/api calls 503 until bootstrap finishes; the client already polls/retries.)
  let ready = false;
  const app = createApp(new LedgerController(ledger, sessions), sessions, jwks, () => ready);
  app.listen(config.port, () => console.log(`Sotto backend on http://localhost:${config.port}`));

  console.log(`Bootstrapping Sotto on Canton (${config.ledgerJsonApi}, auth on)…`);
  await ledger.init(config.sottoDar);
  ready = true;
  console.log('Ledger ready — DAR uploaded, parties + scoped users allocated, mandate established.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
