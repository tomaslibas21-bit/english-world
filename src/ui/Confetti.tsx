import { useLayoutEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

const COLORS = ["#f4b400", "#3aa76d", "#e8743b", "#2a9d8f", "#e84a5f", "#8e6bb0", "#4a90c2"];

/** A burst of confetti from the middle of an element (the task bar, when the task is done): little paper pieces fly
 *  up and out, then flutter down and fade, in about two seconds. None with reduced motion. */
export function Confetti({ from }: { from: RefObject<HTMLElement | null> }) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const [pieces] = useState(() => Array.from({ length: 44 }, (_, i) => {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, v = 70 + Math.random() * 120;
    return {
      x: Math.cos(a) * v * 1.6, up: Math.sin(a) * v, y: 140 + Math.random() * 160,
      r: (Math.random() - 0.5) * 900, d: 1.3 + Math.random() * 0.8, w: Math.random() * 0.12,
      c: COLORS[i % COLORS.length], round: i % 4 === 0,
    };
  }));
  useLayoutEffect(() => {
    const r = from.current?.getBoundingClientRect();
    if (r) setAt({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  }, [from]);
  if (!at || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return null;
  return createPortal(
    <div className="confetti" style={{ left: at.x, top: at.y }} aria-hidden>
      {pieces.map((p, i) => (
        <i key={i} className={p.round ? "round" : undefined} style={{
          background: p.c, animationDuration: `${p.d}s`, animationDelay: `${p.w}s`,
          ["--x" as string]: `${p.x}px`, ["--up" as string]: `${p.up}px`, ["--y" as string]: `${p.y}px`, ["--r" as string]: `${p.r}deg`,
        }} />
      ))}
    </div>,
    document.body,
  );
}
