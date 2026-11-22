import { describe, expect, it } from "vitest";
import { audioKey } from "../src/audio-key";
import { BARISTA_ORDERS } from "../src/content/barista";
import { BARISTA_ACCEPT, BARISTA_LINES, isBaristaCoachLine } from "../src/content/barista-lines";
import { loadSituation } from "../src/content/situations/catalog";
import { cafe, itemPrice } from "../src/content/situations/s72-cafe";
import { coachVoice, npcVoice } from "../src/content/voices";
import { NPCS } from "../src/content/npcs";
import { baristaPieceLine, baristaThanks } from "../src/game/barista/menu";
import { BaristaShift } from "../src/game/barista/shift";
import { trayRows } from "../src/game/barista/tray";
import { conversationLine, learnerTurn } from "../src/game/kit/lines";
import { enumerateAll } from "../tools/enumerate";
import manifestData from "../public/audio-v2/manifest.json";

const manifest: Record<string, number> = manifestData;
const recorded = [
  ["Can I get a latte?", "Medium, please.", "Whole milk, please.", "For here, please."],
  ["I'd like a cappuccino, please.", "A large, please.", "With oat milk, please.", "To go, please."],
  ["Could I have an americano, please?", "Large, please.", "No milk, thanks.", "And a croissant, please.", "I'll take it to go."],
  ["May I have a hot chocolate?", "A small, please.", "I'll have it here."],
  ["I'll have a mocha.", "Large, please.", "Almond milk, please.", "And a blueberry muffin, please.", "Can I get it to go?"],
  ["Let me get a latte.", "Small, please.", "Iced, please.", "Oat milk, please.", "For here, please."],
];

describe("barista content", () => {
  it("renders the original recorded cafe hints for both coach voices", () => {
    expect(BARISTA_ORDERS.map(({ gender }) => gender)).toEqual(["f", "m", "f", "m", "f", "m"]);
    expect(new Set(BARISTA_ORDERS.map(({ npc }) => npc)).size).toBe(6);
    for (const gender of ["f", "m"] as const) {
      const voice = coachVoice(gender, true);
      const check = (s: { en: string; say: string }, expected: string) => {
        expect(s.en).toBe(expected);
        expect(s.say).toBe(expected);
        expect(manifest[audioKey(voice, 1, expected)], `${voice} · ${expected}`).toBeGreaterThan(0);
      };
      BARISTA_ORDERS.forEach(({ pieces }, i) => pieces.forEach((p, j) => check(baristaPieceLine(cafe, p, gender).sentence, recorded[i][j])));
      check(baristaThanks(cafe, gender).sentence, "Thank you very much!");
    }
  });

  it("charges the cafe's item prices for all six orders", () => {
    const shift = new BaristaShift();
    const prices = BARISTA_ORDERS.map(() => {
      for (const piece of shift.order.pieces) shift.select(piece);
      const { drink, size, milk, extras } = shift.built;
      const total = itemPrice({
        cat: "drink", id: drink!, qty: 1, size, milk: milk === "none" ? undefined : milk,
        temp: extras.includes("iced") ? "iced" : undefined,
      }) + extras.filter((id) => id !== "iced").reduce((n, id) => n + itemPrice({ cat: "food", id, qty: 1 }), 0);
      expect(shift.order.price).toBe(total);
      shift.next();
      return total;
    });
    expect(prices).toEqual([475, 575, 725, 350, 1000, 550]);
  });

  it("resolves each new line and enumerates it for the correct recording voices", async () => {
    await loadSituation(cafe.id);
    const { utts } = enumerateAll({ sits: [cafe], fuzzRuns: 0, v2: true });
    for (const key of Object.keys(BARISTA_LINES)) {
      const learner = key.startsWith("bs_a_");
      const sentence = conversationLine(cafe.id, cafe.npc, key, undefined, learner);
      expect(sentence, key).not.toBeNull();
      const voices = isBaristaCoachLine(key) ? [coachVoice("f", true), coachVoice("m", true)] : [npcVoice(NPCS.mia, true)];
      expect(utts.filter((u) => u.where === `${cafe.id}:${key}[0]`).map((u) => u.voice)).toEqual(voices);
      if (!learner || !sentence) continue;
      const turn = learnerTurn([{ key, sentence }], BARISTA_ACCEPT);
      for (const phrase of BARISTA_ACCEPT[key]) expect(turn.read(phrase).answer?.key).toBe(key);
    }
    for (const { priceLine } of BARISTA_ORDERS) expect(BARISTA_LINES[priceLine]).toBeDefined();
  });
});

function fill(shift: BaristaShift) {
  shift.step = "build";
  for (const piece of shift.order.pieces) shift.select(piece);
}

describe("barista shift", () => {
  it("counts one wrong part at a time and awards a first-try score only for clean handovers", () => {
    const shift = new BaristaShift();
    fill(shift);
    shift.select({ row: "drink", id: "espresso" });
    shift.select({ row: "extras", id: "cookie" });
    expect(shift.handover()).toMatchObject({ chip: { row: "drink", id: "latte" }, selected: true });
    expect(shift).toMatchObject({ step: "correction", wrong: 1, served: 0 });
    expect(shift.handover()).toBeNull();
    shift.step = "build";
    shift.select({ row: "drink", id: "latte" });
    expect(shift.handover()).toMatchObject({ chip: { row: "extras", id: "cookie" }, selected: false });
    shift.step = "build";
    shift.select({ row: "extras", id: "cookie" });
    expect(shift.handover()).toBeNull();
    expect(shift).toMatchObject({ step: "handover", wrong: 2, served: 1, firstTime: 0 });
    shift.next();
    fill(shift);
    shift.handover();
    expect(shift).toMatchObject({ served: 2, firstTime: 1, wrong: 2 });
  });

  it("uses two customers per help level, with one level restored for the next customer after a mistake", () => {
    const clean = new BaristaShift();
    const retry = new BaristaShift();
    const levels = [];
    const withMistakes = [];
    for (let i = 0; i < 6; i++) {
      levels.push(clean.help);
      withMistakes.push(retry.help);
      fill(clean);
      clean.handover();
      fill(retry);
      if (i === 1 || i === 3) {
        retry.select({ row: "dine", id: "here" });
        if (i === 3) retry.select({ row: "dine", id: "togo" });
        expect(retry.handover()).not.toBeNull();
        retry.step = "build";
        retry.select(retry.order.pieces.at(-1)!);
      }
      retry.handover();
      clean.next();
      retry.next();
    }
    expect(levels).toEqual([0, 0, 1, 1, 2, 2]);
    expect(withMistakes).toEqual([0, 0, 0, 1, 1, 2]);
    expect(retry).toMatchObject({ step: "closing", served: 6, firstTime: 4, wrong: 2 });
  });

  it("hides milk for hot chocolate and discards milk previously picked for another drink", () => {
    const shift = new BaristaShift();
    shift.select({ row: "milk", id: "whole" });
    shift.select({ row: "drink", id: "hot_chocolate" });
    expect(trayRows(shift.built)).not.toContain("milk");
    shift.select({ row: "milk", id: "oat" });
    expect(shift.built.milk).toBeUndefined();
  });
});
