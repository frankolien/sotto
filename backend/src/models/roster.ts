// The demo's narrative: the org's contributor roster and the seed mandate.
// Each recipient becomes a Canton party at bootstrap.

import { RailConfig, RecipientInput } from './types.ts';

export interface RecipientMeta {
  id: string;
  hint: string; // Canton party-id hint
  name: string;
  role: string; // the contributor's job
  handle: string;
  amount: number;
}

/** Five clear under the threshold; the milestone grant exceeds it and is held. */
export const RECIPIENTS: readonly RecipientMeta[] = [
  { id: 'r1', hint: 'Amara', name: 'amara.eth', role: 'Core protocol', handle: 'amara.eth', amount: 4200 },
  { id: 'r2', hint: 'Tobi', name: 'tobi.eth', role: 'Smart contracts', handle: 'tobi.eth', amount: 3850 },
  { id: 'r3', hint: 'Chen', name: 'chen.eth', role: 'Frontend', handle: 'chen.eth', amount: 5500 },
  { id: 'r4', hint: 'Luca', name: 'luca.eth', role: 'DevRel', handle: 'luca.eth', amount: 2900 },
  { id: 'r5', hint: 'Fatima', name: 'fatima.eth', role: 'Governance', handle: 'fatima.eth', amount: 4100 },
  { id: 'r6', hint: 'Mert', name: 'mert.eth', role: 'Protocol V2 · milestone', handle: 'mert.eth', amount: 32000 },
];

/** The recipient lens represents this contributor. */
export const YOU = 'r1';

export const BATCH_ID = 'BX-4471';
export const BATCH_LABEL = 'May contributor payout';

export const DEFAULT_CONFIG: RailConfig = {
  org: 'Nova DAO',
  treasury: 312480,
  cap: 200000,
  threshold: 25000,
  approver: 'jules.eth',
  approverRole: 'Core multisig',
  auditor: 'Sable Audit',
  auditorRole: 'External audit',
};

/** A Canton party-id hint: alphanumeric only, optionally salted for uniqueness. */
const alnum = (s: string): string => s.replace(/[^a-zA-Z0-9]/g, '');
export const partyHint = (name: string, salt = ''): string =>
  `${alnum(name).slice(0, 24) || 'Party'}${alnum(salt)}`;

/** Resolve the roster a config asks for: the editable list, or the default. */
export function rosterFor(cfg: RailConfig): RecipientMeta[] {
  if (!cfg.recipients?.length) return [...RECIPIENTS];
  return cfg.recipients.map((r: RecipientInput, i: number): RecipientMeta => {
    const id = r.id?.trim() || `r${i + 1}`;
    const first = r.name.trim().split(/\s+/)[0]?.toLowerCase() ?? 'payee';
    return {
      id,
      hint: partyHint(r.name, id), // salted with id so same-named payees stay distinct
      name: r.name.trim(),
      role: r.role.trim(),
      handle: r.handle?.trim() || `${alnum(first) || 'payee'}.${alnum(cfg.org).toLowerCase() || 'rail'}`,
      amount: r.amount,
    };
  });
}
