"use client";

// The real product surface (distinct from the demo Console): an org creates a
// payout rail, adds contributors by their OWN Canton wallet (self-custody), funds a
// treasury and runs private batches — each contributor sees only their own line.
// Talks to the multi-tenant workspace API in lib/workspace.ts.

import { useEffect, useMemo, useState } from "react";
import * as ws from "@/lib/workspace";
import { SottoMark } from "./icon";
import { ThemeToggle } from "./theme-toggle";

const fmt = (n: number) => n.toLocaleString("en-US");
const shortParty = (p: string) => {
  const [hint, ns] = p.split("::");
  return ns ? `${hint}::${ns.slice(0, 6)}…` : hint;
};

/* ── primitives ─────────────────────────────────────────────────────────────── */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mono-label text-[11px] text-ink-3">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-ink-3">{hint}</span> : null}
    </label>
  );
}

const inputCls =
  "mt-1.5 w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-ink outline-none transition focus:border-accent/70 placeholder:text-ink-3";

function Btn({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-accent text-white hover:brightness-110"
      : variant === "danger"
        ? "border border-line text-warn hover:border-line-2"
        : "border border-line text-ink-2 hover:text-ink hover:border-line-2";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}

function Pill({ status }: { status: ws.LineStatus }) {
  const map: Record<ws.LineStatus, [string, string]> = {
    settled: ["Settled", "text-good border-good/30 bg-good/10"],
    pending: ["Awaiting signer", "text-warn border-warn/30 bg-warn/10"],
    draft: ["Queued", "text-ink-3 border-line"],
    rejected: ["Held", "text-warn border-warn/30 bg-warn/10"],
  };
  const [label, cls] = map[status];
  return <span className={`rounded-full border px-2 py-0.5 text-[11px] ${cls}`}>{label}</span>;
}

/* ── shell ──────────────────────────────────────────────────────────────────── */

function Shell({ children, onExit }: { children: React.ReactNode; onExit?: () => void }) {
  return (
    <div className="min-h-screen bg-page text-ink">
      <header className="sticky top-0 z-10 border-b border-line bg-page/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <SottoMark className="h-5 w-5 text-accent" />
            <span className="text-[15px] font-semibold tracking-tight">Sotto</span>
            <span className="mono-label ml-1 rounded border border-line px-1.5 py-0.5 text-[10px] text-ink-3">
              Workspace
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onExit ? (
              <button onClick={onExit} className="text-xs text-ink-3 hover:text-ink-2">
                Sign out
              </button>
            ) : null}
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </div>
  );
}

function Splash() {
  return (
    <Shell>
      <div className="flex items-center gap-2 py-24 text-ink-3">
        <span className="h-3 w-3 animate-spin rounded-full border border-ink-3 border-t-transparent" />
        Connecting to your rail…
      </div>
    </Shell>
  );
}

/* ── onboarding wizard ──────────────────────────────────────────────────────── */

type Row = { name: string; party: string; role: string; amount: string };
const emptyRow = (): Row => ({ name: "", party: "", role: "", amount: "" });

const STEPS = ["Organisation", "Rules", "Contributors", "Fund & run"];

