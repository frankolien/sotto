// One view-model, two sources. The console renders `LedgerState`; this module
// builds it either from the LIVE Canton-backed API (api.ts) or from the seeded
// demo constants — identical shape, so the UI never knows which it's showing.
// `useLedger` tries live first and silently falls back to seeded, so the deployed
// site is reliable even if the ledger is down.

"use client";

import { useCallback, useEffect, useState } from "react";
import { apiConfigured, decideApi, fetchState, settleApi, type ApiLine, type ApiState } from "./api";
import { BATCH, rowMode, THRESHOLD, YOU, type Lens } from "./batch";
import { ACTIVITY, STATS } from "./console";

export type Decided = null | "approved" | "held";
export type RowStatus = "settled" | "held" | "needs-you" | "queued" | "confidential";
export type Stat = { label: string; value: string; sub?: string };
export type ViewRow = {
  id: string;
  name: string;
  role: string;
  amount: number | null;
  status: RowStatus;
  you: boolean;
  redacted: boolean;
  dimmed: boolean;
};
export type LedgerState = {
  source: "live" | "demo";
  settled: boolean;
  decided: Decided;
  headline: { label: string; value: number; sub: string };
  stats: Stat[];
  rows: ViewRow[];
  activity: { title: string; meta: string }[];
};

const fmt0 = (n: number) => n.toLocaleString("en-US");

/* ── Seeded (demo) ─────────────────────────────────────────────────────────── */

function headlineSeeded(lens: Lens, treasury: number, decided: Decided): LedgerState["headline"] {
  switch (lens) {
    case "payer":
      return { label: "Treasury", value: treasury, sub: "USDCx · Lumen Studio" };
    case "recipient":
      return { label: "Your balance", value: 4200, sub: "USDCx · settled" };
    case "auditor":
      return { label: "Batch under audit", value: 52550, sub: "USDCx · 6 receipts" };
    case "approver":
      return {
        label: decided ? "Signed off" : "Awaiting your signature",
        value: decided ? 0 : 32000,
        sub: "USDCx · 1 payment",
      };
  }
}

function statsSeeded(lens: Lens, settled: boolean, decided: Decided): Stat[] {
  if (lens === "payer") {
    const treasury = 312480 - (settled ? 20550 : 0) - (decided === "approved" ? 32000 : 0);
    const moved = (settled ? 20550 : 0) + (decided === "approved" ? 32000 : 0);
    const pending = settled && decided === null ? 1 : 0;
    return [
      { label: "Treasury", value: fmt0(treasury), sub: "USDCx available" },
      { label: "This cycle", value: fmt0(moved), sub: "of 200,000 cap" },
      { label: "Recipients", value: "6", sub: "in this batch" },
      { label: "Pending approval", value: String(pending), sub: pending ? "over threshold" : "all cleared" },
    ];
  }
  if (lens === "approver") {
    return [
      { label: "Awaiting signature", value: decided ? "0" : "32,000", sub: "USDCx" },
      { label: "Over threshold", value: "1 / 6", sub: "needs you" },
      { label: "Settled without you", value: "5", sub: "under 25,000" },
      { label: "Threshold", value: "25,000", sub: "per payment" },
    ];
  }
  return STATS[lens];
}

function statusSeeded(lens: Lens, redacted: boolean, dimmed: boolean, amount: number, settled: boolean, decided: Decided): RowStatus {
  if (redacted) return "confidential";
  const over = amount > THRESHOLD;
  if (over) {
    if (decided === "approved") return "settled";
    if (decided === "held") return "held";
    return lens === "approver" ? "needs-you" : "held";
  }
  void dimmed;
  return settled ? "settled" : "queued";
}

