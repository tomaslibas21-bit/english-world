// The loading screen in index.html: the edition's logo (src/ui/loadingArt.ts) goes where the page says <!--loading-->,
// when Vite builds or serves the page, so it is on screen before any JavaScript. Loading.tsx keeps showing the same
// markup afterwards; public/loading.css has its layout and motion.

/** The loading screen's markup: `label` is what a screen reader hears, `art` the logo. */
export function loadingMarkup(label: string, art: string): string {
  return `<div class="loading ew-loading" role="status" aria-label="${label}"><div class="ew-logo">${art}</div></div>`;
}

/** The Vite plugin. */
export function loadingScreen(label: string, art: string) {
  return {
    name: "loading-screen",
    transformIndexHtml(html: string): string {
      if (!html.includes("<!--loading-->")) throw new Error("index.html has no <!--loading--> for the loading screen");
      // a function, so a "$" in the art is not read as a replacement pattern
      return html.replace("<!--loading-->", () => loadingMarkup(label, art));
    },
  };
}
