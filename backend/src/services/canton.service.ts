// Thin client over Canton's JSON Ledger API v2. The node now runs with auth
// ENABLED, so every call carries a bearer token whose Canton user is scoped to
// exactly the parties it may act/read as. Each method takes the *acting user*;
// the service mints that user's token and sets the command's userId to match, so
// authorization is the ledger's decision — this service no longer holds one
// identity that can touch every party.

import { readFile } from 'node:fs/promises';

import { TokenFactory } from './auth.ts';

const PKG = '#sotto'; // package-name reference; resolves to the uploaded sotto DAR

/** Fully-qualified template id for a Sotto entity (e.g. Holding). */
export const tid = (entity: string): string => `${PKG}:Sotto:${entity}`;

export interface CreatedEvent {
  contractId: string;
  templateId: string;
  createArgument: Record<string, any>;
  createdEventBlob?: string;
  createdAt?: string; // ISO timestamp the contract was created on the ledger
}

/** A user-management right, as the JSON API expects it. */
export type UserRight =
  | { kind: { CanActAs: { value: { party: string } } } }
  | { kind: { CanReadAs: { value: { party: string } } } };

export const canActAs = (party: string): UserRight => ({ kind: { CanActAs: { value: { party } } } });
export const canReadAs = (party: string): UserRight => ({ kind: { CanReadAs: { value: { party } } } });

/** A contract disclosed to a party that isn't a stakeholder (explicit disclosure). */
export interface DisclosedContract {
  templateId: string;
  contractId: string;
  createdEventBlob: string;
}

export class CantonError extends Error {}

export class CantonService {
  constructor(
    private readonly baseUrl: string,
    private readonly tokens: TokenFactory,
  ) {}

  private async http(
    method: string,
    path: string,
    opts: { user?: string; body?: unknown; raw?: Buffer } = {},
  ): Promise<any> {
    const { user, body, raw } = opts;
    const headers: Record<string, string> = {
      'Content-Type': raw ? 'application/octet-stream' : 'application/json',
    };
    if (user) headers.Authorization = `Bearer ${this.tokens.forUser(user)}`;
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: (raw ?? (body !== undefined ? JSON.stringify(body) : undefined)) as BodyInit | undefined,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new CantonError(`${method} ${path} → ${res.status}: ${text.slice(0, 600)}`);
    }
    return text ? JSON.parse(text) : {};
  }

  async version(): Promise<string> {
    return (await this.http('GET', '/v2/version')).version; // public, no token
  }

  async uploadDar(darPath: string, user: string): Promise<void> {
    const bytes = await readFile(darPath);
    await this.http('POST', '/v2/packages', { user, raw: bytes });
  }

  /** All known parties as a map of hint → full party id. */
  async parties(user: string): Promise<Map<string, string>> {
    const data = await this.http('GET', '/v2/parties', { user });
    const map = new Map<string, string>();
    for (const d of data.partyDetails ?? []) {
      const hint = String(d.party).split('::')[0];
      if (!map.has(hint)) map.set(hint, d.party);
    }
    return map;
  }

  /** Ensure a party with the given hint exists; return its full id. */
  async ensureParty(hint: string, user: string): Promise<string> {
    const existing = await this.parties(user);
    if (existing.has(hint)) return existing.get(hint)!;
    const data = await this.http('POST', '/v2/parties', {
      user,
      body: { partyIdHint: hint, identityProviderId: '' },
    });
    return data.partyDetails.party;
  }

  /** Create a user scoped to specific parties' rights. Idempotent: a user id is
   * derived from its party, so if it already exists its rights already match. */
  async ensureUser(userId: string, rights: UserRight[], adminUser: string): Promise<void> {
    try {
      await this.http('POST', '/v2/users', {
        user: adminUser,
        body: { user: { id: userId, identityProviderId: '' }, rights },
      });
    } catch (e) {
      if (e instanceof CantonError && /exist/i.test(e.message)) return;
      throw e;
    }
  }

  async ledgerEnd(user: string): Promise<number> {
    const data = await this.http('GET', '/v2/state/ledger-end', { user });
    return Number(data.offset);
  }

  /**
   * Active contracts visible to `party`, read with `user`'s token (which must be
   * allowed to read as `party`). With `includeBlob`, each event carries the
   * createdEventBlob needed to disclose it to a non-stakeholder.
   */
  async activeContracts(
    party: string,
    user: string,
    entities?: string[],
    includeBlob = false,
  ): Promise<CreatedEvent[]> {
    const offset = await this.ledgerEnd(user);
    const cumulative = entities?.length
      ? entities.map((e) => ({
          identifierFilter: {
            TemplateFilter: { value: { templateId: tid(e), includeCreatedEventBlob: includeBlob } },
          },
        }))
      : [{ identifierFilter: { WildcardFilter: { value: { includeCreatedEventBlob: includeBlob } } } }];

    const res = await this.http('POST', '/v2/state/active-contracts', {
      user,
      body: { filter: { filtersByParty: { [party]: { cumulative } } }, verbose: true, activeAtOffset: offset },
    });

    const rows: any[] = Array.isArray(res) ? res : (res.contractEntries ?? []);
    const out: CreatedEvent[] = [];
    for (const row of rows) {
      const created = row?.contractEntry?.JsActiveContract?.createdEvent ?? row?.createdEvent;
      if (created?.contractId) {
        out.push({
          contractId: created.contractId,
          templateId: created.templateId,
          createArgument: created.createArgument ?? {},
          createdEventBlob: created.createdEventBlob,
          createdAt: created.createdAt,
        });
      }
    }
    return out;
  }

  /** Submit commands as `user` (token + command userId both that user). */
  async submit(
    actAs: string[],
    commands: unknown[],
    commandId: string,
    user: string,
    opts: { readAs?: string[]; disclosedContracts?: DisclosedContract[] } = {},
  ): Promise<CreatedEvent[]> {
    const res = await this.http('POST', '/v2/commands/submit-and-wait-for-transaction', {
      user,
      body: {
        commands: {
          commands,
          commandId,
          actAs,
          readAs: opts.readAs ?? [],
          userId: user,
          deduplicationPeriod: { Empty: {} },
          ...(opts.disclosedContracts?.length ? { disclosedContracts: opts.disclosedContracts } : {}),
        },
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