function Onboard({ onDone }: { onDone: (b: ws.WsDashboard) => void }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [asset, setAsset] = useState("USDC");
  const [cap, setCap] = useState("300000");
  const [threshold, setThreshold] = useState("20000");
  const [approverParty, setApproverParty] = useState("");
  const [approverLabel, setApproverLabel] = useState("Core Multisig");
  const [auditorParty, setAuditorParty] = useState("");
  const [auditorLabel, setAuditorLabel] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [treasury, setTreasury] = useState("");

  const th = Number(threshold) || 0;
  const validRows = rows.filter((r) => r.name.trim() && /::/.test(r.party) && Number(r.amount) > 0);
  const total = validRows.reduce((a, r) => a + Number(r.amount), 0);

  const canNext =
    step === 0
      ? name.trim().length > 0
      : step === 1
        ? /::/.test(approverParty) && /::/.test(auditorParty)
        : step === 2
          ? validRows.length > 0
          : Number(treasury) >= total && total > 0;

  async function launch() {
    setErr(null);
    setBusy("Creating your rail on Canton…");
    try {
      await ws.createWorkspace({
        name: name.trim(),
        asset: asset.trim() || "USDC",
        cap: Number(cap) || 0,
        threshold: th,
        approverParty: approverParty.trim(),
        approverLabel: approverLabel.trim() || "Approver",
        auditorParty: auditorParty.trim(),
        auditorLabel: auditorLabel.trim() || "Auditor",
      });
      setBusy("Adding contributors…");
      await ws.setContributors(
        validRows.map((r) => ({ name: r.name.trim(), party: r.party.trim(), role: r.role.trim() || "Contributor", amount: Number(r.amount) })),
      );
      setBusy("Funding the treasury…");
      await ws.fund(Number(treasury));
      setBusy("Establishing the mandate…");
      const board = await ws.establishMandate();
      onDone(board);
    } catch (e) {
      setBusy(null);
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Shell>
      <div className="mx-auto max-w-xl">
        <p className="mono-label text-[11px] text-accent">Create your rail</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Private contributor payouts on Canton</h1>
        <p className="mt-1.5 text-sm text-ink-2">
          Each contributor sees only their own payment. Nobody — not even the other payees — sees the full list. You custody nothing on their behalf.
        </p>

        {/* step rail */}
        <div className="mt-6 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div
                className={`h-1 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-line"}`}
              />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-3">
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </p>

        <div className="mt-5 rounded-2xl border border-line bg-surface p-6">
          {step === 0 && (
            <div className="space-y-4">
              <Field label="Organisation name">
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Helix Protocol" autoFocus />
              </Field>
              <Field label="Settlement asset" hint="What the treasury pays out in.">
                <input className={inputCls} value={asset} onChange={(e) => setAsset(e.target.value)} placeholder="USDC" />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label={`Batch cap (${asset})`} hint="Max a single batch may move.">
                  <input className={`${inputCls} tnum`} value={cap} onChange={(e) => setCap(e.target.value)} inputMode="numeric" />
                </Field>
                <Field label={`Approval threshold (${asset})`} hint="Over this, a payment needs the approver.">
                  <input className={`${inputCls} tnum`} value={threshold} onChange={(e) => setThreshold(e.target.value)} inputMode="numeric" />
                </Field>
              </div>
              <Field label="Approver wallet (Canton party)" hint="A core multisig / second signer — self-custodied.">
                <input className={`${inputCls} font-mono text-xs`} value={approverParty} onChange={(e) => setApproverParty(e.target.value)} placeholder="core-multisig::1220…" />
              </Field>
              <Field label="Approver label">
                <input className={inputCls} value={approverLabel} onChange={(e) => setApproverLabel(e.target.value)} />
              </Field>
              <Field label="Auditor wallet (Canton party)" hint="A permissioned party that may verify the whole batch.">
                <input className={`${inputCls} font-mono text-xs`} value={auditorParty} onChange={(e) => setAuditorParty(e.target.value)} placeholder="llamarisk::1220…" />
              </Field>
              <Field label="Auditor label">
                <input className={inputCls} value={auditorLabel} onChange={(e) => setAuditorLabel(e.target.value)} placeholder="LlamaRisk" />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-ink-3">
                Add each contributor by the Canton wallet they control. Sotto never holds their keys — a payment names their party as the beneficiary.
              </p>
              {rows.map((r, i) => {
                const over = Number(r.amount) > th && th > 0;
                return (
                  <div key={i} className="rounded-xl border border-line bg-surface-2 p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <input className={inputCls} value={r.name} placeholder="Handle · nebula.eth" onChange={(e) => upd(i, { name: e.target.value })} />
                      <input className={inputCls} value={r.role} placeholder="Role · Protocol eng" onChange={(e) => upd(i, { role: e.target.value })} />
                    </div>
                    <input className={`${inputCls} font-mono text-xs`} value={r.party} placeholder="Their Canton wallet · nebula::1220…" onChange={(e) => upd(i, { party: e.target.value })} />
                    <div className="mt-2 flex items-center gap-2">
                      <input className={`${inputCls} tnum flex-1`} value={r.amount} inputMode="numeric" placeholder={`Amount (${asset})`} onChange={(e) => upd(i, { amount: e.target.value })} />
                      {over ? <span className="text-[11px] text-warn">needs approver</span> : null}
                      {rows.length > 1 ? (
                        <button onClick={() => setRows(rows.filter((_, j) => j !== i))} className="text-ink-3 hover:text-warn" aria-label="remove">
                          ✕
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              <button onClick={() => setRows([...rows, emptyRow()])} className="text-sm text-accent hover:brightness-110">
                + Add contributor
              </button>
              {validRows.length ? (
                <p className="text-xs text-ink-3">
                  {validRows.length} contributor{validRows.length > 1 ? "s" : ""} · {fmt(total)} {asset} this cycle
                </p>
              ) : null}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <Field label={`Fund the treasury (${asset})`} hint={`Needs to cover this cycle: ${fmt(total)} ${asset}.`}>
                <input className={`${inputCls} tnum`} value={treasury} onChange={(e) => setTreasury(e.target.value)} inputMode="numeric" placeholder={String(total)} autoFocus />
              </Field>
              <div className="rounded-xl border border-line bg-surface-2 p-4 text-sm">
                <Row2 k="Organisation" v={name} />
                <Row2 k="Contributors" v={`${validRows.length} · ${fmt(total)} ${asset}`} />
                <Row2 k="Over threshold" v={`${validRows.filter((r) => Number(r.amount) > th).length} (maker-checker)`} />
                <Row2 k="Approver" v={approverLabel} />
                <Row2 k="Auditor" v={auditorLabel || "—"} />
              </div>
              {Number(treasury) < total ? (
                <p className="text-xs text-warn">Treasury must cover {fmt(total)} {asset}.</p>
              ) : null}
            </div>
          )}

          {err ? <p className="mt-4 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">{err}</p> : null}

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0 || !!busy}
              className="text-sm text-ink-3 hover:text-ink-2 disabled:opacity-0"
            >
              ← Back
            </button>
            {step < STEPS.length - 1 ? (
              <Btn onClick={() => setStep(step + 1)} disabled={!canNext}>
                Continue
              </Btn>
            ) : (
              <Btn onClick={launch} disabled={!canNext || !!busy}>
                {busy ?? "Create rail →"}
              </Btn>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );

  function upd(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }
}

function Row2({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-1.5 last:border-0">
      <span className="text-ink-3">{k}</span>
      <span className="text-ink">{v}</span>
    </div>
  );
}

/* ── dashboard helpers ──────────────────────────────────────────────────────── */

const ago = (iso: string): string => {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// A colored dot per event kind — the whole activity row's visual language.
const EVENT_DOT: Record<ws.WsEventKind, string> = {
  created: "bg-ink-3",
  funded: "bg-good",
  roster: "bg-accent",
  mandate: "bg-accent",
  settled: "bg-good",
  approved: "bg-good",
  rejected: "bg-warn",
  cycle: "bg-accent",
};

function Modal({
  title,
  sub,
  onClose,
  size = "md",
  children,
}: {
  title: string;
  sub?: string;
  onClose: () => void;
  size?: "md" | "lg";
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className={`w-full ${size === "lg" ? "max-w-lg" : "max-w-md"} rounded-2xl border border-line bg-surface p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold">{title}</h3>
            {sub ? <p className="mt-0.5 text-xs text-ink-3">{sub}</p> : null}
          </div>
          <button onClick={onClose} className="text-ink-3 hover:text-ink" aria-label="close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ActivityRow({ e }: { e: ws.WsEvent }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${EVENT_DOT[e.kind]}`} />
      <span className="min-w-0 flex-1 truncate text-sm text-ink-2">{e.summary}</span>
      <span className="shrink-0 font-mono text-[11px] text-ink-3">{ago(e.at)}</span>
    </div>
  );
}

/* ── workspace dashboard ────────────────────────────────────────────────────── */

function Dashboard({
  board,
  setBoard,
  onExit,
}: {
  board: ws.WsDashboard;
  setBoard: (b: ws.WsDashboard) => void;
  onExit: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [peek, setPeek] = useState<{ line: ws.WsLine; view: ws.WsView } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [events, setEvents] = useState<ws.WsEvent[]>([]);
  const [fundOpen, setFundOpen] = useState(false);
  const [fundAmt, setFundAmt] = useState("");
  const [rosterOpen, setRosterOpen] = useState(false);
  const [draft, setDraft] = useState<Row[]>([]);

  const anyDraft = board.lines.some((l) => l.status === "draft");
  const pendingOver = board.lines.filter((l) => l.over && l.status === "pending");
  const moved = useMemo(
    () => board.lines.filter((l) => l.status === "settled").reduce((a, l) => a + l.amount, 0),
    [board.lines],
  );

  const refreshActivity = () => ws.activity().then((r) => setEvents(r.events)).catch(() => {});
  useEffect(() => {
    refreshActivity();
  }, []);

  async function run(label: string, fn: () => Promise<ws.WsDashboard>) {
    setErr(null);
    setBusy(label);
    try {
      setBoard(await fn());
      await refreshActivity();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function addFunds() {
    const amt = Number(fundAmt);
    if (!(amt > 0)) return;
    setFundOpen(false);
    setFundAmt("");
    await run("Adding funds…", () => ws.fund(amt));
  }

  function openRoster() {
    setDraft(board.lines.map((l) => ({ name: l.name, party: l.party, role: l.role, amount: String(l.amount) })));
    setRosterOpen(true);
  }

  const rosterValid = draft.filter((r) => r.name.trim() && /::/.test(r.party) && Number(r.amount) > 0);
  async function saveRoster() {
    if (!rosterValid.length) return;
    setRosterOpen(false);
    await run("Updating roster…", async () => {
      await ws.setContributors(
        rosterValid.map((r) => ({ name: r.name.trim(), party: r.party.trim(), role: r.role.trim() || "Contributor", amount: Number(r.amount) })),
      );
      return ws.establishMandate();
    });
  }

  async function peekAt(line: ws.WsLine) {
    try {
      setPeek({ line, view: await ws.viewAs(line.party) });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  async function share(line: ws.WsLine) {
    try {
      const { token } = await ws.contributorLink(line.id);
      const url = `${window.location.origin}/received?t=${encodeURIComponent(token)}`;
      await navigator.clipboard.writeText(url);
      setCopied(line.id);
      setTimeout(() => setCopied((c) => (c === line.id ? null : c)), 2000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Shell onExit={onExit}>
      {/* headline */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{board.org}</h1>
            <span className="rounded-full border border-good/30 bg-good/10 px-2 py-0.5 text-[11px] text-good">Live · Canton</span>
          </div>
          <p className="mt-1 text-sm text-ink-3">
            Threshold {fmt(board.threshold)} {board.asset} · over that needs the approver
          </p>
        </div>
        <div className="text-right">
          <div className="mono-label text-[11px] text-ink-3">Treasury</div>
          <div className="tnum text-3xl font-semibold tracking-tight">{fmt(board.treasury)}</div>
          <div className="text-xs text-ink-3">{board.asset} · {fmt(moved)} moved this cycle</div>
        </div>
      </div>

      {/* actions */}
      <div className="mt-5 flex flex-wrap gap-2">
        <Btn onClick={() => run("Running batch…", ws.settle)} disabled={!anyDraft || !!busy}>
          {busy === "Running batch…" ? "Running…" : "Run batch"}
        </Btn>
        <Btn variant="ghost" onClick={() => setFundOpen(true)} disabled={!!busy}>
          Add funds
        </Btn>
        <Btn variant="ghost" onClick={openRoster} disabled={!!busy}>
          Manage roster
        </Btn>
        {pendingOver.map((l) => (
          <span key={l.id} className="inline-flex gap-1">
            <Btn variant="ghost" onClick={() => run("Approving…", () => ws.approve(l.id))} disabled={!!busy}>
              Approve {l.name}
            </Btn>
            <Btn variant="danger" onClick={() => run("Holding…", () => ws.reject(l.id))} disabled={!!busy}>
              Hold
            </Btn>
          </span>
        ))}
        <div className="flex-1" />
        <Btn variant="ghost" onClick={() => run("Resetting…", ws.resetCycle)} disabled={!!busy}>
          New cycle
        </Btn>
      </div>

      {err ? <p className="mt-4 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">{err}</p> : null}

      {/* roster */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-ink-3">
              <th className="px-4 py-2.5 font-medium">Contributor</th>
              <th className="px-4 py-2.5 font-medium">Wallet</th>
              <th className="px-4 py-2.5 text-right font-medium">Amount</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {board.lines.map((l) => (
              <tr key={l.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <div className="text-ink">{l.name}</div>
                  <div className="text-xs text-ink-3">{l.role}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ink-3">{shortParty(l.party)}</td>
                <td className="tnum px-4 py-3 text-right text-ink">
                  {fmt(l.amount)}
                  {l.over ? <span className="ml-1 text-[11px] text-warn">▲</span> : null}
                </td>
                <td className="px-4 py-3"><Pill status={l.status} /></td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button onClick={() => share(l)} className="text-xs text-ink-3 hover:text-accent">
                      {copied === l.id ? "link copied ✓" : "share link"}
                    </button>
                    <button onClick={() => peekAt(l)} className="text-xs text-ink-3 hover:text-accent">
                      view as →
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-ink-3">
        “view as” reads the ledger as that contributor’s wallet — proof they see only their own line. ▲ = over the approval threshold.
      </p>

      {/* activity — an honest trail of every action taken on the rail */}
      <div className="mt-8">
        <div className="mono-label mb-3 text-[11px] text-ink-3">Activity</div>
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {events.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-3">No activity yet — fund the treasury or run a batch.</p>
          ) : (
            events.map((e, i) => <ActivityRow key={`${e.at}-${i}`} e={e} />)
          )}
        </div>
      </div>

      {/* privacy peek */}
      {peek ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4" onClick={() => setPeek(null)}>
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">What {peek.line.name} can see</h3>
              <button onClick={() => setPeek(null)} className="text-ink-3 hover:text-ink">✕</button>
            </div>
            <p className="mt-1 font-mono text-xs text-ink-3">{shortParty(peek.line.party)}</p>
            <div className="mt-4 rounded-xl border border-line bg-surface-2 p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-ink-3">Balance</span>
                <span className="tnum text-lg font-semibold">{fmt(peek.view.balance)} {board.asset}</span>
              </div>
              <div className="mt-3 space-y-1.5 text-sm">
                {peek.view.contracts.length === 0 ? (
                  <p className="text-ink-3">Nothing visible yet.</p>
                ) : (
                  peek.view.contracts.map((c, i) => (
                    <div key={i} className="flex justify-between text-ink-2">
                      <span>{c.kind === "DisbursementReceipt" ? "Payment receipt" : c.kind === "Holding" ? "Holding" : c.kind}</span>
                      <span className="tnum">{c.amount != null ? fmt(c.amount) : "—"}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <p className="mt-3 text-xs text-ink-3">
              They see their own holding and receipt — and nothing about the other contributors, the mandate, or the treasury. Enforced by Canton.
            </p>
          </div>
        </div>
      ) : null}

      {/* add funds */}
      {fundOpen ? (
        <Modal title="Add funds" sub={`Mint more ${board.asset} into ${board.org}’s treasury.`} onClose={() => setFundOpen(false)}>
          <div className="mt-4">
            <input
              className={`${inputCls} tnum`}
              value={fundAmt}
              onChange={(e) => setFundAmt(e.target.value)}
              inputMode="numeric"
              placeholder={`Amount (${board.asset})`}
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setFundOpen(false)}>
                Cancel
              </Btn>
              <Btn onClick={addFunds} disabled={!(Number(fundAmt) > 0)}>
                Add {Number(fundAmt) > 0 ? fmt(Number(fundAmt)) : ""} {board.asset}
              </Btn>
            </div>
          </div>
        </Modal>
      ) : null}

      {/* manage roster */}
      {rosterOpen ? (
        <Modal
          title="Manage roster"
          sub="Add, edit or remove contributors — saving re-encodes the mandate on Canton."
          size="lg"
          onClose={() => setRosterOpen(false)}
        >
          <div className="mt-4 max-h-[50vh] space-y-3 overflow-y-auto pr-1">
            {draft.map((r, i) => {
              const over = Number(r.amount) > board.threshold && board.threshold > 0;
              const set = (patch: Partial<Row>) => setDraft((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <div key={i} className="rounded-xl border border-line bg-surface-2 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inputCls} value={r.name} placeholder="Handle · nebula.eth" onChange={(e) => set({ name: e.target.value })} />
                    <input className={inputCls} value={r.role} placeholder="Role · Protocol eng" onChange={(e) => set({ role: e.target.value })} />
                  </div>
                  <input
                    className={`${inputCls} font-mono text-xs`}
                    value={r.party}
                    placeholder="Their Canton wallet · nebula::1220…"
                    onChange={(e) => set({ party: e.target.value })}
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      className={`${inputCls} tnum flex-1`}
                      value={r.amount}
                      inputMode="numeric"
                      placeholder={`Amount (${board.asset})`}
                      onChange={(e) => set({ amount: e.target.value })}
                    />
                    {over ? <span className="text-[11px] text-warn">needs signer</span> : null}
                    {draft.length > 1 ? (
                      <button onClick={() => setDraft((d) => d.filter((_, j) => j !== i))} className="text-ink-3 hover:text-warn" aria-label="remove">
                        ✕
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
            <button onClick={() => setDraft((d) => [...d, emptyRow()])} className="text-sm text-accent hover:brightness-110">
              + Add contributor
            </button>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-xs text-ink-3">
              {rosterValid.length} valid · {fmt(rosterValid.reduce((a, r) => a + Number(r.amount), 0))} {board.asset}
            </span>
            <div className="flex gap-2">
              <Btn variant="ghost" onClick={() => setRosterOpen(false)}>
                Cancel
              </Btn>
              <Btn onClick={saveRoster} disabled={!rosterValid.length}>
                Save roster
              </Btn>
            </div>
          </div>
        </Modal>
      ) : null}
    </Shell>
  );
}

/* ── early-access gate ──────────────────────────────────────────────────────── */

// Shown on deployments that can't allocate parties yet (shared DevNet). Never a
// dead end: it funnels to the working live demo and offers to request access.
function RequestAccess() {
  return (
    <Shell>
      <div className="mx-auto max-w-xl py-10 text-center">
        <p className="mono-label text-[11px] text-accent">Early access</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sotto is onboarding teams</h1>
        <p className="mt-2 text-sm text-ink-2">
          The self-custody payout workspace is rolling out to crypto-native teams. See it running live
          on Canton now, or request early access for your DAO.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <a
            href="/app"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
          >
            See it live on Canton
          </a>
          <a
            href="mailto:gkenny896@gmail.com?subject=Sotto%20early%20access"
            className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm text-ink-2 transition hover:border-line-2 hover:text-ink"
          >
            Request early access
          </a>
        </div>
        <p className="mt-6 text-xs text-ink-3">
          Your workspace runs on a Canton participant your team controls — self-serve onboarding lands as we roll out validators.
        </p>
      </div>
    </Shell>
  );
}

/* ── entry ──────────────────────────────────────────────────────────────────── */

export function Workspace() {
  const [ready, setReady] = useState(false);
  const [board, setBoard] = useState<ws.WsDashboard | null>(null);
  const [available, setAvailable] = useState(true); // optimistic; only gated when the backend says so

  useEffect(() => {
    const t = ws.getToken();
    if (t) {
      ws.dashboard()
        .then(setBoard)
        .catch(() => ws.setToken(null))
        .finally(() => setReady(true));
      return;
    }
    ws.availability()
      .then((a) => setAvailable(a.available))
      .catch(() => {
        /* if the check itself is unreachable, stay optimistic — create is guarded server-side too */
      })
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <Splash />;
  if (board) {
    return (
      <Dashboard
        board={board}
        setBoard={setBoard}
        onExit={() => {
          ws.setToken(null);
          setBoard(null);
        }}
      />
    );
  }
  if (!available) return <RequestAccess />;
  return <Onboard onDone={setBoard} />;
}
