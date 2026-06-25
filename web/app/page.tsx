import { Icon } from "@/components/icon";
import { LensLedger } from "@/components/lens-ledger";
import { Reveal } from "@/components/reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

export default function Home() {
  return (
    <div id="top">
      <SiteNav />
      <main>
        <Hero />
        <How />
        <Lenses />
        <Canton />
        <CtaBand />
      </main>
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* top accent glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] bg-[radial-gradient(48%_60%_at_50%_-8%,var(--glow),transparent_70%)]"
      />
      {/* faint grid, masked to fade out */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid)_1px,transparent_1px)] bg-[size:46px_46px] [mask-image:radial-gradient(70%_45%_at_50%_0%,black,transparent)]"
      />

      <div className="mx-auto max-w-3xl px-5 pb-16 pt-20 text-center sm:px-8 sm:pt-28">
        <Reveal>
          <a
            href="#canton"
            className="inline-flex items-center gap-2 rounded-full border border-line-2 bg-surface/60 px-3 py-1.5 text-[12px] text-ink-2 backdrop-blur transition-colors hover:text-ink"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-good shadow-[0_0_8px] shadow-good" />
            <span className="mono-label text-[10.5px]">Live on Canton</span>
            <span className="text-ink-3">·</span> Confidential payouts, proven
          </a>
        </Reveal>

        <Reveal delay={0.06}>
          <h1 className="mt-6 text-[clamp(2.6rem,7vw,4.6rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-ink">
            One batch.
            <br />
            <span className="text-ink-2">Four kinds of eyes.</span>
          </h1>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mx-auto mt-6 max-w-xl text-[16.5px] leading-relaxed text-ink-2">
            Sotto pays your whole roster in a single confidential transaction on Canton. Each
            party sees only what they&rsquo;re entitled to — privacy enforced by the ledger, not
            the app.
          </p>
        </Reveal>

        <Reveal delay={0.18}>
          <div className="mt-8 flex items-center justify-center gap-3">
            <a
              href="#demo"
              className="inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-[14px] font-medium text-page transition-colors hover:bg-white"
            >
              See it live
              <Icon name="arrow-down" size={15} strokeWidth={2} />
            </a>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-xl border border-line-2 px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-surface"
            >
              How it works
            </a>
          </div>
        </Reveal>
      </div>

      {/* the interactive proof */}
      <div id="demo" className="mx-auto flex max-w-6xl scroll-mt-20 justify-center px-5 pb-24 sm:px-8">
        <Reveal delay={0.1}>
          <LensLedger />
        </Reveal>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="mono-label text-[11px] text-accent-2">{eyebrow}</div>
      <h2 className="mt-3 text-[clamp(1.8rem,4vw,2.6rem)] font-semibold tracking-[-0.02em] text-ink">
        {title}
      </h2>
      {sub && <p className="mx-auto mt-4 max-w-xl text-[15.5px] leading-relaxed text-ink-2">{sub}</p>}
    </div>
  );
}

