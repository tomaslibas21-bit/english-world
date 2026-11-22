import { POOL_KIDS, type PoolKid } from "../world/pool";

export type Receiver = PoolKid | "learner";
export type BallHeight = "normal" | "high" | "fast";
export interface Flight {
  from: Receiver;
  to: Receiver;
  height: BallHeight;
  seconds: number;
  mine: boolean;
}

export const POOL_SECONDS = 90;
export const POOL_DROPS = 3;
export const SPLASH_SECONDS = 0.35;
const RESERVE_SECONDS = 1.8;

export function nextFlight(from: Receiver, random: () => number, learnerPlays: boolean): Flight {
  const kids = POOL_KIDS.filter((kid) => kid !== from);
  // A learner hit always goes to a kid. Two of every three kid hits go to the learner,
  // which makes about two of every five passes theirs over a continuous rally.
  const to = learnerPlays && from !== "learner" && random() < 2 / 3
    ? "learner" : kids[Math.min(kids.length - 1, Math.floor(random() * kids.length))];
  const variant = random();
  const height = learnerPlays && to === "learner" && variant < 0.2 ? "fast" : variant > 0.75 ? "high" : "normal";
  const seconds = learnerPlays ? height === "fast" ? 2.1 : height === "high" ? 2.95 : 2.55 : 3.1;
  return { from, to, height, seconds, mine: to !== "learner" && random() < 0.32 };
}

export function hitWindow(flight: Flight, touch: boolean) {
  const width = flight.height === "fast" ? (touch ? 0.5 : 0.4) : touch ? 0.75 : 0.6;
  return { start: flight.seconds - width, end: flight.seconds };
}

/** Drag eases the horizontal motion as the ball finishes its arc. */
export function flightPosition(flight: Flight, seconds: number) {
  const t = Math.max(0, Math.min(1, seconds / flight.seconds));
  const travel = 1 - (1 - t) ** 1.48;
  const apex = flight.height === "high" ? 1.55 : flight.height === "fast" ? 0.95 : 1.2;
  const arc = 1 - (1 - t) ** 1.75;
  return { travel, lift: 4 * apex * arc * (1 - arc) };
}

type Hit = { kind: "hit"; by: Receiver; record: boolean };
export type PoolEvent = Hit | { kind: "drop"; late: boolean } | { kind: "serve" } | { kind: "end" };
export type PoolPress = Hit | { kind: "wrong" | "early" | "late" | "ignored" };

export class PoolRound {
  phase: "rally" | "fall" | "reset" | "ended" = "rally";
  flight: Flight;
  elapsed = 0;
  phaseTime = 0;
  streak = 0;
  best = 0;
  learnerHits = 0;
  drops = 0;
  private late = false;
  private announcedRecord = false;

  constructor(private touch: boolean, private savedBest: number, private random = Math.random) {
    this.flight = this.serve();
  }

  private serve() {
    const kid = POOL_KIDS[Math.min(POOL_KIDS.length - 1, Math.floor(this.random() * POOL_KIDS.length))];
    return nextFlight(kid, this.random, true);
  }

  get canHit() {
    const { start, end } = hitWindow(this.flight, this.touch);
    return this.phase === "rally" && this.flight.to === "learner" && this.phaseTime >= start && this.phaseTime <= end;
  }

  press(): PoolPress {
    if (this.phase === "fall") {
      this.late = true;
      return { kind: "late" };
    }
    if (this.phase !== "rally") return { kind: "ignored" };
    if (this.flight.to !== "learner") return { kind: "wrong" };
    return this.canHit ? this.hit("learner") : { kind: "early" };
  }

  private hit(by: Receiver): Hit {
    this.streak++;
    this.best = Math.max(this.best, this.streak);
    if (by === "learner") this.learnerHits++;
    const record = !this.announcedRecord && this.streak >= 5 && this.streak > this.savedBest;
    if (record) this.announcedRecord = true;
    this.flight = nextFlight(by, this.random, true);
    this.phaseTime = 0;
    return { kind: "hit", by, record };
  }

  /** Advances to the next event. The caller supplies the regular game frame delta. */
  update(dt: number): PoolEvent | null {
    if (this.phase === "ended") return null;
    this.elapsed = Math.min(POOL_SECONDS, this.elapsed + dt);
    if (this.elapsed >= POOL_SECONDS) {
      this.phase = "ended";
      return { kind: "end" };
    }
    this.phaseTime += dt;
    switch (this.phase) {
      case "rally":
        if (this.phaseTime < this.flight.seconds) return null;
        if (this.flight.to !== "learner") return this.hit(this.flight.to);
        this.phase = "fall";
        this.phaseTime = 0;
        this.late = false;
        return null;
      case "fall":
        if (this.phaseTime < SPLASH_SECONDS) return null;
        this.drops++;
        this.streak = 0;
        this.phase = this.drops >= POOL_DROPS ? "ended" : "reset";
        this.phaseTime = 0;
        return { kind: "drop", late: this.late };
      case "reset":
        if (this.phaseTime < RESERVE_SECONDS) return null;
        this.flight = this.serve();
        this.phase = "rally";
        this.phaseTime = 0;
        return { kind: "serve" };
    }
  }
}
