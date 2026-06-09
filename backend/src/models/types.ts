// Domain types shared across the service and HTTP layers.

export type Role = 'payer' | 'recipient' | 'auditor' | 'approver';

export const ROLES: ReadonlySet<Role> = new Set<Role>([
  'payer',
  'recipient',
  'auditor',
  'approver',
]);

export type LineStatus = 'draft' | 'settled' | 'pending' | 'rejected';

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
  mandate: MandateDto;
  batch: BatchDto;
}
