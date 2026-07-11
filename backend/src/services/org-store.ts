// Durable, multi-tenant org store. JSON-file backed so orgs survive a restart —
// a product cannot lose its customers when the process bounces. It persists each
// org's config AND its allocated party ids, so on boot we re-bind the same
// on-ledger identities rather than re-provisioning. (Swap this for Postgres/PQS
// behind the same interface when the read model grows up.)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { Org } from '../models/org.ts';

export class OrgStore {
  private readonly orgs = new Map<string, Org>();

  constructor(private readonly file: string) {
    this.load();
  }

  private load(): void {
    if (!existsSync(this.file)) return;
    try {
      const rows = JSON.parse(readFileSync(this.file, 'utf8')) as Org[];
      for (const o of rows) this.orgs.set(o.id, o);
    } catch {
      // Corrupt/empty file — start clean rather than crash the process.
    }
  }

  private persist(): void {
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify([...this.orgs.values()], null, 2));
  }

  list(): Org[] {
    return [...this.orgs.values()];
  }

  get(id: string): Org | undefined {
    return this.orgs.get(id);
  }

  has(id: string): boolean {
    return this.orgs.has(id);
  }

  save(org: Org): void {
    this.orgs.set(org.id, org);
    this.persist();
  }

  delete(id: string): void {
    if (this.orgs.delete(id)) this.persist();
  }
}
