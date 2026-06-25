// Business logic: maps the roster onto Daml parties + the four templates, runs
// the payout flow on Canton, and builds each role's view from a real ACS query
// as that party. What a role sees is Canton's answer, not this service's choice.
//
// Auth model (Phase 1 — custodial): every party is a scoped Canton user.
//   * custodian  — acts/reads as payer + issuer (the operator side). Bounded: it
//                  cannot touch the approver, auditor or any recipient.
//   * approver   — acts/reads as the approver party only.
//   * auditor    — reads the auditor party only.
//   * rcpt-<…>   — reads exactly one recipient party.
// There is no longer a single identity that can act/read as everyone. A self-
// custody counterparty would simply hold its own user's token on its own node.

import {
  BATCH_ID,
  BATCH_LABEL,
  DEFAULT_CONFIG,
  RecipientMeta,
  partyHint,
  rosterFor,
} from '../models/roster.ts';
import {
  ActivityDto,
  ContractRefDto,
  LedgerInfoDto,
  LedgerStateDto,
  LineDto,
  LineStatus,
  RailConfig,
  Role,
} from '../models/types.ts';
import { CantonService, CreatedEvent, canActAs, canReadAs } from './canton.service.ts';

const num = (s: unknown): number => Number(String(s));
const dec = (n: number): string => n.toFixed(4); // Daml Numeric as a string

/** A Canton user id derived from a party — stable per party, so re-ensuring it
 * is a no-op and its rights always match the party it reads. */
const userForParty = (party: string): string => `u-${party.split('::')[0]}`;

export class LedgerService {
  private readonly CUSTODIAN = 'custodian'; // operator-side user (payer + issuer)
  private issuer = '';
  private payer = '';
  private auditorParty = '';
  private approverParty = '';
  private approverUser = '';
  private auditorUser = '';
  private readonly recipientParty = new Map<string, string>(); // lineId → party
  private readonly recipientUser = new Map<string, string>(); // lineId → user id
  private roster: RecipientMeta[] = [];
  private youId = ''; // the recipient the Recipient lens represents (first payee)
  private cfg: RailConfig = DEFAULT_CONFIG;
  private mandateCid = '';
  private lineStatus = new Map<string, LineStatus>();
  private readonly proposalCid = new Map<string, string>(); // lineId → proposal cid
  private readonly proposalTreasury = new Map<string, string>(); // lineId → treasury holding cid
  private settled = false;
  private seq = 0;

  constructor(
    private readonly canton: CantonService,
    private readonly adminUser: string,
  ) {}

  private nextCommandId(): string {
    return `sotto-${Date.now()}-${this.seq++}`;
  }

  /** Bootstrap: upload the DAR + allocate the fixed parties (issuer, payer) and
   * the bounded custodian user, then apply the default config (which allocates
   * the approver/auditor/recipient parties and their scoped users). */
  async init(darPath: string): Promise<void> {
    await this.canton.uploadDar(darPath, this.adminUser);
    this.issuer = await this.canton.ensureParty('Issuer', this.adminUser);
    this.payer = await this.canton.ensureParty('LumenStudio', this.adminUser);
    await this.canton.ensureUser(
      this.CUSTODIAN,
      [canActAs(this.payer), canActAs(this.issuer), canReadAs(this.payer), canReadAs(this.issuer)],
      this.adminUser,
    );
    await this.applyConfig(DEFAULT_CONFIG);
  }

  configure(cfg: RailConfig): Promise<void> {
    return this.applyConfig(cfg);
  }

  /** Custodial JIT wallet provisioning — the "embedded wallet" of first login.
   * Allocate a fresh Canton party for a brand-new subject and a user scoped to
   * act/read as exactly that party, so the instant someone signs in they own an
   * on-ledger identity that can hold a token. The node holds the keys (custodial);
   * a self-custody counterparty would instead hand us a party id it controls and
   * we'd skip allocation. NOTE: holding ≠ receiving a payout — the payer must add
   * this party to a mandate's approved roster before it can be disbursed to. */
  async provisionWallet(subject: string): Promise<{ party: string; user: string }> {
    const hint = partyHint(subject, 'Wallet');
    const party = await this.canton.ensureParty(hint, this.adminUser);
    const user = userForParty(party);
    await this.canton.ensureUser(
      user,
      [canActAs(party), canReadAs(party)],
      this.adminUser,
    );
    return { party, user };
  }

