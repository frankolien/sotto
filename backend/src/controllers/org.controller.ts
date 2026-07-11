// HTTP surface for the multi-tenant, self-custody engine. Creating a workspace
// returns a session scoped to that org; every /workspace call then operates on the
// session's own org — a client can't touch another tenant.

import { Request, Response } from 'express';

import { HttpError } from '../middleware/http-error.ts';
import { OrgConfig } from '../models/org.ts';
import { OrgService } from '../services/org.service.ts';
import { SessionService } from '../services/session.ts';

const str = (v: unknown, field: string): string => {
  if (typeof v !== 'string' || !v.trim()) throw new HttpError(400, `${field} is required`);
  return v.trim();
};
const posNum = (v: unknown, field: string): number => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new HttpError(400, `${field} must be a non-negative number`);
  return n;
};

export class OrgController {
  constructor(
    private readonly orgs: OrgService,
    private readonly sessions: SessionService,
  ) {}

  private orgId(req: Request): string {
    return req.principal!.orgId!;
  }

  /** Create a workspace and return a session scoped to it. */
  create = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    const config: OrgConfig = {
      name: str(b.name, 'name'),
      asset: (typeof b.asset === 'string' && b.asset.trim()) || 'USDC',
      cap: posNum(b.cap ?? 0, 'cap'),
      threshold: posNum(b.threshold ?? 0, 'threshold'),
      approverParty: str(b.approverParty, 'approverParty'),
      approverLabel: (typeof b.approverLabel === 'string' && b.approverLabel.trim()) || 'Approver',
      auditorParty: str(b.auditorParty, 'auditorParty'),
      auditorLabel: (typeof b.auditorLabel === 'string' && b.auditorLabel.trim()) || 'Auditor',
    };
    const org = await this.orgs.createOrg(config);
    res.json({ org, token: this.sessions.issue('payer', org.id) });
  };

  /** List workspaces (dev/admin — a product would scope this to the caller). */
  list = async (_req: Request, res: Response): Promise<void> => {
    res.json(
      this.orgs.list().map((o) => ({
        id: o.id,
        name: o.config.name,
        asset: o.config.asset,
        contributors: o.contributors.length,
        createdAt: o.createdAt,
      })),
    );
  };

  /** Enter an existing workspace (dev passwordless). */
  login = async (req: Request, res: Response): Promise<void> => {
    const org = this.orgs.get(str(req.params.id, 'id'));
    if (!org) throw new HttpError(404, 'workspace not found');
    res.json({ org, token: this.sessions.issue('payer', org.id) });
  };

  dashboard = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.orgs.payerView(this.orgId(req)));
  };

  /** The org's activity trail — funding, batches, approvals, cycles. */
  activity = async (req: Request, res: Response): Promise<void> => {
    res.json({ events: this.orgs.activity(this.orgId(req)) });
  };

  setContributors = async (req: Request, res: Response): Promise<void> => {
    const rows = Array.isArray(req.body?.contributors) ? req.body.contributors : [];
    const contributors = rows.map((r: Record<string, unknown>) => ({
      party: str(r.party, 'contributor.party'),
      name: str(r.name, 'contributor.name'),
      role: (typeof r.role === 'string' && r.role.trim()) || 'Contributor',
      amount: posNum(r.amount, 'contributor.amount'),
    }));
    this.orgs.setContributors(this.orgId(req), contributors);
    res.json(await this.orgs.payerView(this.orgId(req)));
  };

  fund = async (req: Request, res: Response): Promise<void> => {
    await this.orgs.fund(this.orgId(req), posNum(req.body?.amount, 'amount'));
    res.json(await this.orgs.payerView(this.orgId(req)));
  };

  mandate = async (req: Request, res: Response): Promise<void> => {
    await this.orgs.establishMandate(this.orgId(req));
    res.json(await this.orgs.payerView(this.orgId(req)));
  };

  settle = async (req: Request, res: Response): Promise<void> => {
    await this.orgs.settle(this.orgId(req));
    res.json(await this.orgs.payerView(this.orgId(req)));
  };

  approve = async (req: Request, res: Response): Promise<void> => {
    await this.orgs.approve(this.orgId(req), str(req.params.lineId, 'lineId'));
    res.json(await this.orgs.payerView(this.orgId(req)));
  };

  reject = async (req: Request, res: Response): Promise<void> => {
    await this.orgs.reject(this.orgId(req), str(req.params.lineId, 'lineId'));
    res.json(await this.orgs.payerView(this.orgId(req)));
  };

  reset = async (req: Request, res: Response): Promise<void> => {
    await this.orgs.archiveAll(this.orgId(req));
    res.json(await this.orgs.payerView(this.orgId(req)));
  };

  /** The privacy proof: what a given party actually sees on the ledger. */
  viewAs = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.orgs.viewAs(this.orgId(req), decodeURIComponent(str(req.params.party, 'party'))));
  };

  /** Payer mints a shareable magic link for a contributor: a session scoped to
   * exactly that contributor's wallet, so it can only ever read their own payments. */
  contributorLink = async (req: Request, res: Response): Promise<void> => {
    const org = this.orgs.get(this.orgId(req));
    const c = org?.contributors.find((r) => r.id === str(req.params.id, 'id'));
    if (!org || !c) throw new HttpError(404, 'contributor not found');
    const WEEK = 7 * 24 * 3600;
    res.json({ token: this.sessions.issue('recipient', org.id, c.party, WEEK), name: c.name, party: c.party });
  };

  /** Contributor reads their own payments (contributor session — scoped to their party). */
  received = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.orgs.received(req.principal!.orgId!, req.principal!.party!));
  };
}
