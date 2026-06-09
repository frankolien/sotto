import cors from 'cors';
import express, { Application } from 'express';

import { LedgerController } from './controllers/ledger.controller.ts';
import { errorHandler, notFound } from './middleware/error-handler.ts';
import { apiRoutes } from './routes/index.ts';

/** Assemble the Express application (no listening — see server.ts). */
export function createApp(controller: LedgerController): Application {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', apiRoutes(controller));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
