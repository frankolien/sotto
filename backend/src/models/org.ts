// Multi-tenant, self-custody domain model.
//
// An Org is a Sotto workspace — a DAO, protocol, or crypto company that runs
// private contributor payouts. The org's own treasury identity (the payer) is a
// Canton party Sotto operates FOR the org. Its contributors, approver and auditor
// are identified by THEIR OWN Canton parties (wallets they control): Sotto never
// allocates or holds their keys. That is what makes the rail non-custodial for
// everyone but the org's own treasury.

/** A payee on an org's roster, identified by the party they self-custody. */
export interface Contributor {
  id: string; // stable within the org (e.g. 'c1')
  party: string; // the contributor's OWN Canton party id — a wallet they control
  name: string; // display handle, e.g. 'nebula.eth'
  role: string; // what they do, e.g. 'Protocol eng'
  amount: number; // this cycle's payout in the settlement asset
}

/** The rules an org sets for its rail. Approver/auditor are external parties the
 * org designates (a core multisig, a community auditor) — self-custody, like the
 * contributors. */
export interface OrgConfig {
  name: string; // 'Helix Protocol'
  asset: string; // settlement-asset label, e.g. 'USDC'
  cap: number; // max a single batch may disburse
  threshold: number; // any single payment above this needs the approver
  approverParty: string; // external party that signs over-threshold payments
  approverLabel: string; // display, e.g. 'Core Multisig'
  auditorParty: string; // external party that may verify the whole batch
  auditorLabel: string; // display, e.g. 'LlamaRisk'
}

/** A tenant. `payerParty`/`issuerParty` are allocated once at creation and
 * persisted, so a restart re-binds the same on-ledger identities (party
 * allocation is idempotent by hint) rather than losing the org. */
export interface Org {
  id: string; // stable slug, e.g. 'helix-protocol'
  config: OrgConfig;
  payerParty: string; // the org's treasury identity (Sotto-operated for the org)
  issuerParty: string; // settlement-asset issuer (collapsed into payer for now)
  contributors: Contributor[];
  treasury: number; // amount funded into the treasury
  mandateCid: string; // the live PayoutMandate contract, if established
  batchRef: string; // current cycle label
  createdAt: string; // ISO
}

/** A slug safe for a party-id hint and a URL: alphanumeric, lowercased. */
export const orgSlug = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'org';
