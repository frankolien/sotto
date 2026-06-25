import { SottoMark } from "./icon";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="flex flex-col justify-between gap-10 sm:flex-row">
          <div className="max-w-xs">
            <div className="flex items-center gap-2 text-ink">
              <SottoMark size={20} />
              <span className="text-[15px] font-semibold tracking-tight">Sotto</span>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-3">
              Confidential payouts on a public ledger. Privacy enforced by the rail, not the app.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-14 gap-y-2 sm:grid-cols-3">
            {[
              ["Product", ["How it works", "The four lenses", "On Canton", "Console"]],
              ["Model", ["Confidentiality", "Maker–checker", "Atomic settlement", "Audit"]],
              ["Company", ["Roadmap", "Security", "Contact"]],
            ].map(([title, items]) => (
              <div key={title as string}>
                <div className="mono-label mb-3 text-[10.5px] text-ink-3">{title as string}</div>
                <ul className="space-y-2">
                  {(items as string[]).map((it) => (
                    <li key={it}>
                      <a href="#" className="text-[13px] text-ink-2 transition-colors hover:text-ink">
                        {it}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-line pt-6 text-[12px] text-ink-3 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Sotto. Built on Canton.</span>
          <span className="mono-label text-[10.5px]">Confidential · Auditable · Atomic</span>
        </div>
      </div>
    </footer>
  );
}
