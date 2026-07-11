// The sample batch behind the interactive hero — a crypto-native team (Nova DAO)
// paying its contributor roster, projected per lens. Everyone is self-custodied:
// each contributor is their own wallet, paid to a party Sotto never controls.
// This is the whole product on one screen.

export type Lens = "payer" | "recipient" | "auditor" | "approver";

export const LENSES: Lens[] = ["payer", "recipient", "auditor", "approver"];

export const LENS_LABEL: Record<Lens, string> = {
  payer: "Treasury",
  recipient: "Contributor",
  auditor: "Auditor",
  approver: "Signer",
};

// Stroke-icon name per lens (see components/icon.tsx).
export const LENS_ICON: Record<Lens, string> = {
  payer: "building",
  recipient: "arrow-down",
  auditor: "eye",
  approver: "shield",
};

export const WHO: Record<Lens, string> = {
  payer: "Nova DAO",
  recipient: "amara.eth",
  auditor: "Sable Audit",
  approver: "jules.eth",
};

export type Row = { name: string; role: string; amount: number };

export const BATCH: Row[] = [
  { name: "amara.eth", role: "Core protocol", amount: 4200 },
  { name: "tobi.eth", role: "Smart contracts", amount: 3850 },
  { name: "chen.eth", role: "Frontend", amount: 5500 },
  { name: "luca.eth", role: "DevRel", amount: 2900 },
  { name: "fatima.eth", role: "Governance", amount: 4100 },
  { name: "mert.eth", role: "Protocol V2 · milestone", amount: 32000 }, // over threshold
];

export const THRESHOLD = 25000;
export const TOTAL = 52550; // verified sum of the six amounts
export const YOU = 0; // the Contributor lens follows amara.eth (row 0)

// What each lens is allowed to reveal — the caption above the ledger.
export const REVEALS: Record<Lens, string> = {
  payer: "Reveals · wallets · roles · amounts · total",
  recipient: "Reveals · your own line only",
  auditor: "Reveals · every receipt · read-only",
  approver: "Reveals · over-threshold only",
};

// The hero lead line, written from the active party's point of view.
export const LEAD: Record<Lens, string> = {
  payer: "You're Nova DAO. You see every contributor, role and amount before it leaves the treasury.",
  recipient: "You're amara.eth. You see your own line — paid to your own wallet, and nothing else in the batch.",
  auditor: "You're Sable Audit. Every receipt, read-only. Visibility is granted, never assumed.",
  approver: "You're jules.eth, second signer. Only what crosses the threshold needs your key.",
};

// The ledger footer per lens: [label, sub-line, amount].
export const FOOTER: Record<Lens, [string, string, number]> = {
  payer: ["Batch total", "6 contributors · 1 confidential transfer", TOTAL],
  recipient: ["Your payment", "1 of 6 · the rest aren't yours to see", BATCH[YOU].amount],
  auditor: ["Auditor view", "6 of 6 receipts · read-only", TOTAL],
  approver: ["Needs your signature", "1 of 6 · over the 25,000 threshold", 32000],
};

export type RowMode = "full" | "redacted" | "dimmed" | "flagged";

/** How a given row renders under a lens. */
export function rowMode(lens: Lens, i: number, amount: number): RowMode {
  const over = amount > THRESHOLD;
  if (lens === "recipient") return i === YOU ? "full" : "redacted";
  if (lens === "approver") return over ? "flagged" : "dimmed";
  return "full"; // payer + auditor
}

export const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Handles carry a dot (amara.eth) — split on it too so avatars read "AE", not "A".
export const initials = (name: string) =>
  name
    .trim()
    .split(/[\s.]+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
