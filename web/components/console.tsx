"use client";

import { useEffect, useState } from "react";
import {
  fmt,
  initials,
  LENS_ICON,
  LENS_LABEL,
  LENSES,
  REVEALS,
  WHO,
  type Lens,
} from "@/lib/batch";
import { ACTIONS, INFO } from "@/lib/console";
import { useLedger, type LedgerState, type RowStatus, type Stat, type ViewRow } from "@/lib/ledger";
import { Icon, SottoMark } from "./icon";
import { ThemeToggle } from "./theme-toggle";

export function Console() {
  const [lens, setLens] = useState<Lens | null>(null);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("lens");
    if (LENSES.includes(p as Lens)) setLens(p as Lens);
  }, []);
  if (!lens) return <SignIn onPick={setLens} />;
  return <Dashboard lens={lens} onSwitch={() => setLens(null)} />;
}

/* ── Sign in ──────────────────────────────────────────────────────────────── */

function SignIn({ onPick }: { onPick: (l: Lens) => void }) {
  const others = LENSES.filter((l) => l !== "payer");
  return (
    <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-5 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(50%_60%_at_50%_-10%,var(--glow),transparent_70%)]"
      />
      <div className="flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 text-ink">
          <SottoMark size={22} />
          <span className="text-[15px] font-semibold tracking-tight">Sotto</span>
        </a>
        <ThemeToggle />
      </div>

      <div className="mt-12">
        <h1 className="text-[34px] font-semibold tracking-[-0.02em] text-ink">Sign in</h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
          One batch, four vantage points. The rail reveals to each identity only what it&rsquo;s
          entitled to see.
        </p>
      </div>

      <button onClick={() => onPick("payer")} className="mt-8 text-left">
        <IdentityCard lens="payer" featured />
      </button>

      <div className="mono-label mt-7 text-[10.5px] text-ink-3">Or view the same batch as</div>
      <div className="mt-3 space-y-2.5">
        {others.map((l) => (
          <button key={l} onClick={() => onPick(l)} className="block w-full text-left">
            <IdentityCard lens={l} />
          </button>
        ))}
      </div>

      <div className="mt-auto flex items-start gap-2 pt-10 text-ink-3">
        <Icon name="lock" size={13} className="mt-0.5 shrink-0" />
        <p className="text-[12px] leading-relaxed">
          Demo · passwordless sign-in. In production each identity authenticates with a credential —
          RS256 + JWKS — before a session is issued.
        </p>
      </div>
    </div>
  );
}

