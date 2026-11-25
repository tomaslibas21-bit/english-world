import * as THREE from "three";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LOOKS } from "../../src/ui/Title";
import type { Accessory } from "../../src/content/npcs";
import { SURF } from "../../src/content/surf";
import { loadSituation } from "../../src/content/situations/catalog";
import { Character } from "../../src/game/characters/Character";
import { StyledCharacter } from "../../src/game/characters/StyledCharacter";
import { surfLook, withBackpack } from "../../src/game/characters";
import { CameraRig } from "../../src/game/camera";
import { Game } from "../../src/game/Game";
import { SURF_SPOT } from "../../src/game/world/surf";
import { arrowFor, NO_INPUT, type Do, type Phase, type SurfArrow, type SurfInput } from "../../src/game/surf/logic";
import { SurfPlay } from "../../src/game/surf/play";
import { Surf } from "../../src/game/surf/Surf";
import { EMPTY_SCORE, useSurf, type SurfUi } from "../../src/game/surf/store";
import { SurfOverlay, SurfPicker } from "../../src/ui/Surf";

vi.mock("../../src/game/surf/store", async (load) => {
  const store = await load<typeof import("../../src/game/surf/store")>();
  return {
    ...store,
    useSurf: Object.assign((select = (state: SurfUi) => state) => select(store.useSurf.getState()), store.useSurf),
  };
});

describe("surf totals", () => {
  it.each([
    [1, 2, "1 wave, 2 seconds"],
    [2, 1, "2 waves, 1 second"],
    [1, 1, "1 wave, 1 second"],
    [2, 0, "2 waves, 0 seconds"],
  ])("shows the totals for %i waves and %i seconds on both cards", (waves, seconds, expected) => {
    const previous = useSurf.getState();
    try {
      useSurf.setState({ picking: true, best: { waves, seconds } });
      expect(renderToStaticMarkup(createElement(SurfPicker))).toContain(`All time: ${expected} riding`);

      useSurf.setState({ picking: false, active: true, over: true, best: { waves: waves - 1, seconds }, score: { ...EMPTY_SCORE, waves: 1 } });
      expect(renderToStaticMarkup(createElement(SurfOverlay, { toolbar: null }))).toContain(`All time: ${expected} riding`);
    } finally {
      useSurf.setState(previous);
    }
  });
});

function gameWith(normal: Character | StyledCharacter): Game {
  return Object.assign(Object.create(Game.prototype), { player: normal, playerLook: normal.look, normalPlayer: normal });
}

describe("surf clothes", () => {
  it.each(LOOKS)("keeps the player recognizable in $id", ({ look, gender }) => {
    const original = { ...withBackpack(look), female: gender === "f", carry: "bag" as const, phone: true };
    const dressed = surfLook(Object.freeze(original));
    expect(dressed).toMatchObject({
      skin: look.skin, hair: look.hair, top: look.top, bottom: look.bottom, female: original.female,
      rash: true, sleeves: "short", swim: "trunks", shorts: false, skirt: false, flipflops: true, shoes: look.skin,
    });
    const surfer = new Character(dressed);
    const meshes: THREE.SkinnedMesh[] = [];
    surfer.root.traverse((part) => { if (part instanceof THREE.SkinnedMesh) meshes.push(part); });
    expect(meshes).toHaveLength(1);
    expect(meshes[0].geometry.groups).toHaveLength(0);
    surfer.dispose();
    for (const prop of ["backpack", "carry", "phone"]) expect(dressed).not.toHaveProperty(prop);
  });

  it("keeps the face and proportions and filters accessories without changing the original", () => {
    const keep: Accessory[] = ["beard", "mustache", "earrings", "flower"];
    const drop: Accessory[] = [
      "glasses", "sunglasses", "shades", "readers", "hat", "cap", "scarf", "tie", "bowtie", "cardigan",
      "vest", "apron", "lanyard", "badge", "headset", "pilot", "chef", "police", "coverup", "sarong", "hipil",
    ];
    const look = { ...LOOKS[0].look, height: 1.1, build: 0.9, face: { brow: 0.8 }, acc: [...drop, ...keep] };
    expect(surfLook(look)).toMatchObject({ height: look.height, build: look.build, face: look.face, acc: keep });
    expect(look.acc).toEqual([...drop, ...keep]);
  });

  it.each([["blocks", Character], ["styled", StyledCharacter]] as const)("swaps the cached characters in place from %s", (_style, NormalCharacter) => {
    const look = withBackpack(LOOKS[0].look);
    const normal = new NormalCharacter(look);
    const group = new THREE.Group();
    group.add(normal.root);
    normal.root.position.set(1, 2, 3);
    normal.root.rotation.set(0.1, 0.2, 0.3, "YXZ");
    normal.setAnim("walk");
    const game = gameWith(normal);

    game.dressPlayer("surf");
    const surfer = game.player as Character;
    expect(game.outfit).toBe("surf");
    expect(surfer).not.toBe(normal);
    expect(surfer.backpackVisible).toBe(false);
    expect(surfer.surf).toBeDefined();
    expect(surfer.root.position.equals(normal.root.position)).toBe(true);
    expect(surfer.root.rotation.equals(normal.root.rotation)).toBe(true);
    expect(surfer.anim).toBe("walk");
    expect(group.children).toEqual([surfer.root]);

    surfer.root.position.set(4, 5, 6);
    surfer.setAnim("idle");
    game.dressPlayer(null);
    expect(game.outfit).toBeNull();
    expect(game.player).toBe(normal);
    expect(normal.root.position.toArray()).toEqual([4, 5, 6]);
    expect(normal.anim).toBe("idle");
    expect(group.children).toEqual([normal.root]);
    if (normal instanceof Character) expect(normal.backpackVisible).toBe(true);
    game.dressPlayer("surf");
    expect(game.player).toBe(surfer);
  });

  it("dresses during the fade, keeps the outfit for another lesson, and restores it on exit", async () => {
    const spot = SURF_SPOT!, content = SURF!;
    await loadSituation(content.situation);
    const look = withBackpack(LOOKS[0].look), normal = new Character(look);
    const game = gameWith(normal);
    let fade: (() => void) | undefined;
    const player = () => game.player, splash = vi.fn(), left = vi.fn();
    const play = new SurfPlay(spot, content, {
      player, splash, left, rig: new CameraRig(1), time: () => 0, hideNpc: vi.fn(), entered: vi.fn(),
      dressPlayer: (outfit) => game.dressPlayer(outfit),
      fade: (inDark) => { fade = inDark; return true; },
    });
    play.scene = new Surf(spot, { get player() { return player(); }, aspect: 1, splash }, play.group);
    const throughFade = () => { const inDark = fade!; fade = undefined; inDark(); };

    play.start("beginner");
    expect(game.player).toBe(normal);
    throughFade();
    const surfer = game.player as Character;
    expect(game.outfit).toBe("surf");
    expect(surfer.backpackVisible).toBe(false);
    expect(surfer.root.rotation.order).toBe("YXZ");

    play.again("advanced");
    expect(game.player).toBe(surfer);
    throughFade();
    expect(game.player).toBe(surfer);
    expect(left).not.toHaveBeenCalled();

    play.stop();
    expect(game.player).toBe(surfer);
    throughFade();
    expect(game.player).toBe(normal);
    expect(normal.backpackVisible).toBe(true);
    expect(normal.root.rotation.order).toBe("XYZ");
    expect(game.outfit).toBeNull();
    expect(left).toHaveBeenCalledWith(spot.start.x, spot.start.z, spot.start.rot);

    play.start("beginner");
    throughFade();
    play.again();
    play.stop(true);
    throughFade();
    expect(play.active).toBe(false);
    expect(game.player).toBe(normal);
  });
});

