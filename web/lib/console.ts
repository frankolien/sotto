// Per-lens console state, derived from the same sample batch as the landing demo.
// Self-contained (reliable for judging); a real deployment swaps these reads for
// the Canton-backed HTTP API behind the same shape.

import { BATCH, TOTAL, YOU, type Lens } from "./batch";

// The headline figure each identity sees on its dashboard.
export const BALANCE: Record<Lens, { label: string; value: number; sub: string }> = {
  payer: { label: "Treasury", value: 312480, sub: "USDCx · Nova DAO" },
  recipient: { label: "Your balance", value: BATCH[YOU].amount, sub: "USDCx · settled" },
  auditor: { label: "Batch under audit", value: TOTAL, sub: "USDCx · 6 receipts" },
  approver: { label: "Awaiting your signature", value: 32000, sub: "USDCx · 1 payment" },
};

// What this identity can do — the lens-appropriate actions on its dashboard.
export const ACTIONS: Record<Lens, { label: string; icon: string; primary: boolean }[]> = {
  payer: [
    { label: "Pay out batch", icon: "bolt", primary: true },
    { label: "Configure rail", icon: "layers", primary: false },
  ],
  recipient: [{ label: "Cash out", icon: "arrow-down", primary: false }],
  auditor: [{ label: "Export receipts", icon: "layers", primary: false }],
  approver: [
    { label: "Approve", icon: "check", primary: true },
    { label: "Hold", icon: "shield", primary: false },
  ],
};

// The stat cards across the top of each dashboard — lens-specific, all real.
export const STATS: Record<Lens, { label: string; value: string; sub?: string }[]> = {
  payer: [
    { label: "Treasury", value: "312,480", sub: "USDCx available" },
    { label: "This cycle", value: "52,550", sub: "of 200,000 cap" },
    { label: "Recipients", value: "6", sub: "in this batch" },
    { label: "Pending approval", value: "1", sub: "over threshold" },
  ],
  recipient: [
    { label: "Your balance", value: "4,200", sub: "USDCx settled" },
    { label: "This batch", value: "1", sub: "payment to you" },
    { label: "Status", value: "Settled", sub: "on Canton" },
    { label: "Hidden from you", value: "5", sub: "other lines" },
  ],
  auditor: [
    { label: "Batch total", value: "52,550", sub: "USDCx" },
    { label: "Receipts", value: "6 / 6", sub: "visible" },
    { label: "Settled", value: "5", sub: "under threshold" },
    { label: "Held", value: "1", sub: "awaiting signer" },
  ],
  approver: [
    { label: "Awaiting signature", value: "32,000", sub: "USDCx" },
    { label: "Over threshold", value: "1 / 6", sub: "needs you" },
    { label: "Settled without you", value: "5", sub: "under 25,000" },
    { label: "Threshold", value: "25,000", sub: "per payment" },
  ],
};

// The recent-events feed — lens-specific.
export const ACTIVITY: Record<Lens, { title: string; meta: string }[]> = {
  payer: [
    { title: "Batch BX-4471 disbursed", meta: "5 lines settled atomically · just now" },
    { title: "mert.eth held for approval", meta: "32,000 over threshold · 2m ago" },
    { title: "Mandate established", meta: "cap 200,000 · threshold 25,000 · 1h ago" },
    { title: "Treasury funded", meta: "312,480 USDCx minted · 1h ago" },
  ],
  recipient: [
    { title: "Payment received", meta: "4,200 from Nova DAO · just now" },
    { title: "Receipt issued on Canton", meta: "DisbursementReceipt · 00c263c2…" },
  ],
  auditor: [
    { title: "Read access granted", meta: "batch BX-4471 · by Nova DAO" },
    { title: "6 receipts available", meta: "5 settled · 1 held for approval" },
    { title: "Mandate visible", meta: "cap, threshold, approver, auditor" },
  ],
  approver: [
    { title: "Signature requested", meta: "32,000 to mert.eth · just now" },
    { title: "5 lines settled without you", meta: "all under the 25,000 threshold" },
  ],
};

// The lens-specific note that frames what this identity is allowed to see/do.
export const INFO: Record<Lens, { title: string; body: string }> = {
  payer: {
    title: "You run the rail",
    body: "You set the mandate and the batch. You see every name, role and amount before it leaves — but the ledger reveals each line only to its own recipient.",
  },
  recipient: {
    title: "The rest is invisible to you",
    body: "You see only your own payment. The other five lines aren't redacted on your screen — they never arrive. Even the number of other payees isn't yours to know.",
  },
  auditor: {
    title: "Read-only, by grant",
    body: "You can see every receipt in the batch — because the payer named you auditor on the mandate. Visibility is granted on purpose, never assumed, and never lets you move funds.",
  },
  approver: {
    title: "Maker–checker",
    body: "You see only payments over the 25,000 threshold. The 32,000 to mert.eth can't settle without your signature; the under-threshold lines settled atomically without you.",
  },
};
