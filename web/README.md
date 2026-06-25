# Sotto — web

The Sotto landing page and confidential-payout console. This is the hackathon
submission surface. Next.js 16 (App Router, Turbopack) + React 19 + Tailwind v4.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
```

## What's here

- **`/`** — landing. Interactive *lens-ledger* hero (one batch cycling through four
  lenses), how-it-works, the four lenses, an **On Canton** proof section, CTA.
- **`/app`** — the console. Sign in as any of four identities and get a real dashboard
  view of one shared batch:
  - **Payer** (Lumen Studio) — the whole batch; runs the atomic payout.
  - **Recipient** (Amara Okafor) — only her own line; the rest never arrive.
  - **Approver** (Priya Raman) — only the over-threshold payment, to sign.
  - **Auditor** (Hale & Co.) — every receipt, read-only.

Deep-linkable: `/app?lens=payer&view=batch`. `lens` ∈ payer·recipient·approver·auditor;
`view` ∈ overview·batch·activity·mandate. Theme via `?theme=light|dark`, the toggle, or
stored preference (no flash).

## Data

Self-contained sample data ([lib/batch.ts](lib/batch.ts), [lib/console.ts](lib/console.ts))
so the demo is reliable and offline. The reads are shaped to swap for the Canton-backed
backend (`../backend`) behind the same interface. The privacy and atomic settlement the
console *shows* are the real mechanism — proven in `../daml` and implemented in
`../backend`.

## Design

Dark-first, monochrome + one indigo accent (`#6e5bf6`), hairline depth (no heavy
shadows), IBM Plex Mono for all ledger figures — the brand throughline with the mobile
app. Tokens live in [app/globals.css](app/globals.css) (`@theme inline`, CSS vars +
`[data-theme="light"]` override). Entrances are CSS keyframes (`reveal-up` / `fade-key`),
not JS-driven, so they render under headless capture for screenshots.

## Recording the demo

Shot-by-shot script: [DEMO.md](DEMO.md). Pitch outline: [../docs/DECK.md](../docs/DECK.md).

> Heads up: this repo pins a newer Next.js than most training data — see
> [AGENTS.md](AGENTS.md) before changing build/config.
