// Multi-tenant, self-custody payout engine.
//
// Sotto operates ONE identity per org: the payer (the org's treasury), for which
// it holds a scoped Canton user. Everyone else — contributors, approver, auditor —
// is an EXTERNAL party the org names but does not custody. So the engine can:
//   * act as the org's payer (fund, run batches, raise/settle proposals), and
//   * name external parties as beneficiaries/observers on the ledger,
// but it never holds a contributor's keys. Reads for a non-payer lens are done AS
// that party (in production, via that party's own login; on a dev sandbox, via a
// scoped view-user this service ensures). Orgs are fully isolated: each has its own
// parties, treasury, mandate and roster, persisted in the OrgStore.

import { Contributor, Org, OrgConfig, orgSlug } from '../models/org.ts';
import { CantonService, CreatedEvent, canActAs, canReadAs } from './canton.service.ts';
import { OrgStore } from './org-store.ts';

const num = (s: unknown): number => Number(String(s));
const dec = (n: number): string => n.toFixed(4);
const hintOf = (party: string): string => party.split('::')[0];

export type LineStatus = 'draft' | 'settled' | 'pending' | 'rejected';

export interface PayerLine {
  id: string;
  party: string;
  name: string;
  role: string;
  amount: number;
  status: LineStatus;
  over: boolean; // above the mandate threshold → needs the approver
}

export class OrgService {
  private seq = 0;
  private readonly proposalCid = new Map<string, Map<string, string>>(); // orgId → lineId → cid
  private readonly proposalTreasury = new Map<string, Map<string, string>>(); // orgId → lineId → holding cid

  constructor(
    private readonly canton: CantonService,
    private readonly adminUser: string,
    private readonly store: OrgStore,
  ) {}

  private cmd(): string {
    return `sotto-org-${Date.now()}-${this.seq++}`;
  }

  private payerUser(org: Org): string {
    return `u-${org.id}-payer`;
  }

  /** A dev/read scoped user for an external party — used to read (or, for the
   * approver, act) AS that party when its own client isn't the caller. In
   * production this is replaced by the party's own OIDC identity. */
  private async viewUser(party: string, canAct = false): Promise<string> {
    const user = `u-view-${hintOf(party)}`;
    const rights = canAct ? [canActAs(party), canReadAs(party)] : [canReadAs(party)];
    await this.canton.ensureUser(user, rights, this.adminUser);
    return user;
  }

  list(): Org[] {
    return this.store.list();
  }

  get(id: string): Org | undefined {
    return this.store.get(id);
  }

  /** Create a workspace: allocate the org's own treasury party (payer == issuer for
   * now) and a scoped user Sotto operates it with. Idempotent by slug, so the same
   * name re-binds the same on-ledger identity. */
  async createOrg(config: OrgConfig): Promise<Org> {
    const id = orgSlug(config.name);
    const existing = this.store.get(id);
    if (existing) return existing;

    const payerParty = await this.canton.ensureParty(`${id}-treasury`, this.adminUser);
    await this.canton.ensureUser(
      this.payerUser({ id } as Org),
      [canActAs(payerParty), canReadAs(payerParty)],
      this.adminUser,
    );

    const org: Org = {
      id,
      config,
      payerParty,
      issuerParty: payerParty, // settlement-asset issuer collapses into the payer for now
      contributors: [],
      treasury: 0,
      mandateCid: '',
      batchRef: `${id.toUpperCase()}-1`,
      createdAt: new Date().toISOString(),
    };
    this.store.save(org);
    return org;
  }

  /** Set the roster. Contributors are EXTERNAL parties the org supplies — we only
   * validate + store them; we never allocate or custody them. */
  setContributors(orgId: string, rows: Omit<Contributor, 'id'>[]): Org {
    const org = this.require(orgId);
    org.contributors = rows.map((r, i) => {
      if (!/::/.test(r.party)) throw new Error(`contributor "${r.name}" needs a full Canton party id (name::fingerprint)`);
      return { id: `c${i + 1}`, party: r.party, name: r.name, role: r.role, amount: r.amount };
    });
    this.store.save(org);
    return org;
  }

  /** Fund the treasury: the issuer (== payer) mints a settlement Holding to itself. */
  async fund(orgId: string, amount: number): Promise<Org> {
    const org = this.require(orgId);
    await this.canton.submit(
      [org.issuerParty],
      [this.canton.create('Holding', { issuer: org.issuerParty, owner: org.payerParty, amount: dec(amount) })],
      this.cmd(),
      this.payerUser(org),
    );
    org.treasury += amount;
    this.store.save(org);
    return org;
  }

