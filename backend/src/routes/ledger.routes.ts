import { Router } from 'express';

import { LedgerController } from '../controllers/ledger.controller.ts';
import { asyncHandler } from '../middleware/async-handler.ts';
import { requireRole, requireSession } from '../middleware/session.ts';
import { SessionService } from '../services/session.ts';

/** Routes for the confidential-payout rail. Every endpoint past /login requires a
 * session; reads serve the principal's own role, and writes are role-gated. */
export function ledgerRoutes(controller: LedgerController, sessions: SessionService): Router {
  const router = Router();
  const auth = requireSession(sessions);

  router.post('/login', asyncHandler(controller.login));
  router.post('/wallet', auth, requireRole('payer'), asyncHandler(controller.provisionWallet));
  router.get('/state', auth, asyncHandler(controller.getState));
  router.get('/ledger', auth, asyncHandler(controller.ledgerInfo));
  router.post('/configure', auth, requireRole('payer'), asyncHandler(controller.configure));
  router.post('/settle', auth, requireRole('payer'), asyncHandler(controller.settle));
  router.post('/approve/:lineId', auth, requireRole('approver'), asyncHandler(controller.approve));
  router.post('/reject/:lineId', auth, requireRole('approver'), asyncHandler(controller.reject));
  router.post('/reset', auth, requireRole('payer'), asyncHandler(controller.reset));
  return router;
}
