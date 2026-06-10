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

export interface LedgerStateDto {
  treasury: number;
  org: string;
  /** Identity the Recipient lens represents (the first payee). Demo-only label
   * for the role switcher — never used in any role's data panel. */
  recipientName: string;
  mandate: MandateDto;
  batch: BatchDto;
}