function buildSeeded(lens: Lens, settled: boolean, decided: Decided): LedgerState {
  const treasury = 312480 - (settled ? 20550 : 0) - (decided === "approved" ? 32000 : 0);
  return {
    source: "demo",
    settled,
    decided,
    headline: headlineSeeded(lens, treasury, decided),
    stats: statsSeeded(lens, settled, decided),
    rows: BATCH.map((r, i) => {
      const mode = rowMode(lens, i, r.amount);
      const redacted = mode === "redacted";
      const dimmed = mode === "dimmed";
      return {
        id: `r${i + 1}`,
        name: r.name,
        role: r.role,
        amount: r.amount,
        status: statusSeeded(lens, redacted, dimmed, r.amount, settled, decided),
        you: lens === "recipient" && i === YOU,
        redacted,
        dimmed,
      };
    }),
    activity: ACTIVITY[lens],
  };
}

/* ── Live (Canton) ─────────────────────────────────────────────────────────── */

function liveStatus(lens: Lens, l: ApiLine): RowStatus {
  if (l.status === "settled") return "settled";
  if (l.status === "pending") return lens === "approver" ? "needs-you" : "held";
  if (l.status === "held" || l.status === "rejected") return "held";
  return "queued"; // draft / not yet disbursed
}

function headlineLive(lens: Lens, s: ApiState, big?: ApiLine): LedgerState["headline"] {
  const lines = s.batch.lines;
  const settled = s.batch.status === "settled";
  switch (lens) {
    case "payer":
      return { label: "Treasury", value: s.treasury, sub: `USDCx · ${s.org}` };
    case "recipient":
      return { label: "Your balance", value: s.treasury, sub: `USDCx · ${settled ? "settled" : "pending"}` };
    case "auditor": {
      const total = lines.reduce((a, l) => a + (l.amount ?? 0), 0);
      return { label: "Batch under audit", value: total, sub: `USDCx · ${lines.length} receipts` };
    }
    case "approver": {
      const signed = big?.status === "settled";
      return {
        label: signed ? "Signed off" : "Awaiting your signature",
        value: signed ? 0 : big?.amount ?? 0,
        sub: "USDCx · 1 payment",
      };
    }
  }
}

function statsLive(lens: Lens, s: ApiState, big?: ApiLine): Stat[] {
  const lines = s.batch.lines;
  const settledCount = lines.filter((l) => l.status === "settled").length;
  const total = lines.reduce((a, l) => a + (l.amount ?? 0), 0);
  const moved = lines.filter((l) => l.status === "settled").reduce((a, l) => a + (l.amount ?? 0), 0);
  if (lens === "payer") {
    const pending = lines.filter((l) => l.status === "pending" || l.status === "held").length;
    return [
      { label: "Treasury", value: fmt0(s.treasury), sub: "USDCx available" },
      { label: "This cycle", value: fmt0(moved), sub: `of ${fmt0(s.mandate.cap)} cap` },
      { label: "Recipients", value: String(s.mandate.recipients), sub: "in this batch" },
      { label: "Pending approval", value: String(pending), sub: pending ? "over threshold" : "all cleared" },
    ];
  }
  if (lens === "recipient") {
    const settled = s.batch.status === "settled";
    return [
      { label: "Your balance", value: fmt0(s.treasury), sub: settled ? "USDCx settled" : "USDCx pending" },
      { label: "This batch", value: String(lines.length), sub: "payment to you" },
      { label: "Status", value: settled ? "Settled" : "Pending", sub: "on Canton" },
      { label: "Hidden from you", value: "•••", sub: "not disclosed" },
    ];
  }
  if (lens === "auditor") {
    return [
      { label: "Batch total", value: fmt0(total), sub: "USDCx" },
      { label: "Receipts", value: `${lines.length} / ${lines.length}`, sub: "visible" },
      { label: "Settled", value: String(settledCount), sub: "cleared" },
      { label: "Held", value: String(lines.length - settledCount), sub: "awaiting signer" },
    ];
  }
  // approver — sees only the over-threshold line; can't see what it can't see
  return [
    { label: "Awaiting signature", value: big?.status === "settled" ? "0" : fmt0(big?.amount ?? 0), sub: "USDCx" },
    { label: "Over threshold", value: "1", sub: "needs you" },
    { label: "Threshold", value: fmt0(s.mandate.threshold), sub: "per payment" },
    { label: "Approver", value: s.mandate.approver.split(" ")[0], sub: s.mandate.approverRole },
  ];
}

