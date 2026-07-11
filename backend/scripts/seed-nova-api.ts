// Dev-only: seeds a rich "Nova DAO" workspace through the LIVE backend API (:8091)
// so the dashboard has a real roster + treasury + activity to look at. Allocates
// each contributor's wallet on-ledger first (self-custody parties), then drives the
// public API exactly as the web app would. Prints the payer token at the end.
// Run from backend/: LEDGER_MODE=local npx tsx scripts/seed-nova-api.ts

import { HmacTokenFactory } from '../src/services/auth.ts';
import { CantonService } from '../src/services/canton.service.ts';

const LEDGER = process.env.LEDGER_JSON_API ?? 'http://localhost:7864';
const API = process.env.API ?? 'http://localhost:8091';
const SECRET = 'sotto-dev-hs256-secret-change-me-please-0123456789';
const AUDIENCE = 'https://sotto.dev/ledger-api';
const ADMIN = 'participant_admin';

const canton = new CantonService(LEDGER, new HmacTokenFactory(SECRET, AUDIENCE, 3600));

async function main() {
  console.log('Allocating self-custody contributor wallets on-ledger…');
  const w = (h: string) => canton.ensureParty(h, ADMIN);
  const [amara, tobi, chen, luca, fatima, mert, sig, audit] = await Promise.all([
    w('amara'), w('tobi'), w('chen'), w('luca'), w('fatima'), w('mert'), w('nova-multisig'), w('nova-audit'),
  ]);

  let token = '';
  const call = async (path: string, method = 'GET', body?: unknown) => {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`);
    return res.status === 204 ? null : res.json();
  };

  console.log('Creating Nova DAO workspace via API…');
  const created = await call('/api/orgs', 'POST', {
    name: 'Nova DAO', asset: 'USDCx', cap: 300000, threshold: 20000,
    approverParty: sig, approverLabel: 'Core Multisig',
    auditorParty: audit, auditorLabel: 'Sable Audit',
  });
  token = created.token;

  await call('/api/workspace/reset', 'POST'); // clean slate for a fresh demo cycle
  await call('/api/workspace/contributors', 'PUT', {
    contributors: [
      { party: amara, name: 'amara.eth', role: 'Core protocol', amount: 4200 },
      { party: tobi, name: 'tobi.eth', role: 'Smart contracts', amount: 3850 },
      { party: chen, name: 'chen.eth', role: 'Frontend', amount: 5500 },
      { party: luca, name: 'luca.eth', role: 'DevRel', amount: 2900 },
      { party: fatima, name: 'fatima.eth', role: 'Governance', amount: 4100 },
      { party: mert, name: 'mert.eth', role: 'Protocol V2 · milestone', amount: 32000 },
    ],
  });
  await call('/api/workspace/fund', 'POST', { amount: 60000 });
  await call('/api/workspace/mandate', 'POST');
  await call('/api/workspace/settle', 'POST'); // 5 settle atomically; mert (32k) holds for the signer

  const board = await call('/api/workspace');
  const acts = await call('/api/workspace/activity');
  console.log(`\nSeeded ${board.org}: treasury ${board.treasury} ${board.asset}, ${board.lines.length} lines, ${acts.events.length} activity events.`);
  console.log('\nPAYER_TOKEN=' + token);
}

main().catch((e) => { console.error('FAILED:', e); process.exit(1); });