function How() {
  const steps = [
    {
      icon: "layers",
      title: "Set the rail",
      body: "Fund a treasury and encode the mandate — per-cycle cap, approval threshold, named approver and auditor. The rules live on the ledger, not in a policy doc.",
    },
    {
      icon: "bolt",
      title: "Pay the batch at once",
      body: "One confidential transaction disburses the whole roster. Under-threshold lines settle atomically; anything larger holds for a second signer — all of it, or none.",
    },
    {
      icon: "eye",
      title: "Everyone sees their slice",
      body: "A recipient sees only their own line. A named auditor sees every receipt. A competitor sees nothing at all. The asymmetry is the product.",
    },
  ];
  return (
    <section id="how" className="scroll-mt-16 border-t border-line py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="How it works"
            title="Payroll that doesn't leak"
            sub="Three steps from a funded treasury to six people paid — each seeing only what the rail allows."
          />
        </Reveal>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-line bg-surface/50 p-6 transition-colors hover:border-line-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-line-2 bg-surface-2 text-accent-2">
                  <Icon name={s.icon} size={19} strokeWidth={1.7} />
                </div>
                <div className="mono-label mt-5 text-[10.5px] text-ink-3">Step {i + 1}</div>
                <h3 className="mt-2 text-[17px] font-semibold tracking-tight text-ink">{s.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Lenses() {
  const lenses = [
    { icon: "building", name: "Payer", who: "Lumen Studio", sees: "Runs the mandate and the batch. Sees every name, role and amount before it leaves." },
    { icon: "arrow-down", name: "Recipient", who: "Amara Okafor", sees: "Sees their own line — and nothing else. The other five payments simply aren't there." },
    { icon: "eye", name: "Auditor", who: "Hale & Co.", sees: "Read-only visibility into every receipt in the batch. Granted on purpose, never assumed." },
    { icon: "shield", name: "Approver", who: "Priya Raman", sees: "Sees only what crosses the threshold. The 32,000 needs a second signature; the rest settle untouched." },
  ];
  return (
    <section id="lenses" className="scroll-mt-16 border-t border-line py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="The four lenses"
            title="One ledger, four truths"
            sub="The same batch, viewed by four parties. Switch the lens in the demo above and watch the rows redact in real time."
          />
        </Reveal>
        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          {lenses.map((l, i) => (
            <Reveal key={l.name} delay={i * 0.06}>
              <div className="flex h-full gap-4 rounded-2xl border border-line bg-surface/50 p-6 transition-colors hover:border-line-2">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line-2 bg-surface-2 text-ink">
                  <Icon name={l.icon} size={20} strokeWidth={1.7} />
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-[16px] font-semibold tracking-tight text-ink">{l.name}</h3>
                    <span className="font-mono text-[12px] text-ink-3">{l.who}</span>
                  </div>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{l.sees}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Canton() {
  // Real evidence from the running rail — each line actually happened on Canton.
  const proof: { op: string; detail: string; tag: string; icon: string; tone: "good" | "accent" }[] = [
    { op: "settle", detail: "treasury 312,480.00 → 291,930.00", tag: "atomic", icon: "check", tone: "good" },
    { op: "receipt", detail: "amara okafor · +4,200.00", tag: "on-chain", icon: "check", tone: "good" },
    { op: "deny", detail: "recipient → another’s line", tag: "403 refused", icon: "lock", tone: "accent" },
    { op: "auth", detail: "per-party token", tag: "RS256 · JWKS", icon: "shield", tone: "good" },
  ];
  const tone = {
    good: "border-good/30 bg-good/10 text-good",
    accent: "border-accent/30 bg-accent/10 text-accent-2",
  };
  return (
    <section id="canton" className="scroll-mt-16 border-t border-line py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2">
        <Reveal>
          <div>
            <div className="mono-label text-[11px] text-accent-2">On Canton</div>
            <h2 className="mt-3 text-[clamp(1.8rem,4vw,2.6rem)] font-semibold tracking-[-0.02em] text-ink">
              Not a mockup. A real ledger.
            </h2>
            <p className="mt-4 max-w-md text-[15.5px] leading-relaxed text-ink-2">
              Every payment is a real contract on a Canton participant node. Privacy isn&rsquo;t a UI
              trick — a recipient&rsquo;s token is <span className="text-ink">refused at the ledger</span> when it
              reaches for anyone else&rsquo;s line. The numbers below are on-chain, not made up.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {["Provably real", "Maker–checker", "Explicit disclosure", "Auditable"].map((t) => (
                <span key={t} className="rounded-full border border-line-2 px-3 py-1 text-[12px] text-ink-2">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="overflow-hidden rounded-2xl border border-line-2 bg-surface/60 backdrop-blur">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-good shadow-[0_0_8px] shadow-good" />
              <span className="mono-label text-[10.5px] text-ink-2">participant · sandbox</span>
              <span className="ml-auto font-mono text-[11px] text-ink-3">offset 56 · live</span>
            </div>
            <div className="divide-y divide-line font-mono">
              {proof.map((p) => (
                <div key={p.op} className="flex items-center gap-3 px-4 py-3 text-[12px]">
                  <span className="w-12 shrink-0 text-accent-2">{p.op}</span>
                  <span className="min-w-0 flex-1 truncate text-ink">{p.detail}</span>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] ${tone[p.tone]}`}
                  >
                    <Icon name={p.icon} size={10} strokeWidth={2.2} />
                    {p.tag}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-line px-4 py-3">
              <span className="font-mono text-[11px] text-ink-3">
                Holding · 00066642fdb1… · owner LumenStudio::1220df30…
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CtaBand() {
  return (
    <section className="border-t border-line py-24">
      <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
        <Reveal>
          <h2 className="text-[clamp(2rem,5vw,3.2rem)] font-semibold tracking-[-0.025em] text-ink">
            Stop leaking your payroll.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed text-ink-2">
            Pay everyone at once. Show no one the others.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <a
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-[14px] font-medium text-page transition-colors hover:bg-white"
            >
              Open the console
              <Icon name="arrow-right" size={15} strokeWidth={2} />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