function mapLive(lens: Lens, s: ApiState): LedgerState {
  const lines = s.batch.lines;
  const settled = s.batch.status === "settled";
  const big = lines.find((l) => l.big);
  const decided: Decided = big
    ? big.status === "settled"
      ? "approved"
      : big.status === "held" || big.status === "rejected"
        ? "held"
        : null
    : null;
  return {
    source: "live",
    settled,
    decided,
    headline: headlineLive(lens, s, big),
    stats: statsLive(lens, s, big),
    rows: lines.map((l) => ({
      id: l.id,
      name: l.name ?? "—",
      role: l.role ?? "—",
      amount: l.amount,
      status: liveStatus(lens, l),
      you: l.you,
      redacted: false, // live: the ledger omits others entirely — no placeholders
      dimmed: false,
    })),
    activity: s.activity,
  };
}

/* ── The hook ──────────────────────────────────────────────────────────────── */

export type Ledger = {
  state: LedgerState;
  source: "live" | "demo" | "loading";
  busy: string | null;
  result: string | null;
  setResult: (s: string | null) => void;
  run: (label: string) => void;
};

export function useLedger(lens: Lens): Ledger {
  const [src, setSrc] = useState<"live" | "demo" | "loading">("loading");
  const [api, setApi] = useState<ApiState | null>(null);
  // demo-only mutable state (live state comes from the ledger itself)
  const [settled, setSettled] = useState(lens !== "payer");
  const [decided, setDecided] = useState<Decided>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const loadLive = useCallback(async () => {
    const s = await fetchState(lens);
    setApi(s);
    setSrc("live");
    return s;
  }, [lens]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (apiConfigured()) {
        try {
          const s = await fetchState(lens);
          if (!cancelled) {
            setApi(s);
            setSrc("live");
          }
          return;
        } catch {
          /* backend unreachable — fall back to the reliable seeded demo */
        }
      }
      if (!cancelled) setSrc("demo");
    })();
    return () => {
      cancelled = true;
    };
  }, [lens]);

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => setResult(null), 7000);
    return () => clearTimeout(t);
  }, [result]);

  const state = src === "live" && api ? mapLive(lens, api) : buildSeeded(lens, settled, decided);

  const run = (label: string) => {
    if (busy) return;
    setBusy(label);
    (async () => {
      try {
        if (src === "live") {
          if (label === "Pay out batch") {
            await settleApi();
            await loadLive();
            setResult("Batch settled on Canton — the under-threshold lines cleared in one atomic transaction. The over-threshold payment is held for the approver’s signature.");
          } else if (label === "Approve") {
            const big = api?.batch.lines.find((l) => l.big);
            if (big) {
              await decideApi(big.id, "approve");
              await loadLive();
              setResult("Approved — the over-threshold payment settled on Canton. Maker–checker complete.");
            }
          } else if (label === "Hold") {
            const big = api?.batch.lines.find((l) => l.big);
            if (big) {
              await decideApi(big.id, "reject");
              await loadLive();
              setResult("Held — it will not settle without a second signer.");
            }
          } else {
            setResult(`${label} · off-ramp coming soon.`);
          }
        } else {
          // seeded: simulate the round-trip
          await new Promise((r) => setTimeout(r, 900));
          switch (label) {
            case "Pay out batch":
              setSettled(true);
              setResult("Batch settled on Canton — 5 lines cleared in one atomic transaction. Kwame Nyong · 32,000 is held for Priya Raman’s signature.");
              break;
            case "Approve":
              setDecided("approved");
              setResult("Approved — Kwame Nyong’s 32,000 settled. Maker–checker complete.");
              break;
            case "Hold":
              setDecided("held");
              setResult("Held — the 32,000 will not settle without a second signer.");
              break;
            case "Cash out":
              setResult("4,200.00 USDCx routed to your linked account · demo off-ramp.");
              break;
            default:
              setResult(`${label} · demo.`);
          }
        }
      } catch (e) {
        setResult(`Action failed — ${e instanceof Error ? e.message : String(e)}.`);
      } finally {
        setBusy(null);
      }
    })();
  };

  return { state, source: src, busy, result, setResult, run };
}
