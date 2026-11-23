import { describe, expect, it } from "vitest";
import { STREET_CHATTER, STREET_MOMENTS } from "../src/content/street";
import { coachVoice } from "../src/content/voices";
import { setVariety } from "../src/convo/compose";
import { EDITION } from "../src/edition";
import { learnerTurn } from "../src/game/kit/lines";
import { resolveStreetLine, streetSpeechTexts, streetText, streetVoice } from "../src/game/street/lines";
import { emptyStreet, localStreetDay, recordHelp, recordStart, type StreetMemory } from "../src/game/street/memory";
import { makeStreetProp, disposeStreetGeometry, STREET_PROPS } from "../src/game/street/props";
import {
  drawChatter, drawMoment, momentDue, newStreetClock, reschedule, selectScript, tickStreetClock,
  STREET_SESSION_CAP, type MomentDraw, type StreetSnapshot,
} from "../src/game/street/schedule";
import type { StreetChatter, StreetLine, StreetMoment } from "../src/game/street/types";
import { canShowPhoneCard } from "../src/game/phone/schedule";

const rand = () => 0;
const day = "2026-11-23", tomorrow = "2026-11-24";
const free: StreetSnapshot = {
  town: true, outdoors: true, visible: true, onFoot: true, grounded: true, enabled: true,
  conversation: false, panel: false, dialog: false, guide: false, banner: false, cardOpen: false,
  flight: false, loading: false, transition: false, mode: false,
};
const placeAvailable = () => true;
const greet = { en: "Hello.", lt: "Labas." };
const first = { choices: [{ say: greet }] };
const second = { choices: [{ say: greet }], reply: [greet] };
const familiar = { open: [greet], choices: [{ say: greet }] };
const cast = [
  { id: "a", gender: "m", age: "adult", role: "Praeivis", voice: "st_m_adult" },
  { id: "b", gender: "f", age: "adult", role: "Praeivė", voice: "st_f_adult" },
  { id: "c", gender: "f", age: "adult", role: "Praeivė", voice: "st_f_adult" },
] as const;
const dropped: StreetMoment = { id: "drop-fixture", kind: "incident", cast: [...cast], first, second, familiar };
const musician: StreetMoment = { id: "regular-fixture", kind: "regular", cast: cast.slice(0, 2), first, second, familiar };
const coffee: StreetMoment = { id: "helped-fixture", kind: "arc", cast: [...cast], first, after: { id: dropped.id, helped: true } };
const song: StreetMoment = { id: "seen-fixture", kind: "arc", cast: [cast[0]], first, after: { id: musician.id, seen: 2 } };
const start = (memory: StreetMemory, draw: MomentDraw, date: string) => {
  recordStart(memory, draw.moment.id, draw.cast.id, date, draw.bag);
};

