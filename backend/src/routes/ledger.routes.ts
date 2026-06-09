import { Router } from 'express';

import { LedgerController } from '../controllers/ledger.controller.ts';
import { asyncHandler } from '../middleware/async-handler.ts';

/** Routes for the confidential-payout rail (the LedgerRepository contract). */
export function ledgerRoutes(controller: LedgerController): Router {
  const router = Router();
  router.get('/state/:role', asyncHandler(controller.getState));
  router.post('/configure', asyncHandler(controller.configure));
  router.post('/settle', asyncHandler(controller.settle));
  router.post('/approve/:lineId', asyncHandler(controller.approve));
  router.post('/reject/:lineId', asyncHandler(controller.reject));
  router.post('/reset', asyncHandler(controller.reset));
  return router;
}
