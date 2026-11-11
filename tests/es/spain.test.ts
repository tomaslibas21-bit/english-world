// Spain's Spanish, the third text (docs/es/STYLE.md "Spain Spanish", owner 11 Nov 2026): a line's Spain twin, else its
// neutral one; Spain's tú for casual service; Spain's nouns, letter names and times; the esp_ voices.
import { afterEach, describe, expect, it } from "vitest";
import { t, ent } from "../../src/content/dsl";
import type { EntityDef } from "../../src/content/types";
import { addressInformal, compose, setVariety } from "../../src/convo/compose";
import { NPCS } from "../../src/content/npcs";
import { coachVoice, npcVoice } from "../../src/content/voices";
import { chooseVariety } from "../../src/state/variety";

afterEach(() => setVariety("default"));

const E: EntityDef[] = [
  ent("carro", "carro", "car", "m", { attrs: { neutral: "auto", spain: "coche" } }),
  ent("jitomate", "jitomate", "tomato", "m", { pl: "jitomates", ltPl: "tomatoes", attrs: { neutral: "tomate" } }),
];
const look = (id: string) => E.find((e) => e.id === id);
const c = (src: ReturnType<typeof t>, vars: Record<string, unknown> = {}, formal = true) => compose(src, vars, { look, addressee: "m", speaker: "f", formal });

describe("Spain's text", () => {
  const line = { ...t("¿Me prestas tu celular?", "Me you-lend your cellphone?", "Can I borrow your phone?"),
    neutral: t("¿Me prestas tu teléfono?", "Me you-lend your phone?", "Can I borrow your phone?"),
    spain: t("¿Me dejas tu móvil?", "Me you-let your phone?", "Can I borrow your phone?") };
  const neutralOnly = { ...t("Ahorita vengo.", "Right-now I-come.", "I'll be right back."), neutral: t("Ya vengo.", "Already I-come.", "I'll be right back.") };
  it("says the Spain twin, else the neutral one, else the line", () => {
    setVariety("spain");
    expect(c(line).en).toBe("¿Me dejas tu móvil?");
    expect(c(neutralOnly).en).toBe("Ya vengo.");
    expect(c(t("Gracias.", "Thanks.", "Thanks.")).en).toBe("Gracias.");
    setVariety("neutral");
    expect(c(line).en).toBe("¿Me prestas tu teléfono?");
    setVariety("default");
    expect(c(line).en).toBe("¿Me prestas tu celular?");
  });
  it("names things with the entity's Spain noun, else its neutral one", () => {
    const s = t("{X.np}", "{X.np}", "{X.np}");
    setVariety("spain");
    expect(c(s, { X: "carro" }).en).toBe("Un coche");
    expect(c(s, { X: "jitomate" }).en).toBe("Un tomate");
    setVariety("neutral");
    expect(c(s, { X: "carro" }).en).toBe("Un auto");
  });
  it("spells B and V as Spain does, and says the time Spain's way", () => {
    const s = t("Se escribe | {$letters}.", "It's spelled | {$letters}.", "It's spelled {$letters}.", { say: "Se escribe: {$letters}." });
    const h = t("A | {$time}.", "At | {$time}.", "At {$time}.", { say: "A {$time}." });
    setVariety("spain");
    expect(c(s, { letters: "Bevy" }).say).toBe("Se escribe: be, e, uve, i griega.");
    expect(c(h, { time: { h: 8, m: 45 } }).say).toBe("A las nueve menos cuarto.");
    expect(c(h, { time: { h: 8, m: 40 } }).say).toBe("A las nueve menos veinte.");
    expect(c(h, { time: { h: 8, m: 30 } }).say).toBe("A las ocho y media.");
    setVariety("default");
    expect(c(h, { time: { h: 8, m: 45 } }).say).toBe("A cuarto para las nueve.");
  });
});

describe("Spain's tú and usted", () => {
  it("casual service says tú in Spain's text only", () => {
    for (const id of ["mia", "marco", "marco_host", "chloe", "jessie"]) {
      expect(NPCS[id].informalSpain, id).toBe(true);
      expect(addressInformal(NPCS[id]), id).toBe(false);
    }
    setVariety("spain");
    for (const id of ["mia", "chloe", "jessie", "jordan"]) expect(addressInformal(NPCS[id]), id).toBe(true);
    // officials, the bank, the doctor and older people keep usted
    for (const id of ["diaz", "aduana", "aaron", "carter", "rosa", "marcus", "vinnie", "patel", "mr_grant", "brooks"]) expect(addressInformal(NPCS[id]), id).toBe(false);
  });
  it("a shared line's {u:|t:} follows Spain's register", () => {
    const s = t("¿{u:Puede|t:Puedes} | repetir?", "Can-you | repeat?", "Can you repeat?");
    setVariety("spain");
    expect(compose(s, {}, { look, addressee: "m", speaker: "f", formal: !addressInformal(NPCS.mia) }).en).toBe("¿Puedes repetir?");
    expect(compose(s, {}, { look, addressee: "m", speaker: "f", formal: !addressInformal(NPCS.aaron) }).en).toBe("¿Puede repetir?");
  });
});

describe("the switch", () => {
  it("España plays the esp_ voices", () => {
    chooseVariety("spain");
    expect(npcVoice(NPCS.mia)).toBe("esp_mia");
    expect(coachVoice("m")).toBe("esp_coach_m");
    chooseVariety("default");
    expect(npcVoice(NPCS.mia)).toBe("es_mia");
  });
});

describe("Spain's role names", () => {
  it("names a job as Spain does where it differs", async () => {
    const { roleSaid } = await import("../../src/convo/compose");
    expect(roleSaid(NPCS.jake)).toBe("Renta de autos");
    setVariety("spain");
    expect(roleSaid(NPCS.jake)).toBe("Alquiler de coches");
    expect(roleSaid(NPCS.mia)).toBe("Barista");
  });
});
