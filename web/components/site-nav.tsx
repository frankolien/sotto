import { SottoMark } from "./icon";
import { ThemeToggle } from "./theme-toggle";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-page/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-8">
        <a href="#top" className="flex items-center gap-2 text-ink">
          <SottoMark size={20} />
          <span className="text-[15px] font-semibold tracking-tight">Sotto</span>
        </a>
        <nav className="hidden items-center gap-7 text-[13.5px] text-ink-2 md:flex">
          <a href="#how" className="transition-colors hover:text-ink">
            How it works
          </a>
          <a href="#lenses" className="transition-colors hover:text-ink">
            The four lenses
          </a>
          <a href="#canton" className="transition-colors hover:text-ink">
            On Canton
          </a>
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle className="mr-1" />
          <a
            href="/app"
            className="hidden rounded-lg px-3 py-1.5 text-[13.5px] text-ink-2 transition-colors hover:text-ink sm:block"
          >
            Sign in
          </a>
          <a
            href="/app"
            className="rounded-lg bg-ink px-3.5 py-1.5 text-[13.5px] font-medium text-page transition-colors hover:bg-white"
          >
            Open the console
          </a>
        </div>
      </div>
    </header>
  );
}
