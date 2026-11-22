// The 3D town's guide: a hint when the thing it is about first matters, one at a time, in a small card that never gets
// in the way (Guide.tsx draws it). How to walk as the town opens; how to talk the first time one stands by somebody;
// where the list of all situations is, the first time a later visit opens (the town opens by itself, without the list);
// the car, the boat and the sea the first time one comes up to them; the surf lesson as one first comes near its school; running, jumping and the radio after a stretch on
// foot. A hint goes when the learner does what it says, with "Gerai", or by itself after a while, and never comes
// back; "Daugiau nerodyti" ends them all. Everything they say stays under "Kaip žaisti?" (Panels.tsx Help).
// It waits while a conversation or a panel is open. What was shown is remembered with the progress.
import { useStore, type HudState } from "../state/store";
import { radio } from "../radio";

export type CoachStep = NonNullable<HudState["coach"]>["step"];
/** Every hint, in the order "Kaip žaisti?" lists them. */
export const COACH_STEPS: CoachStep[] = ["walk", "run", "jump", "talk", "list", "car", "boat", "water", "surf", "radio"];
/** How much of a hint's own doing ticks it off: metres walked, seconds at a run; once for the others. */
const ENOUGH: Partial<Record<CoachStep, number>> = { walk: 7, run: 1.2 };
/** A long stretch on foot without a run (s): the hint about running. */
const LONG_WALK = 6;
/** How far one has walked in the town (m) when jumping, and then the radio, come up. */
const JUMP_AFTER = 25, RADIO_AFTER = 120;
/** How long a hint stays if nothing is done about it (ms). */
const STAY = 25000;

class Coach {
  private done = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private remaining = 0;
  private deadline = 0;
  private walked = 0;
  private far = 0;
  private watching = false;

  private off() { return !!useStore.getState().progress.coach?.done; }
  private seen(step: CoachStep) {
    const c = useStore.getState().progress.coach;
    // (where the list is: also for whoever finished the guide of before 16 Nov 2026, when every visit opened with
    // the list. "Daugiau nerodyti" marks it seen with the rest.)
    if (step === "list") return !!c?.seen?.list;
    return !!c?.done || !!c?.seen?.[step] || (step === "run" && !!c?.run);
  }
  private mark(step: CoachStep) {
    useStore.getState().updateProgress((p) => { p.coach = { ...p.coach, seen: { ...p.coach?.seen, [step]: true }, ...(step === "run" ? { run: true } : {}) }; });
  }

  private stopTimer() {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.remaining = 0;
  }

  private startTimer() {
    if (!this.remaining || useStore.getState().hud.zoneBanner) return;
    this.deadline = Date.now() + this.remaining;
    this.timer = setTimeout(() => this.next(), this.remaining);
  }

  private timeHint(ms: number) {
    this.stopTimer();
    this.remaining = ms;
    this.startTimer();
  }

  /** The town opens: how to walk, the first time; the rest comes when it matters. `back`: a visit that opens where
   *  the learner left off, straight in the town (no flight, and no list of situations any more): once, where the
   *  list is. */
  begin(back = false) {
    this.stopTimer();
    this.walked = 0;
    this.far = 0;
    useStore.getState().setHud({ coach: null });
    this.watch();
    if (!this.cue("walk") && back) this.cue("list");
  }

  /** What the town itself shows: standing by somebody, by a car or a boat (the prompt), and taking the wheel, the
   *  helm or to the water. */
  private watch() {
    if (this.watching) return;
    this.watching = true;
    useStore.subscribe((s, prev) => {
      // The place name gets the screen first. A hint keeps its time, even if it was already ticked off.
      if (s.hud.zoneBanner && !prev.hud.zoneBanner && this.timer !== undefined) {
        this.remaining = Math.max(1, this.deadline - Date.now());
        clearTimeout(this.timer);
        this.timer = undefined;
      } else if (!s.hud.zoneBanner && prev.hud.zoneBanner) this.startTimer();
      if (s.hud.prompt?.kind !== prev.hud.prompt?.kind) this.near(s.hud.prompt?.kind);
      if (s.hud.panel === "scenarios" && prev.hud.panel !== "scenarios") this.did("list");
      if (s.hud.ride !== prev.hud.ride && s.hud.ride && s.hud.ride !== "taxi") this.did(s.hud.ride === "car" ? "car" : s.hud.ride === "boat" ? "boat" : s.hud.ride === "surf" ? "surf" : "water");
    });
  }
  private near(kind: NonNullable<HudState["prompt"]>["kind"] | undefined) {
    if (kind === "talk") this.cue("talk");
    else if (kind === "drive") this.cue("car");
    else if (kind === "boat") this.cue("boat");
    else if (kind === "surf") this.cue("surf");
  }

  /** `step` matters now: its hint, if it was never shown and no other is up. */
  cue(step: CoachStep): boolean {
    const st = useStore.getState();
    if (st.hud.coach || this.seen(step) || (step === "radio" && !radio.store.getState().available)) return false;
    this.done = 0;
    this.mark(step);
    st.setHud({ coach: { step, ok: false } });
    this.timeHint(STAY);
    return true;
  }

  /** The learner did what a hint is about: `amount` of it (metres, seconds, or 1). Done before its hint ever came up
   *  (a jump, a drive, a swim…), the hint is not needed any more. */
  did(what: CoachStep, amount = 1) {
    const c = useStore.getState().hud.coach;
    if (what === "walk") { this.far += amount; this.onFoot(); }
    if (!c || c.step !== what) {
      if (what !== "walk" && what !== "talk" && what !== "run" && !this.seen(what) && (what === "list" || !this.off())) this.mark(what);
      return;
    }
    if (c.ok) return;
    this.done += amount;
    if (this.done < (ENOUGH[what] ?? 1)) return;
    // a tick for a moment, then the card goes
    useStore.getState().setHud({ coach: { ...c, ok: true } });
    this.timeHint(1100);
  }

  /** After a stretch on foot: jumping, and later the radio. */
  private onFoot() {
    if (this.far >= JUMP_AFTER && !this.seen("jump")) this.cue("jump");
    else if (this.far >= RADIO_AFTER && !this.seen("radio")) this.cue("radio");
  }

  /** "Gerai", or the hint's time is up: the card goes; whatever else matters right now may come up. */
  next() {
    this.stopTimer();
    const st = useStore.getState();
    if (!st.hud.coach) return;
    st.setHud({ coach: null });
    this.near(st.hud.prompt?.kind);
  }

  /** "Daugiau nerodyti": no more hints, ever. */
  finish() {
    this.stopTimer();
    const st = useStore.getState();
    st.setHud({ coach: null });
    st.updateProgress((p) => { p.coach = { ...p.coach, done: true, seen: { ...p.coach?.seen, list: true } }; });
  }

  /** Walking on outdoors without running (`dt` s more of it; `stopped`: they stood still or ran): after a long
   *  stretch, once, the hint about running. */
  stroll(dt: number, stopped: boolean) {
    if (stopped) { this.walked = 0; return; }
    if (useStore.getState().hud.coach || this.seen("run")) return;
    if ((this.walked += dt) < LONG_WALK) return;
    this.walked = 0;
    this.cue("run");
  }
}

export const coach = new Coach();
