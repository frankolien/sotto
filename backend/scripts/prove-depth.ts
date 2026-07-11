// Proves the "repeatable rail" dashboard-depth features against the local sandbox:
//   * treasury top-up (fund again mid-life, additive),
//   * roster management after onboarding (add/edit → re-establish mandate),
//   * stable contributor ids across a roster edit,
//   * the activity trail records every real ledger action, in order, and
//   * a new cycle bumps the batch ref and clears the treasury.
// Run: LEDGER_MODE=local npx tsx scripts/prove-depth.ts   (needs the sandbox on :7864)

import { HmacTokenFactory } from '../src/services/auth.ts';
import { CantonService } from '../src/services/canton.service.ts';
import { OrgStore } from '../src/services/org-store.ts';
import { OrgService } from '../src/services/org.service.ts';

const LEDGER = process.env.LEDGER_JSON_API ?? 'http://localhost:7864';
const SECRET = 'sotto-dev-hs256-secret-change-me-please-0123456789';
const AUDIENCE = 'https://sotto.dev/ledger-api';
const ADMIN = 'participant_admin';
const STORE = '/private/tmp/claude-501/-Users-hi-rust-projects-sotto/aa60035d-2feb-4440-9d5d-6b08bb7e0b65/scratchpad/orgs-depth.json';

const tokens = new HmacTokenFactory(SECRET, AUDIENCE, 3600);
const canton = new CantonService(LEDGER, tokens);
const store = new OrgStore(STORE);
const svc = new OrgService(canton, ADMIN, store);

let failures = 0;
const check = (label: string, ok: boolean) => {
  console.log(`   ${ok ? '✅' : '❌'} ${label}`);
  if (!ok) failures++;
};

async function main() {
  console.log('Allocating external self-custody wallets…');
  const w = (h: string) => canton.ensureParty(h, ADMIN);
  const [nova, tobi, chen, sig, audit] = await Promise.all([
    w('wallet-nova'), w('wallet-tobi'), w('wallet-chen'), w('depth-multisig'), w('depth-audit'),
  ]);

  console.log('\n=== Create + first cycle ===');
  const org = await svc.createOrg({
    name: 'Depth DAO', asset: 'USDC', cap: 300000, threshold: 20000,
    approverParty: sig, approverLabel: 'Core Multisig',
    auditorParty: audit, auditorLabel: 'Depth Audit',
  });
  await svc.archiveAll(org.id); // clean slate (idempotent parties accumulate across runs)
  const startRef = svc.get(org.id)!.batchRef;

  svc.setContributors(org.id, [
    { party: nova, name: 'nova.eth', role: 'Core protocol', amount: 9500 },
    { party: tobi, name: 'tobi.eth', role: 'Smart contracts', amount: 6000 },
  ]);
  const idsAfterFirst = svc.get(org.id)!.contributors.map((c) => c.id);
  await svc.fund(org.id, 50000);
  await svc.establishMandate(org.id);
  await svc.settle(org.id);

  let v = await svc.payerView(org.id);
  check('2 contributors settled', v.lines.filter((l) => l.status === 'settled').length === 2);

  console.log('\n=== Top up treasury (fund again, mid-life) ===');
  const before = (await svc.payerView(org.id)).treasury;
  await svc.fund(org.id, 25000);
  const after = (await svc.payerView(org.id)).treasury;
  check(`treasury grew ${before} → ${after} (additive top-up)`, after === before + 25000);

  console.log('\n=== Manage roster after onboarding (add + edit) ===');
  svc.setContributors(org.id, [
    { party: nova, name: 'nova.eth', role: 'Core protocol', amount: 12000 }, // edited amount
    { party: tobi, name: 'tobi.eth', role: 'Smart contracts', amount: 6000 }, // unchanged
    { party: chen, name: 'chen.eth', role: 'Frontend', amount: 4200 }, // NEW
  ]);
  await svc.establishMandate(org.id);
  const after2 = svc.get(org.id)!.contributors;
  check('roster grew to 3', after2.length === 3);
  check('existing ids stable across edit (nova/tobi keep c-ids)',
    after2[0].id === idsAfterFirst[0] && after2[1].id === idsAfterFirst[1]);
  check('new contributor got a fresh, distinct id', after2[2].id !== idsAfterFirst[0] && after2[2].id !== idsAfterFirst[1]);
  check('edited amount persisted (nova → 12000)', after2[0].amount === 12000);

  console.log('\n=== New cycle bumps the batch ref ===');
  await svc.archiveAll(org.id);
  const endRef = svc.get(org.id)!.batchRef;
  const endTreasury = (await svc.payerView(org.id)).treasury;
  check(`batch ref advanced ${startRef} → ${endRef}`, endRef !== startRef);
  check('treasury cleared on new cycle', endTreasury === 0);

  console.log('\n=== Activity trail (most recent first) ===');
  const events = svc.activity(org.id);
  for (const e of events.slice(0, 12)) console.log(`   ${e.kind.padEnd(9)} ${e.summary}`);
  const kinds = new Set(events.map((e) => e.kind));
  check('trail records funding', kinds.has('funded'));
  check('trail records roster changes', kinds.has('roster'));
  check('trail records settled batches', kinds.has('settled'));
  check('trail records mandate + cycle', kinds.has('mandate') && kinds.has('cycle'));
  check('trail is ordered newest-first (cycle is latest action)', events[0].kind === 'cycle');

  console.log(`\n${failures === 0 ? '✅ dashboard-depth features verified on real Canton' : `❌ ${failures} check(s) failed`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error('FAILED:', e); process.exit(1); });
