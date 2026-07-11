// Client for the multi-tenant, self-custody workspace API (backend/org.routes).
// This is the REAL product surface: an org creates a workspace, adds contributors
// by their own wallet (self-custody), funds a treasury and runs private payouts.
// Distinct from lib/api.ts (the single-tenant demo). Needs a backend in a mode that
// can allocate parties (local sandbox / own validator) — set NEXT_PUBLIC_API_URL.

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
export const wsConfigured = (): boolean => BASE.length > 0;

const TOKEN_KEY = "sotto.ws.token"; // payer/owner session
const CTOKEN_KEY = "sotto.ws.ctoken"; // contributor magic-link session
export const getToken = (): string | null =>
  typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null): void => {
  if (typeof window === "undefined") return;
  if (t) window.localStorage.setItem(TOKEN_KEY, t);
  else window.localStorage.removeItem(TOKEN_KEY);
};
export const getCToken = (): string | null =>
  typeof window === "undefined" ? null : window.localStorage.getItem(CTOKEN_KEY);
export const setCToken = (t: string | null): void => {
  if (typeof window === "undefined") return;
  if (t) window.localStorage.setItem(CTOKEN_KEY, t);
  else window.localStorage.removeItem(CTOKEN_KEY);
};

export type LineStatus = "draft" | "settled" | "pending" | "rejected";

export type WsContributor = { party: string; name: string; role: string; amount: number };
export type WsConfig = {
  name: string;
  asset: string;
  cap: number;
  threshold: number;
  approverParty: string;
  approverLabel: string;
  auditorParty: string;
  auditorLabel: string;
};
export type WsLine = {
  id: string;
  party: string;
  name: string;
  role: string;
  amount: number;
  status: LineStatus;
  over: boolean;
};
export type WsDashboard = {
  org: string;
  asset: string;
  treasury: number;
  threshold: number;
  cap: number;
  lines: WsLine[];
};
export type WsView = {
  party: string;
  balance: number;
  contracts: { kind: string; amount: number | null; recipient?: string }[];
};
export type WsEventKind = "created" | "funded" | "roster" | "mandate" | "settled" | "approved" | "rejected" | "cycle";
export type WsEvent = { at: string; kind: WsEventKind; summary: string; amount?: number; batchRef?: string };

async function req<T>(path: string, init?: RequestInit, token = getToken()): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        "ngrok-skip-browser-warning": "true",
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      let msg = `${res.status}`;
      try {
        msg = (await res.json())?.error ?? msg;
      } catch {
        /* keep status */
      }
      throw new Error(msg);
    }
    return (res.status === 204 ? undefined : await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

/** Public: whether this backend can create workspaces (allocate parties). False on
 * shared DevNet — the web uses it to gate onboarding into a "request access" state. */
export const availability = () => req<{ available: boolean }>("/api/workspace-availability", undefined, null);

/** Create a workspace; stores + returns the session scoped to it. */
export async function createWorkspace(config: WsConfig): Promise<{ id: string }> {
  const { org, token } = await req<{ org: { id: string }; token: string }>("/api/orgs", {
    method: "POST",
    body: JSON.stringify(config),
  });
  setToken(token);
  return { id: org.id };
}

export const setContributors = (rows: WsContributor[]) =>
  req<WsDashboard>("/api/workspace/contributors", { method: "PUT", body: JSON.stringify({ contributors: rows }) });
export const fund = (amount: number) =>
  req<WsDashboard>("/api/workspace/fund", { method: "POST", body: JSON.stringify({ amount }) });
export const establishMandate = () => req<WsDashboard>("/api/workspace/mandate", { method: "POST" });
export const dashboard = () => req<WsDashboard>("/api/workspace");
export const activity = () => req<{ events: WsEvent[] }>("/api/workspace/activity");
export const settle = () => req<WsDashboard>("/api/workspace/settle", { method: "POST" });
export const approve = (lineId: string) => req<WsDashboard>(`/api/workspace/approve/${lineId}`, { method: "POST" });
export const reject = (lineId: string) => req<WsDashboard>(`/api/workspace/reject/${lineId}`, { method: "POST" });
export const resetCycle = () => req<WsDashboard>("/api/workspace/reset", { method: "POST" });
export const viewAs = (party: string) => req<WsView>(`/api/workspace/view/${encodeURIComponent(party)}`);

/** Payer mints a shareable magic link for a contributor (uses the payer session). */
export const contributorLink = (lineId: string) =>
  req<{ token: string; name: string; party: string }>(`/api/workspace/contributors/${lineId}/link`, { method: "POST" });

/* ── contributor side ─────────────────────────────────────────────────────── */

export type Received = {
  org: string;
  asset: string;
  balance: number;
  payments: { amount: number; from: string; batchRef: string; at: string }[];
};
/** The contributor's own view — uses the contributor (magic-link) session. */
export const received = () => req<Received>("/api/received", undefined, getCToken());