  reset(): Promise<void> {
    return this.applyConfig(DEFAULT_CONFIG);
  }

  /** The party a role reads, and the user whose token reads it. */
  private partyFor(role: Role): string {
    switch (role) {
      case 'payer': return this.payer;
      case 'auditor': return this.auditorParty;
      case 'approver': return this.approverParty;
      case 'recipient': return this.recipientParty.get(this.youId)!;
    }
  }

  private userFor(role: Role): string {
    switch (role) {
      case 'payer': return this.CUSTODIAN;
      case 'auditor': return this.auditorUser;
      case 'approver': return this.approverUser;
      case 'recipient': return this.recipientUser.get(this.youId)!;
    }
  }

  /** Archive every active Sotto contract so a reset/reconfigure starts clean.
   * The issuer is a stakeholder of all four templates; the custodian reads as
   * the issuer and co-signs the archives. */
  private async archiveAll(): Promise<void> {
    const all = await this.canton.activeContracts(this.issuer, this.CUSTODIAN);
    for (const ev of all) {
      const entity = ev.templateId.split(':').pop()!;
      const actAs = entity === 'Holding' ? [this.issuer] : [this.payer, this.issuer];
      try {
        await this.canton.submit(
          actAs,
          [this.canton.exercise(entity, ev.contractId, 'Archive', {})],
          this.nextCommandId(),
          this.CUSTODIAN,
        );
      } catch {
        // already archived or not ours to archive — skip
      }
    }
  }

  /** Allocate the parties + scoped users a config names, fund a fresh treasury,
   * and (re)establish the mandate. Picking a different approver allocates and
   * signs with a different real party, scoped to its own user. */
  private async applyConfig(cfg: RailConfig): Promise<void> {
    await this.archiveAll();
    this.cfg = cfg;
    this.settled = false;
    this.proposalCid.clear();
    this.proposalTreasury.clear();

    // Approver / auditor become their own parties + their own scoped users.
    this.approverParty = await this.canton.ensureParty(partyHint(cfg.approver, 'Approver'), this.adminUser);
    this.auditorParty = await this.canton.ensureParty(partyHint(cfg.auditor, 'Auditor'), this.adminUser);
    this.approverUser = userForParty(this.approverParty);
    this.auditorUser = userForParty(this.auditorParty);
    await this.canton.ensureUser(this.approverUser, [canActAs(this.approverParty), canReadAs(this.approverParty)], this.adminUser);
    await this.canton.ensureUser(this.auditorUser, [canReadAs(this.auditorParty)], this.adminUser);

    // The editable roster: one Canton party + one read-scoped user per payee.
    this.roster = rosterFor(cfg);
    this.youId = this.roster[0]?.id ?? '';
    this.recipientParty.clear();
    this.recipientUser.clear();
    for (const r of this.roster) {
      const party = await this.canton.ensureParty(r.hint, this.adminUser);
      const user = userForParty(party);
      this.recipientParty.set(r.id, party);
      this.recipientUser.set(r.id, user);
      await this.canton.ensureUser(user, [canReadAs(party)], this.adminUser);
    }
    this.lineStatus = new Map(this.roster.map((r) => [r.id, 'draft' as LineStatus]));

    // Issuer mints settlement tokens into the payer's treasury (custodian signs).
    await this.canton.submit(
      [this.issuer],
      [this.canton.create('Holding', { issuer: this.issuer, owner: this.payer, amount: dec(cfg.treasury) })],
      this.nextCommandId(),
      this.CUSTODIAN,
    );

    // Payer + issuer establish the mandate over the roster's parties.
    const approved = this.roster.map((r) => this.recipientParty.get(r.id)!);
    const created = await this.canton.submit(
      [this.payer, this.issuer],
      [this.canton.create('PayoutMandate', {
        payer: this.payer,
        issuer: this.issuer,
        auditor: this.auditorParty,
        approver: this.approverParty,
        cap: dec(cfg.cap),
        threshold: dec(cfg.threshold),
        approved,
      })],
      this.nextCommandId(),
      this.CUSTODIAN,
    );
    this.mandateCid =
      created.find((e) => e.templateId.endsWith(':PayoutMandate'))?.contractId ?? this.mandateCid;
  }

  /** The payer's current treasury Holding (their largest holding). */
  private async currentTreasury(): Promise<{ cid: string; amount: number }> {
    const holdings = await this.canton.activeContracts(this.payer, this.CUSTODIAN, ['Holding']);
    const mine = holdings
      .filter((h) => h.createArgument.owner === this.payer)
      .map((h) => ({ cid: h.contractId, amount: num(h.createArgument.amount) }))
      .sort((a, b) => b.amount - a.amount);
    return mine[0] ?? { cid: '', amount: 0 };
  }

