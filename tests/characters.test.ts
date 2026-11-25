// Characters, second version (13 Nov 2026): one draw call a person whatever they wear and do, the face's parts where
// the game reaches for them, the expression a line calls for, the voice's sound for the mouth's shape, and Maple
// Harbor's people dressed as before (no beachwear).
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { NPCS, type Look } from "../src/content/npcs";
import { Character, LONG_HAIR, hairStyle, type Mood } from "../src/game/characters/Character";
import { withBackpack } from "../src/game/characters";
import { LOOKS } from "../src/ui/Title";
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

// Frozen from the R1 bake, including raw attribute bytes, bounds, and the ordered bind inverses.
function rigDigest(skin: THREE.SkinnedMesh) {
  const { geometry, skeleton } = skin;
  const hash = createHash("sha256");
  for (const name of ["index", "position", "normal", "color", "skinIndex", "skinWeight"]) {
    const attr = (name === "index" ? geometry.index : geometry.getAttribute(name))!;
    const { array } = attr;
    hash.update(JSON.stringify([name, array.constructor.name, attr.itemSize, attr.normalized, attr.count]));
    hash.update(Buffer.from(array.buffer, array.byteOffset, array.byteLength));
  }
  hash.update(JSON.stringify([
    geometry.boundingBox, skin.boundingBox, skin.boundingSphere, skin.bindMatrix.elements,
    skeleton.boneInverses.map((matrix) => matrix.elements),
  ]));
  return hash.digest("hex");
}

