import { createApp } from './app.ts';
import { config } from './config/index.ts';
import { LedgerController } from './controllers/ledger.controller.ts';
import { DevnetTokenFactory, HmacTokenFactory, Rs256TokenFactory, TokenFactory } from './services/auth.ts';
import { CantonService } from './services/canton.service.ts';
import { SigningKey } from './services/keys.ts';
import { LedgerService } from './services/ledger.service.ts';
import { OrgService } from './services/org.service.ts';
import { OrgStore } from './services/org-store.ts';
import { OrgController } from './controllers/org.controller.ts';
import { SessionService } from './services/session.ts';

async function main(): Promise<void> {
  // The Ledger-API token issuer. Devnet uses the operator's OIDC (Keycloak); locally
  // RS256 publishes a JWKS the node validates against, and HMAC is the shared-secret
  // fallback. In every case the token's `sub`/`aud` contract is identical downstream.
  let tokens: TokenFactory;
  let jwks: (() => unknown) | undefined;
  if (config.ledgerMode === 'devnet') {
    const d = config.devnet;
    if (!d.accessToken && (!d.username || !d.password)) {
      throw new Error(
        'devnet mode needs DEVNET_USERNAME + DEVNET_PASSWORD (or a DEVNET_ACCESS_TOKEN) — put them in backend/.env.local',
      );
    }
    tokens = new DevnetTokenFactory(d.tokenUrl, d.clientId, d.username, d.password, d.scope, d.userId, d.accessToken);
    console.log(
      d.username
        ? `Auth: DevNet OAuth2 — Keycloak password grant as ${d.username} (client ${d.clientId}).`
        : 'Auth: DevNet OAuth2 — using supplied DEVNET_ACCESS_TOKEN (no refresh creds).',
    );
  } else if (config.auth.mode === 'rs256') {
    const key = new SigningKey(config.auth.privateKeyPem);
    tokens = new Rs256TokenFactory(key, config.auth.audience, config.auth.tokenTtlSeconds);
    jwks = () => key.jwks();
    console.log(`Auth: RS256 asymmetric — JWKS at /.well-known/jwks.json (kid ${key.kid.slice(0, 10)}…).`);
  } else {
    tokens = new HmacTokenFactory(config.auth.secret, config.auth.audience, config.auth.tokenTtlSeconds);
    console.log('Auth: HMAC256 (dev shared secret).');
  }

  const canton = new CantonService(config.ledgerJsonApi, tokens);
  const ledger = new LedgerService(
    canton,
    config.auth.adminUser,
    config.ledgerMode === 'devnet' ? config.devnet : undefined,
  );
  const sessions = new SessionService(config.session.secret, config.session.ttlSeconds);

  // Multi-tenant, self-custody workspace engine (additive; shares the Canton client).
  const orgStore = new OrgStore(config.orgStore);
  const orgService = new OrgService(canton, config.auth.adminUser, orgStore);
  // Creating a workspace allocates a fresh Canton party for the org's treasury.
  // Only a backend with party-allocation rights can do that (local sandbox / own
  // validator); on shared DevNet we only hold act-as rights on pre-created parties,
  // so self-serve onboarding is gated off there. SOTTO_GATE_ONBOARDING=1 forces the
  // gated state on any backend (to preview the request-access experience locally).
  const canProvision = config.ledgerMode !== 'devnet' && process.env.SOTTO_GATE_ONBOARDING !== '1';
  const orgController = new OrgController(orgService, sessions, canProvision);

  // Listen FIRST, then bootstrap. In RS256 mode the node validates our tokens
  // against the JWKS we publish, so that endpoint must be reachable before the
  // first authenticated ledger call init() makes — otherwise bootstrap deadlocks.
  // (/api calls 503 until bootstrap finishes; the client already polls/retries.)
  let ready = false;
  const app = createApp(new LedgerController(ledger, sessions), orgController, sessions, jwks, () => ready);
  app.listen(config.port, () => console.log(`Sotto backend on http://localhost:${config.port}`));

  console.log(`Bootstrapping Sotto on Canton (${config.ledgerMode}, ${config.ledgerJsonApi})…`);
  await ledger.init(config.sottoDar);
  ready = true;
  console.log(
    config.ledgerMode === 'devnet'
      ? 'Ledger ready — live on Canton DevNet; mandate established (parties pre-allocated by the operator).'
      : 'Ledger ready — DAR uploaded, parties + scoped users allocated, mandate established.',
  );
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