  /** Run the batch: settle under-threshold lines atomically, hold the rest. */
  async settle(): Promise<void> {
    const under = this.roster.filter((r) => r.amount <= this.cfg.threshold);
    const over = this.roster.filter((r) => r.amount > this.cfg.threshold);

    if (under.length) {
      const treasury = await this.currentTreasury();
      await this.canton.submit(
        [this.payer],
        [this.canton.exercise('PayoutMandate', this.mandateCid, 'Disburse', {
          treasury: treasury.cid,
          batchRef: BATCH_ID,
          payments: under.map((r) => ({ _1: this.recipientParty.get(r.id)!, _2: dec(r.amount) })),
        })],
        this.nextCommandId(),
        this.CUSTODIAN,
      );
      for (const r of under) this.lineStatus.set(r.id, 'settled');
    }

    for (const r of over) {
      const treasury = await this.currentTreasury();
      const created = await this.canton.submit(
        [this.payer, this.issuer],
        [this.canton.create('LargePaymentProposal', {
          payer: this.payer,
          issuer: this.issuer,
          approver: this.approverParty,
          auditor: this.auditorParty,
          recipient: this.recipientParty.get(r.id)!,
          amount: dec(r.amount),
          treasury: treasury.cid,
          batchRef: BATCH_ID,
        })],
        this.nextCommandId(),
        this.CUSTODIAN,
      );
      const cid = created.find((e) => e.templateId.endsWith(':LargePaymentProposal'))?.contractId;
      if (cid) {
        this.proposalCid.set(r.id, cid);
        this.proposalTreasury.set(r.id, treasury.cid);
      }
      this.lineStatus.set(r.id, 'pending');
    }
    this.settled = true;
  }

  async approve(lineId: string): Promise<void> {
    const cid = this.proposalCid.get(lineId);
    if (!cid) return;
    // The approver isn't a stakeholder of the payer's treasury Holding, but the
    // Approve choice fetches it. Disclose that ONE contract explicitly (the
    // custodian reads its blob) — no broad readAs of the payer's book.
    const treasuryCid = this.proposalTreasury.get(lineId);
    const disclosed = [];
    if (treasuryCid) {
      const holdings = await this.canton.activeContracts(this.payer, this.CUSTODIAN, ['Holding'], true);
      const t = holdings.find((h) => h.contractId === treasuryCid);
      if (t?.createdEventBlob) {
        disclosed.push({ templateId: t.templateId, contractId: treasuryCid, createdEventBlob: t.createdEventBlob });
      }
    }
    await this.canton.submit(
      [this.approverParty],
      [this.canton.exercise('LargePaymentProposal', cid, 'Approve', {})],
      this.nextCommandId(),
      this.approverUser,
      { disclosedContracts: disclosed },
    );
    this.lineStatus.set(lineId, 'settled');
    this.proposalCid.delete(lineId);
    this.proposalTreasury.delete(lineId);
  }

  async reject(lineId: string): Promise<void> {
    const cid = this.proposalCid.get(lineId);
    if (!cid) return;
    await this.canton.submit(
      [this.approverParty],
      [this.canton.exercise('LargePaymentProposal', cid, 'Reject', {})],
      this.nextCommandId(),
      this.approverUser,
    );
    this.lineStatus.set(lineId, 'rejected');
    this.proposalCid.delete(lineId);
    this.proposalTreasury.delete(lineId);
  }

  private lineJson(meta: RecipientMeta, status: LineStatus): LineDto {
    return {
      id: meta.id,
      name: meta.name,
      role: meta.role,
      handle: meta.handle,
      amount: meta.amount,
      status,
      you: meta.id === this.youId,
      big: meta.amount > this.cfg.threshold,
    };
  }

