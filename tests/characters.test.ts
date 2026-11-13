// Characters, second version (13 Nov 2026): one draw call a person whatever they wear and do, the face's parts where
// the game reaches for them, the expression a line calls for, the voice's sound for the mouth's shape, and Maple
// Harbor's people dressed as before (no beachwear).
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { NPCS, type Look } from "../src/content/npcs";
import { Character, type Mood } from "../src/game/characters/Character";
import { moodOf } from "../src/game/characters/mood";
import { walkerLook } from "../src/game/ambient";
import { rand } from "../src/game/world/util";
import { AudioSystem } from "../src/game/audio";

const skins = (c: Character) => { const out: THREE.SkinnedMesh[] = []; c.root.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) out.push(o as THREE.SkinnedMesh); }); return out; };
const finite = (c: Character) => {
  c.root.updateMatrixWorld(true);
  let ok = true;
  c.root.traverse((o) => { for (const v of o.matrixWorld.elements) if (!Number.isFinite(v)) ok = false; });
  return ok;
};
const BEACH: Look[] = [
  { skin: "#c68e63", hair: { style: "short", color: "#1f1a17" }, top: "#f4f1ea", bottom: "#e4572e", swim: "trunks", sleeves: "short", flipflops: true },
  { skin: "#d9a47e", hair: { style: "long", color: "#2b1d16" }, top: "#e4007c", bottom: "#00a6a6", swim: "suit", skirt: true, flipflops: true, acc: ["sarong", "sunhat"], accColor: "#e4007c", female: true },
  { skin: "#b07a52", hair: { style: "bun", color: "#1f1a17" }, top: "#1f6fd1", bottom: "#1f6fd1", swim: "suit", acc: ["coverup", "bucket"], accColor: "#fbf6ea", female: true },
];

describe("a character is one mesh", () => {
  it("every one of the cast: one skinned mesh, the same bones for everyone standing, no part left out of the skeleton", () => {
    for (const [id, def] of Object.entries(NPCS)) {
      const c = new Character(def.look);
      const s = skins(c);
      expect(s.length, id).toBe(1);
      // the body, two thighs, two shins, two upper arms, two forearms, the head, the eyes, the irises, the lids, two
      // brows, the closed mouth, its corners, the open mouth; a skirt, a phone or something carried each add one
      const extra = (def.look.skirt ? 1 : 0) + (def.look.phone ? 1 : 0) + (def.look.carry ? 1 : 0);
      expect(s[0].skeleton.bones.length, id).toBe(18 + extra);
      const idx = s[0].geometry.getAttribute("skinIndex");
      let most = 0;
      for (let i = 0; i < idx.count; i++) most = Math.max(most, idx.getX(i), idx.getY(i));
      expect(most, id).toBeLessThan(s[0].skeleton.bones.length);
      c.dispose();
    }
  });

  it("stays one mesh sitting down, standing up again, with things in the hands and in beachwear", () => {
    const looks: Look[] = [
      { ...NPCS.mia.look, carry: "coffee", phone: true }, { ...NPCS.chuck.look, carry: "bag" }, { ...NPCS.rosa.look, carry: "paper" },
      { ...NPCS.priya.look, carry: "cup" }, ...BEACH,
    ];
    for (const look of looks) {
      const c = new Character(look);
      c.seatY = 0.48;
      c.setAnim("sit");
      c.recline = 0.7;
      for (let i = 0; i < 20; i++) c.update(1 / 30);
      expect(skins(c).length).toBe(1);
      expect(finite(c)).toBe(true);
      c.setAnim("idle");
      c.update(1 / 30);
      expect(skins(c).length).toBe(1);
      c.dispose();
    }
  });

  it("a far version (fewer triangles) fits the same skeleton, sitting or standing", () => {
    for (const seated of [false, true]) for (const look of [NPCS.mia.look, NPCS.harold.look, BEACH[1]]) {
      const c = new Character(look), twin = Character.far(look);
      if (seated) { for (const x of [c, twin]) { x.seatY = 0.5; x.setAnim("sit"); } }
      const full = skins(c)[0].geometry.index!.count;
      expect(skins(twin)[0].geometry.index!.count).toBeLessThan(full * 0.6);
      expect(c.attachFar(twin)).toBe(true);
      c.setFar(true);
      expect(skins(c).filter((m) => m.visible).length).toBe(1);
      c.dispose();
    }
  });

  it("no heavier than before: a person of the cast is under 6,000 triangles on average", () => {
    let sum = 0, n = 0;
    for (const def of Object.values(NPCS)) { const c = new Character(def.look); sum += skins(c)[0].geometry.index!.count / 3; n++; c.dispose(); }
    expect(sum / n).toBeLessThan(6000);
  });
});