function IdentityCard({ lens, featured }: { lens: Lens; featured?: boolean }) {
  const sees: Record<Lens, string> = {
    payer: "Runs mandates and payout batches.",
    recipient: "Sees only their own payment.",
    auditor: "Sees every receipt in the batch.",
    approver: "Signs off payments over threshold.",
  };
  return (
    <div
      className={`flex items-center gap-3.5 rounded-2xl border p-3.5 transition-colors ${
        featured ? "border-transparent bg-ink text-page" : "border-line-2 bg-surface/60 hover:bg-surface"
      }`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          featured ? "bg-white/15 text-page" : "bg-surface-2 text-ink"
        }`}
      >
        <Icon name={LENS_ICON[lens]} size={20} strokeWidth={1.7} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className={`text-[15.5px] font-semibold ${featured ? "text-page" : "text-ink"}`}>
            {LENS_LABEL[lens]}
          </span>
          <span className={`truncate text-[13px] ${featured ? "text-page/65" : "text-ink-3"}`}>
            {WHO[lens]}
          </span>
        </div>
        <div className={`text-[12.5px] ${featured ? "text-page/65" : "text-ink-3"}`}>{sees[lens]}</div>
      </div>
      <Icon name="arrow-right" size={16} strokeWidth={2} className={featured ? "text-page/70" : "text-ink-3"} />
    </div>
  );
}

/* ── Dashboard ────────────────────────────────────────────────────────────── */

type View = "overview" | "batch" | "activity" | "mandate";

const NAV: { label: string; icon: string; id: View }[] = [
  { label: "Overview", icon: "layers", id: "overview" },
  { label: "Batch", icon: "git-branch", id: "batch" },
  { label: "Activity", icon: "bolt", id: "activity" },
  { label: "Mandate", icon: "shield", id: "mandate" },
];

function Dashboard({ lens, onSwitch }: { lens: Lens; onSwitch: () => void }) {
  const [view, setView] = useState<View>("overview");
  const { state, source, busy, result, setResult, run } = useLedger(lens);

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("view");
    if (v && NAV.some((n) => n.id === v)) setView(v as View);
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar lens={lens} onSwitch={onSwitch} view={view} onView={setView} />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <MobileBar lens={lens} onSwitch={onSwitch} view={view} onView={setView} />
        <DashHeader lens={lens} state={state} source={source} busy={busy} onAction={run} />
        {result && <ResultBanner msg={result} onClose={() => setResult(null)} />}

        <main className="flex-1 px-5 py-6 lg:px-8">
          {source === "loading" ? (
            <div className="flex h-64 items-center justify-center text-ink-3">
              <span className="flex items-center gap-2.5 text-[13px]">
                <Spinner /> Connecting to the ledger…
              </span>
            </div>
          ) : (
            <>
              {view === "overview" && <OverviewView lens={lens} state={state} onView={setView} />}
              {view === "batch" && <BatchView lens={lens} state={state} />}
              {view === "activity" && <ActivityView lens={lens} state={state} />}
              {view === "mandate" && <MandateView lens={lens} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Sidebar({
  lens,
  onSwitch,
  view,
  onView,
}: {
  lens: Lens;
  onSwitch: () => void;
  view: View;
  onView: (v: View) => void;
}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface/30 p-4 lg:flex">
      <a href="/" className="flex items-center gap-2 px-2 text-ink">
        <SottoMark size={20} />
        <span className="text-[15px] font-semibold tracking-tight">Sotto</span>
        <span className="mono-label ml-1 text-[9px] text-ink-3">Console</span>
      </a>

      <div className="mt-5 rounded-xl border border-line-2 bg-surface p-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2 text-ink">
            <Icon name={LENS_ICON[lens]} size={16} strokeWidth={1.7} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-ink">{WHO[lens]}</div>
            <div className="mono-label text-[9px] text-ink-3">{LENS_LABEL[lens]}</div>
          </div>
        </div>
      </div>

      <nav className="mt-5 space-y-0.5">
        {NAV.map((n) => {
          const on = view === n.id;
          return (
            <button
              key={n.label}
              onClick={() => onView(n.id)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors ${
                on ? "bg-surface-2 font-medium text-ink" : "text-ink-2 hover:bg-surface-2/60 hover:text-ink"
              }`}
            >
              <Icon name={n.icon} size={15} strokeWidth={1.7} />
              {n.label}
              {on && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-2" />}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto space-y-1">
        <button
          onClick={onSwitch}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] text-ink-2 transition-colors hover:bg-surface-2/60 hover:text-ink"
        >
          <Icon name="arrow-right" size={15} strokeWidth={1.7} />
          Switch identity
        </button>
        <div className="flex items-center justify-between px-1.5 pt-1">
          <a href="/" className="text-[12.5px] text-ink-3 transition-colors hover:text-ink">
            ← Back to site
          </a>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

function MobileBar({
  lens,
  onSwitch,
  view,
  onView,
}: {
  lens: Lens;
  onSwitch: () => void;
  view: View;
  onView: (v: View) => void;
}) {
  return (
    <div className="lg:hidden">
      <header className="flex items-center gap-3 border-b border-line px-5 py-3">
        <a href="/" className="flex items-center gap-2 text-ink">
          <SottoMark size={18} />
          <span className="text-[14px] font-semibold tracking-tight">Sotto</span>
        </a>
        <div className="ml-auto flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-line-2 px-2.5 py-1 text-[12px] text-ink">
            <Icon name={LENS_ICON[lens]} size={13} className="text-ink-2" />
            {LENS_LABEL[lens]}
          </span>
          <button onClick={onSwitch} className="text-[12.5px] text-ink-2">
            Switch
          </button>
          <ThemeToggle />
        </div>
      </header>
      <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-line px-4 py-2">
        {NAV.map((n) => (
          <button
            key={n.label}
            onClick={() => onView(n.id)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
              view === n.id ? "bg-surface-2 font-medium text-ink" : "text-ink-2"
            }`}
          >
            {n.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Spinner() {
  return <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />;
}

function SourceBadge({ source }: { source: "live" | "demo" | "loading" }) {
  if (source === "loading") return null;
  const live = source === "live";
  return (
    <span
      title={live ? "Reading the live Canton ledger" : "Self-contained demo data"}
      className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:inline-flex ${
        live ? "border-good/30 bg-good/10 text-good" : "border-line-2 bg-surface-2 text-ink-3"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-good" : "bg-ink-3"}`} />
      {live ? "Live · Canton" : "Demo data"}
    </span>
  );
}

function DashHeader({
  lens,
  state,
  source,
  busy,
  onAction,
}: {
  lens: Lens;
  state: LedgerState;
  source: "live" | "demo" | "loading";
  busy: string | null;
  onAction: (label: string) => void;
}) {
  const { label, value, sub } = state.headline;
  const done = (lens === "payer" && state.settled) || (lens === "approver" && state.decided !== null);
  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b border-line bg-page/80 px-5 py-4 backdrop-blur-xl lg:px-8">
      <div>
        <div className="mono-label text-[10px] text-ink-3">{label}</div>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="font-mono text-[26px] font-semibold leading-none tabular-nums text-ink transition-all">
            {fmt(value)}
          </span>
          <span className="text-[12px] text-ink-3">{sub}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <SourceBadge source={source} />
        {done ? (
          <span className="inline-flex items-center gap-2 rounded-xl border border-good/30 bg-good/10 px-4 py-2 text-[13.5px] font-medium text-good">
            <Icon name="check" size={15} strokeWidth={2.2} />
            {lens === "payer" ? "Batch settled" : state.decided === "approved" ? "Approved" : "Held"}
          </span>
        ) : (
          ACTIONS[lens].map((a) => (
            <button
              key={a.label}
              disabled={!!busy}
              onClick={() => onAction(a.label)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                a.primary ? "bg-ink text-page hover:opacity-90" : "border border-line-2 text-ink hover:bg-surface"
              }`}
            >
              {busy === a.label ? <Spinner /> : <Icon name={a.icon} size={15} strokeWidth={1.9} />}
              {busy === a.label ? "Working…" : a.label}
            </button>
          ))
        )}
      </div>
    </header>
  );
}

function ResultBanner({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div className="fade-key border-b border-good/20 bg-good/[0.07] px-5 py-3 lg:px-8">
      <div className="mx-auto flex items-center gap-3">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-good/20 text-good">
          <Icon name="check" size={13} strokeWidth={2.4} />
        </span>
        <p className="flex-1 text-[13px] leading-snug text-ink">{msg}</p>
        <button onClick={onClose} className="shrink-0 text-ink-3 transition-colors hover:text-ink" aria-label="Dismiss">
          <Icon name="x" size={15} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

/* ── Views ────────────────────────────────────────────────────────────────── */

function OverviewView({ lens, state, onView }: { lens: Lens; state: LedgerState; onView: (v: View) => void }) {
  return (
    <>
      <StatsRow stats={state.stats} />
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <SnapshotCard lens={lens} onView={onView} className="lg:col-span-2" />
        <InfoCard lens={lens} />
      </div>
    </>
  );
}

function BatchView({ lens, state }: { lens: Lens; state: LedgerState }) {
  return <BatchTable lens={lens} state={state} />;
}

function ActivityView({ lens, state }: { lens: Lens; state: LedgerState }) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <ActivityCard activity={state.activity} className="lg:col-span-2" />
      <InfoCard lens={lens} />
    </div>
  );
}

function MandateView({ lens }: { lens: Lens }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <InfoCard lens={lens} />
      {lens === "recipient" ? <PrivacyCard /> : <MandateCard lens={lens} />}
    </div>
  );
}

function StatsRow({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-line bg-surface/50 p-4">
          <div className="mono-label text-[10px] text-ink-3">{s.label}</div>
          <div className="mt-2 font-mono text-[22px] font-semibold tabular-nums text-ink transition-all">{s.value}</div>
          {s.sub && <div className="mt-0.5 text-[11.5px] text-ink-3">{s.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function SnapshotCard({ lens, onView, className }: { lens: Lens; onView: (v: View) => void; className?: string }) {
  const line: Record<Lens, string> = {
    payer: "Six contributors, one confidential transaction. Five settle atomically; the one over threshold holds for a signer.",
    recipient: "Your line settled on Canton. The other five payments in this batch aren’t yours to see.",
    auditor: "Every receipt in the batch is visible to you — read-only, granted on purpose by the payer.",
    approver: "One payment over the 25,000 threshold needs your signature; the rest settled without you.",
  };
  return (
    <div className={`rounded-xl border border-line bg-surface/50 p-5 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[14px] font-semibold tracking-tight text-ink">May contributor payout</h3>
        <span className="mono-label text-[10px] text-ink-3">{REVEALS[lens]}</span>
      </div>
      <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">{line[lens]}</p>
      <button
        onClick={() => onView("batch")}
        className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-line-2 px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface"
      >
        View full batch
        <Icon name="arrow-right" size={14} strokeWidth={2} />
      </button>
    </div>
  );
}

/* ── The ledger, as a table ───────────────────────────────────────────────── */

function StatusBadge({ status }: { status: RowStatus }) {
  const map: Record<RowStatus, { label: string; cls: string; icon: string }> = {
    settled: { label: "Settled", cls: "border-good/30 bg-good/10 text-good", icon: "check" },
    held: { label: "Held · approval", cls: "border-warn/30 bg-warn/10 text-warn", icon: "shield" },
    "needs-you": { label: "Needs you", cls: "border-warn/30 bg-warn/10 text-warn", icon: "shield" },
    queued: { label: "Queued", cls: "border-line bg-surface-2 text-ink-3", icon: "clock" },
    confidential: { label: "Confidential", cls: "border-line bg-surface-2 text-ink-3", icon: "lock" },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${s.cls}`}>
      <Icon name={s.icon} size={11} strokeWidth={2} />
      {s.label}
    </span>
  );
}

function BatchTable({ lens, state }: { lens: Lens; state: LedgerState }) {
  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">May contributor payout</h2>
        <span className="mono-label text-[10px] text-ink-3">{REVEALS[lens]}</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-line-2 bg-surface/50">
        <div className="grid grid-cols-[1.4fr_auto_auto] items-center gap-4 border-b border-line px-4 py-2.5 sm:grid-cols-[1.5fr_1fr_auto_auto]">
          <div className="mono-label text-[9.5px] text-ink-3">Recipient</div>
          <div className="mono-label hidden text-[9.5px] text-ink-3 sm:block">Role</div>
          <div className="mono-label text-[9.5px] text-ink-3">Status</div>
          <div className="mono-label text-right text-[9.5px] text-ink-3">Amount</div>
        </div>
        {state.rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-[13px] text-ink-3">
            Nothing has been disbursed to you in this batch — there is no line for the ledger to show you.
          </div>
        ) : (
          <div className="divide-y divide-line">
            {state.rows.map((r) => (
              <BatchRow key={r.id} row={r} highlight={lens === "recipient" && r.you} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BatchRow({ row, highlight }: { row: ViewRow; highlight: boolean }) {
  const { redacted, dimmed } = row;
  return (
    <div
      className={`grid grid-cols-[1.4fr_auto_auto] items-center gap-4 px-4 py-3 transition-colors sm:grid-cols-[1.5fr_1fr_auto_auto] ${
        dimmed ? "opacity-45" : ""
      } ${highlight ? "bg-accent/[0.07]" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[10.5px] font-medium ${
            highlight ? "border-accent/40 bg-accent/15 text-accent-2" : "border-line-2 bg-surface-2 text-ink-2"
          }`}
        >
          {redacted ? <Icon name="lock" size={12} className="text-ink-3" /> : initials(row.name)}
        </div>
        <span className={`truncate text-[13.5px] font-medium ${redacted ? "select-none text-ink-3 blur-[5px]" : "text-ink"}`}>
          {row.name}
        </span>
      </div>
      <div className={`hidden truncate text-[12.5px] sm:block ${redacted ? "text-ink-3" : "text-ink-2"}`}>
        {redacted ? "—" : row.role}
      </div>
      <div>
        <StatusBadge status={row.status} />
      </div>
      <div className="text-right">
        {redacted || row.amount === null ? (
          <span className="mono-label text-[10px] text-ink-3">•••••</span>
        ) : (
          <span className={`font-mono text-[13.5px] font-semibold tabular-nums ${dimmed ? "text-ink-3" : "text-ink"}`}>
            {fmt(row.amount)}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Side panels ──────────────────────────────────────────────────────────── */

function ActivityCard({ activity, className }: { activity: { title: string; meta: string }[]; className?: string }) {
  return (
    <div className={`rounded-xl border border-line bg-surface/50 p-5 ${className ?? ""}`}>
      <h3 className="text-[14px] font-semibold tracking-tight text-ink">Activity</h3>
      <div className="mt-4 space-y-3.5">
        {activity.map((a, i) => (
          <div key={i} className="flex gap-3">
            <div className="mt-1 flex flex-col items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-2" />
              {i < activity.length - 1 && <span className="mt-1 w-px flex-1 bg-line" />}
            </div>
            <div className="pb-1">
              <div className="text-[13px] font-medium text-ink">{a.title}</div>
              <div className="mt-0.5 font-mono text-[11px] text-ink-3">{a.meta}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoCard({ lens }: { lens: Lens }) {
  const info = INFO[lens];
  return (
    <div className="rounded-xl border border-line bg-surface/50 p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-line-2 bg-surface-2 text-accent-2">
        <Icon name={lens === "recipient" ? "lock" : LENS_ICON[lens]} size={17} strokeWidth={1.7} />
      </div>
      <h3 className="mt-4 text-[14px] font-semibold tracking-tight text-ink">{info.title}</h3>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">{info.body}</p>
    </div>
  );
}

function MandateCard({ lens }: { lens: Lens }) {
  const rows: [string, string][] =
    lens === "approver"
      ? [
          ["Approval threshold", "25,000"],
          ["You sign", "over threshold"],
          ["Approver", "jules.eth"],
          ["Auditor", "Sable Audit"],
        ]
      : [
          ["Per-cycle cap", "200,000"],
          ["Approval threshold", "25,000"],
          ["Approver", "jules.eth"],
          ["Auditor", "Sable Audit"],
        ];
  return (
    <div className="rounded-xl border border-line bg-surface/50 p-5">
      <h3 className="text-[14px] font-semibold tracking-tight text-ink">Mandate</h3>
      <div className="mt-3 divide-y divide-line">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between py-2.5">
            <span className="text-[12.5px] text-ink-2">{k}</span>
            <span className="font-mono text-[12.5px] tabular-nums text-ink">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrivacyCard() {
  return (
    <div className="rounded-xl border border-line bg-surface/50 p-5">
      <div className="mono-label text-[10px] text-ink-3">What you cannot see</div>
      <div className="mt-3 space-y-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="grid h-7 w-7 place-items-center rounded-full border border-line bg-surface-2">
              <Icon name="lock" size={12} className="text-ink-3" />
            </div>
            <div className="h-2 flex-1 rounded-full bg-surface-2" />
            <div className="h-2 w-12 rounded-full bg-surface-2" />
          </div>
        ))}
      </div>
      <p className="mt-4 text-[12px] leading-relaxed text-ink-3">
        These lines aren&rsquo;t hidden by the app — they never arrive. Even the number of other
        payees isn&rsquo;t yours to know.
      </p>
    </div>
  );
}
