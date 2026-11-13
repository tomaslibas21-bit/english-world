// The loading screen in index.html: the edition's logo (src/ui/loadingArt.ts) goes where the page says <!--loading-->,
// when Vite builds or serves the page, so it is on screen before any JavaScript. Loading.tsx keeps showing the same
// markup afterwards; public/loading.css has its layout and motion.

/** Where a page that showed the same logo just before this one (the course's way into the game) leaves the moment
 *  its logo began, in sessionStorage, as epoch milliseconds. */
export const LOADING_BEGAN_KEY = "ew-loading-began";

// One line of script right after the logo: if the page before this one was already showing it, carry on from there
// (--ew-t, public/loading.css) instead of letting the logo arrive a second time. Read once, then forgotten.
const CARRY_ON = `<script>(function(){try{var k="${LOADING_BEGAN_KEY}",b=+sessionStorage.getItem(k),d=Date.now()-b;sessionStorage.removeItem(k);if(b&&d>0&&d<20000)document.currentScript.previousElementSibling.style.setProperty("--ew-t",-d+"ms")}catch(e){}})()</script>`;

/** The loading screen's markup: `label` is what a screen reader hears, `art` the logo. */
export function loadingMarkup(label: string, art: string): string {
  return `<div class="loading ew-loading" role="status" aria-label="${label}"><div class="ew-logo">${art}</div></div>${CARRY_ON}`;
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
