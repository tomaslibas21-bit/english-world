import { describe, expect, it, vi } from "vitest";
import { DirectionalLight, Fog, Group, HemisphereLight, Mesh, Raycaster, Scene, ShaderMaterial, Color, Vector3 } from "three";
import { KEEPSAKES } from "../../src/content/keepsakes";
import { GLOBAL } from "../../src/content/global";
import { ROUTE } from "../../src/content/route";
import { audio } from "../../src/game/audio";
import { NPCS } from "../../src/content/npcs";
import { splitUnits } from "../../src/convo/compose";
import { buildNlu } from "../../src/convo/dialogue";
import { getSituation, loadSituation, SITUATION_BY_ID } from "../../src/content/situations/catalog";
import { LOTERIA_DECK, LOTERIA_ROUNDS, LOTERIA_SITUATION, LOTERIA_UI, LOTERIA_UI_EN } from "../../src/editions/es/content/loteria";
import { LOTERIA_ACCEPT, LOTERIA_LINES, LOTERIA_MERGES } from "../../src/editions/es/content/loteria-lines";
import { learnerItems } from "../../src/editions/es/learner/walk";
import { CameraRig } from "../../src/game/camera";
import { Character } from "../../src/game/characters/Character";
import type { ModeHost } from "../../src/game/kit/host";
import { conversationLine, learnerTurn } from "../../src/game/kit/lines";
import { ModeRegistry, type ModeScreen } from "../../src/game/kit/modes";
import { BETOS_STAND, LOTERIA_APPROACH, LOTERIA_BULBS, LOTERIA_HOLDER, TONAS_SEAT, TABLES, TABLE_Z } from "../../src/game/loteria/location";
import { BETO_STAGE_YAW, frameLoteria, HOLDER_AT, loteriaHeadBounds, loteriaShot } from "../../src/game/loteria/framing";
import { cardsNeeded, listenStage, LoteriaRoundState, roundKind, winningPattern } from "../../src/game/loteria/logic";
import { loteriaDusk, loteriaTables } from "../../src/game/loteria/scene";
import { Colliders } from "../../src/game/world/util";
import { createLoteriaMode } from "../../src/game/loteria/mode";
import { useLoteria } from "../../src/game/loteria/store";
import { OUTDOOR_NPCS } from "../../src/game/world/layout";
import { useStore } from "../../src/state/store";
import { L } from "../../src/ui/i18n";
import { playSim } from "../../tools/sim-play";
import { codeSpeakers, unspoken } from "../../tools/es-voices/reach-es";

const sit = (await loadSituation(LOTERIA_SITUATION))!;
const allCells = Array.from({ length: 16 }, (_, i) => i);

