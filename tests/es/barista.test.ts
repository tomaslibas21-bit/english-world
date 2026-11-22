import { afterEach, describe, expect, it } from "vitest";
import { audioKey } from "../../src/audio-key";
import { BARISTA_CHOCOLATE, BARISTA_ORDERS, priceText } from "../../src/content/barista";
import { BARISTA_ACCEPT, BARISTA_LINES, isBaristaCoachLine } from "../../src/content/barista-lines";
import { NPCS } from "../../src/content/npcs";
import { loadSituation } from "../../src/content/situations/catalog";
import cafe from "../../src/content/situations/s72-cafe";
import { coachVoice, npcVoice } from "../../src/content/voices";
import { setVariety } from "../../src/convo/compose";
import { baristaMenu, baristaPieceLine, baristaThanks } from "../../src/game/barista/menu";
import { BaristaShift } from "../../src/game/barista/shift";
import { trayRows } from "../../src/game/barista/tray";
import { conversationLine, learnerTurn } from "../../src/game/kit/lines";
import { enumerateEs } from "../../tools/es-voices/lines-es";
import manifestData from "../../public/audio-es/manifest.json";

const manifest: Record<string, number> = manifestData;
const varieties = [["default", "es"], ["neutral", "esn"], ["spain", "esp"]] as const;
const genders = ["f", "m"] as const;
const recorded = [
  ["¿Me da un latte, por favor?", "Mediano, por favor.", "Leche entera, por favor.", "Para aquí, por favor."],
  ["Quisiera un capuchino, por favor.", "Mediano, por favor.", "Con leche de avena, por favor.", "Para llevar, por favor."],
  ["¿Me puede dar un americano?", "Grande, por favor.", "Sin leche, gracias.", "Y un cuernito, por favor.", "Me lo llevo."],
  ["Voy a querer un chocolate.", "Chico, por favor.", "Me lo tomo aquí."],
  ["Quiero un moka, por favor.", "Grande, por favor.", "Leche de almendra, por favor.", "Y una dona, por favor.", "Es para llevar."],
  ["Para mí, un latte.", "Chico, por favor.", "Frío, por favor.", "Leche de avena, por favor.", "Para aquí, por favor."],
];

afterEach(() => setVariety("default"));

describe("Café La Ceiba barista shift", () => {
  it.each(varieties)("renders recorded hints and thanks for %s in both coach voices", (variety, prefix) => {
    setVariety(variety);
    for (const gender of genders) {
      const voice = coachVoice(gender);
      expect(voice).toBe(`${prefix}_coach_${gender}`);
      const check = ({ sentence }: ReturnType<typeof baristaPieceLine>, expected: string) => {
        if (variety === "default") {
          expect(sentence.en).toBe(expected);
          expect(sentence.say).toBe(expected);
        }
        expect(manifest[audioKey(voice, 1, sentence.say)], `${voice} · ${sentence.say}`).toBeGreaterThan(0);
      };
      BARISTA_ORDERS.forEach(({ pieces }, i) => pieces.forEach((p, j) => check(baristaPieceLine(cafe, p, gender), recorded[i][j])));
      check(baristaThanks(cafe, gender), "¡Muchas gracias!");
    }
  });

  it("serves the six café orders at the café's peso prices", () => {
    const ids = BARISTA_ORDERS.map(({ npc }) => npc);
    expect(new Set(ids).size).toBe(6);
    expect(ids).not.toContain("mia");
    expect(BARISTA_ORDERS.map(({ gender }) => gender)).toEqual(["f", "m", "f", "m", "f", "m"]);
    expect(BARISTA_ORDERS.map(({ price }) => priceText(price))).toEqual(["$50", "$60", "$75", "$40", "$95", "$65"]);
    expect(BARISTA_ORDERS.map(({ priceLine }) => priceLine)).toEqual([
      "bs_a_price_1", "bs_a_price_2", "bs_a_price_3", "bs_a_price_4", "bs_a_price_5", "bs_a_price_6",
    ]);
    const shift = new BaristaShift();
    for (const order of BARISTA_ORDERS) {
      shift.step = "build";
      for (const piece of order.pieces) shift.select(piece);
      expect(shift.handover()).toBeNull();
      shift.next();
    }
    expect(shift.firstTime).toBe(6);
  });

  it("draws the matching tray chips and hides milk for chocolate", () => {
    const menu = baristaMenu(cafe);
    expect(menu.size.map(({ en }) => en)).toEqual(["chico", "mediano", "grande"]);
    expect(menu.drink.map(({ en }) => en)).toEqual(["latte", "capuchino", "americano", "chocolate", "moka", "café de olla", "horchata"]);
    expect(menu.milk.map(({ en }) => en)).toEqual(["entera", "deslactosada", "de avena", "de almendra", "Sin leche"]);
    expect(menu.milk[0].lt).toBe("whole milk");
    expect(menu.extras.map(({ en }) => en)).toEqual(["frío", "cuernito", "dona", "concha", "galleta"]);
    expect(menu.dine.map(({ en, lt }) => [en, lt])).toEqual([["Para aquí", "for here"], ["Para llevar", "to go"]]);
    expect(trayRows({ drink: BARISTA_CHOCOLATE, extras: [] })).not.toContain("milk");

    setVariety("spain");
    const spain = baristaMenu(cafe);
    expect(spain.size[0].en).toBe("pequeño");
    expect(spain.extras[1].en).toBe("cruasán");
    expect(spain.extras[2].en).toBe("dónut");
  });

  it("resolves every new line and accepts the learner alternatives", async () => {
    expect(await loadSituation(cafe.id)).toBe(cafe);
    const keys = Object.keys(BARISTA_LINES);
    expect(Object.keys(cafe.lines).filter((key) => key.startsWith("bs_"))).toEqual(keys);
    const { utts } = enumerateEs({ only: [cafe.id], fuzzRuns: 0, probes: false });
    for (const [variety, prefix] of varieties) {
      setVariety(variety);
      expect(npcVoice(NPCS.mia)).toBe(`${prefix}_mia`);
      for (const key of keys) {
        const learner = key.startsWith("bs_a_");
        const sentence = conversationLine(cafe.id, cafe.npc, key, undefined, learner);
        expect(sentence?.en, key).toBeTruthy();
        const voices = isBaristaCoachLine(key) ? genders.map((g) => coachVoice(g)) : [npcVoice(NPCS.mia)];
        for (const voice of voices) expect(utts.some((u) => u.voice === voice && u.say === sentence!.say), `${voice} · ${key}`).toBe(true);
        if (!learner) continue;
        if (key === "bs_a_hi") expect(sentence!.say).toBe(variety === "spain" ? "¡Buenas! ¿Qué le pongo?" : "¡Buenas! ¿Qué le preparo?");
        const turn = learnerTurn([{ key, sentence: sentence! }], BARISTA_ACCEPT);
        for (const phrase of BARISTA_ACCEPT[key]) expect(turn.read(phrase).answer?.key, phrase).toBe(key);
      }
    }
  });
});