describe("street pacing", () => {
  it("paces the first moment and the time between moments within their windows", () => {
    const first = newStreetClock(rand);
    expect(first.due).toBe(120);
    expect(newStreetClock(() => 1).due).toBe(180);
    expect(momentDue(tickStreetClock(first, 119.9, free))).toBe(false);
    const reached = tickStreetClock(first, 120, free);
    expect(momentDue(reached)).toBe(true);
    expect(reschedule(reached, true, rand).due - reached.clock).toBe(240);
    expect(reschedule(reached, true, () => 1).due - reached.clock).toBe(420);
    expect(reschedule(reached, false, rand).due - reached.clock).toBe(15);
  });

  it("counts only visible free walking and applies a 30-second calm period after interrupted walks", () => {
    const clock = tickStreetClock(newStreetClock(rand), 114, free);
    const blocked: Partial<StreetSnapshot>[] = [
      { conversation: true }, { mode: true }, { outdoors: false }, { onFoot: false },
      { flight: true }, { transition: true }, { loading: true }, { grounded: false },
      { town: false }, { visible: false }, { cardOpen: true }, { panel: true }, { dialog: true },
    ];
    for (const patch of blocked) expect(tickStreetClock(clock, 99, { ...free, ...patch }).clock).toBe(114);
    for (const patch of [{ conversation: true }, { mode: true }, { onFoot: false }]) {
      const interrupted = tickStreetClock(clock, 85, { ...free, ...patch });
      expect(momentDue(tickStreetClock(interrupted, 29.9, free))).toBe(false);
      expect(momentDue(tickStreetClock(interrupted, 30, free))).toBe(true);
    }
  });

  it("counts unobstructed light-mode app time through panels and pauses during conversation", () => {
    const light = { ...free, light: true, panel: true };
    const clock = tickStreetClock(newStreetClock(rand), 120, light);
    expect(momentDue(clock)).toBe(true);
    expect(tickStreetClock(clock, 40, { ...light, conversation: true })).toMatchObject({ clock: 120, calm: 0 });
    expect(tickStreetClock(clock, 40, { ...light, visible: false }).clock).toBe(120);
  });

  it("caps sessions at four moments and blocks a due phone card while the street has priority", () => {
    const due = tickStreetClock(newStreetClock(rand), 180, free);
    expect(STREET_SESSION_CAP).toBe(4);
    expect(momentDue({ ...due, sessionCount: 3 })).toBe(true);
    expect(momentDue({ ...due, sessionCount: 4 })).toBe(false);
    const phone = { active: 500, calm: 30, sinceCard: 500 };
    expect(canShowPhoneCard(free, phone)).toBe(true);
    expect(canShowPhoneCard({ ...free, streetBlocked: true }, phone)).toBe(false);
  });
});