  /** Establish (or replace) the PayoutMandate over the current roster. */
  async establishMandate(orgId: string): Promise<Org> {
    const org = this.require(orgId);
    const c = org.config;
    const created = await this.canton.submit(
      [org.payerParty, org.issuerParty],
      [this.canton.create('PayoutMandate', {
        payer: org.payerParty,
        issuer: org.issuerParty,
        auditor: c.auditorParty,
        approver: c.approverParty,
        cap: dec(c.cap),
        threshold: dec(c.threshold),
        approved: org.contributors.map((r) => r.party),
      })],
      this.cmd(),
      this.payerUser(org),
    );
    org.mandateCid = created.find((e) => e.templateId.endsWith(':PayoutMandate'))?.contractId ?? org.mandateCid;
    this.store.save(org);
    return org;
  }

  /** Archive every live Sotto contract for an org (the payer is a signatory of all
   * four templates, so it can). Resets a cycle to a clean slate. */
  async archiveAll(orgId: string): Promise<void> {
    const org = this.require(orgId);
    const user = this.payerUser(org);
    const all = await this.canton.activeContracts(org.payerParty, user);
    for (const ev of all) {
      const entity = ev.templateId.split(':').pop()!;
      try {
        await this.canton.submit([org.payerParty], [this.canton.exercise(entity, ev.contractId, 'Archive', {})], this.cmd(), user);
      } catch {
        // not ours to archive / already gone — skip
      }
    }
    org.treasury = 0;
    org.mandateCid = '';
    this.proposalCid.delete(orgId);
    this.proposalTreasury.delete(orgId);
    this.store.save(org);
  }

  private async treasuryHolding(org: Org): Promise<{ cid: string; amount: number }> {
    const holdings = await this.canton.activeContracts(org.payerParty, this.payerUser(org), ['Holding']);
    const mine = holdings
      .filter((h) => h.createArgument.owner === org.payerParty)
      .map((h) => ({ cid: h.contractId, amount: num(h.createArgument.amount) }))
      .sort((a, b) => b.amount - a.amount);
    return mine[0] ?? { cid: '', amount: 0 };
  }

  /** Run the batch: settle under-threshold lines atomically to their self-custodied
   * parties; raise a maker-checker proposal for each over-threshold line. */
  async settle(orgId: string): Promise<Org> {
    const org = this.require(orgId);
    const c = org.config;
    const under = org.contributors.filter((r) => r.amount <= c.threshold);
    const over = org.contributors.filter((r) => r.amount > c.threshold);

    if (under.length) {
      const t = await this.treasuryHolding(org);
      await this.canton.submit(
        [org.payerParty],
        [this.canton.exercise('PayoutMandate', org.mandateCid, 'Disburse', {
          treasury: t.cid,
          batchRef: org.batchRef,
          payments: under.map((r) => ({ _1: r.party, _2: dec(r.amount) })),
        })],
        this.cmd(),
        this.payerUser(org),
      );
    }

    const props = this.proposalCid.get(orgId) ?? new Map<string, string>();
    const treas = this.proposalTreasury.get(orgId) ?? new Map<string, string>();
    for (const r of over) {
      const t = await this.treasuryHolding(org);
      const created = await this.canton.submit(
        [org.payerParty, org.issuerParty],
        [this.canton.create('LargePaymentProposal', {
          payer: org.payerParty,
          issuer: org.issuerParty,
          approver: c.approverParty,
          auditor: c.auditorParty,
          recipient: r.party,
          amount: dec(r.amount),
          treasury: t.cid,
          batchRef: org.batchRef,
        })],
        this.cmd(),
        this.payerUser(org),
      );
      const cid = created.find((e) => e.templateId.endsWith(':LargePaymentProposal'))?.contractId;
      if (cid) {
        props.set(r.id, cid);
        treas.set(r.id, t.cid);
      }
    }
    this.proposalCid.set(orgId, props);
    this.proposalTreasury.set(orgId, treas);
    return org;
  }

  /** Approver signs off an over-threshold line. In production the approver's OWN
   * client submits this; here we act as the approver party via a scoped user
   * (dev), reading the payer's treasury for the choice's fetch. */
  async approve(orgId: string, lineId: string): Promise<void> {
    const org = this.require(orgId);
    const cid = this.proposalCid.get(orgId)?.get(lineId);
    if (!cid) return;
    const approverUser = await this.viewUser(org.config.approverParty, true);
    // The approver isn't a stakeholder of the payer's treasury Holding, but the
    // Approve choice fetches it. Disclose that ONE contract explicitly (its blob),
    // rather than granting the approver readAs over the payer's whole book —
    // self-custody means the approver sees only what it's handed.
    const treasuryCid = this.proposalTreasury.get(orgId)?.get(lineId);
    const disclosed = [];
    if (treasuryCid) {
      const holdings = await this.canton.activeContracts(org.payerParty, this.payerUser(org), ['Holding'], true);
      const t = holdings.find((h) => h.contractId === treasuryCid);
      if (t?.createdEventBlob) {
        disclosed.push({ templateId: t.templateId, contractId: treasuryCid, createdEventBlob: t.createdEventBlob });
      }
    }
    await this.canton.submit(
      [org.config.approverParty],
      [this.canton.exercise('LargePaymentProposal', cid, 'Approve', {})],
      this.cmd(),
      approverUser,
      { disclosedContracts: disclosed },
    );
    this.proposalCid.get(orgId)?.delete(lineId);
    this.proposalTreasury.get(orgId)?.delete(lineId);
  }