describe("surf arrows", () => {
  it("shows the arrows for every move", () => {
    const expected: Record<Do, SurfArrow[]> = {
      paddle: ["up"], duck: ["down"], turn: ["left", "right"], up: ["up"], left: ["left"],
      right: ["right"], down: ["down"], fwd: ["up"], jump: ["up"], steady: [],
    };
    for (const what of Object.keys(expected) as Do[]) expect(arrowFor(what)).toEqual(expected[what]);
  });

  function controls(todo: Do | null, phase: Phase) {
    const play = new SurfPlay(SURF_SPOT!, SURF!, {} as ConstructorParameters<typeof SurfPlay>[2]);
    const keys = new Set<string>();
    const logic = { todo: todo && { do: todo }, phase, setSlow: vi.fn() };
    let input = NO_INPUT;
    Object.assign(play, {
      logic, sync: () => {},
      scene: { update: (_dt: number, _t: number, next: SurfInput) => { input = next; } },
    });
    const step = () => {
      play.update(1 / 60, 0, 0, keys.has("arrowup") || keys.has("w") ? 1 : 0, false);
      return input;
    };
    return { play, logic, step, press: (key: string, repeat = false) => play.key(key, repeat, keys) };
  }

  it.each(["ArrowUp", "W"])("%s strokes once per press and never pushes up during paddling", (key) => {
    const { logic, press, step } = controls("paddle", "catch");
    expect(press(key)).toBe(true);
    expect(step()).toEqual({ ...NO_INPUT, stroke: true });
    logic.todo = null;
    press(key, true);
    expect(step()).toEqual(NO_INPUT);
    press(key);
    expect(step()).toEqual({ ...NO_INPUT, y: 1 });
  });

  it.each(["ArrowUp", "W"])("%s jumps instead of leaning forward when asked for a trick", (key) => {
    const { press, step } = controls("jump", "ride");
    press(key);
    expect(step()).toEqual({ ...NO_INPUT, up: true });
    press(key, true);
    expect(step()).toEqual(NO_INPUT);
  });

  it("combines held phone arrows and releases each one independently", () => {
    const { play, step } = controls("fwd", "ride");
    play.arrow("left", true);
    play.arrow("up", true);
    expect(step()).toEqual({ ...NO_INPUT, x: -1, y: 1 });
    play.arrow("right", true);
    expect(step()).toEqual({ ...NO_INPUT, y: 1 });
    play.arrow("up", false);
    play.arrow("left", false);
    expect(step()).toEqual({ ...NO_INPUT, x: 1 });
    play.arrow("right", false);
    expect(step()).toEqual(NO_INPUT);
  });

  it("reads a quick tap once even when the thumb lifts between frames", () => {
    const { play, step } = controls("duck", "out");
    play.arrow("down", true);
    play.arrow("down", false);
    expect(step()).toEqual({ ...NO_INPUT, y: -1 });
    expect(step()).toEqual(NO_INPUT);
  });

  it("shares the paddle and trick inputs between the phone arrows and move taps", () => {
    const { play, logic, step } = controls("paddle", "catch");
    play.arrow("up", true);
    play.arrow("up", true);
    expect(step()).toEqual({ ...NO_INPUT, stroke: true });
    expect(step()).toEqual(NO_INPUT);
    play.arrow("up", false);
    play.act("paddle");
    expect(step()).toEqual({ ...NO_INPUT, stroke: true });
    logic.todo = { do: "jump" };
    play.arrow("up", true);
    expect(step()).toEqual({ ...NO_INPUT, up: true });
    play.arrow("up", false);
    play.act("jump");
    expect(step()).toEqual({ ...NO_INPUT, up: true });
  });
});
