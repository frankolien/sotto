import cors from 'cors';
import express, { Application } from 'express';

import { LedgerController } from './controllers/ledger.controller.ts';
import { errorHandler, notFound } from './middleware/error-handler.ts';
import { apiRoutes } from './routes/index.ts';
import { SessionService } from './services/session.ts';

/** Assemble the Express application (no listening — see server.ts).
 * `jwks`, when given (RS256 mode), is published unauthenticated at the standard
 * well-known path so Canton — and any OIDC client — can fetch the public key.
 * `isReady`, when given, gates /api with a 503 until bootstrap completes (the
 * server listens before bootstrap so the JWKS is reachable during it). */
export function createApp(
  controller: LedgerController,
  sessions: SessionService,
  jwks?: () => unknown,
  isReady?: () => boolean,
): Application {
  const app = express();
  app.use(cors());
  app.use(express.json());
  if (jwks) app.get('/.well-known/jwks.json', (_req, res) => res.json(jwks()));
  if (isReady) {
    app.use('/api', (_req, res, next) =>
      isReady() ? next() : res.status(503).json({ error: 'bootstrapping — retry shortly' }));
  }
  app.use('/api', apiRoutes(controller, sessions));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
