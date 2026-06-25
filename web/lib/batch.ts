// The sample batch behind the interactive hero — the real Lumen Studio roster
// from the demo, projected per lens. This is the whole product on one screen.

export type Lens = "payer" | "recipient" | "auditor" | "approver";

export const LENSES: Lens[] = ["payer", "recipient", "auditor", "approver"];

export const LENS_LABEL: Record<Lens, string> = {
  payer: "Payer",
  recipient: "Recipient",
  auditor: "Auditor",
  approver: "Approver",
};

// Stroke-icon name per lens (see components/icon.tsx).
export const LENS_ICON: Record<Lens, string> = {
  payer: "building",
  recipient: "arrow-down",
  auditor: "eye",
  approver: "shield",
};

export const WHO: Record<Lens, string> = {
  payer: "Lumen Studio",
  recipient: "Amara Okafor",
  auditor: "Hale & Co.",
  approver: "Priya Raman",
};

export type Row = { name: string; role: string; amount: number };

export const BATCH: Row[] = [
  { name: "Amara Okafor", role: "Sound design", amount: 4200 },
  { name: "Tobi Adeyemi", role: "Motion", amount: 3850 },
  { name: "Chen Wei", role: "Edit", amount: 5500 },
  { name: "Diego Marquez", role: "Color", amount: 2900 },
  { name: "Fatima Bello", role: "Production", amount: 4100 },
  { name: "Kwame Nyong", role: "Score · milestone", amount: 32000 }, // over threshold
];

export const THRESHOLD = 25000;
export const TOTAL = 52550; // verified sum of the six amounts
export const YOU = 0; // the Recipient lens follows Amara (row 0)

// What each lens is allowed to reveal — the caption above the ledger.
export const REVEALS: Record<Lens, string> = {
  payer: "Reveals · names · roles · amounts · total",
  recipient: "Reveals · your own line only",
  auditor: "Reveals · every receipt · read-only",
  approver: "Reveals · over-threshold only",
};

// The hero lead line, written from the active party's point of view.
export const LEAD: Record<Lens, string> = {
  payer: "You're Lumen Studio. You see every name, role and amount before it leaves.",
  recipient: "You're Amara Okafor. You see your own line — and nothing else in the batch.",
  auditor: "You're Hale & Co. Every receipt, read-only. Visibility is granted, never assumed.",
  approver: "You're Priya Raman. Only what crosses the threshold needs a second signer.",
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

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
