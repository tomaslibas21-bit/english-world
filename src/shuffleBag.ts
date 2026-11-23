/** Draws each item once per cycle. At a refill, avoid an immediate repeat when there is a choice. */
export class ShuffleBag<T> {
  private remaining: T[] = [];
  private last?: T;

  constructor(private random: () => number = Math.random) {}

  take(items: readonly T[]): T | undefined {
    this.remaining = this.remaining.filter((item) => items.includes(item));
    if (!this.remaining.length) {
      this.remaining = [...items];
      for (let i = this.remaining.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [this.remaining[i], this.remaining[j]] = [this.remaining[j], this.remaining[i]];
      }
      const next = this.remaining.length - 1;
      if (next > 0 && this.remaining[next] === this.last) {
        [this.remaining[0], this.remaining[next]] = [this.remaining[next], this.remaining[0]];
      }
    }
    const item = this.remaining.pop();
    if (item !== undefined) this.last = item;
    return item;
  }
}
