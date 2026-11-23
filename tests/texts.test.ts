import { afterEach, describe, expect, it, vi } from "vitest";
import { TEXT_THREADS } from "../src/content/texts";
import { audio } from "../src/game/audio";
import { TownPhone } from "../src/game/phone/Phone";
import type { PhoneSnapshot } from "../src/game/phone/schedule";
import { canDeliverText, eligibleText, localDay, nextText, queueTexts, textsInRoute } from "../src/game/phone/texts";
import { emptyProgress, sitProgress } from "../src/state/progress";
import { useStore } from "../src/state/store";

const [dinner, neighbor, pool] = TEXT_THREADS;
const visibleTown: PhoneSnapshot = {
  town: true, onFoot: true, grounded: true, visible: true, enabled: true, conversation: false, panel: false, dialog: false,
  guide: false, banner: false, cardOpen: false, flight: false, loading: false, transition: false, mode: false,
};
const timers = { enabled: true, active: 180, calm: 45, sinceCall: 60, sinceText: 1800 };
const day = "2026-11-23";
const mark = (p: ReturnType<typeof emptyProgress>, id: string) => { p.sits[id] = { ...sitProgress(p, id), completions: 1 }; };

describe("town text eligibility", () => {
  it("migrates already completed conversations once and records new completion times", () => {
    const p = emptyProgress();
    mark(p, dinner.after);
    p.texts = queueTexts(TEXT_THREADS, p, day, 1200);
    expect(p.texts.pending[dinner.id]).toEqual({ day: "", played: 0 });
    expect(nextText(TEXT_THREADS, p.texts, day, 0, new Set())).toBe(dinner);
    mark(p, pool.after);
    p.texts = queueTexts(TEXT_THREADS, p, day, 1220);
    expect(p.texts.pending[pool.id]).toEqual({ day, played: 1220 });
    expect(queueTexts(TEXT_THREADS, p, "2026-11-24", 1500)).toBe(p.texts);
  });

  it("waits 480 free-walking seconds or a later session for later, and a later local date for nextDay", () => {
    const pending = { day, played: 300 };
    expect(eligibleText(pool, pending, day, 779.99, false)).toBe(false);
    expect(eligibleText(pool, pending, day, 780, false)).toBe(true);
    expect(eligibleText(pool, pending, day, 300, true)).toBe(true);
    expect(eligibleText(dinner, pending, day, 6000, true)).toBe(false);
    expect(eligibleText(dinner, pending, "2026-11-24", 300, false)).toBe(true);
    expect(eligibleText(dinner, { day: "", played: 0 }, day, 0, false)).toBe(true);
    expect(localDay(new Date(2026, 10, 23, 23, 59))).toBe(day);
  });

  it("picks pending texts in chapter and order and leaves already delivered texts alone", () => {
    const ordered = textsInRoute([dinner, pool, neighbor], [
      { id: dinner.after, chapter: 8, order: 5 }, { id: pool.after, chapter: 9, order: 1 }, { id: neighbor.after, chapter: 8, order: 2 },
    ]);
    const p = emptyProgress();
    for (const thread of ordered) mark(p, thread.after);
    p.texts = queueTexts(ordered, p, day, 0);
    expect(nextText(ordered, p.texts, day, 0, new Set())).toBe(neighbor);
    p.texts.got[neighbor.id] = { at: 1, read: true, reply: 0 };
    expect(nextText(ordered, p.texts, day, 0, new Set())).toBe(dinner);
  });

  it("requires calm, walking time, time since the previous text and call, and the setting", () => {
    expect(canDeliverText(visibleTown, timers)).toBe(true);
    for (const t of [{ active: 179.9 }, { calm: 44.9 }, { sinceText: 1799.9 }, { sinceCall: 59.9 }, { enabled: false }]) {
      expect(canDeliverText(visibleTown, { ...timers, ...t })).toBe(false);
    }
    const forced = { ...timers, force: true, active: 0, calm: 0, sinceText: 0 };
    expect(canDeliverText(visibleTown, forced)).toBe(true);
    expect(canDeliverText(visibleTown, { ...forced, sinceCall: 59 })).toBe(false);
    expect(canDeliverText(visibleTown, { ...forced, enabled: false })).toBe(false);
    for (const guard of [{ town: false }, { grounded: false }, { conversation: true }, { cardOpen: true }, { visible: false }, { panel: true }, { mode: true }]) {
      expect(canDeliverText({ ...visibleTown, ...guard }, forced)).toBe(false);
    }
  });
});

describe("texts and calls share the handset", () => {
  afterEach(() => {
    useStore.setState(useStore.getInitialState());
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("leaves 60 seconds clear on both sides of a text and allows a second after 30 more minutes", () => {
    vi.stubGlobal("navigator", { vibrate: vi.fn() });
    vi.spyOn(audio, "sfx").mockImplementation(() => {});
    vi.spyOn(audio, "phoneAlert").mockImplementation(() => undefined);
    const progress = emptyProgress();
    for (const id of ["s63-party", dinner.after, neighbor.after]) mark(progress, id);
    useStore.setState({ progress });
    const phone = new TownPhone();
    phone.dueNow();
    phone.tick(0, visibleTown);
    expect(useStore.getState().hud.phoneCard).toBeTruthy();
    phone.texts.dueNow();
    phone.tick(5, visibleTown);
    phone.dismiss();
    phone.tick(59, visibleTown);
    expect(phone.textsState().sessionCount).toBe(0);
    phone.tick(1, visibleTown);
    expect(phone.textsState().sessionCount).toBe(1);
    expect(audio.sfx).toHaveBeenCalledWith("message");

    phone.dueNow();
    phone.tick(8, visibleTown);
    expect(useStore.getState().hud.textArrival).toBeNull();
    phone.tick(59, visibleTown);
    expect(useStore.getState().hud.phoneCard).toBeNull();
    phone.tick(1, visibleTown);
    expect(useStore.getState().hud.phoneCard).toBeTruthy();
    phone.dismiss();

    const textsOnly = { ...visibleTown, enabled: false };
    phone.tick(1731, textsOnly);
    expect(phone.textsState().sessionCount).toBe(1);
    phone.tick(1, textsOnly);
    expect(phone.textsState().sessionCount).toBe(2);
  });
});