describe("the shuffle bags and street memory", () => {
  it("draws every ordinary moment once before repeating, including across reloaded saves", () => {
    const moments = [musician, dropped];
    let memory = emptyStreet();
    const first = drawMoment(moments, memory, day, rand, placeAvailable)!;
    expect(first.moment.id).toBe(musician.id);
    start(memory, first, day);
    memory = JSON.parse(JSON.stringify(memory));
    expect(memory.bag).toEqual([dropped.id]);
    const second = drawMoment(moments, memory, tomorrow, rand, placeAvailable)!;
    expect(second.moment.id).toBe(dropped.id);
    start(memory, second, tomorrow);
    expect(memory.bag).toEqual([]);
    expect(drawMoment(moments, memory, tomorrow, rand, placeAvailable)?.moment.id).toBe(musician.id);
  });

  it("suppresses a second appearance in a local day and retries the same bag when no spot fits", () => {
    const memory = emptyStreet();
    const date = localStreetDay(new Date(2026, 10, 23, 23, 59));
    expect(date).toBe(day);
    const first = drawMoment([dropped], memory, date, rand, placeAvailable)!;
    start(memory, first, date);
    expect(drawMoment([dropped], memory, day, rand, placeAvailable)).toBeUndefined();
    expect(drawMoment([dropped], memory, tomorrow, rand, () => false)).toBeUndefined();
    expect(drawMoment([dropped], memory, tomorrow, rand, placeAvailable)?.cast.id).toBe("b");
    expect(drawMoment([dropped], memory, day, rand, placeAvailable, { id: dropped.id, cast: "a" })?.scriptName).toBe("second");
  });

  it("selects a regular's script and prop by the number of meetings, with fallbacks", () => {
    expect(selectScript(musician)?.scriptName).toBe("first");
    expect(selectScript(musician, { seen: 1, helped: 0 })).toMatchObject({ scriptName: "second", cast: { id: "b" } });
    expect(selectScript(musician, { seen: 2, helped: 0 })).toMatchObject({ scriptName: "familiar", cast: { id: "a" } });
    expect(selectScript({ ...musician, familiar: undefined }, { seen: 9, helped: 0 })?.scriptName).toBe("second");
  });

  it("rotates incident cast by fewest meetings and applies callbacks per cast member", () => {
    const entry = { seen: 2, helped: 0, cast: { a: 1, b: 1 } };
    expect(selectScript(dropped, entry)).toMatchObject({ scriptName: "first", cast: { id: "c" } });
    expect(selectScript(dropped, { ...entry, cast: { a: 1, b: 1, c: 1 } })).toMatchObject({ scriptName: "second", cast: { id: "a" } });
    expect(selectScript(dropped, { ...entry, cast: { a: 3, b: 2, c: 2 } })).toMatchObject({ scriptName: "familiar", cast: { id: "b" } });
  });

  it("draws a helped arc the next day, before the bag, once and with the same person", () => {
    const memory = emptyStreet();
    recordStart(memory, dropped.id, "c", day, [musician.id, dropped.id]);
    recordHelp(memory, dropped.id, "c", day);
    const moments = [musician, dropped, coffee];
    expect(drawMoment(moments, memory, day, rand, placeAvailable)?.moment.id).toBe(musician.id);
    const arc = drawMoment(moments, memory, tomorrow, rand, placeAvailable)!;
    expect(arc).toMatchObject({ moment: { id: coffee.id }, cast: { id: "c" }, scriptName: "first" });
    start(memory, arc, tomorrow);
    expect(memory.bag).toEqual([musician.id]);
    expect(drawMoment(moments, memory, tomorrow, rand, placeAvailable)?.moment.id).toBe(musician.id);
  });

  it("draws a seen arc as soon as the regular reaches its meeting threshold", () => {
    const memory = emptyStreet();
    recordStart(memory, musician.id, "a", day, []);
    expect(drawMoment([song], memory, day, rand, placeAvailable)).toBeUndefined();
    recordStart(memory, musician.id, "b", tomorrow, []);
    expect(drawMoment([song], memory, tomorrow, rand, placeAvailable)?.cast.id).toBe("a");
  });

  it("passes a failed place check over in the same draw and preserves that id for later", () => {
    const water: StreetMoment = { ...dropped, near: "water" };
    const memory = emptyStreet();
    const next = drawMoment([water, musician], memory, day, rand, ({ moment }) => !moment.near)!;
    expect(next.moment).toBe(musician);
    start(memory, next, day);
    expect(memory.bag).toEqual([water.id]);
    expect(drawMoment([water, musician], memory, day, rand, placeAvailable)?.moment).toBe(water);
  });

  it("draws eligible chatter from its own persisted bag with local priority and refill", () => {
    const line = { en: "Hello.", lt: "Labas." };
    const chatters: StreetChatter[] = [
      { id: "cafe", near: "cafe", lines: [line, line] },
      { id: "square", near: "square", lines: [line, line] },
      { id: "any-1", lines: [line, line] },
      { id: "any-2", lines: [line, line] },
    ];
    const memory = emptyStreet();
    const seen = new Set<string>();
    const locations = ["cafe", "square", undefined, undefined] as const;
    for (const near of locations) {
      const draw = drawChatter(chatters, memory.chatterBag, rand, near)!;
      expect(seen.has(draw.chatter.id)).toBe(false);
      expect(draw.chatter.near).toBe(near);
      seen.add(draw.chatter.id);
      memory.chatterBag = JSON.parse(JSON.stringify(draw.bag));
    }
    expect(memory.chatterBag).toEqual([]);
    expect(drawChatter(chatters, memory.chatterBag, rand, "cafe")?.chatter.id).toBe("cafe");
    expect(drawChatter(chatters, ["cafe"], rand, "water")).toBeUndefined();
  });
});

