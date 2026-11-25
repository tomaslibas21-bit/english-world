export const padPopovers = new WeakMap<HTMLElement, { anchor: HTMLElement; close: () => void }>();

/** Let the lazy controller discover a visible body portal without watching the whole page. */
export function registerPadPopover(node: HTMLElement | null, anchor: HTMLElement | null, close: () => void) {
  if (!node || !anchor) return;
  const changed = () => document.dispatchEvent(new CustomEvent("padpopover", { detail: node }));
  padPopovers.set(node, { anchor, close });
  changed();
  return () => { padPopovers.delete(node); changed(); };
}
