// Thin client over the Sotto backend (REST → Canton JSON Ledger API).
// When NEXT_PUBLIC_API_URL is set and reachable, the console runs on the LIVE
// ledger; otherwise it falls back to the self-contained seeded demo (see ledger.ts).
// Login is passwordless by design (the backend issues a role-scoped session); the
// real privacy is enforced server-side by the ledger, not by which role we ask for.

import type { Lens } from "./batch";

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

/** Whether a live backend is configured at all. */
export const apiConfigured = (): boolean => BASE.length > 0;

export type ApiLine = {
  id: string;
  name: string | null;
  role: string | null;
  handle: string | null;
  amount: number | null;
  status: string; // "draft" | "settled" | "pending" | "held"
  you: boolean;
  big: boolean;
};

export type ApiState = {
  treasury: number;
  org: string;
  recipientName: string;
  mandate: {
    name: string;
    cap: number;
    threshold: number;
    approver: string;
    approverRole: string;
    auditor: string;
    auditorRole: string;
    recipients: number;
  };
  batch: { id: string; label: string; status: string; lines: ApiLine[] };
  activity: { title: string; meta: string }[];
};

// Reads use a short timeout so an unreachable backend fails fast into the seeded
// fallback. Writes (settle/approve/reject) run real Canton submits on a shared
// DevNet node — those take several seconds to tens of seconds — so they get a much
// longer budget; aborting them mid-flight is what produced the cryptic
// "signal is aborted without reason".
const READ_TIMEOUT = 6000;
const WRITE_TIMEOUT = 90000;

async function req<T>(path: string, init?: RequestInit, token?: string, timeoutMs = READ_TIMEOUT): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        // ngrok's free tier serves a browser-warning interstitial unless this
        // header is present; harmless when the backend isn't behind ngrok.
        "ngrok-skip-browser-warning": "true",
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) throw new Error(`${path} → ${res.status}`);
    return (await res.json()) as T;
  } catch (e) {
    // Turn the raw AbortError into something a person can act on.
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("The ledger is taking longer than usual — give it a moment and try again.");
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

async function login(role: Lens): Promise<string> {
  const { token } = await req<{ token: string; role: Lens }>("/api/login", {
    method: "POST",
    body: JSON.stringify({ role }),
  });
  return token;
}

/** Read the role-scoped state straight off the ledger. */
export async function fetchState(role: Lens): Promise<ApiState> {
  const token = await login(role);
  return req<ApiState>("/api/state", undefined, token);
}

/** Payer disburses the batch (atomic settle). Returns the payer's updated state. */
export async function settleApi(): Promise<ApiState> {
  const token = await login("payer");
  return req<ApiState>("/api/settle", { method: "POST" }, token, WRITE_TIMEOUT);
}

/** Approver decides the over-threshold line. */
export async function decideApi(lineId: string, action: "approve" | "reject"): Promise<ApiState> {
  const token = await login("approver");
  return req<ApiState>(`/api/${action}/${lineId}`, { method: "POST" }, token, WRITE_TIMEOUT);
}
