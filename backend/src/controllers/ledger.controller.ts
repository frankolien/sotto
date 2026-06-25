import { Request, Response } from 'express';

import { HttpError } from '../middleware/http-error.ts';
import { Role, ROLES } from '../models/types.ts';
import { LedgerService } from '../services/ledger.service.ts';
import { SessionService } from '../services/session.ts';

/** Thin HTTP layer: authenticate, validate, delegate to the service. Every read
 * and write is scoped to the *logged-in principal* — there is no role parameter
 * a client can pass to peek at another role. */
export class LedgerController {
  constructor(
    private readonly ledger: LedgerService,
    private readonly sessions: SessionService,
  ) {}

  /** Sign in as an identity. DEV: passwordless. Production validates a credential
   * / OIDC assertion here before issuing the session. */
  login = async (req: Request, res: Response): Promise<void> => {
    const role = req.body?.role as Role;
    if (!ROLES.has(role)) throw new HttpError(400, `unknown role: ${req.body?.role}`);
    res.json({ token: this.sessions.issue(role), role });
  };

  /** Provision a custodial wallet for a new counterparty: a real Canton party +
   * a user scoped to it. This is the "embedded wallet on sign-up" step — auth
   * proves identity, this gives that identity something on-ledger to own. */
  provisionWallet = async (req: Request, res: Response): Promise<void> => {
    const subject = String(req.body?.subject ?? '').trim();
    if (!subject) throw new HttpError(400, 'subject is required');
    res.json(await this.ledger.provisionWallet(subject));
  };

  getState = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.ledger.stateFor(req.principal!.role));
  };

  ledgerInfo = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.ledger.ledgerInfo(req.principal!.role));
  };

  configure = async (req: Request, res: Response): Promise<void> => {
    await this.ledger.configure(req.body);
    res.json(await this.ledger.stateFor(req.principal!.role));
  };

  settle = async (req: Request, res: Response): Promise<void> => {
    await this.ledger.settle();
    res.json(await this.ledger.stateFor(req.principal!.role));
  };

  approve = async (req: Request, res: Response): Promise<void> => {
    await this.ledger.approve(req.params.lineId);
    res.json(await this.ledger.stateFor(req.principal!.role));
  };

  reject = async (req: Request, res: Response): Promise<void> => {
    await this.ledger.reject(req.params.lineId);
    res.json(await this.ledger.stateFor(req.principal!.role));
  };

  reset = async (req: Request, res: Response): Promise<void> => {
    await this.ledger.reset();
    res.json(await this.ledger.stateFor(req.principal!.role));
  };
}