describe("seeded lotería rules", () => {
  it("deals two boards and calls each card exactly once in repeatable order", () => {
    const first = new LoteriaRoundState(0, 1234), same = new LoteriaRoundState(0, 1234);
    expect(first.board).toEqual(same.board);
    expect(first.deck).toEqual(same.deck);
    expect(first.deck).not.toEqual(new LoteriaRoundState(0, 1235).deck);
    for (const board of [first.board, first.neighbor]) expect(new Set(board).size).toBe(16);
    expect(first.board).not.toEqual(first.neighbor);
    expect(first.deck).toHaveLength(54);
    expect(new Set(first.deck)).toEqual(new Set(LOTERIA_DECK));
    for (const card of first.deck) {
      expect(first.draw()).toBe(card);
      expect(first.draw()).toBeUndefined();
      first.reveal();
    }
    expect(first.called).toEqual(first.deck);
    expect(first.draw()).toBeUndefined();
  });

  it("recognizes every row, column and diagonal, the corners and a full tabla", () => {
    const lines = [
      [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15],
      [0, 4, 8, 12], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15],
      [0, 5, 10, 15], [3, 6, 9, 12],
    ];
    for (const line of lines) {
      expect(winningPattern("linea", new Set(line))).toEqual(line);
      expect(cardsNeeded("linea", new Set(line.slice(1)))).toBe(1);
      expect(winningPattern("esquinas", new Set(line))).toBeUndefined();
    }
    expect(winningPattern("esquinas", new Set([0, 3, 12, 15]))).toEqual([0, 3, 12, 15]);
    expect(winningPattern("esquinas", new Set([0, 3, 12, 14]))).toBeUndefined();
    expect(winningPattern("llena", new Set(allCells.slice(1)))).toBeUndefined();
    expect(winningPattern("llena", new Set(allCells))).toEqual(allCells);
    expect(allCells.slice(0, 7).map(roundKind)).toEqual([...LOTERIA_ROUNDS, ...LOTERIA_ROUNDS, "linea"]);
    expect([1, 6, 7, 14, 15, 54].map((n) => listenStage(0, n))).toEqual(["glow", "glow", "plain", "plain", "ear", "ear"]);
    expect(listenStage(1, 1)).toBe("plain");
  });

  it("rejects premature marks, accepts old calls and counts a hidden card only once", () => {
    const round = new LoteriaRoundState(0, 1234);
    const positions = round.board.map((card) => round.deck.indexOf(card)).sort((a, b) => a - b);
    const early = round.board.indexOf(round.deck[positions[0]]);
    const late = round.board.indexOf(round.deck[positions.find((i) => i >= 14)!]);
    expect(round.cover(early)).toBe("uncalled");
    expect(round.cover(16)).toBe("ignored");
    expect(round.shout()).toBe(false);
    while (round.current !== round.board[late]) {
      round.reveal();
      round.draw();
    }
    expect(round.faceDown).toBe(true);
    expect(round.cover(early)).toBe("covered");
    expect(round.cover(late)).toBe("covered");
    expect(round.cover(late)).toBe("ignored");
    expect([...round.byEar]).toEqual([late]);
    round.reveal();
    expect(round.faceDown).toBe(false);
    while (round.draw()) round.reveal();
    allCells.forEach((i) => round.cover(i));
    expect(round.winner).toBeNull();
    expect(round.shout()).toBe(true);
    expect(round.winner).toBe("learner");
    expect(round.shout()).toBe(false);
  });

  it("holds Doña Toña a card short except on roughly one fifth of later boards", () => {
    let wins = 0;
    for (const i of [0, 1, 2]) {
      for (let seed = 0; seed < 100; seed++) {
        const round = new LoteriaRoundState(i, seed);
        while (round.draw()) round.reveal();
        if (i > 0 && round.neighborCanWin) {
          expect(round.winner).toBe("neighbor");
          wins++;
        } else {
          expect(round.winner).toBeNull();
          expect(cardsNeeded(round.kind, round.neighborCovered)).toBe(1);
        }
      }
    }
    expect(wins).toBeGreaterThan(25);
    expect(wins).toBeLessThan(55);
  });
});

