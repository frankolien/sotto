// Domain types shared across the service and HTTP layers.

export type Role = 'payer' | 'recipient' | 'auditor' | 'approver';

export const ROLES: ReadonlySet<Role> = new Set<Role>([
  'payer',
  'recipient',
  'auditor',
  'approver',
]);

export type LineStatus = 'draft' | 'settled' | 'pending' | 'rejected';

/** One payee as the onboarding flow submits it. id/handle are derived backend
 * side when omitted; each becomes its own Canton party. */
export interface RecipientInput {
  id?: string;
  name: string;
  role: string;
  handle?: string;
  amount: number;
}

/** Configuration the onboarding flow writes into the rail. */
export interface RailConfig {
  org: string;
  treasury: number;
  cap: number;
  threshold: number;
  approver: string;
  approverRole: string;
  auditor: string;
  auditorRole: string;
  /** The editable roster. Absent → the default demo roster is used. */
  recipients?: RecipientInput[];
}

// ---- Response DTOs (the contract the Flutter client consumes) ----

export interface LineDto {
  id: string;
  name: string;
  role: string;
  handle: string;
  amount: number;
  status: LineStatus;
  you: boolean;
  big: boolean;
}

export interface MandateDto {
  name: string;
  cap: number;
  threshold: number;
  approver: string;
  approverRole: string;
  auditor: string;
  auditorRole: string;
  recipients: number;
}

export interface BatchDto {
  id: string;
  label: string;
  status: 'draft' | 'settled';
  lines: LineDto[];
}

/** A real contract on the ledger, surfaced so amounts are provably not made up. */
export interface ContractRefDto {
  template: string; // Holding | PayoutMandate | LargePaymentProposal | DisbursementReceipt
  cid: string; // the on-ledger contract id
  amount: number | null;
  label: string;
}

/** The raw ledger truth for the signed-in party: identity, position, contracts. */
export interface LedgerInfoDto {
  party: string; // full Canton party id of the session
  offset: number; // current ledger offset (live position)
  contracts: ContractRefDto[];
}

/** One real on-ledger activity row (a settled payment), with its real timestamp. */
export interface ActivityDto {
  name: string;
  sub: string;
  amount: number;
  dir: 'in' | 'out';
  at: string; // ISO timestamp from the ledger
  cid: string; // the receipt contract id
}

export interface LedgerStateDto {
  treasury: number;
  org: string;
  /** Identity the Recipient lens represents (the first payee). Demo-only label
   * for the role switcher — never used in any role's data panel. */
  recipientName: string;
  mandate: MandateDto;
  batch: BatchDto;
  /** Real activity derived from on-ledger DisbursementReceipts (newest first). */
  activity: ActivityDto[];
}
