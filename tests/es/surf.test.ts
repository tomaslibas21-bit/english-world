// Puerto Colibrí's surf school (La Ola: theme `surfShack`, src/editions/es/game/world/surf.ts, x01-surf and its
// "sg_…" lines): the checks that need no browser. The engine's own are tests/surf.test.ts; the real game,
// tests/browser/surf.mjs. Runs in the vitest project "es".
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CFG, CUES } from "../../src/game/surf/logic";
import { SURF_SPOT } from "../../src/game/world/surf";
import { SURF } from "../../src/content/surf";
import { SURF_PICTURES } from "../../src/editions/es/content/surf";
import { COMMANDS } from "../../src/game/surf/logic";
import { existsSync, readdirSync, statSync } from "node:fs";
import { RIDES } from "../../src/game/world/rides";
import { THEME } from "../../src/game/world/theme";
import { OUTDOOR_NPCS, CHAT_SPOTS } from "../../src/game/world/layout";
import { MALECON } from "../../src/game/world/mexican";
import { BAY, SHORE, sandY, SEA_LEVEL } from "../../src/game/water";
import { SITUATION_BY_ID } from "../../src/content/situations";
import { NPCS } from "../../src/content/npcs";
import { LOCATIONS } from "../../src/content/locations";
import { compose, setVariety } from "../../src/convo/compose";