describe("Lotería content", () => {
  it("registers the cast, chat, keepsake and localizable words", () => {
    expect(SITUATION_BY_ID[sit.id]).toMatchObject({ bonus: true, chapter: 9, order: 9, location: "town-square", npc: "tona" });
    expect(ROUTE.some(({ id }) => id === sit.id)).toBe(false);
    expect(KEEPSAKES[sit.id]).toBe("loteria_card");
    expect(OUTDOOR_NPCS.find(({ npc }) => npc === "tona")).toMatchObject({ ...TONAS_SEAT, sit: true });
    expect(OUTDOOR_NPCS.some(({ npc }) => npc === "beto")).toBe(false);
    expect(NPCS.tona.look.acc).toContain("rebozo");
    expect(NPCS.beto.look.acc).toEqual(expect.arrayContaining(["jipi", "mustache"]));
    expect(sit.merges).toEqual(LOTERIA_MERGES);
    expect(Object.keys(LOTERIA_MERGES).sort()).toEqual(["don beto", "doña toña", "pa'l"]);
    const items = learnerItems(sit);
    for (const [key, [line]] of Object.entries(LOTERIA_LINES)) {
      const npc = key.startsWith("lt_t_") ? "tona" : "beto";
      const sentence = conversationLine(sit.id, npc, key, undefined, false);
      expect(sentence?.units, key).toHaveLength(splitUnits(line.en).length);
      expect(items.some((item) => item.kind === "sent" && item.es === line.en), key).toBe(true);
      if (key === "lt_a_loteria") expect(unspoken(sit.id, key)).toBe(true);
      else expect([...(codeSpeakers(sit).get(key) ?? [])], key).toEqual([npc]);
    }
    expect(L(LOTERIA_UI.calledCount, { n: 6 })).toBe("Cards called: 6");
    expect(L(LOTERIA_UI.wonBy, { nom: NPCS.tona.name })).toBe("Doña Toña won");
    expect(LOTERIA_UI_EN[LOTERIA_UI.again]).toBe("Again");
  });

  it("accepts each supplied spoken variant and has exactly the declared verses", () => {
    const keys = ["lt_a_loteria", ...LOTERIA_DECK.map(({ id }) => `lt_c_${id}`)];
    expect(Object.keys(LOTERIA_ACCEPT).sort()).toEqual(keys.sort());
    for (const key of keys) {
      const sentence = conversationLine(sit.id, "beto", key, undefined, true)!;
      const match = learnerTurn([{ key, sentence }], LOTERIA_ACCEPT);
      expect(LOTERIA_ACCEPT[key].length).toBeGreaterThan(1);
      for (const alternative of LOTERIA_ACCEPT[key]) expect(match.read(alternative).answer?.key).toBe(key);
      expect(match.read("no sé").answer).toBeUndefined();
    }
    for (const card of LOTERIA_DECK) expect(Object.hasOwn(LOTERIA_LINES, `lt_v_${card.id}`), card.id).toBe(card.verse);
  });

  const nlu = buildNlu(sit, GLOBAL, NPCS);
  for (const row of sit.tests ?? []) {
    it(`recognizes ${row.say}`, () => {
      const expected = sit.steps.find(({ id }) => id === row.step)?.expects ?? [];
      expect(nlu.parse(row.say, expected).best?.segments[0]?.intent).toBe(row.intent);
    });
  }
  for (const sim of sit.sims ?? []) {
    it(sim.name, () => {
      const { start, turns, unused, conv } = playSim(sit, sim, 1);
      expect(start.lines[0].lineId).toBe("again");
      expect(unused).toBe(0);
      expect(conv.completed).toBe(sim.expect.complete);
      if (sim.expect.state) expect(conv.s).toMatchObject(sim.expect.state);
      const outs = [start, ...turns.map(({ out }) => out)];
      const events = outs.flatMap(({ events }) => events.map(({ name }) => name));
      expect(events).toEqual(sim.expect.complete ? ["loteria"] : []);
      expect(outs.flatMap(({ lines }) => lines).at(-1)?.lineId).toBe(sim.expect.complete ? "lets_play" : "bye");
    });
  }
});

