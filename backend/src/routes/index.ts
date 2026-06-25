import { Router } from 'express';

import { LedgerController } from '../controllers/ledger.controller.ts';
import { SessionService } from '../services/session.ts';
import { ledgerRoutes } from './ledger.routes.ts';

/** The /api surface. */
export function apiRoutes(controller: LedgerController, sessions: SessionService): Router {
  const router = Router();
  router.get('/health', (_req, res) => res.json({ ok: true }));
  router.use('/', ledgerRoutes(controller, sessions));
  return router;
}
