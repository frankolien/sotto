import type { CSSProperties, ReactNode } from "react";

/** Entrance: a subtle fade + rise, CSS-driven so it always runs (SSR/headless
 *  included) and costs no JS. The stagger comes from `delay`. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const style: CSSProperties = {
    animation: "reveal-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
    animationDelay: `${delay}s`,
  };
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}
