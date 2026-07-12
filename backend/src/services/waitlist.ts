// Early-access signups. Best-effort durable: appended to a JSONL file AND logged
// (so they're recoverable from the host's logs even where the container disk is
// ephemeral). Swap the append for a real store / email webhook when volume grows.

import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

export interface Signup {
  email: string;
  org?: string;
  at: string; // ISO
}

export class Waitlist {
  constructor(private readonly file: string) {}

  record(email: string, org?: string): Signup {
    const entry: Signup = { email, org, at: new Date().toISOString() };
    try {
      mkdirSync(dirname(this.file), { recursive: true });
      appendFileSync(this.file, `${JSON.stringify(entry)}\n`);
    } catch {
      // disk unavailable/ephemeral — the log line below is the durable record
    }
    console.log(`[early-access] ${email}${org ? ` · ${org}` : ''}`);
    return entry;
  }

  /** All signups on disk (most-recent last). Empty if the file isn't there yet. */
  list(): Signup[] {
    try {
      return readFileSync(this.file, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l) as Signup);
    } catch {
      return [];
    }
  }
}
