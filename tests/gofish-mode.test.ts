import { Color, Group, Mesh, PerspectiveCamera, Raycaster, Vector3, type BufferGeometry, type Intersection } from "three";
import { expect, it, vi } from "vitest";
import { GOFISH_UI } from "../src/content/gofish";
import { GOFISH_SPEAKER_NAMES } from "../src/content/gofish-lines";
import { NPCS } from "../src/content/npcs";
import { loadSituation } from "../src/content/situations/catalog";
import { createCharacter } from "../src/game/characters";
import { DINING, DINING_SEATS, DINNER_PROPS, GOFISH_PROMPT, TABLETOP_CORNERS, hostBounds } from "../src/game/gofish/framing";
import { createGoFishMode } from "../src/game/gofish/mode";
import { targets } from "../src/game/gofish/logic";
import { useGoFish } from "../src/game/gofish/store";
import { FrameFade } from "../src/game/kit/frameFade";
import type { CameraRig } from "../src/game/camera";
import type { ModeHost } from "../src/game/kit/host";
import { ModeRegistry, type ModeScreen } from "../src/game/kit/modes";
import { getInterior } from "../src/game/world/interiors";
import { useCards } from "../src/state/cards";
import { readPlayStats } from "../src/state/playStats";
import { useStore } from "../src/state/store";
import { townCanvasDocument } from "../tools/town-canvas-stub";

vi.mock("../src/game/audio", () => ({
  audio: { sfx: vi.fn(), clipDuration: () => 1, play: async () => true, stop() {}, getState: () => "playing",
    level: () => null, vowel: () => null },
}));

