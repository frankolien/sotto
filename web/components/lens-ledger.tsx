"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  BATCH,
  FOOTER,
  fmt,
  initials,
  LEAD,
  LENS_ICON,
  LENS_LABEL,
  LENSES,
  REVEALS,
  rowMode,
  WHO,
  YOU,
  type Lens,
  type Row,
  type RowMode,
} from "@/lib/batch";
import { Icon } from "./icon";

/** The whole product on one card: tap a lens and the SAME ledger re-renders to
 *  show exactly what that party is allowed to see. Auto-tours the four lenses;
 *  pauses on hover; clickable. */
export function LensLedger() {
  const [lens, setLens] = useState<Lens>("payer");
  const paused = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      if (paused.current) return;
      setLens((cur) => LENSES[(LENSES.indexOf(cur) + 1) % LENSES.length]);
    }, 2600);
    return () => clearInterval(id);
  }, []);

  const pick = (l: Lens) => {
    paused.current = true;
    setLens(l);
  };

  const [label, sub, total] = FOOTER[lens];

  return (
    <div
      className="relative w-full max-w-[460px]"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      {/* accent glow behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-16 -top-16 bottom-0 -z-10 bg-[radial-gradient(55%_45%_at_50%_0%,var(--glow-strong),transparent_72%)]"
      />

      {/* lens-aware lead line */}
      <div className="mb-4 h-10">
        <p key={lens} className="fade-key text-[13.5px] leading-snug text-ink-2">
          <span className="font-medium text-ink">{WHO[lens]}.</span>{" "}
          {LEAD[lens].split(". ").slice(1).join(". ")}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line-2 bg-surface/85 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        {/* lens tabs with a sliding active pill */}
        <div className="flex gap-1 border-b border-line p-1.5">
          {LENSES.map((l) => {
            const on = l === lens;
            return (
              <button
                key={l}
                onClick={() => pick(l)}
                className="relative flex-1 rounded-lg px-2 py-2.5 outline-none transition-colors"
              >
                {on && (
                  <motion.span
                    layoutId="lens-pill"
                    className="absolute inset-0 rounded-lg bg-ink"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                <span
                  className={`relative z-10 flex items-center justify-center gap-1.5 text-[12.5px] font-medium ${
                    on ? "text-page" : "text-ink-2"
                  }`}
                >
                  <Icon name={LENS_ICON[l]} size={14} strokeWidth={1.8} />
                  {LENS_LABEL[l]}
                </span>
              </button>
            );
          })}
        </div>

        {/* reveals caption */}
        <div className="px-4 pb-1 pt-3.5">
          <p key={lens} className="fade-key mono-label text-[10.5px] text-ink-3">
            {REVEALS[lens]}
          </p>
        </div>

        {/* rows */}
        <div className="px-2 pb-2">
          {BATCH.map((r, i) => (
            <LedgerRow
              key={r.name}
              row={r}
              mode={rowMode(lens, i, r.amount)}
              highlight={lens === "recipient" && i === YOU}
            />
          ))}
        </div>

        {/* footer total */}
        <div className="flex items-end justify-between gap-3 border-t border-line px-4 py-3.5">
          <div key={label} className="fade-key min-w-0">
            <div className="mono-label text-[10.5px] text-ink-3">{label}</div>
            <div className="mt-1 truncate text-[12.5px] text-ink-2">{sub}</div>
          </div>
          <div className="shrink-0 font-mono text-[19px] font-semibold tabular-nums text-ink">
            {fmt(total)} <span className="text-[11px] font-medium text-ink-3">USDCx</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LedgerRow({ row, mode, highlight }: { row: Row; mode: RowMode; highlight: boolean }) {
  const redacted = mode === "redacted";
  const dimmed = mode === "dimmed";
  const flagged = mode === "flagged";
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-all duration-300 ${
        dimmed ? "opacity-40" : "opacity-100"
      } ${highlight ? "bg-accent/10 ring-1 ring-inset ring-accent/30" : ""}`}
    >
      {/* avatar */}
      <div
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-[11px] font-medium ${
          highlight ? "border-accent/40 bg-accent/15 text-accent-2" : "border-line-2 bg-surface-2 text-ink-2"
        }`}
      >
        {redacted ? <Icon name="lock" size={13} className="text-ink-3" /> : initials(row.name)}
      </div>

      {/* name + role */}
      <div className="min-w-0 flex-1">
        <div
          className={`truncate text-[14px] font-medium transition-all duration-300 ${
            redacted ? "select-none text-ink-3 blur-[5px]" : "text-ink"
          }`}
        >
          {row.name}
        </div>
        <div
          className={`truncate text-[12px] ${
            flagged ? "flex items-center gap-1.5 text-warn" : "text-ink-3"
          }`}
        >
          {flagged ? (
            <>
              <Icon name="shield" size={12} strokeWidth={1.8} />
              Over threshold — second signer required
            </>
          ) : redacted ? (
            "Confidential"
          ) : (
            row.role
          )}
        </div>
      </div>

      {/* amount */}
      <div className="shrink-0">
        {redacted ? (
          <div className="flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-ink-3">
            <Icon name="lock" size={10} />
            <span className="mono-label text-[9.5px]">confidential</span>
          </div>
        ) : (
          <span
            className={`font-mono text-[14px] font-semibold tabular-nums ${dimmed ? "text-ink-3" : "text-ink"}`}
          >
            {fmt(row.amount)} <span className="text-[10px] font-medium text-ink-3">USDCx</span>
          </span>
        )}
      </div>
    </div>
  );
}
