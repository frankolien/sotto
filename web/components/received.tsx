"use client";

// The contributor's private view. Opened from a magic link the org shares
// (/received?t=<token>). It reads ONLY this contributor's own payments — the whole
// point: they see their pay and nobody else's, proven by the ledger.

import { useEffect, useState } from "react";
import * as ws from "@/lib/workspace";
import { SottoMark } from "./icon";
import { ThemeToggle } from "./theme-toggle";

const fmt = (n: number) => n.toLocaleString("en-US");
const day = (iso: string) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
};

export function Received() {
  const [state, setState] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [data, setData] = useState<ws.Received | null>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("t");
    if (t) {
      ws.setCToken(t);
      window.history.replaceState(null, "", "/received");
    }
    if (!ws.getCToken()) {
      setState("empty");
      return;
    }
    ws.received()
      .then((d) => {
        setData(d);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  return (
    <div className="min-h-screen bg-page text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <SottoMark className="h-5 w-5 text-accent" />
            <span className="text-[15px] font-semibold tracking-tight">Sotto</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 py-12">
        {state === "loading" && (
          <div className="flex items-center gap-2 py-16 text-ink-3">
            <span className="h-3 w-3 animate-spin rounded-full border border-ink-3 border-t-transparent" />
            Opening your private view…
          </div>
        )}

        {state === "empty" && (
          <div className="rounded-2xl border border-line bg-surface p-8 text-center">
            <h1 className="text-xl font-semibold">No payment link</h1>
            <p className="mt-2 text-sm text-ink-2">Open the private link your organisation shared with you to see your payment.</p>
          </div>
        )}

        {state === "error" && (
          <div className="rounded-2xl border border-warn/30 bg-warn/10 p-8 text-center text-warn">
            <h1 className="text-xl font-semibold">Link expired or invalid</h1>
            <p className="mt-2 text-sm">Ask your organisation to re-share your payment link.</p>
          </div>
        )}

        {state === "ready" && data && (
          <div>
            <p className="mono-label text-[11px] text-accent">Paid to you</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {data.payments.length ? "You’ve been paid" : "You’re on the roster"}
            </h1>
            <p className="mt-1.5 text-sm text-ink-2">
              from <span className="text-ink">{data.org}</span> · settled on Canton
            </p>

            <div className="mt-6 rounded-2xl border border-line bg-surface p-6">
              <div className="mono-label text-[11px] text-ink-3">Your balance</div>
              <div className="tnum mt-1 text-4xl font-semibold tracking-tight">
                {fmt(data.balance)} <span className="text-lg text-ink-3">{data.asset}</span>
              </div>

              <div className="mt-5 space-y-2">
                {data.payments.length === 0 ? (
                  <p className="text-sm text-ink-3">No payment yet — you’ll see it here the moment it settles.</p>
                ) : (
                  data.payments.map((p, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-line bg-surface-2 px-4 py-3">
                      <div>
                        <div className="text-sm text-ink">Payout · {p.batchRef}</div>
                        <div className="text-xs text-ink-3">{day(p.at)}</div>
                      </div>
                      <div className="tnum text-ink">
                        +{fmt(p.amount)} <span className="text-xs text-ink-3">{data.asset}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <p className="mt-4 text-xs text-ink-3">
              Only you can see this. Not the other contributors, not the public — Canton discloses your payment to your wallet alone. You custody it yourself.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
