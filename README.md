# Sotto

**Confidential payout infrastructure on the Canton Network.**

> *Sotto* is a working placeholder name — one find-and-replace from final.

Sotto lets an organisation pay many people at once — staff, contractors, suppliers, beneficiaries — so that **each recipient sees only their own payment**, **the full payout list stays private** from competitors and the public, **a permissioned auditor can verify the entire batch**, and **the money settles atomically** (all payments clear or none do).

Privacy here is not a feature the app bolts on. It is a property of the rail: it falls directly out of how the Daml contracts declare their signatories and observers on Canton. See [docs/handoff.md](docs/handoff.md) and [docs/sotto-litepaper.pdf](docs/sotto-litepaper.pdf) for the full thesis.

This repository is the **hackathon MVP** for *Build on Canton* (ENCODE Club, kicks off 15 June 2026).

---

## The privacy model (the whole point)

| Contract | Signatory | Observer | What it guarantees |
|---|---|---|---|
| `Holding` (settlement token) | issuer | owner | Only the issuer and the owner see a balance. Recipients never see one another's holdings. |
| `DisbursementReceipt` | payer, issuer | recipient, auditor | Each recipient sees **only their own** payment; the auditor sees **every** receipt in the batch. This asymmetry is the demo. |
| `PayoutMandate` | payer, issuer | auditor | The on-ledger spending authority: cap, threshold, recipient allow-list. Its `Disburse` choice settles a whole batch atomically. |
| `LargePaymentProposal` | payer, issuer | approver, auditor | Maker-checker: a payment over the mandate threshold is held until a second party (the approver) signs, on-ledger. |

## Repository layout

```
sotto/
  daml/
    sotto/         # the four confidential-payout templates (uploaded to participants)
    sotto-tests/   # the runnable demo + privacy assertions (data-depends on sotto)
    multi-package.yaml
  backend/         # thin service over Canton's JSON Ledger API (REST -> ledger)  [pending]
  frontend/        # Flutter app: one surface, role switcher (payer/recipient/auditor)  [pending]
  docs/            # litepaper + build handoff
```

The Daml is split the way cn-quickstart splits `licensing` / `licensing-tests`: the
templates package carries no `daml-script` dependency, so the DAR uploaded to a
participant stays lean. The scripts (and the privacy proofs) live in `sotto-tests`.

## Toolchain

- **Daml SDK via `dpm`** (Digital Asset Package Manager) — the model targets Daml 3.x (Canton 3.x), matching `cn-quickstart`.
- **Docker** — for a local Canton network when the demo moves on-ledger.
- **Flutter** — the UI surface.

## Status

- [x] Repo scaffolded; model in place; docs captured
- [x] Daml SDK (`dpm`) installed; model **compiles on 3.4.11** (cn-quickstart's pin) and 3.5.1
- [x] `demo` script **green with per-party privacy assertions** — the asymmetry is machine-checked, not just narrated
- [x] Templates split from scripts (lean upload DAR), mirroring cn-quickstart
- [ ] Local Canton network (cn-quickstart LocalNet) + Sotto DAR deployed
- [ ] Thin backend over the JSON Ledger API
- [ ] Flutter UI with the three role-switched views
- [ ] Deployed live URL + 3-minute demo video

## Quick start (Daml model)

Requires the Daml SDK (`dpm`). Install: `curl https://get.digitalasset.com/install/install.sh | sh`.

```bash
cd daml
dpm build --all                 # build the templates + tests packages
cd sotto-tests && dpm test      # run the demo; inspect per-party visibility
```

Expected: `Sotto/Scripts/Demo.daml:demo: ok, 9 active contracts, 7 transactions.`

> The `demo` script in [daml/sotto-tests/daml/Sotto/Scripts/Demo.daml](daml/sotto-tests/daml/Sotto/Scripts/Demo.daml)
> allocates parties, funds a treasury, runs an atomic batch, shows an over-threshold payment rejected by
> `Disburse` and then approved via the maker-checker `LargePaymentProposal` — then **asserts** that Ada sees only
> her 2 receipts, Kola only his 1, the auditor all 3, recipients see only holdings they own, and the mandate is
> invisible to recipients. That is the entire privacy story, proven before any UI exists.