describe("what they do", () => {
  it("minutes of every animation, talking, reacting and watching the learner, never break a matrix", () => {
    let seed = 1;
    const level = () => { seed = (seed * 16807) % 2147483647; return seed % 7 === 0 ? 0 : (seed % 100) / 100; };
    for (const anim of ["idle", "walk", "run", "wave", "sit"] as const) {
      const c = new Character({ ...NPCS.ben.look, phone: true });
      c.watch = new THREE.Vector3(2, 1.5, 3);
      c.setAnim(anim);
      for (let i = 0; i < 1200; i++) {
        if (i === 100) c.talk(8, level, () => (i % 9) / 9);
        if (i === 300) c.react("nod");
        if (i === 320) c.react("clap");
        if (i === 500) c.react("puzzled");
        if (i === 600) { c.attentive = true; c.steady = true; }
        if (i === 700) c.express("surprised", 2);
        if (i === 900) { c.lift = 0.4; c.tuck = 0.8; c.squash = 0.3; }
        if (i === 930) { c.lift = c.tuck = c.squash = 0; }
        c.update(1 / 30);
      }
      expect(finite(c), anim).toBe(true);
      c.dispose();
    }
  });

  it("the eyes and the head turn to someone in front, and not to someone behind", () => {
    const turned = (x: number, z: number) => {
      const c = new Character(NPCS.mia.look) as unknown as { watch: THREE.Vector3; steady: boolean; fidgets: boolean; update(dt: number): void; gazeYaw: number; eyeX: number };
      c.fidgets = false;
      c.watch = new THREE.Vector3(x, 1.5, z);
      c.steady = true;
      for (let i = 0; i < 90; i++) c.update(1 / 30);
      return c.gazeYaw;
    };
    expect(turned(2, 2)).toBeGreaterThan(0.4);
    expect(turned(-2, 2)).toBeLessThan(-0.4);
    expect(Math.abs(turned(0.3, -3))).toBeLessThan(0.05);
  });

  it("an expression asked for shows for its time, then the person's own comes back", () => {
    const c = new Character(NPCS.mia.look) as unknown as { express(m: Mood, s: number): void; update(dt: number): void; face: { smile: number; tilt: number } };
    for (let i = 0; i < 30; i++) c.update(1 / 30);
    const smile = c.face.smile;
    expect(smile).toBeGreaterThan(0.015);
    c.express("concerned", 1);
    for (let i = 0; i < 24; i++) c.update(1 / 30);
    expect(c.face.smile).toBeLessThan(0);
    expect(c.face.tilt).toBeGreaterThan(0.2);
    for (let i = 0; i < 60; i++) c.update(1 / 30);
    expect(c.face.smile).toBeCloseTo(smile, 2);
  });
});

describe("the expression a line calls for", () => {
  it("English", () => {
    expect(moodOf("Hi! What can I get you?")).toBe("friendly");
    expect(moodOf("I'm sorry, we're out of blueberry muffins.")).toBe("concerned");
    expect(moodOf("Unfortunately, the 9:15 bus is delayed.")).toBe("concerned");
    expect(moodOf("Really? You came all the way from Lithuania?")).toBe("surprised");
    expect(moodOf("The museum is two blocks north of here, right across from the bank on Main Street.")).toBe("neutral");
    expect(moodOf("Thank you. Enjoy your stay.")).toBe("friendly");
  });
  it("Spanish", () => {
    expect(moodOf("¡Hola! ¿Qué le sirvo?")).toBe("friendly");
    expect(moodOf("Lo siento, ya no nos quedan conchas.")).toBe("concerned");
    expect(moodOf("Lamentablemente, el camión de las 9:15 viene retrasado.")).toBe("concerned");
    expect(moodOf("¿De verdad? ¿Viene desde Lituania?")).toBe("surprised");
    expect(moodOf("El museo está a dos cuadras hacia el norte, justo enfrente del banco, sobre la avenida Juárez.")).toBe("neutral");
    expect(moodOf("Gracias. Que disfrute su estancia.")).toBe("friendly");
  });
});

describe("the voice's sound, for the mouth's shape", () => {
  it("a dark sound is round and a bright one wide, each loud enough to open the mouth", () => {
    // half a second of a low tone ("oo"), a pause, half a second of a high one ("ee"), at the same loudness
    const rate = 22050, n = rate * 1.2, data = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / rate;
      data[i] = t < 0.5 ? 0.5 * Math.sin(2 * Math.PI * 220 * t) : t < 0.7 ? 0 : 0.5 * Math.sin(2 * Math.PI * 2600 * t);
    }
    const audio = new AudioSystem() as unknown as { envelope(key: string, buf: unknown): void; envelopes: Map<string, Float32Array>; vowels: Map<string, Float32Array> };
    audio.envelope("k", { sampleRate: rate, length: n, getChannelData: () => data });
    const env = audio.envelopes.get("k")!, round = audio.vowels.get("k")!;
    expect(env.length).toBe(round.length);
    const at = (t: number) => Math.floor(t * 30);
    expect(env[at(0.25)]).toBeGreaterThan(0.8);
    expect(env[at(0.6)]).toBe(0);
    expect(env[at(0.95)]).toBeGreaterThan(0.8);
    expect(round[at(0.25)]).toBeGreaterThan(0.8);
    expect(round[at(0.95)]).toBeLessThan(0.2);
  });
});

describe("Maple Harbor's people are dressed as before", () => {
  const beachwear = (l: Look) => !!l.swim || !!l.sleeves || (l.acc ?? []).some((a) => ["sarong", "coverup", "sunhat", "bucket"].includes(a));
  it("none of the cast and no passer-by wears beachwear, short sleeves or none", () => {
    for (const [id, def] of Object.entries(NPCS)) expect(beachwear(def.look), id).toBe(false);
    const r = rand(4242);
    for (let i = 0; i < 200; i++) expect(beachwear(walkerLook(i % 2 === 0, r))).toBe(false);
  });
});
