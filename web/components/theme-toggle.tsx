"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icon";

type Theme = "dark" | "light";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const t = (document.documentElement.dataset.theme as Theme) || "dark";
    setTheme(t);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setTheme(next);
  };

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className={`grid h-8 w-8 place-items-center rounded-lg border border-line-2 text-ink-2 transition-colors hover:bg-surface hover:text-ink ${className ?? ""}`}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} size={15} strokeWidth={1.7} />
    </button>
  );
}