describe("baked character rigs match R1", () => {
  it("preserves the learner's backpack, Vinnie's face, and both weights on a posed hair vertex", () => {
    const learner = new Character(withBackpack(LOOKS.find(({ id }) => id === "m1")!.look));
    const vinnie = new Character({ ...NPCS.vinnie.look, female: false });
    const longHair = new Character({ ...NPCS.mia.look, female: true });
    const hairSkin = skins(longHair)[0];
    expect(rigDigest(skins(learner)[0]), "learner").toBe("79de2a6114cddf5baa3877fbeab1769e6d4b414dfad15e6c5cd70d9235da35f3");
    expect(rigDigest(skins(vinnie)[0]), "Vinnie").toBe("212193579313389080fd44d6187216a37c4545b9b30dbd67910cc7976b553f4b");
    expect(rigDigest(hairSkin), "long hair").toBe("ea908d9fa1ecc1ec26a146157d5b3dc303211a0409156774fb5bf1b021f4ed4d");

    const { mane } = longHair as unknown as { mane: THREE.Bone };
    const hairBone = hairSkin.skeleton.bones.indexOf(mane);
    expect(hairBone).toBeGreaterThanOrEqual(0);
    const { position, skinIndex, skinWeight } = hairSkin.geometry.attributes;
    let vertex = 0;
    while (vertex < position.count && (
      skinIndex.getX(vertex) !== hairBone || skinWeight.getX(vertex) === 0 || skinWeight.getY(vertex) === 0
    )) vertex++;
    expect(vertex).toBeLessThan(position.count);

    const head = hairSkin.skeleton.bones[skinIndex.getY(vertex)];
    expect(head).not.toBe(mane);
    head.rotation.set(0.18, 0.42, -0.06);
    mane.rotation.set(0.09, -0.12, 0.04);
    longHair.root.updateMatrixWorld(true);
    const posed = hairSkin.getVertexPosition(vertex, new THREE.Vector3());
    expect(posed.distanceTo(new THREE.Vector3().fromBufferAttribute(position, vertex))).toBeGreaterThan(0.001);
    expect(vertex).toBe(557);
    expect(posed.x).toBeCloseTo(-0.02432667058136161, 10);
    expect(posed.y).toBeCloseTo(1.4012803394463436, 10);
    expect(posed.z).toBeCloseTo(-0.010447446209770889, 10);
    for (const actor of [learner, vinnie, longHair]) actor.dispose();
  });

  it("preserves seated rebakes and their buffer ownership with a held prop and a far twin", () => {
    const look: Look = { ...NPCS.mia.look, female: true, phone: true };
    const actor = new Character(look), live = new Character(look);
    const twin = Character.far(look);
    const prop = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    actor.rightHand.add(prop);

    const original = skins(actor)[0], liveSkin = skins(live)[0], farGeometry = skins(twin)[0].geometry;
    const liveDigest = rigDigest(liveSkin);
    for (const name of Object.keys(original.geometry.attributes)) {
      expect(original.geometry.attributes[name].array.buffer).not.toBe(liveSkin.geometry.attributes[name].array.buffer);
    }
    expect(original.geometry.index!.array.buffer).not.toBe(liveSkin.geometry.index!.array.buffer);
    let liveDisposals = 0, farDisposals = 0;
    liveSkin.geometry.addEventListener("dispose", () => liveDisposals++);
    farGeometry.addEventListener("dispose", () => farDisposals++);
    expect(actor.attachFar(twin)).toBe(true);
    actor.setFar(true);
    const far = skins(actor).find((skin) => skin.visible)!;
    expect(far.geometry).toBe(farGeometry);
    expect(far.skeleton).toBe(original.skeleton);
    expect(rigDigest(far)).toBe("0897a33573210229db052514defcfdf440e3576e83eee1ca92f13a7012fee2cd");

    const lowSeat = "dcd2ba7555ff07418bf7ccf306a25a2f8a94b2b17381dac21fbfc43de226126a";
    for (const [height, digest] of [
      [0.42, lowSeat],
      [0.63, "4d39eceb4910e1cb26a1b2fd963ad6de0a075cd6253583ff375936e1ed8e84f4"],
    ] as const) {
      actor.seatY = height;
      actor.setAnim("sit");
      const [seated] = skins(actor);
      expect(skins(actor)).toHaveLength(1);
      expect(seated.visible).toBe(true);
      expect(prop.parent).toBe(actor.rightHand);
      expect(rigDigest(seated), `seat height ${height}`).toBe(digest);
      actor.setAnim("idle");
      expect(skins(actor)[0]).toBe(seated);
      expect(seated.skeleton.bones.slice(-2).every((bone) => bone.scale.x === 1e-5)).toBe(true);
    }
    expect(farDisposals).toBe(1);
    actor.dispose();
    expect(liveDisposals).toBe(0);
    expect(rigDigest(liveSkin)).toBe(liveDigest);
    live.seatY = 0.42;
    live.setAnim("sit");
    expect(rigDigest(skins(live)[0])).toBe(lowSeat);
    live.dispose();
    prop.geometry.dispose();
    prop.material.dispose();
  });

  it("uses the highest referenced index to choose the width, including nonindexed parts", () => {
    const actor = new Character(NPCS.vinnie.look);
    const rig = actor as unknown as { body: THREE.Group; bake(): void };
    const part = (count: number) => {
      const geometry = new THREE.BufferGeometry();
      for (const name of ["position", "normal", "color"]) {
        geometry.setAttribute(name, new THREE.BufferAttribute(new Float32Array(count * 3), 3));
      }
      return geometry;
    };
    const padding = part(65533 - skins(actor)[0].geometry.attributes.position.count);
    padding.setIndex([0, 0, 0]);
    const triangle = part(3);
    triangle.setIndex([0, 1, 1]);
    rig.body.add(new THREE.Mesh(padding), new THREE.Mesh(triangle));
    rig.bake();
    const narrow = skins(actor)[0].geometry.index!.array;
    expect(narrow).toBeInstanceOf(Uint16Array);
    expect(Array.from(narrow.slice(-3))).toEqual([65533, 65534, 65534]);

    triangle.setIndex(null);
    rig.bake();
    const wide = skins(actor)[0].geometry.index!.array;
    expect(wide).toBeInstanceOf(Uint32Array);
    expect(Array.from(wide.slice(-3))).toEqual([65533, 65534, 65535]);
    expect(triangle.index).toBeNull();
    actor.dispose();
  });

  it("preserves the representation of a source attribute that is already packed", () => {
    const actor = new Character(NPCS.vinnie.look);
    const rig = actor as unknown as { parts: { geo: THREE.BufferGeometry | null }[]; bake(): void };
    const original = skins(actor)[0].geometry;
    for (const { geo } of rig.parts) {
      if (!geo) continue;
      const color = new Uint8Array(geo.attributes.color.count * 3).fill(173);
      geo.setAttribute("color", new THREE.BufferAttribute(color, 3, true));
    }
    rig.bake();
    const { geometry } = skins(actor)[0];
    const color = geometry.attributes.color;
    expect(color.array).toBeInstanceOf(Uint8Array);
    expect(color.normalized).toBe(true);
    expect(color.count).toBe(original.attributes.color.count);
    expect(color.array.every((value) => value === 173)).toBe(true);
    expect(geometry.boundingBox).toEqual(original.boundingBox);
    actor.dispose();
  });
});