describe("street content", () => {
  it("uses unique IDs, valid arc casts, known props and voice ids, and complete translated scripts", () => {
    const ids = [...STREET_MOMENTS, ...STREET_CHATTER].map(({ id }) => id);
    expect(ids).toContain(EDITION.id === "es" ? "r_trovador" : "r_musician");
    expect(new Set(ids).size).toBe(ids.length);
    for (const moment of STREET_MOMENTS) {
      const cast = moment.cast.map(({ id }) => id);
      expect(new Set(cast).size, moment.id).toBe(cast.length);
      if (moment.kind === "arc") {
        const origin = STREET_MOMENTS.find(({ id }) => id === moment.after?.id)!;
        expect(origin, moment.id).toBeDefined();
        if (moment.after?.helped) expect([...cast].sort()).toEqual(origin.cast.map(({ id }) => id).sort());
        else {
          expect(cast).toHaveLength(1);
          expect(origin.cast.map(({ id }) => id)).toContain(cast[0]);
        }
      } else expect([2, 3]).toContain(cast.length);
      for (const member of moment.cast) {
        expect(member.voice).toMatch(/^st_\w+$/);
        checkText(member.role);
        if (member.name) checkText(member.name);
        if (member.prop) expect(STREET_PROPS, moment.id).toContain(member.prop);
      }
      for (const script of [moment.first, moment.second, moment.familiar]) {
        if (!script) continue;
        checkScript(script, cast);
        if (script.then) checkScript(script.then, cast);
      }
    }
    for (const { lines } of STREET_CHATTER) {
      expect(lines).toHaveLength(2);
      checkScript(lines, []);
    }
  });

  it("builds every non-dog prop with vertex colors", () => {
    for (const id of STREET_PROPS.filter((name) => name !== "dog")) {
      const prop = makeStreetProp(id);
      expect(prop.children, id).toHaveLength(1);
      expect(prop.children[0]).toHaveProperty("geometry.attributes.color");
      disposeStreetGeometry(prop);
    }
  });

  it("uses the saved variety for text and voice and accepts the other twins for speech", () => {
    const line: StreetLine = {
      en: "{m:Buenos días|f:Buenas tardes}", lt: "{nm:antras|nf:antra}", neutral: "Hasta mañana", spain: "Vale",
    };
    try {
      for (const [variety, text, prefix] of [
        ["default", "Buenas tardes", "es"], ["neutral", "Hasta mañana", "esn"], ["spain", "Vale", "esp"],
      ] as const) {
        setVariety(variety);
        const sentence = resolveStreetLine(line, "f", "m");
        expect(sentence).toMatchObject({ en: text, say: text, nat: "antras" });
        const voicePrefix = EDITION.id === "es" ? prefix : "g";
        const dedicated = `${voicePrefix}_st_dedicated`;
        const passerby = `${voicePrefix}_amb_f`;
        expect(streetVoice("f", "st_dedicated", true)).toBe(dedicated);
        expect(streetVoice("f", "st_dedicated", true, () => true)).toBe(dedicated);
        expect(streetVoice("f", "st_dedicated", true, (id) => id === passerby)).toBe(passerby);
        expect(coachVoice("m", true)).toBe(`${voicePrefix}_coach_m`);
        expect(coachVoice("f", true)).toBe(`${voicePrefix}_coach_f`);
        expect(streetVoice("f", "st_dedicated", false)).toBe(streetVoice("f", undefined, false));
        const option = { key: "a", sentence };
        const { read } = learnerTurn([option], { a: streetSpeechTexts(line, "f", "m") });
        for (const alternate of ["Buenas tardes", "Hasta mañana", "Vale"]) expect(read(alternate).answer).toBe(option);
        expect(read("Buenos días").answer).toBeUndefined();
      }
      expect(resolveStreetLine({ ...line, spain: undefined }, "f", "f")).toMatchObject({ en: "Hasta mañana", nat: "antra" });
      expect(resolveStreetLine({ ...line, spain: undefined, neutral: undefined }, "f", "f").en).toBe("Buenas tardes");
    } finally {
      setVariety("default");
    }
  });
});

function checkText(text: string) {
  expect(text.trim()).not.toBe("");
  for (const gender of ["m", "f"] as const) expect(streetText(text, gender, gender)).not.toMatch(/[{}]/);
}

function checkScript(value: unknown, cast: string[]) {
  if (typeof value === "string") { checkText(value); return; }
  if (Array.isArray(value)) { value.forEach((child) => checkScript(child, cast)); return; }
  if (value === null || typeof value !== "object") return;
  if ("byCast" in value) {
    expect(Object.keys(value.byCast as object).sort()).toEqual([...cast].sort());
  }
  if ("choices" in value) expect([1, 2, 3]).toContain((value.choices as unknown[]).length);
  if ("en" in value) {
    expect(typeof value.en).toBe("string");
    expect(typeof (value as StreetLine).lt).toBe("string");
  }
  Object.values(value).forEach((child) => checkScript(child, cast));
}

