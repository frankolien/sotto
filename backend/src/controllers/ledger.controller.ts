import { Request, Response } from 'express';

import { HttpError } from '../middleware/http-error.ts';
import { Role, ROLES } from '../models/types.ts';
import { LedgerService } from '../services/ledger.service.ts';

/** Thin HTTP layer: validate input, delegate to the service, return its result. */
export class LedgerController {
  constructor(private readonly ledger: LedgerService) {}

  getState = async (req: Request, res: Response): Promise<void> => {
    const role = req.params.role as Role;
    if (!ROLES.has(role)) throw new HttpError(400, `unknown role: ${req.params.role}`);
    res.json(await this.ledger.stateFor(role));
  };

  configure = async (req: Request, res: Response): Promise<void> => {
    await this.ledger.configure(req.body);
    res.json(await this.ledger.stateFor('payer'));
  };

  settle = async (_req: Request, res: Response): Promise<void> => {
    await this.ledger.settle();
    res.json(await this.ledger.stateFor('payer'));
  };

  approve = async (req: Request, res: Response): Promise<void> => {
    await this.ledger.approve(req.params.lineId);
    res.json(await this.ledger.stateFor('approver'));
  };

  reject = async (req: Request, res: Response): Promise<void> => {
    await this.ledger.reject(req.params.lineId);
    res.json(await this.ledger.stateFor('approver'));
  };

  reset = async (_req: Request, res: Response): Promise<void> => {
    await this.ledger.reset();
    res.json(await this.ledger.stateFor('payer'));
  };
}
