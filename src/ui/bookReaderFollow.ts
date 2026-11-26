type Box = Pick<DOMRect, "top" | "bottom" | "height">;
type Pane = Pick<HTMLElement, "scrollTop" | "scrollHeight" | "clientHeight" | "getBoundingClientRect"> & { scrollTo(options: ScrollToOptions): void };

export function readerScrollTop(pane: Box, line: Box, top: number): number {
  if (line.height > pane.height - 16 || line.top < pane.top + 8) return top + line.top - pane.top - 8;
  if (line.bottom > pane.bottom - 8) return top + line.bottom - pane.bottom + 8;
  return top;
}

/** Own scrolls carry an expected position. Every other scroll releases sentence following. */
export class ReaderFollow {
  following = true;
  private expected: number | null = null;

  suspend() { this.following = false; this.expected = null; }
  rejoin() { this.following = true; }

  scrolled(top: number) {
    if (this.expected !== null && Math.abs(this.expected - top) <= 1) this.expected = null;
    else this.suspend();
    return this.following;
  }

  move(pane: Pane, line: Pick<HTMLElement, "getBoundingClientRect">) {
    if (!this.following) return;
    const desired = readerScrollTop(pane.getBoundingClientRect(), line.getBoundingClientRect(), pane.scrollTop);
    const top = Math.max(0, Math.min(pane.scrollHeight - pane.clientHeight, desired));
    if (Math.abs(pane.scrollTop - top) <= 1) return;
    this.expected = top;
    pane.scrollTo({ top, behavior: "instant" });
  }
}
