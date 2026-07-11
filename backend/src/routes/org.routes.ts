import { Router } from 'express';

import { OrgController } from '../controllers/org.controller.ts';
import { asyncHandler } from '../middleware/async-handler.ts';
import { requireContributor, requireOrg, requireRole, requireSession } from '../middleware/session.ts';
import { SessionService } from '../services/session.ts';

/** Multi-tenant, self-custody workspace API. `/orgs` creates or enters a workspace
 * (returning a session scoped to it); every `/workspace` route then operates on the
 * session's own org, so one tenant can never touch another's rail. */
export function orgRoutes(controller: OrgController, sessions: SessionService): Router {
  const router = Router();
  const auth = requireSession(sessions);
  // Workspace routes are the org owner's — a contributor session (role 'recipient',
  // scoped to one wallet) must never reach the payer dashboard.
  const workspace = [auth, requireOrg, requireRole('payer')];

  router.get('/workspace-availability', asyncHandler(controller.availability));
  router.post('/orgs', asyncHandler(controller.create));
  router.get('/orgs', asyncHandler(controller.list));
  router.post('/orgs/:id/login', asyncHandler(controller.login));

  router.get('/workspace', workspace, asyncHandler(controller.dashboard));
  router.get('/workspace/activity', workspace, asyncHandler(controller.activity));
  router.put('/workspace/contributors', workspace, asyncHandler(controller.setContributors));
  router.post('/workspace/fund', workspace, asyncHandler(controller.fund));
  router.post('/workspace/mandate', workspace, asyncHandler(controller.mandate));
  router.post('/workspace/settle', workspace, asyncHandler(controller.settle));
  router.post('/workspace/approve/:lineId', workspace, asyncHandler(controller.approve));
  router.post('/workspace/reject/:lineId', workspace, asyncHandler(controller.reject));
  router.post('/workspace/reset', workspace, asyncHandler(controller.reset));
  router.get('/workspace/view/:party', workspace, asyncHandler(controller.viewAs));
  router.post('/workspace/contributors/:id/link', workspace, asyncHandler(controller.contributorLink));

  // Contributor side: a magic-link session scoped to one wallet reads its own pay.
  router.get('/received', auth, requireContributor, asyncHandler(controller.received));
  return router;
}
