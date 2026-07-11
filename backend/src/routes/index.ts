import { Router } from 'express';

import { LedgerController } from '../controllers/ledger.controller.ts';
import { OrgController } from '../controllers/org.controller.ts';
import { SessionService } from '../services/session.ts';
import { ledgerRoutes } from './ledger.routes.ts';
import { orgRoutes } from './org.routes.ts';

/** The /api surface: the legacy single-tenant demo (ledgerRoutes) plus the
 * multi-tenant, self-custody workspace API (orgRoutes). */
export function apiRoutes(
  controller: LedgerController,
  orgController: OrgController,
  sessions: SessionService,
): Router {
  const router = Router();
  router.get('/health', (_req, res) => res.json({ ok: true }));
  router.use('/', ledgerRoutes(controller, sessions));
  router.use('/', orgRoutes(orgController, sessions));
  return router;
}
