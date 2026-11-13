# The loading screen

While the game loads, the learner sees the town's logo: a picture, the wordmark and a string of flags that wave
(the only "still loading" sign; there is no progress bar and no text).

- Maple Harbor: the lighthouse on its rock, two gulls and a maple leaf; "MAPLE HARBOR" over the "English World"
  wordmark; pennants. `src/ui/loadingArt.ts`.
- Puerto Colibrí: the hummingbird hovering before the sun; the "Puerto Colibrí" wordmark; papel picado.
  `src/editions/es/ui/loadingArt.ts` (on the Spanish edition's branch).

## How it gets on screen

1. `vite.config.ts` puts the edition's logo into `index.html` where the page says `<!--loading-->`
   (`tools/loading-screen.ts`), when the page is built or served. It is inline SVG with outlined lettering, so it
   shows before any script and waits for no font. Layout and the motion both towns share: `public/loading.css`;
   the picture's own motion is in a `<style>` inside the logo.
2. The game's script (`src/ui/Loading.tsx`) keeps the page's own markup and sets `--ew-t` to minus the time the
   logo has been up. Every animation's delay starts from `--ew-t`, so the logo arrives once (the sun or the sky
   pops in, the bird or the leaf comes, the words rise) and its loops carry on in step.
3. With `prefers-reduced-motion` the logo stands still.

4. The picture and the flags are stacks of layers, each the size of the drawing: a part that moves is an element
   of its own (an `<svg class="ew-layer">` or a `<div class="ew-layer">`), moved only by `transform` and
   `opacity`. A browser animates such elements off the main thread, so the wings keep beating while the game's
   script builds the town (that blocks the main thread for about a second on a fast computer and several on a
   phone). Chromium also does this for parts inside one SVG; Safari does not, hence the layers.

A new picture must keep to this: every `animation` rule gets `animation-delay: calc(var(--ew-t, 0s) + …)`, every
animated class is on a layer, lengths are percentages of the drawing, ids are unique, nothing is fetched
(tests/loading.test.ts).

## A course's way into the game

A course that sends the learner to the game through a page of its own (a route that checks access and forwards)
can show the same logo there, so the learner never sees a bare "opening the game" line:

- link the game's `loading.css`;
- draw `<div class="ew-loading" role="status" aria-label="…"><div class="ew-logo">…</div></div>` with the inner
  markup of `.ew-logo` taken from the exported game's `index.html` (keep a test that the two are the same);
- when it first draws the logo, store the time: `sessionStorage.setItem("ew-loading-began", String(Date.now()))`
  (`LOADING_BEGAN_KEY` in `tools/loading-screen.ts`).

The game's page reads that mark once (one line of script after the logo) and carries the animation on from there.
`.ew-loading-logo` and `brand/loading-wordmark.svg` (the bare "English World" wordmark) stay only for a course
page that has not moved to the logo yet.

## The outlines

The wordmarks are EB Garamond 600 and 500 italic, the small capitals Nunito 900 (both SIL Open Font License),
shaped with HarfBuzz (kerning as in the browser) and written as SVG paths at one decimal.