describe("street exchanges", () => {
  it("runs both authored turns through the kit and keeps only completed help", async () => {
    const { StreetLife, useStreet } = await import("../src/game/street/StreetLife");
    const { useStore } = await import("../src/state/store");
    const { parseCards, useCards } = await import("../src/state/cards");
    const saved = useStore.getState();
    const cards = useCards.getState();
    const life = new StreetLife();
    const light = { ...free, light: true };
    const fixture: StreetMoment = {
      ...dropped, id: "gender-switches",
      cast: [{ ...dropped.cast[0], role: "{nm:Praeivis|nf:Praeivė} · {m:tu pasirengęs|f:tu pasirengusi}" }],
      first: {
        scene: { byCast: { a: "{nm:Jis|nf:Ji} pamatė, kad tu {m:pasirengęs|f:pasirengusi}." } },
        choices: [{ say: greet }, { say: greet, helped: false }],
        reply: [{ en: "My wallet!", lt: "Mano piniginė!" }],
        then: { choices: [{ say: greet }, { say: greet, helped: false }] },
        card: { en: "You dropped your wallet!", lt: "Jums iškrito piniginė!" },
      },
    };
    STREET_MOMENTS.push(fixture);
    const until = async (predicate: () => boolean) => {
      for (let frame = 0; frame < 240; frame++) {
        if (predicate()) return;
        life.tick(0.1, light);
        await Promise.resolve();
      }
      expect(predicate()).toBe(true);
    };
    try {
      life.observe(light);
      expect(life.streetNow(fixture.id, "a")).toBe(true);
      await until(() => useStreet.getState().moment?.step === "scene");
      expect(useStreet.getState().moment).toMatchObject({
        role: "Praeivis · tu pasirengusi",
        scene: "Jis pamatė, kad tu pasirengusi.",
      });
      await until(() => useStreet.getState().moment?.choices.length === 2);
      const first = useStreet.getState().moment!;
      first.choose(first.choices[0].key);
      await until(() => useStreet.getState().moment?.step === "reply");
      expect(useStreet.getState().moment?.line?.sentence.en).toContain("My wallet!");
      await until(() => useStreet.getState().moment?.exchange === 1 && useStreet.getState().moment?.choices.length === 2);
      const second = useStreet.getState().moment!;
      second.choose(second.choices[0].key);
      await until(() => !life.streetState()?.active);
      expect(useStore.getState().progress.street?.moments[fixture.id]).toMatchObject({ seen: 1, helped: 1, helpedCast: "a" });
      const restored = parseCards(JSON.parse(JSON.stringify({ v: 1, cards: useCards.getState().cards })));
      expect(restored).toContainEqual(expect.objectContaining({
        en: "You dropped your wallet!", situationId: "street", sourceLabel: "Praeivis · tu pasirengusi",
      }));
      expect(useStore.getState().toasts.some((toast) => toast.source === "street")).toBe(true);
      useStore.getState().toast({ kind: "info", title: "Unrelated toast" });

      expect(life.streetNow(fixture.id, "a")).toBe(true);
      expect(life.streetState()?.active?.script).toBe("second");
      await until(() => !!useStreet.getState().moment);
      expect(useStore.getState().toasts.some((toast) => toast.source === "street")).toBe(false);
      expect(useStore.getState().toasts.some((toast) => toast.title === "Unrelated toast")).toBe(true);
      life.observe({ ...light, conversation: true });
      expect(life.streetState()?.active).toBeNull();
      expect(useStore.getState().progress.street?.moments[fixture.id]).toMatchObject({ seen: 2, helped: 1 });
    } finally {
      STREET_MOMENTS.pop();
      for (const { id } of useStore.getState().toasts) {
        if (!saved.toasts.some((toast) => toast.id === id)) useStore.getState().dismissToast(id);
      }
      life.dispose();
      useStore.setState(saved);
      useCards.setState(cards);
    }
  });
});
