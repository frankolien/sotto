// Thin client over Canton's JSON Ledger API v2. One instance per participant.
// Every call is made acting *as* a specific party so Canton performs the
// per-party visibility filtering — this service never decides who sees what.

import { readFile } from 'node:fs/promises';

const PKG = '#sotto'; // package-name reference; resolves to the uploaded sotto DAR

/** Fully-qualified template id for a Sotto entity (e.g. Holding). */
export const tid = (entity: string): string => `${PKG}:Sotto:${entity}`;

export interface CreatedEvent {
  contractId: string;
  templateId: string;
  createArgument: Record<string, any>;
}

export class CantonError extends Error {}

export class CantonService {
  constructor(private readonly baseUrl: string) {}

  private async http(method: string, path: string, body?: unknown, raw?: Buffer): Promise<any> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: raw
        ? { 'Content-Type': 'application/octet-stream' }
        : { 'Content-Type': 'application/json' },
      body: (raw ?? (body !== undefined ? JSON.stringify(body) : undefined)) as BodyInit | undefined,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new CantonError(`${method} ${path} → ${res.status}: ${text.slice(0, 600)}`);
    }
    return text ? JSON.parse(text) : {};
  }

  async version(): Promise<string> {
    return (await this.http('GET', '/v2/version')).version;
  }

  async uploadDar(darPath: string): Promise<void> {
    const bytes = await readFile(darPath);
    await this.http('POST', '/v2/packages', undefined, bytes);
  }

  /** All known parties as a map of hint → full party id. */
  async parties(): Promise<Map<string, string>> {
    const data = await this.http('GET', '/v2/parties');
    const map = new Map<string, string>();
    for (const d of data.partyDetails ?? []) {
      const hint = String(d.party).split('::')[0];
      if (!map.has(hint)) map.set(hint, d.party);
    }
    return map;
  }

  /** Ensure a party with the given hint exists; return its full id. */
  async ensureParty(hint: string): Promise<string> {
    const existing = await this.parties();
    if (existing.has(hint)) return existing.get(hint)!;
    const data = await this.http('POST', '/v2/parties', {
      partyIdHint: hint,
      displayName: hint,
      identityProviderId: '',
    });
    return data.partyDetails.party;
  }

  async ledgerEnd(): Promise<number> {
    const data = await this.http('GET', '/v2/state/ledger-end');
    return Number(data.offset);
  }

  /**
   * Active contracts visible to `party`, optionally narrowed to entity names.
   * Returns only contracts where `party` is a stakeholder — the privacy boundary.
   */
  async activeContracts(party: string, entities?: string[]): Promise<CreatedEvent[]> {
    const offset = await this.ledgerEnd();
    const cumulative = entities?.length
      ? entities.map((e) => ({
          identifierFilter: {
            TemplateFilter: { value: { templateId: tid(e), includeCreatedEventBlob: false } },
          },
        }))
      : [{ identifierFilter: { WildcardFilter: { value: { includeCreatedEventBlob: false } } } }];

    const res = await this.http('POST', '/v2/state/active-contracts', {
      filter: { filtersByParty: { [party]: { cumulative } } },
      verbose: true,
      activeAtOffset: offset,
    });

    const rows: any[] = Array.isArray(res) ? res : (res.contractEntries ?? []);
    const out: CreatedEvent[] = [];
    for (const row of rows) {
      const created =
        row?.contractEntry?.JsActiveContract?.createdEvent ?? row?.createdEvent;
      if (created?.contractId) {
        out.push({
          contractId: created.contractId,
          templateId: created.templateId,
          createArgument: created.createArgument ?? {},
        });
      }
    }
    return out;
  }

  /** Submit commands acting as the given parties; return the created contracts. */
  async submit(
    actAs: string[],
    commands: unknown[],
    commandId: string,
    readAs: string[] = [],
  ): Promise<CreatedEvent[]> {
    const res = await this.http('POST', '/v2/commands/submit-and-wait-for-transaction', {
      commands: {
        commands,
        commandId,
        actAs,
        readAs,
        userId: 'sotto-backend',
        deduplicationPeriod: { Empty: {} },
      },
    });
    const out: CreatedEvent[] = [];
    for (const ev of res?.transaction?.events ?? []) {
      const created = ev?.CreatedEvent;
      if (created?.contractId) {
        out.push({
          contractId: created.contractId,
          templateId: created.templateId,
          createArgument: created.createArgument ?? {},
        });
      }
    }
    return out;
  }

  create(entity: string, args: Record<string, unknown>) {
    return { CreateCommand: { templateId: tid(entity), createArguments: args } };
  }

  exercise(entity: string, contractId: string, choice: string, arg: Record<string, unknown>) {
    return { ExerciseCommand: { templateId: tid(entity), contractId, choice, choiceArgument: arg } };
  }
}