  async reject(orgId: string, lineId: string): Promise<void> {
    const org = this.require(orgId);
    const cid = this.proposalCid.get(orgId)?.get(lineId);
    if (!cid) return;
    const approverUser = await this.viewUser(org.config.approverParty, true);
    await this.canton.submit(
      [org.config.approverParty],
      [this.canton.exercise('LargePaymentProposal', cid, 'Reject', {})],
      this.cmd(),
      approverUser,
    );
    this.proposalCid.get(orgId)?.delete(lineId);
    this.proposalTreasury.get(orgId)?.delete(lineId);
  }

  /** The org's own (payer) view: treasury + every line with its live status, read
   * as the payer straight off the ledger. */
  async payerView(orgId: string): Promise<{
    org: string;
    asset: string;
    treasury: number;
    threshold: number;
    cap: number;
    lines: PayerLine[];
  }> {
    const org = this.require(orgId);
    const user = this.payerUser(org);
    const [receipts, proposals, holdings] = await Promise.all([
      this.canton.activeContracts(org.payerParty, user, ['DisbursementReceipt']),
      this.canton.activeContracts(org.payerParty, user, ['LargePaymentProposal']),
      this.canton.activeContracts(org.payerParty, user, ['Holding']),
    ]);
    const paid = new Set(receipts.map((r) => r.createArgument.recipient));
    const pending = new Set(proposals.map((p) => p.createArgument.recipient));
    const treasury = holdings
      .filter((h) => h.createArgument.owner === org.payerParty)
      .reduce((a, h) => a + num(h.createArgument.amount), 0);

    const lines: PayerLine[] = org.contributors.map((r) => ({
      id: r.id,
      party: r.party,
      name: r.name,
      role: r.role,
      amount: r.amount,
      over: r.amount > org.config.threshold,
      status: paid.has(r.party) ? 'settled' : pending.has(r.party) ? 'pending' : 'draft',
    }));
    return { org: org.config.name, asset: org.config.asset, treasury, threshold: org.config.threshold, cap: org.config.cap, lines };
  }

  /** What an arbitrary party sees — the proof of privacy. Reads AS that party (its
   * own client in prod; a scoped view-user here). Returns only what the ledger
   * discloses to them. */
  async viewAs(orgId: string, party: string): Promise<{ party: string; balance: number; contracts: { kind: string; amount: number | null; recipient?: string }[] }> {
    this.require(orgId);
    const user = await this.viewUser(party);
    const all = await this.canton.activeContracts(party, user);
    let balance = 0;
    const contracts = all.map((ev: CreatedEvent) => {
      const kind = ev.templateId.split(':').pop()!;
      const a = ev.createArgument;
      if (kind === 'Holding' && a.owner === party) balance += num(a.amount);
      return {
        kind,
        amount: a.amount != null ? num(a.amount) : null,
        recipient: a.recipient ? hintOf(a.recipient) : undefined,
      };
    });
    return { party, balance, contracts };
  }

  /** The contributor's own view: their payments from this org and their balance,
   * read AS their wallet — so it contains only what the ledger discloses to them. */
  async received(orgId: string, party: string): Promise<{
    org: string;
    asset: string;
    balance: number;
    payments: { amount: number; from: string; batchRef: string; at: string }[];
  }> {
    const org = this.require(orgId);
    const user = await this.viewUser(party);
    const [receipts, holdings] = await Promise.all([
      this.canton.activeContracts(party, user, ['DisbursementReceipt']),
      this.canton.activeContracts(party, user, ['Holding']),
    ]);
    const balance = holdings
      .filter((h) => h.createArgument.owner === party)
      .reduce((a, h) => a + num(h.createArgument.amount), 0);
    const payments = receipts
      .filter((r) => r.createArgument.recipient === party)
      .map((r) => ({
        amount: num(r.createArgument.amount),
        from: org.config.name,
        batchRef: String(r.createArgument.batchRef ?? ''),
        at: r.createdAt ?? '',
      }))
      .sort((a, b) => b.at.localeCompare(a.at));
    return { org: org.config.name, asset: org.config.asset, balance, payments };
  }

  private require(orgId: string): Org {
    const org = this.store.get(orgId);
    if (!org) throw new Error(`unknown org: ${orgId}`);
    return org;
  }
}
