import type { PhoneSnapshot } from "../phone/schedule";
import { freeToWalk } from "../phone/schedule";
import type { StreetMeeting, StreetMemory } from "./memory";
import type { StreetCast, StreetChatter, StreetMoment, StreetScript } from "./types";

export const STREET_WAIT = {
  first: [120, 180], between: [240, 420], calm: 30, retry: 15, phone: 10,
  chatter: [60, 120], lightChatter: 180, answer: 25,
} as const;
export const STREET_SESSION_CAP = 4;

export interface StreetSnapshot extends PhoneSnapshot {
  outdoors: boolean;
  light?: boolean;
}

export interface StreetClock {
  clock: number;
  due: number;
  calm: number;
  sessionCount: number;
}

export const randomWait = ([min, max]: readonly [number, number], rand: () => number) => min + (max - min) * rand();

export function newStreetClock(rand: () => number): StreetClock {
  return { clock: 0, due: randomWait(STREET_WAIT.first, rand), calm: STREET_WAIT.calm, sessionCount: 0 };
}

export function streetFree(snapshot: StreetSnapshot) {
  return snapshot.visible && streetContext(snapshot) && !snapshot.cardOpen && (snapshot.light || freeToWalk(snapshot));
}

export function streetContext(snapshot: StreetSnapshot) {
  return snapshot.town && snapshot.outdoors && snapshot.onFoot && !snapshot.conversation
    && !snapshot.mode && !snapshot.flight && !snapshot.loading && !snapshot.transition;
}

export function tickStreetClock(clock: StreetClock, dt: number, snapshot: StreetSnapshot): StreetClock {
  if (snapshot.conversation || snapshot.mode || !snapshot.onFoot) {
    return clock.calm === 0 ? clock : { ...clock, calm: 0 };
  }
  if (!streetFree(snapshot) || dt <= 0) return clock;
  return { ...clock, clock: clock.clock + dt, calm: Math.min(STREET_WAIT.calm, clock.calm + dt) };
}

export function momentDue(clock: StreetClock) {
  return clock.sessionCount < STREET_SESSION_CAP && clock.clock >= clock.due && clock.calm >= STREET_WAIT.calm;
}

export function reschedule(clock: StreetClock, started: boolean, rand: () => number): StreetClock {
  return { ...clock, due: clock.clock + (started ? randomWait(STREET_WAIT.between, rand) : STREET_WAIT.retry) };
}

type ScriptName = "first" | "second" | "familiar";
export interface MomentDraw {
  moment: StreetMoment;
  cast: StreetCast;
  script: StreetScript;
  scriptName: ScriptName;
  bag: string[];
}

function currentBag(ids: string[], saved: readonly string[]) {
  const remaining = [...new Set(saved)].filter((id) => ids.includes(id));
  return remaining.length ? remaining : ids;
}

function choose<T>(options: T[], rand: () => number) {
  return options.length ? options[Math.min(options.length - 1, Math.floor(rand() * options.length))] : undefined;
}

export function selectScript(moment: StreetMoment, entry?: StreetMeeting, remembered?: string, forced?: string) {
  const cast = forced ? moment.cast.find(({ id }) => id === forced)
    : moment.kind === "arc" ? moment.cast.find(({ id }) => id === remembered)
      : moment.kind === "regular" ? moment.cast[(entry?.seen ?? 0) % moment.cast.length]
        : moment.cast.reduce<StreetCast | undefined>((least, candidate) => {
          const count = (id: string) => entry?.cast?.[id] ?? 0;
          return !least || count(candidate.id) < count(least.id) ? candidate : least;
        }, undefined);
  if (!cast) return undefined;
  const seen = moment.kind === "arc" ? 0 : moment.kind === "regular" ? entry?.seen ?? 0 : entry?.cast?.[cast.id] ?? 0;
  const scriptName: ScriptName = seen >= 2 && moment.familiar ? "familiar" : seen >= 1 && moment.second ? "second" : "first";
  return { moment, cast, script: moment[scriptName]!, scriptName };
}

export function drawMoment(moments: readonly StreetMoment[], memory: StreetMemory, day: string, rand: () => number,
  fits: (draw: Omit<MomentDraw, "bag">) => boolean, dev?: { id?: string; cast?: string }): MomentDraw | undefined {
  const bag = currentBag(moments.filter(({ kind }) => kind !== "arc").map(({ id }) => id), memory.bag);
  const arcs: MomentDraw[] = [], ordinary: MomentDraw[] = [];
  for (const moment of moments) {
    if (dev?.id && dev.id !== moment.id) continue;
    const entry = memory.moments[moment.id];
    let remembered: string | undefined;
    if (moment.kind === "arc") {
      const after = moment.after;
      const earlier = after && memory.moments[after.id];
      if (!dev?.id && (!after || !earlier || entry?.seen)) continue;
      if (after?.helped) {
        if (!dev?.id && (!earlier?.helped || !earlier.helpedDay || earlier.helpedDay >= day)) continue;
        remembered = earlier?.helpedCast;
      } else {
        if (!dev?.id && (after?.seen === undefined || (earlier?.seen ?? 0) < after.seen)) continue;
        remembered = moment.cast[0]?.id;
      }
      if (dev?.id) remembered ??= moment.cast[0]?.id;
    } else if ((!dev?.id && !bag.includes(moment.id)) || (!dev && entry?.last === day)) continue;

    const drawn = selectScript(moment, entry, remembered, dev?.cast);
    if (!drawn) continue;
    (moment.kind === "arc" ? arcs : ordinary).push({ ...drawn, bag });
  }
  for (const group of [arcs, ordinary]) {
    while (group.length) {
      const draw = choose(group, rand)!;
      if (fits(draw)) return draw;
      group.splice(group.indexOf(draw), 1);
    }
  }
  return undefined;
}

export function drawChatter(chatters: readonly StreetChatter[], saved: string[], rand: () => number,
  near?: StreetChatter["near"], devId?: string, anywhere = false) {
  const bag = currentBag(chatters.map(({ id }) => id), saved);
  const ready = chatters.filter((item) => devId ? item.id === devId : bag.includes(item.id) && (anywhere || !item.near || item.near === near));
  const local = !devId && near ? ready.filter((item) => item.near === near) : [];
  const chatter = choose(local.length ? local : ready, rand);
  return chatter && { chatter, bag: bag.filter((id) => id !== chatter.id) };
}
