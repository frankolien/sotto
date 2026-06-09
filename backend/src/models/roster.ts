// The demo's narrative: the org's contributor roster and the seed mandate.
// Each recipient becomes a Canton party at bootstrap.

import { RailConfig } from './types.ts';

export interface RecipientMeta {
  id: string;
  hint: string; // Canton party-id hint
  name: string;
  role: string; // the contributor's job
  handle: string;
  amount: number;
}

/** Five clear under the threshold; the score milestone exceeds it and is held. */
export const RECIPIENTS: readonly RecipientMeta[] = [
  { id: 'r1', hint: 'Amara', name: 'Amara Okafor', role: 'Sound design', handle: 'amara.lumen', amount: 4200 },
  { id: 'r2', hint: 'Tobi', name: 'Tobi Adeyemi', role: 'Motion', handle: 'tobi.lumen', amount: 3850 },
  { id: 'r3', hint: 'Chen', name: 'Chen Wei', role: 'Edit', handle: 'chen.lumen', amount: 5500 },
  { id: 'r4', hint: 'Diego', name: 'Diego Marquez', role: 'Color', handle: 'diego.lumen', amount: 2900 },
  { id: 'r5', hint: 'Fatima', name: 'Fatima Bello', role: 'Production', handle: 'fatima.lumen', amount: 4100 },
  { id: 'r6', hint: 'Kwame', name: 'Kwame Nyong', role: 'Score · milestone', handle: 'kwame.lumen', amount: 32000 },
];

/** The recipient lens represents this contributor. */
export const YOU = 'r1';

export const BATCH_ID = 'BX-4471';
export const BATCH_LABEL = 'May contributor payout';

export const DEFAULT_CONFIG: RailConfig = {
  org: 'Lumen Studio',
  treasury: 312480,
  cap: 200000,
  threshold: 25000,
  approver: 'Priya Raman',
  approverRole: 'Finance lead',
  auditor: 'Hale & Co.',
  auditorRole: 'External audit',
};
