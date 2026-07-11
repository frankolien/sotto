// Session middleware: require a valid Sotto session, and (optionally) a role.

import { NextFunction, Request, Response } from 'express';

import { Role } from '../models/types.ts';
import { Principal, SessionService } from '../services/session.ts';
import { HttpError } from './http-error.ts';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      principal?: Principal;
    }
  }
}

/** Reject anything without a valid Bearer session; attach the principal. */
export function requireSession(sessions: SessionService) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const principal = token ? sessions.verify(token) : null;
    if (!principal) throw new HttpError(401, 'authentication required');
    req.principal = principal;
    next();
  };
}

/** Require the session to be scoped to a workspace (org). Use after requireSession
 * on the multi-tenant org routes. */
export function requireOrg(req: Request, _res: Response, next: NextFunction): void {
  if (!req.principal?.orgId) throw new HttpError(403, 'a workspace session is required');
  next();
}

/** Require a contributor session — scoped to one workspace AND one party (its own
 * wallet). The recipient magic link. */
export function requireContributor(req: Request, _res: Response, next: NextFunction): void {
  if (!req.principal?.orgId || !req.principal?.party) throw new HttpError(403, 'a contributor session is required');
  next();
}

/** Require the session's principal to hold one of the given roles. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.principal || !roles.includes(req.principal.role)) {
      throw new HttpError(403, `this action requires role: ${roles.join(' or ')}`);
    }
    next();
  };
}
