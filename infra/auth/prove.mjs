// Proof that the per-party read boundary is enforced by Canton's auth, not by
// our backend. Run against the auth-enabled sandbox (sandbox-auth.conf, :7864).
//
//   node infra/auth/prove.mjs
//
// Expected:
//   no-token   → ACS(Alice)  401   (the API now requires a token at all)
//   alice      → ACS(Alice)  200   (her own party)
//   bob        → ACS(Bob)    200   (his own party)
//   bob        → ACS(Alice)  403   ← the keystone: Bob's token CANNOT read Alice
//
// On the OPEN demo sandbox the last line would be 200 — that is exactly the
// leak this phase closes (one identity could read everyone).

import { token } from './jwt.mjs';

const BASE = 'http://localhost:7864';
const admin = token('participant_admin'); // default Canton admin user

async function api(path, { method = 'POST', body, tok } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json, text };
}

async function allocParty(hint) {
  const r = await api('/v2/parties', { body: { partyIdHint: hint, identityProviderId: '' }, tok: admin });
  if (r.status !== 200) throw new Error(`alloc ${hint} → ${r.status}: ${r.text.slice(0, 300)}`);
  return r.json.partyDetails.party;
}

async function createUser(id, party) {
  const r = await api('/v2/users', {
    body: {
      user: { id, primaryParty: party, identityProviderId: '' },
      rights: [{ kind: { CanReadAs: { value: { party } } } }],
    },
    tok: admin,
  });
  if (r.status !== 200) throw new Error(`createUser ${id} → ${r.status}: ${r.text.slice(0, 300)}`);
  return r.json;
}

async function acs(party, tok) {
  const end = await api('/v2/state/ledger-end', { method: 'GET', tok });
  const offset = end.json?.offset ?? 0;
  return api('/v2/state/active-contracts', {
    body: {
      filter: { filtersByParty: { [party]: { cumulative: [{ identifierFilter: { WildcardFilter: { value: { includeCreatedEventBlob: false } } } }] } } },
      verbose: false,
      activeAtOffset: Number(offset),
    },
    tok,
  });
}

const main = async () => {
  console.log('Bootstrapping auth node…');
  const alice = await allocParty('Alice');
  const bob = await allocParty('Bob');
  await createUser('alice', alice);
  await createUser('bob', bob);
  console.log('  alice =', alice);
  console.log('  bob   =', bob);

  const aliceTok = token('alice');
  const bobTok = token('bob');

  const checks = [
    ['no-token → ACS(Alice)', await acs(alice, undefined), 401],
    ['alice    → ACS(Alice)', await acs(alice, aliceTok), 200],
    ['bob      → ACS(Bob)  ', await acs(bob, bobTok), 200],
    ['bob      → ACS(Alice)', await acs(alice, bobTok), 403], // the keystone
  ];

  console.log('\nResult:');
  let allPass = true;
  for (const [label, res, want] of checks) {
    const ok = res.status === want;
    allPass &&= ok;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}  → ${res.status} (want ${want})`);
  }
  console.log(allPass ? '\n✅ Per-party boundary ENFORCED by the ledger.' : '\n❌ Boundary not enforced as expected — see statuses above.');
  process.exit(allPass ? 0 : 1);
};

main().catch((e) => { console.error('ERROR:', e.message); process.exit(2); });
