import { useState, type CSSProperties } from "react";

// The logo is already on the page when the game's script starts (index.html, put there by vite.config.ts from
// src/ui/loadingArt.ts). Keep its markup, and the moment its animations began, before React clears the page.
const FIRST = typeof document === "undefined" ? null : document.querySelector(".ew-loading");
const ART = FIRST?.querySelector(".ew-logo")?.innerHTML ?? "";
const BEGAN = began(FIRST);

/** When the logo on the page began moving (performance.now()'s clock): now, less its longest-running animation. */
function began(el: Element | null): number {
  if (typeof performance === "undefined") return 0;
  let run = 0;
  try {
    for (const a of el?.getAnimations?.({ subtree: true }) ?? []) run = Math.max(run, Number(a.currentTime) || 0);
  } catch { /* an old browser: the logo arrives again, once */ }
  return performance.now() - run;
}

/** The same logo as on the static page (index.html), so booting React and loading the town share one screen: the
 *  markup is the page's own, and --ew-t tells its animations how long the logo has been up already
 *  (public/loading.css), so it does not arrive a second time and its loops carry on in step. */
export function Loading() {
  const [t] = useState(() => `${-Math.round(performance.now() - BEGAN)}ms`);
  return (
    <div className="loading ew-loading" role="status" aria-label="Kraunamas „English World“" style={{ "--ew-t": t } as CSSProperties}>
      <div className="ew-logo" dangerouslySetInnerHTML={{ __html: ART }} />
    </div>
  );
}
