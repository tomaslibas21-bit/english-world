// The first-time guide of the 3D town: a few hints, one at a time, in a small card that never gets in the way (Guide.tsx
// draws it): walk, run, jump, talk, the radio, and the choice between pictures and the 3D town for conversations. Each
// hint moves on when the learner does what it says, or with "Toliau"; "Praleisti" ends them all. It waits while a
// conversation or a panel is open, and once finished or skipped it is remembered with the progress and never comes back.
// Also the one-time tip about running, for someone walking a long stretch after the guide.
import { useStore } from "../state/store";
import { radio } from "../radio";

export type CoachStep = "walk" | "run" | "jump" | "talk" | "radio" | "scenes";
const ORDER: CoachStep[] = ["walk", "run", "jump", "talk", "radio", "scenes"];
/** How much of a step's own doing finishes it: metres walked, seconds at a run, one jump, one conversation. */
const ENOUGH: Partial<Record<CoachStep, number>> = { walk: 7, run: 1.2, jump: 1, talk: 1, radio: 1 };
/** A long stretch on foot without a run (s): the tip about running. */
const LONG_WALK = 6;

class Coach {
  private done = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private walked = 0;
  private toldRun = false;

  private steps(): CoachStep[] {
    return ORDER.filter((s) => s !== "radio" || radio.store.getState().available);
  }

  /** Starts the guide the first time the town opens (not again once it was finished or skipped). */
  begin() {
    const st = useStore.getState();
    clearTimeout(this.timer);
    this.walked = 0;
    this.toldRun = false;
    if (st.progress.coach?.done) { st.setHud({ coach: null }); return; }
    this.show(0);
  }

  private show(i: number) {
    const steps = this.steps();
    if (i >= steps.length) { this.finish(); return; }
    this.done = 0;
    if (steps[i] === "run") this.toldRun = true;
    useStore.getState().setHud({ coach: { step: steps[i], n: i + 1, of: steps.length, ok: false } });
  }

  /** The learner did what a hint is about: `amount` of it (metres, seconds, or 1). */
  did(what: CoachStep, amount = 1) {
    const c = useStore.getState().hud.coach;
    if (!c || c.step !== what || c.ok) return;
    this.done += amount;
    if (this.done < (ENOUGH[what] ?? 1)) return;
    // a tick for a moment, then the next hint
    useStore.getState().setHud({ coach: { ...c, ok: true } });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.next(), 1100);
  }

  next() {
    clearTimeout(this.timer);
    const c = useStore.getState().hud.coach;
    if (!c) return;
    this.show(this.steps().indexOf(c.step) + 1);
  }

  /** "Praleisti", or the last hint's "Baigti": remembered, never shown again. */
  finish() {
    clearTimeout(this.timer);
    const st = useStore.getState();
    st.setHud({ coach: null });
    // (if they got as far as the hint about running, no tip about it later)
    const told = this.toldRun;
    st.updateProgress((p) => { p.coach = { ...p.coach, done: true, ...(told ? { run: true } : {}) }; });
  }

  /** Walking on outdoors without running (`dt` s more of it; `stopped`: they stood still or ran): after a long
   *  stretch, once, the tip about running. */
  stroll(dt: number, stopped: boolean, touch: boolean) {
    if (stopped) { this.walked = 0; return; }
    const st = useStore.getState();
    if (st.hud.coach || st.progress.coach?.run) return;
    if ((this.walked += dt) < LONG_WALK) return;
    this.walked = 0;
    st.updateProgress((p) => { p.coach = { ...p.coach, run: true }; });
    st.toast({ kind: "tip", title: touch ? "Patrauk vairalazdę iki krašto – bėgsi." : "Laikyk Shift – bėgsi.", ms: 8000 });
  }
}

export const coach = new Coach();