describe("lotería scene", () => {
  it("merges the set, leaves the talk approach free and restores the daylight exactly", () => {
    const colliders = new Colliders();
    const group = loteriaTables(colliders);
    expect(group.children).toHaveLength(4);
    expect(group.getObjectByName(LOTERIA_BULBS)?.visible).toBe(false);
    expect(group.getObjectByName(LOTERIA_HOLDER)).toBeDefined();
    for (const x of TABLES) expect(colliders.blocked(x, TABLE_Z, 0.45)).toBe(true);
    expect(colliders.blocked(LOTERIA_APPROACH.x, LOTERIA_APPROACH.z, 0.45)).toBe(false);

    const material = new ShaderMaterial({
      uniforms: { top: { value: new Color(0x445566) }, mid: { value: new Color(0xabcedf) }, bottom: { value: new Color(0xeeeaaa) } },
    });
    const sky = new Mesh(undefined, material);
    const sun = new DirectionalLight(0xffffff, 2.5), hemi = new HemisphereLight(0x99bbff, 0x448822, 1.6);
    const fog = new Fog("#cceeff", 12, 30);
    const snapshot = () => [sun.intensity, hemi.intensity, fog.color.getHex(), ...Object.values(material.uniforms).map(({ value }) => value.getHex())];
    const before = snapshot(), restore = loteriaDusk(sky, sun, hemi, fog);
    expect(snapshot()).not.toEqual(before);
    restore();
    expect(snapshot()).toEqual(before);
  });

  it.each([[390, 664, 58], [390, 844, 166], [1280, 800, 530]])("frames Beto, his holder and Toña at %i×%i", (width, height, freeHeight) => {
    const { cam } = new CameraRig(width / height);
    const area = { left: 12, top: 42, width: width > 740 ? 642 : width - 24, height: freeHeight };
    const beto = new Vector3(BETOS_STAND.x, 1.52, BETOS_STAND.z);
    const tona = new Vector3(TONAS_SEAT.x, 1.42, TONAS_SEAT.z);
    const screen = (point: Vector3) => {
      const p = point.clone().project(cam);
      return { x: (p.x + 1) * width / 2, y: (1 - p.y) * height / 2 };
    };
    const headWidth = (point: Vector3) => Math.abs(screen(point.clone().add(new Vector3(0, 0, .25))).x
      - screen(point.clone().add(new Vector3(0, 0, -.25))).x);
    for (const score of [false, true]) {
      const shot = loteriaShot(score);
      cam.fov = shot.fov;
      cam.position.copy(shot.pos);
      cam.lookAt(shot.look);
      frameLoteria(cam, width, height, area, beto, tona, score);

      for (const point of [...loteriaHeadBounds(beto), ...loteriaHeadBounds(tona), HOLDER_AT]) {
        const { x, y } = screen(point);
        expect(x).toBeGreaterThan(area.left);
        expect(x).toBeLessThan(area.left + area.width);
        expect(y).toBeGreaterThan(area.top);
        expect(y).toBeLessThan(area.top + area.height);
      }
      expect((screen(beto).x - area.left) / area.width).toBeGreaterThan(.36);
      expect((screen(beto).x - area.left) / area.width).toBeLessThan(.55);
      expect(screen(tona).x).toBeGreaterThan(screen(beto).x);
      expect(headWidth(tona)).toBeLessThan(headWidth(beto) * 1.22);
      if (!score) {
        const headHeight = screen(beto.clone().setY(1.3)).y - screen(beto.clone().setY(1.8)).y;
        if (width > 740) {
          const waist = screen(beto.clone().setY(0.87));
          const upperBody = waist.y - screen(beto.clone().setY(1.88)).y;
          expect(waist.y).toBeLessThan(area.top + area.height);
          expect(upperBody / area.height).toBeGreaterThan(0.29);
          expect(upperBody / area.height).toBeLessThan(0.39);
        } else {
          expect(headHeight).toBeGreaterThan(freeHeight < 70 ? 25 : 40);
        }
      }
    }
  });
});

