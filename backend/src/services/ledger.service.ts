// Business logic: maps the roster onto Daml parties + the four templates, runs
// the payout flow on Canton, and builds each role's view from a real ACS query
// as that party. What a role sees is Canton's answer, not this service's choice.

import {
  BATCH_ID,
  BATCH_LABEL,
  DEFAULT_CONFIG,
  RecipientMeta,
  partyHint,
  rosterFor,
} from '../models/roster.ts';
import { LedgerStateDto, LineDto, LineStatus, RailConfig, Role } from '../models/types.ts';
import { CantonService, CreatedEvent } from './canton.service.ts';

const num = (s: unknown): number => Number(String(s));
const dec = (n: number): string => n.toFixed(4); // Daml Numeric as a string

export class LedgerService {
  private issuer = '';
  private payer = '';
  private auditorParty = '';
  private approverParty = '';
  private readonly recipientParty = new Map<string, string>(); // lineId → party
  private roster: RecipientMeta[] = []; // the active roster (default or configured)
  private youId = ''; // the recipient the Recipient lens represents (first payee)
  private cfg: RailConfig = DEFAULT_CONFIG;
  private mandateCid = '';
  private lineStatus = new Map<string, LineStatus>();
  private readonly proposalCid = new Map<string, string>(); // lineId → proposal cid
  private settled = false;
  private seq = 0;

  constructor(private readonly canton: CantonService) {}

  private nextCommandId(): string {
    return `sotto-${Date.now()}-${this.seq++}`;
  }

  /** One-time bootstrap: upload the DAR, allocate the fixed parties (issuer +
   * payer), then apply the default config — which allocates the approver,
   * auditor and recipient parties and seeds the batch. */
  async init(darPath: string): Promise<void> {
    await this.canton.uploadDar(darPath);
    this.issuer = await this.canton.ensureParty('Issuer');
    this.payer = await this.canton.ensureParty('LumenStudio');
    await this.applyConfig(DEFAULT_CONFIG);
  }

  configure(cfg: RailConfig): Promise<void> {
    return this.applyConfig(cfg);
  }

  reset(): Promise<void> {
    return this.applyConfig(DEFAULT_CONFIG);
  }

  private partyFor(role: Role): string {
    switch (role) {
      case 'payer': return this.payer;
      case 'auditor': return this.auditorParty;
      case 'approver': return this.approverParty;
      case 'recipient': return this.recipientParty.get(this.youId)!;
    }
  }

  /** Archive every active Sotto contract so a reset/reconfigure starts clean.
   * The issuer is a stakeholder of all four templates, so one query finds them. */
  private async archiveAll(): Promise<void> {
    const all = await this.canton.activeContracts(this.issuer);
    for (const ev of all) {
      const entity = ev.templateId.split(':').pop()!;
      const actAs = entity === 'Holding' ? [this.issuer] : [this.payer, this.issuer];
      try {
        await this.canton.submit(
          actAs,
          [this.canton.exercise(entity, ev.contractId, 'Archive', {})],
          this.nextCommandId(),
        );
      } catch {
        // already archived or not ours to archive — skip
      }
    }
  }

  /** Allocate the parties a config names, fund a fresh treasury, and (re)establish
   * the mandate. The roster, approver and auditor are all driven by the config —
   * picking a different approver allocates and signs with a different real party. */
  private async applyConfig(cfg: RailConfig): Promise<void> {
    await this.archiveAll();
    this.cfg = cfg;
    this.settled = false;
    this.proposalCid.clear();

    // The chosen approver / auditor become their own Canton parties — the name
    // on the contract is the identity that was picked, not a fixed relabel.
    this.approverParty = await this.canton.ensureParty(partyHint(cfg.approver, 'Approver'));
    this.auditorParty = await this.canton.ensureParty(partyHint(cfg.auditor, 'Auditor'));

    // The editable roster: one Canton party per payee.
    this.roster = rosterFor(cfg);
    this.youId = this.roster[0]?.id ?? '';
    this.recipientParty.clear();
    for (const r of this.roster) {
      this.recipientParty.set(r.id, await this.canton.ensureParty(r.hint));
    }
    this.lineStatus = new Map(this.roster.map((r) => [r.id, 'draft' as LineStatus]));

    // Issuer mints settlement tokens into the payer's treasury.
    await this.canton.submit(
      [this.issuer],
      [this.canton.create('Holding', { issuer: this.issuer, owner: this.payer, amount: dec(cfg.treasury) })],
      this.nextCommandId(),
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
    );
    this.mandateCid =
      created.find((e) => e.templateId.endsWith(':PayoutMandate'))?.contractId ?? this.mandateCid;
  }

  /** The payer's current treasury Holding (their largest holding). */
  private async currentTreasury(): Promise<{ cid: string; amount: number }> {
    const holdings = await this.canton.activeContracts(this.payer, ['Holding']);
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
      );
      const cid = created.find((e) => e.templateId.endsWith(':LargePaymentProposal'))?.contractId;
      if (cid) this.proposalCid.set(r.id, cid);
      this.lineStatus.set(r.id, 'pending');
    }
    this.settled = true;
  }

  async approve(lineId: string): Promise<void> {
    const cid = this.proposalCid.get(lineId);
    if (!cid) return;
    // Approver acts; payer grants read of the treasury for this one approval.
    await this.canton.submit(
      [this.approverParty],
      [this.canton.exercise('LargePaymentProposal', cid, 'Approve', {})],
      this.nextCommandId(),
      [this.payer],
    );
    this.lineStatus.set(lineId, 'settled');
    this.proposalCid.delete(lineId);
  }

  async reject(lineId: string): Promise<void> {
    const cid = this.proposalCid.get(lineId);
    if (!cid) return;
    await this.canton.submit(
      [this.approverParty],
      [this.canton.exercise('LargePaymentProposal', cid, 'Reject', {})],
      this.nextCommandId(),
    );
    this.lineStatus.set(lineId, 'rejected');
    this.proposalCid.delete(lineId);
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

  /** The state as Canton reveals it to `role`. */
  async stateFor(role: Role): Promise<LedgerStateDto> {
    const party = this.partyFor(role);
    const [receipts, proposals, holdings] = await Promise.all([
      this.canton.activeContracts(party, ['DisbursementReceipt']),
      this.canton.activeContracts(party, ['LargePaymentProposal']),
      this.canton.activeContracts(party, ['Holding']),
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
    };
  }
}