describe("La Ola, the surf school", () => {
  const spot = SURF_SPOT!, shack = THEME.surfShack!;
  it("the town has the school, its instructor at her counter, and the lesson's place", () => {
    expect(spot).toBeTruthy();
    expect(shack).toBeTruthy();
    expect(SURF?.situation).toBe("x01-surf");
    const sit = SITUATION_BY_ID["x01-surf"];
    expect(sit.npc).toBe(SURF!.npc);
    expect(LOCATIONS[sit.location]?.kind).toBe("outdoor");
    expect(NPCS[SURF!.npc]?.informal).toBe(true);
    const at = OUTDOOR_NPCS.find((n) => n.npc === SURF!.npc)!;
    expect(at).toBeTruthy();
    // she stands under the palapa's roof, the learner on the sand in front of the counter, below the malecón's wall
    expect(Math.hypot(at.x - shack.x, at.z - shack.z)).toBeLessThan(2.2);
    expect(at.az!).toBeLessThan(MALECON.z - 1);
    expect(sandY(at.ax!, at.az!)).toBeGreaterThan(-0.05);
    expect(Math.hypot(at.ax! - at.x, at.az! - at.z)).toBeGreaterThan(1.6);
  });

  it("the palapa stands on dry sand, clear of the beach's palapas, the terrace, the steps and everyone's spot", () => {
    for (const [dx, dz] of [[-2.2, -1.5], [2.2, -1.5], [-2.2, 1.5], [2.2, 1.5]]) expect(sandY(shack.x + dx, shack.z + dz), "dry").toBeGreaterThan(-0.12);
    expect(shack.z + 1.5).toBeLessThan(MALECON.z);
    for (const [x, z] of THEME.palapas) expect(Math.hypot(x - shack.x, z - shack.z)).toBeGreaterThan(6);
    for (const [x0, x1] of THEME.terrace ?? []) expect(Math.min(Math.abs(shack.x + 2.2 - x0), Math.abs(shack.x - 2.2 - x1))).toBeGreaterThan(0.8);
    // (the steps down from the malecón at x −48: the way to her counter)
    expect(shack.x - 2.2).toBeGreaterThan(-46.8);
    for (const n of OUTDOOR_NPCS) if (n.npc !== SURF!.npc) expect(Math.hypot(n.x - shack.x, n.z - shack.z)).toBeGreaterThan(8);
    for (const [ax, az, bx, bz] of CHAT_SPOTS) for (const [x, z] of [[ax, az], [bx, bz]]) expect(Math.hypot(x - shack.x, z - shack.z)).toBeGreaterThan(5);
    for (const [x, z] of THEME.sitters ?? []) expect(Math.hypot(x - shack.x, z - shack.z)).toBeGreaterThan(4);
    const [kx, kz] = shack.kayak;
    expect(sandY(kx, kz)).toBeGreaterThan(-0.2);
    // its boards say what the conversation charges (x01-surf.ts PRICE, LESSON) and the report its intro quotes
    const src = readFileSync(new URL("../../src/editions/es/content/situations/x01-surf.ts", import.meta.url), "utf8");
    for (const [what, cents] of [["Tabla de surf $200", 20000], ["Paddle $250", 25000], ["Kayak $250", 25000], ["Snorkel $150", 15000], ["Clase de surf $600", 60000]] as [string, number][]) {
      expect(shack.prices.join(" · ")).toContain(what);
      expect(src).toContain(String(cents));
    }
    expect(shack.report.slice(1).join(" · ")).toBe("Olas: 1 m · Marea baja · Viento suave");
    expect(SITUATION_BY_ID["x01-surf"].intro).toContain("Olas: 1 m · Marea baja · Viento suave");
  });

  it("the lesson's lane is open water: clear of the pier, the lancha one takes out, the boats at anchor, inside the bay", () => {
    const far = Math.max(CFG.beginner.lineup, CFG.advanced.lineup) + 32, half = 11;
    expect(spot.z).toBeLessThan(SHORE.top - 1.5);
    expect(sandY(spot.x, spot.z)).toBeLessThan(SEA_LEVEL);
    expect(spot.z - far).toBeGreaterThan(BAY.z0);
    expect(spot.x - half).toBeGreaterThan(BAY.x0);
    // El Muelle's pier and its terraces
    for (const [x0, x1] of THEME.terrace ?? []) expect(Math.min(x0, x1) - (spot.x + half)).toBeGreaterThan(5);
    for (const b of RIDES.boats) expect(Math.abs(b.x - spot.x)).toBeGreaterThan(half + 8);
    for (const [x, z] of THEME.lanchas?.afloat ?? []) if (z < spot.z + 1 && z > spot.z - far) expect(Math.abs(x - spot.x), `the lancha at ${x}, ${z}`).toBeGreaterThan(half + 6);
    for (const [x, z, r] of RIDES.rocks) expect(Math.hypot(x - spot.x, z - (spot.z - 20))).toBeGreaterThan(r + 30);
    // the two of them start on the sand between the beach's palapas' loungers, and its prompt is at her boards
    for (const [x, z] of THEME.palapas) expect(Math.hypot(x - spot.x, z - (spot.z + 1.7))).toBeGreaterThan(3.2);
    expect(Math.hypot(spot.start.x - shack.x, spot.start.z - shack.z)).toBeLessThan(4);
    const at = OUTDOOR_NPCS.find((n) => n.npc === SURF!.npc)!;
    expect(Math.hypot(spot.start.x - at.ax!, spot.start.z - at.az!), "its prompt apart from the talk prompt").toBeGreaterThan(3.4);
  });

  it("every cue of the lesson is a line of the conversation, in the three Spanishes, short enough to shout", () => {
    const sit = SITUATION_BY_ID[SURF!.situation];
    for (const v of ["default", "neutral", "spain"] as const) {
      setVariety(v);
      for (const cue of CUES) {
        const src = sit.lines["sg_" + cue]?.[0];
        expect(src, `sg_${cue}`).toBeTruthy();
        for (const g of ["m", "f"] as const) {
          const s = compose(src, {}, { look: () => undefined, addressee: g, speaker: "f", formal: false });
          expect(s.units.length, cue).toBeGreaterThan(0);
          expect(s.say.trim().length, cue).toBeGreaterThan(1);
          expect(s.say, cue).not.toMatch(/[{}|]/);
          expect(s.nat.trim().length, cue).toBeGreaterThan(1);
          for (const u of s.units) { expect(u.en.trim(), cue).not.toBe(""); expect(u.lt.trim(), cue).not.toBe(""); }
          // a command is a few words: it is acted on within two seconds
          if (!/^(start_|listen|tip_|et_|duck_miss|nothing|another|first_wave|leash|board_take|arrive)/.test(cue)) expect(s.units.length, `${cue}: ${s.say}`).toBeLessThanOrEqual(7);
        }
      }
    }
    setVariety("default");
    // and nothing else hides among them
    const extra = Object.keys(sit.lines).filter((k) => k.startsWith("sg_") && !CUES.includes(k.slice(3)));
    expect(extra).toEqual([]);
    // Spain's instructor says it Spain's way
    setVariety("spain");
    const say = (cue: string) => compose(sit.lines["sg_" + cue][0], {}, { look: () => undefined, addressee: "f", speaker: "f", formal: false }).say;
    expect(say("board_take_long")).toMatch(/Coge/);
    expect(say("lie")).toMatch(/Túmbate/);
    expect(say("a_late")).toMatch(/Me he levantado/);
    setVariety("default");
    expect(say("board_take_long")).toMatch(/Agarra/);
    expect(say("a_late")).toMatch(/Me levanté/);
  });

  it("a yes to “¿Probamos una ola?” hands over to the lesson, at a level the engine knows", () => {
    // (the conversation's own sims prove its paths; here: its event is the engine's)
    const src = readFileSync(new URL("../../src/editions/es/content/situations/x01-surf.ts", import.meta.url), "utf8");
    expect(src).toMatch(/c\.event\("surf", \{ level: level\(c\) \}\)/);
    expect(src).toMatch(/"advanced" : "beginner"/);
    expect(SITUATION_BY_ID["x01-surf"].sims?.length).toBeGreaterThanOrEqual(4);
  });

  it("every command has a picture of what it asks for: 17 pictures, each one's file in the game, each cue a real one", () => {
    const P = SURF!.pictures!;
    expect(P.dir).toBe("scenes-es/x01-surf-game");
    const dir = new URL(`../../public/${P.dir}/`, import.meta.url);
    const names = Object.keys(SURF_PICTURES);
    expect(names.length).toBe(17);
    // the folder holds exactly these (nothing forgotten, nothing left over), each a picture the card can load fast
    expect(readdirSync(dir).filter((f) => !f.startsWith(".")).sort()).toEqual(names.map((n) => n + ".webp").sort());
    for (const n of names) {
      const file = new URL(n + ".webp", dir);
      expect(existsSync(file), n).toBe(true);
      const size = statSync(file).size;
      expect(size, n).toBeGreaterThan(20_000);
      expect(size, n).toBeLessThan(140_000);
    }
    // a cue has one picture; every cue named is one the lesson says
    const seen = new Set<string>();
    for (const [n, cues] of Object.entries(SURF_PICTURES)) for (const c of cues) {
      expect(CUES, `${n}: ${c}`).toContain(c);
      expect(seen.has(c), `${c} twice`).toBe(false);
      seen.add(c);
      expect(P.of[c]).toBe(n);
    }
    // what one must act on is shown: every correction of the ride, and the calls before it
    for (const c of [...COMMANDS.map((x) => x.cue), "board_ask", "lie", "paddle", "paddle_hard", "wave_duck", "not_this", "this_one", "turn", "paddle_now", "now_up", "wipeout", "what_happened"]) expect(P.of[c], c).toBeTruthy();
    // left is left: the two leans have their own pictures
    expect(P.of.lean_left).toBe("left");
    expect(P.of.lean_right).toBe("right");
    expect(P.of.lean_left).not.toBe(P.of.lean_right);
  });
});
