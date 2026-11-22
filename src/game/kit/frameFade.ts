// The scene changes at full opacity. Both ramps and the hold advance with the game clock.
const RAMP = 0.3;
const HOLD = 0.12;

export class FrameFade {
  private fade: { time: number; swap?: () => void } | null = null;

  constructor(private opacity: (value: number) => void) {}

  get active() { return this.fade !== null; }

  start(swap: () => void) {
    this.fade = { time: 0, swap };
    this.opacity(0);
  }

  update(dt: number) {
    const fade = this.fade;
    if (!fade) return;
    fade.time += dt;
    if (fade.swap && fade.time >= RAMP) {
      this.opacity(1);
      const swap = fade.swap;
      fade.swap = undefined;
      swap();
      return;
    }
    if (fade.time >= 2 * RAMP + HOLD) {
      this.clear();
      return;
    }
    this.opacity(Math.min(1, fade.time / RAMP, (2 * RAMP + HOLD - fade.time) / RAMP));
  }

  clear() {
    if (!this.fade) return;
    this.fade = null;
    this.opacity(0);
  }
}