it("launches from the queued chat event, reads a winning line, restarts at corners and restores the scene", async () => {
  expect(getSituation(sit.id)).toBe(sit);
  const player = new Character(NPCS.tona.look);
  const tona = new Character(NPCS.tona.look);
  tona.root.position.set(TONAS_SEAT.x, 0, TONAS_SEAT.z);
  tona.root.rotation.y = TONAS_SEAT.rot;
  tona.setAnim("sit");
  const scene = new Scene();
  const bulbs = new Group();
  bulbs.visible = false;
  const daylight = vi.fn();
  let screen: ModeScreen | null = null;
  const registry = new ModeRegistry({ read: () => screen, set: (next) => { screen = next; } });
  const host = {
    player: () => player, rig: new CameraRig(1), add: (...objects) => scene.add(...objects),
    canStart: () => true, owns: (id) => registry.owns(id), fade: (go) => { go(); return true; },
    place: (x, z, rot) => { player.root.position.set(x, 0, z); player.root.rotation.y = rot; },
    entered: (id) => registry.entered(id), left: (id) => registry.left(id), prepare() {}, updatePose() {},
  } satisfies Partial<ModeHost>;
  const mode = createLoteriaMode(host, {
    npc: (id) => id === "tona" ? tona : undefined,
    prop: (id) => id === LOTERIA_BULBS ? bulbs : undefined,
    dusk: () => daylight, save() {},
  })!;
  const tick = async (test: () => boolean) => {
    for (let i = 0; i < 1600; i++) {
      if (test()) return;
      registry.update({ dt: 0.5, time: i / 2, x: 0, y: 0, brake: false, blocked: false });
      await Promise.resolve();
      await Promise.resolve();
    }
    throw new Error(`Mode stalled at ${useLoteria.getState().phase}`);
  };
  const sfx = vi.spyOn(audio, "sfx").mockImplementation(() => {});
  const settings = useStore.getState().settings;
  useStore.setState({ settings: { ...settings, volume: 0 } });
  try {
    registry.register(mode);
    mode.debug(1, 4);
    expect(registry.offer(sit.id)).toEqual({ id: "loteria", label: LOTERIA_UI_EN[LOTERIA_UI.start] });
    registry.event("loteria", null);
    expect(registry.hasQueued).toBe(true);
    registry.launchQueued();
    expect(screen).toMatchObject({ id: "loteria" });
    expect(bulbs.visible).toBe(true);
    expect(player.anim).toBe("sit");
    expect(player.root.visible).toBe(false);
    const caller = scene.getObjectByName("loteria-beto")!;
    caller.updateMatrixWorld(true);
    const eye = loteriaShot().pos;
    for (const x of [-0.13, 0, 0.13]) {
      const edge = new Vector3(x, 0, 0).applyAxisAngle(new Vector3(0, 1, 0), BETO_STAGE_YAW);
      const toHolder = HOLDER_AT.clone().add(edge).sub(eye);
      const sightline = new Raycaster(eye, toHolder.clone().normalize(), 0, toHolder.length());
      expect(sightline.intersectObject(caller)).toHaveLength(0);
    }
    await tick(() => {
      const { board, current, phase, ready } = useLoteria.getState();
      if (phase === "waiting") {
        const index = board.findIndex((card) => card.id === current?.id);
        if (index >= 0) mode.action("cover", String(index));
      }
      return ready;
    });
    mode.action("shout");
    await tick(() => useLoteria.getState().choices.length === 4);
    const first = useLoteria.getState().read.map(({ id }) => id);
    for (const card of first) {
      await tick(() => useLoteria.getState().choices.some(({ key }) => key === `lt_c_${card}`));
      mode.action("read", `lt_c_${card}`);
    }
    await tick(() => !!useLoteria.getState().result);
    expect(useLoteria.getState().result).toMatchObject({ winner: "learner", phrases: 8 });
    mode.action("again");
    expect(useLoteria.getState()).toMatchObject({ kind: "esquinas", next: "llena", phase: "opening", covered: [], glow: -1 });
    registry.exit();
    await tick(() => !registry.active);
    expect(daylight).toHaveBeenCalledOnce();
    expect(screen).toBeNull();
    expect(bulbs.visible).toBe(false);
    expect(tona.root.rotation.y).toBe(TONAS_SEAT.rot);
    expect(player.anim).toBe("idle");
    expect(player.root.visible).toBe(true);
    expect(player.root.position.toArray()).toEqual([LOTERIA_APPROACH.x, 0, LOTERIA_APPROACH.z]);
    expect(scene.children).toHaveLength(0);
  } finally {
    registry.dispose();
    sfx.mockRestore();
    player.dispose();
    tona.dispose();
    useStore.setState({ settings });
  }
});