it("offers from the completed dinner and table, plays a seeded round and restores the house", async () => {
  const dinner = "s85-dinner";
  await loadSituation(dinner);
  const player = createCharacter(NPCS.rosa.look);
  const actors = { dan: createCharacter(NPCS.dan.look), nora: createCharacter(NPCS.nora.look) };
  const home = { dan: new Vector3(-1, 0, 2.8), nora: new Vector3(4.2, 0, -4.3) };
  actors.dan.root.position.copy(home.dan);
  actors.nora.root.position.copy(home.nora);
  vi.stubGlobal("document", townCanvasDocument());
  let room: Group;
  try { room = getInterior("dans-house")!.group; } finally { vi.unstubAllGlobals(); }
  const plates = room.getObjectByName(DINNER_PROPS)!;
  const furniture = room.children.slice();
  const tableAt = (x: number, z: number) => {
    const down = new Raycaster(new Vector3(x, 1.25, z), new Vector3(0, -1, 0));
    return down.intersectObjects(furniture.filter((o) => o.visible), true)[0];
  };
  const surfaceColor = (hit: Intersection) => {
    const attr = (hit.object as Mesh).geometry.getAttribute("color"), v = hit.face!.a;
    return new Color(attr.getX(v), attr.getY(v), attr.getZ(v)).getHexString();
  };
  const expectCardsOnLinen = () => {
    const pile = room.getObjectByName("gofish-table-cards")!.children[0] as Mesh<BufferGeometry>;
    expect(pile.visible).toBe(true);
    const pos = pile.geometry.getAttribute("position");
    expect(pos.count).toBeGreaterThan(0);
    // Each card is a quad. Its opposite corners locate the dealt center, including rotated cards in pairs.
    for (let i = 0; i < pos.count; i += 4) {
      const center = new Vector3().fromBufferAttribute(pos, i).lerp(new Vector3().fromBufferAttribute(pos, i + 3), 0.5);
      pile.localToWorld(center);
      const hit = tableAt(center.x, center.z);
      expect(surfaceColor(hit)).toBe("d6c4a3");
      expect(hit.point.y).toBeCloseTo(DINING.surface, 4);
      expect(center.y - hit.point.y).toBeGreaterThan(0.003);
    }
  };
  let currentRoom: Group | null = room;
  let screen: ModeScreen | null = null;
  const registry = new ModeRegistry({ read: () => screen, set: (value) => { screen = value; } });
  let alpha = 0;
  const fade = new FrameFade((value) => { alpha = value; });
  const rig = { stage: null as CameraRig["stage"], mode: "interior", stageSnap() {
    const { pos, look, fov } = this.stage!;
    this.cam.position.copy(pos);
    this.cam.lookAt(look);
    this.cam.fov = fov!;
  }, cam: new PerspectiveCamera() };
  const host = {
    player: () => player, rig, prepare() {}, updatePose() {}, canStart: () => !fade.active,
    entered: (id: string) => registry.entered(id), left: (id: string) => registry.left(id), owns: (id: string) => registry.owns(id),
    fade: (fn: () => void) => { if (fade.active) return false; fade.start(fn); return true; },
  } as unknown as ModeHost;
  const place = (x: number, z: number, rot: number) => {
    player.root.position.set(x, 0, z);
    player.root.rotation.y = rot;
    rig.mode = "interior";
  };
  const standAtTable = () => place(GOFISH_PROMPT.x, GOFISH_PROMPT.z, GOFISH_PROMPT.rot);
  const savePlace = vi.fn();
  const mode = createGoFishMode(host, { room: () => currentRoom, npc: (id) => actors[id], place, savePlace });
  registry.register(mode);
  const ui = useGoFish.getState;
  const cues: string[] = [];
  const unsubscribe = useGoFish.subscribe((s, old) => { if (s.line && s.line !== old.line) cues.push(s.line.key); });
  let time = 0;
  const frame = async () => {
    const dt = 0.05;
    time += dt;
    fade.update(dt);
    registry.tick(dt, false);
    registry.update({ dt, time, x: 0, y: 0, brake: false, blocked: fade.active });
    await Promise.resolve();
  };
  const until = async (ready: () => boolean) => {
    for (let i = 0; i < 500 && !ready(); i++) await frame();
    expect(ready(), JSON.stringify(mode.state())).toBe(true);
  };
  const key = (key: string) => registry.input({ kind: "key", key, keys: new Set(), repeat: false });
  const prompt = () => registry.prompt(GOFISH_PROMPT.x, GOFISH_PROMPT.z, Infinity, true);
  try {
    const serving = tableAt(DINING.x, DINING.z);
    expect(serving.object.parent).toBe(plates);
    standAtTable();
    expect(registry.offer(dinner)).toBeNull();
    expect(prompt()).toBeNull();
    useStore.getState().updateProgress((p) => { p.sits[dinner] = { visits: 1, completions: 1, used: [], twists: [], memory: {} }; });
    expect(registry.offer(dinner)).toEqual({ id: "gofish", label: GOFISH_UI.start });
    expect(prompt()?.kind).toBe("gofish");
    currentRoom = null;
    expect(prompt()).toBeNull();
    expect(registry.start("gofish")).toBe(false);
    currentRoom = room;
    expect(registry.start("gofish")).toBe(true);
    expect(ui().line).toMatchObject({ key: "gf_offer", speaker: "dan" });
    place(1.5, 4.5, 0);
    await until(() => mode.state() === null);
    standAtTable();
    expect(registry.start("gofish")).toBe(true);
    mode.seed(124);
    mode.action("start");
    expect(mode.state()).toEqual({ step: "starting" });
    await until(() => mode.active);
    expect(alpha).toBe(1);
    expect(ui().round).toBeNull();
    expect(screen).toMatchObject({ id: "gofish", kind: "menu" });
    expect(plates.visible).toBe(false);
    expect(rig.mode).toBe("stage");
    expect(player.root.visible).toBe(false);
    expect([player, actors.dan, actors.nora].map((ch) => ch.anim)).toEqual(["sit", "sit", "sit"]);
    expect(actors.dan.root.position.toArray()).toEqual([DINING_SEATS.dan.x, 0, DINING_SEATS.dan.z]);
    expect(readPlayStats(useStore.getState().progress).games.gofish).toBe(1);
    const ready = () => ui().step === "fish" || ui().step === "score" || !!ui().choices.length;
    await until(ready);
    expect(cues.slice(-3)).toEqual(["gf_intro", "gf_shuffle", "gf_first"]);
    expect(ui()).toMatchObject({ step: "ask", tip: GOFISH_UI.tipAsk, target: "dan", gloss: true });
    expectCardsOnLinen();
    for (const side of [-1, 1]) {
      const edge = DINING.x + side * DINING.width / 2;
      const hem = tableAt(edge - side * 0.07, DINING.z);
      const wood = tableAt(edge - side * 0.02, DINING.z);
      expect(surfaceColor(hem)).toBe("657887");
      expect(hem.point.y).toBeCloseTo(DINING.surface, 4);
      expect(surfaceColor(wood)).toBe("926443");
      expect(wood.point.y).toBeLessThan(DINING.surface);
    }
    const faces = GOFISH_SPEAKER_NAMES.map((id) => {
      const seat = DINING_SEATS[id];
      return new Vector3(seat.x + Math.sin(seat.rot) * 0.12, actors[id].seatY! + 0.1 * (NPCS[id].look.build ?? 1)
        + actors[id].height * 0.93 / 1.75, seat.z + Math.cos(seat.rot) * 0.12);
    });
    const heads = Object.values(actors).flatMap((ch) => {
      if (!("head" in ch) || !(ch.head instanceof Group) || !("parts" in ch) || !Array.isArray(ch.parts)) return [];
      const head = ch.head;
      const geo: BufferGeometry | undefined = ch.parts.find(({ bone }) => bone === head)?.geo;
      if (!geo) return [];
      ch.root.updateMatrixWorld(true);
      geo.computeBoundingBox();
      const { min, max } = geo.boundingBox!;
      return [min.x, max.x].flatMap((x) => [min.y, max.y].flatMap((y) =>
        [min.z, max.z].map((z) => new Vector3(x, y, z).applyMatrix4(head.matrixWorld))));
    });
    for (const [width, height, top, bottom, panelLeft] of [
      [390, 664, 180, 345, 0], [390, 844, 180, 525, 0], [1280, 800, 180, 554, 0],
      [740, 360, 105, 308, 376], [844, 390, 90, 338, 428], [932, 430, 120, 378, 472],
    ]) {
      const tags = { left: 10, right: (panelLeft || width) - 10, top: bottom };
      mode.frameView(width, height, top, tags, { left: panelLeft, top: panelLeft ? 58 : bottom + 48 });
      const [dan, nora] = faces.map((face) => hostBounds(face).map((point) => point.project(rig.cam)));
      const detail = panelLeft ? [...heads, ...TABLETOP_CORNERS] : heads;
      for (const { x, y } of [...dan, ...nora, ...detail.map((point) => point.clone().project(rig.cam))]) {
        if (panelLeft) {
          expect((1 + x) * width / 2).toBeGreaterThan(tags.left);
          expect((1 + x) * width / 2).toBeLessThan(tags.right);
        } else expect(Math.abs(x)).toBeLessThanOrEqual(0.81);
        expect((1 - y) * height / 2).toBeGreaterThan(top);
        expect((1 - y) * height / 2).toBeLessThan(bottom);
      }
      expect(Math.max(...dan.map(({ x }) => x))).toBeLessThan(Math.min(...nora.map(({ x }) => x)));
    }
    expect(key("arrowright")).toBe(true);
    expect(ui().target).toBe("nora");
    expect(key("d")).toBe(true);
    let widestAsk = 0, wrong = false, sawPair = false;
    for (let i = 0; i < 70; i++) {
      await until(ready);
      const { step, line, round, choices, tip, gloss } = ui();
      if (!round || step === "score") break;
      if (step === "fish") {
        expect(key("f")).toBe(true);
        await until(() => ui().step === "move");
        expect(ui().drawn).toBeTruthy();
        expect(ui().round!.pond.length).toBe(round.pond.length - 1);
      } else if (step === "ask") {
        const asks = (mode.state() as { asks: number }).asks;
        expect(!!tip).toBe(asks < 2);
        expect(gloss).toBe(asks < 5);
        widestAsk = Math.max(widestAsk, round.hands.learner.length);
        const options = round.hands.learner.flatMap((word, index) =>
          targets(round).map((target) => ({ word, index, target, match: round.hands[target].includes(word) })));
        const ask = (widestAsk < 7 && round.pond.length ? options.find((o) => !o.match) : undefined)
          ?? options.find((o) => o.match) ?? options[0];
        key(ask.target === "dan" ? "d" : "n");
        key(String(ask.index + 1));
        expect(ui().picked).toBe(ask.word);
        key("enter");
      } else if (step === "reply") {
        const word = line!.key.slice("gf_ask_".length);
        const correct = round.hands.learner.includes(word) ? "y" : "n";
        if (!wrong) {
          wrong = true;
          key(correct === "y" ? "n" : "y");
          await until(() => ui().line?.key === "gf_sure");
          await until(() => ui().step === "reply" && !!ui().choices.length);
          expect(ui().hintCard ?? ui().hintReply).toBe(correct === "y" ? word : "gf_nope");
        }
        key(correct);
      } else if (step === "pair") {
        sawPair = true;
        expect(choices[0]?.key).toBe("gf_pair");
        expect(new Set(round.hands.learner).size).toBe(round.hands.learner.length - 1);
        key("enter");
      } else throw new Error(`Unexpected step ${step}`);
      await frame();
    }
    expect(sawPair && wrong).toBe(true);
    expect(widestAsk).toBe(7);
    expect(ui().result).toEqual({ winner: "learner", right: 1, replies: 2, cards: 6 });
    expect(ui().round?.pairs.learner).toHaveLength(7);
    expectCardsOnLinen();
    expect(cues).toEqual(expect.arrayContaining(["gf_lucky", "gf_again", "gf_my_turn", "gf_your_turn", "gf_win_you", "gf_bye"]));
    expect(useCards.getState().cards.filter((card) => card.situationId === dinner).map((card) => card.sentence.en))
      .toEqual(expect.arrayContaining(["Do you have any pancakes?", "Yes, here you go.", "Nope. Go fish!", "I got a pair!", "Your turn!", "Lucky me!"]));

    mode.action("again");
    await until(() => ui().step === "ask" && !!ui().choices.length);
    expect(ui()).toMatchObject({ round: { deck: 1 }, tip: null, gloss: true });
    expect(readPlayStats(useStore.getState().progress).games.gofish).toBe(2);
    expect(key("escape")).toBe(true);
    await until(() => !fade.active);
    expect(screen).toBeNull();
    expect(plates.visible).toBe(true);
    const restored = tableAt(DINING.x, DINING.z);
    expect(restored.object).toBe(serving.object);
    expect(restored.point.y).toBeCloseTo(serving.point.y, 4);
    expect(room.getObjectByName("gofish-table-cards")).toBeUndefined();
    expect(actors.dan.root.position).toEqual(home.dan);
    expect(actors.nora.root.position).toEqual(home.nora);
    expect(player.root.visible).toBe(true);
    expect(player.anim).toBe("idle");
    expect(player.root.position.toArray()).toEqual([GOFISH_PROMPT.x, 0, GOFISH_PROMPT.z]);
    expect(rig.mode).toBe("interior");
    expect(savePlace).toHaveBeenCalledOnce();

    expect(registry.queue("gofish")).toBe(true);
    registry.launchQueued();
    expect(mode.state()).toEqual({ step: "starting" });
    await until(() => ui().step === "ask" && !!ui().choices.length);
    expect(ui().round?.deck).toBe(2);
  } finally {
    unsubscribe();
    registry.dispose();
    player.dispose?.();
    actors.dan.dispose?.();
    actors.nora.dispose?.();
  }
});