describe("a character is one mesh", () => {
  it("every one of the cast: one skinned mesh, the same bones for everyone standing, no part left out of the skeleton", () => {
    for (const [id, def] of Object.entries(NPCS)) {
      // (as the game builds them: a woman's figure from the cast's gender)
      const female = def.gender === "f", c = new Character({ ...def.look, female });
      const s = skins(c);
      expect(s.length, id).toBe(1);
      // the body, two thighs, two shins, two upper arms, two forearms, the head, the eyes, the irises, the lids, two
      // brows, the closed mouth, its corners, the open mouth; a skirt, a phone or something carried each add one, and
      // so does a woman's long hair
      const extra = (def.look.skirt ? 1 : 0) + (def.look.phone ? 1 : 0) + (def.look.carry ? 1 : 0) + (female && def.look.hair.style !== "bald" ? 1 : 0);
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

  // (5,886 on average before the women's long hair of 18 Nov 2026, 6,139 with it: 5,946 a man, 6,277 a woman)
  it("no heavier than they were: a person of the cast is under 6,200 triangles on average", () => {
    let sum = 0, n = 0;
    for (const def of Object.values(NPCS)) { const c = new Character({ ...def.look, female: def.gender === "f" }); sum += skins(c)[0].geometry.index!.count / 3; n++; c.dispose(); }
    expect(sum / n).toBeLessThan(6200);
  });
});

describe("a woman's hair is long", () => {
  const women = Object.entries(NPCS).filter(([, d]) => d.gender === "f" && d.look.hair.style !== "bald");
  it("every woman of the cast, every woman the player can be and every woman passing by names a long style", () => {
    expect(women.length).toBeGreaterThan(25);
    for (const [id, def] of women) expect(LONG_HAIR, id).toContain(def.look.hair.style);
    for (const l of LOOKS) if (l.gender === "f") expect(LONG_HAIR, l.id).toContain(l.look.hair.style);
    const r = rand(4242);
    for (let i = 0; i < 300; i++) expect(LONG_HAIR).toContain(walkerLook(true, r).hair.style);
  });

  it("a short or tied-up style given to a woman is built as the nearest long one; a man's stays his own", () => {
    const look = (style: Look["hair"]["style"]): Look => ({ ...NPCS.mia.look, hair: { style, color: "#5a3a25" } });
    for (const style of ["short", "side", "buzz", "bob", "bun", "ponytail", "curly"] as const) {
      expect(LONG_HAIR, style).toContain(hairStyle(look(style), true));
      expect(hairStyle(look(style), false)).toBe(style);
    }
    expect(hairStyle(look("curly"), true)).toBe("curls");
    expect(hairStyle(look("bald"), true)).toBe("bald");
    for (const [id, def] of Object.entries(NPCS)) if (def.gender === "m") expect(hairStyle(def.look, false), id).toBe(def.look.hair.style);
  });

  it("the hair reaches well below the shoulders (a braid the waist), on a part that follows the body", () => {
    /** The lowest point of the hair's own part, as a share of the person's height. */
    const lowest = (look: Look) => {
      const c = new Character(look) as unknown as { mane: THREE.Object3D | null; parts: { bone: THREE.Object3D; geo: THREE.BufferGeometry | null }[]; height: number; dispose(): void };
      expect(c.mane, look.hair.style).not.toBeNull();
      const part = c.parts.find((p) => p.bone === c.mane)!;
      part.geo!.computeBoundingBox();
      const y = (c.mane!.position.y + part.geo!.boundingBox!.min.y) / c.height;
      c.dispose();
      return y;
    };
    for (const style of LONG_HAIR) for (const height of [0.92, 1, 1.06]) {
      const y = lowest({ ...NPCS.mia.look, female: true, height, hair: { style, color: "#5a3a25" } });
      // (the shoulders are at 0.73 of the height, the waist at 0.49)
      expect(y, `${style} ${height}`).toBeLessThan(style === "braid" ? 0.5 : 0.62);
      expect(y, `${style} ${height}`).toBeGreaterThan(0.36);
    }
    // a man has no such part, whatever his hair
    for (const style of ["long", "wavy", "curly", "short"] as const) {
      const c = new Character({ ...NPCS.ben.look, female: false, hair: { style, color: "#5a3a25" } }) as unknown as { mane: unknown; dispose(): void };
      expect(c.mane, style).toBeNull();
      c.dispose();
    }
  });

  it("stays one mesh, in a hat, with a backpack, sitting and as a far version", () => {
    for (const style of LONG_HAIR) for (const extra of [{}, { acc: ["cap"] }, { backpack: "#1d3557" }, { skirt: true, height: 0.5 }] as Partial<Look>[]) {
      const look: Look = { ...NPCS.chloe.look, female: true, hair: { style, color: "#1f1a17", side: -1 }, ...extra };
      const c = new Character(look), twin = Character.far(look);
      expect(skins(c).length).toBe(1);
      expect(c.attachFar(twin)).toBe(true);
      c.seatY = 0.48;
      c.setAnim("sit");
      for (let i = 0; i < 10; i++) c.update(1 / 30);
      c.setAnim("walk");
      for (let i = 0; i < 30; i++) c.update(1 / 30);
      expect(skins(c).length).toBe(1);
      expect(finite(c)).toBe(true);
      c.dispose();
    }
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