  /** The state as Canton reveals it to `role` (queried with that role's token). */
  async stateFor(role: Role): Promise<LedgerStateDto> {
    const party = this.partyFor(role);
    const user = this.userFor(role);
    const [receipts, proposals, holdings] = await Promise.all([
      this.canton.activeContracts(party, user, ['DisbursementReceipt']),
      this.canton.activeContracts(party, user, ['LargePaymentProposal']),
      this.canton.activeContracts(party, user, ['Holding']),
    ]);
    const paid = new Set(receipts.map((r: CreatedEvent) => r.createArgument.recipient));
    const proposed = new Set(proposals.map((p: CreatedEvent) => p.createArgument.recipient));

    const ledgerStatus = (meta: RecipientMeta): LineStatus => {
      const p = this.recipientParty.get(meta.id)!;
      if (paid.has(p)) return 'settled';
      if (proposed.has(p)) return 'pending';
      return this.lineStatus.get(meta.id) ?? 'draft';
    };

    let lines: LineDto[];
    if (role === 'payer' || role === 'auditor') {
      lines = this.roster.map((m) => this.lineJson(m, ledgerStatus(m)));
    } else if (role === 'approver') {
      lines = this.roster.filter((m) => m.amount > this.cfg.threshold).map((m) =>
        this.lineJson(m, ledgerStatus(m)),
      );
    } else {
      // recipient: only their own receipt is ever visible to them
      const meta = this.roster.find((m) => m.id === this.youId);
      const myParty = this.recipientParty.get(this.youId);
      lines = meta && myParty && paid.has(myParty) ? [this.lineJson(meta, 'settled')] : [];
    }

    const treasury = holdings
      .filter((h) => h.createArgument.owner === party)
      .reduce((a, h) => a + num(h.createArgument.amount), 0);

    // Real activity, straight off the ledger: each settled payment with its real
    // creation timestamp and receipt contract id. Scoped by what this party sees.
    const activity: ActivityDto[] = receipts
      .map((r: CreatedEvent): ActivityDto => {
        const a = r.createArgument;
        const incoming = role === 'recipient';
        return {
          name: incoming ? this.cfg.org : this.nameForParty(a.recipient),
          sub: incoming ? `Payout · ${a.batchRef}` : `Contributor payout · ${a.batchRef}`,
          amount: num(a.amount),
          dir: incoming ? 'in' : 'out',
          at: r.createdAt ?? '',
          cid: r.contractId,
        };
      })
      .sort((x, y) => y.at.localeCompare(x.at));

    const visible = role !== 'recipient';
    return {
      treasury,
      org: this.cfg.org,
      recipientName: this.roster.find((m) => m.id === this.youId)?.name ?? '',
      mandate: {
        name: 'Contributor roster',
        cap: visible ? this.cfg.cap : 0,
        threshold: visible ? this.cfg.threshold : 0,
        approver: visible ? this.cfg.approver : '',
        approverRole: visible ? this.cfg.approverRole : '',
        auditor: visible ? this.cfg.auditor : '',
        auditorRole: visible ? this.cfg.auditorRole : '',
        recipients: this.roster.length,
      },
      batch: {
        id: BATCH_ID,
        label: BATCH_LABEL,
        status: this.settled ? 'settled' : 'draft',
        lines,
      },
      activity,
    };
  }

  /** A human label for a party from the active roster (else org / its hint). */
  private nameForParty(p: string): string {
    for (const r of this.roster) {
      if (this.recipientParty.get(r.id) === p) return r.name;
    }
    if (p === this.payer) return this.cfg.org;
    return p.split('::')[0];
  }

  /** The raw ledger truth for `role`: its party id, the live ledger offset, and
   * the real contracts it holds — so the numbers are provably on-chain, not made
   * up. Scoped to that party's token, so it can only ever see its own. */
  async ledgerInfo(role: Role): Promise<LedgerInfoDto> {
    const party = this.partyFor(role);
    const user = this.userFor(role);
    const [offset, all] = await Promise.all([
      this.canton.ledgerEnd(user),
      this.canton.activeContracts(party, user),
    ]);
    const contracts: ContractRefDto[] = all.map((ev) => {
      const template = ev.templateId.split(':').pop()!;
      const a = ev.createArgument;
      const amount = a.amount != null ? num(a.amount) : null;
      let label = template;
      if (template === 'Holding') {
        label = a.owner === this.payer ? 'Treasury' : `Held by ${this.nameForParty(a.owner)}`;
      } else if (template === 'PayoutMandate') {
        label = 'Spending mandate';
      } else if (template === 'DisbursementReceipt') {
        label = `Receipt · ${this.nameForParty(a.recipient)}`;
      } else if (template === 'LargePaymentProposal') {
        label = `Pending · ${this.nameForParty(a.recipient)}`;
      }
      return { template, cid: ev.contractId, amount, label };
    });
    return { party, offset, contracts };
  }
}
