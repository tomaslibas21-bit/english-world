import { afterEach, describe, expect, it, vi } from "vitest";
import { Group, Mesh, Vector3 } from "three";
import { CameraRig } from "../src/game/camera";
import { NPCS } from "../src/content/npcs";
import type { GameCharacter, CharacterJoint } from "../src/game/characters";
import { Character } from "../src/game/characters/Character";
import { StyledCharacter } from "../src/game/characters/StyledCharacter";
import { KaraokeMode } from "../src/game/karaoke/mode";
import { KARAOKE_MARK, KARAOKE_PROMPT, addKaraokeBooth, makeKaraokeMic, karaokeShot } from "../src/game/karaoke/stage";
import { resetKaraokeUi, useKaraoke } from "../src/game/karaoke/store";
import type { ModeHost } from "../src/game/kit/host";
import { ModeRegistry, type ModeScreen } from "../src/game/kit/modes";
import { Colliders } from "../src/game/world/util";
import { NavGrid } from "../src/game/nav";
import { townCanvasDocument } from "../tools/town-canvas-stub";
import { Radio } from "../src/radio/radio";
import type { RadioOutput } from "../src/radio/output";
import { audio } from "../src/game/audio";

function actor() {
  const root = new Group(), rightHand = new Group(), joints = new Map<CharacterJoint, Group>();
  root.add(rightHand);
  return {
    root, rightHand, headJoint: new Group(), height: 1.75, anim: "idle",
    joint(name: CharacterJoint) { if (!joints.has(name)) joints.set(name, new Group()); return joints.get(name)!; },
    setAnim(this: GameCharacter, anim: GameCharacter["anim"]) { this.anim = anim; },
    update() {}, talk() {},
  } as GameCharacter;
}

async function fixture({ configured = true, ready = true, player = actor(), guests = [actor(), actor()] } = {}) {
  const out: RadioOutput = {
    play: vi.fn(async () => true), pause: vi.fn(), position: () => 7.25,
    setVolume() {}, unlock() {}, onEnded: null, onStopped: null,
  };
  const radio = new Radio({
    config: configured ? { index: "/songs/index.json", files: null, recordings: null } : null,
    output: out, token: () => null, volume: () => 1, storageKey: "karaoke-mode-test",
    stations: [{ id: "grammar", name: "Grammar", freq: 94, lt: "", has: () => true }],
    fetchJson: async (url) => url.includes("index") ? { songs: [
      { id: "G01", c: "g", n: 1, t: "Home", a: "/G01.mp3", d: 20 },
    ] } : { L: [{ s: 1, e: 5, src: "Every evening", u: [["Every", "Kiekvieną", 1], ["evening", "vakarą", 1]], w: [[1, 2], [2, 5]] }] },
  });
  if (ready) await radio.init();
  player.root.position.set(KARAOKE_PROMPT.x, 0, KARAOKE_PROMPT.z);
  player.root.rotation.y = 0.72;
  player.joint("foreR").rotation.x = 0.3;
  guests[0].watch = new Vector3(3, 1.3, 0);
  guests[0].steady = false;
  const room = new Group(), dock = new Group();
  dock.name = "karaoke-docked-mic";
  room.add(dock);
  let inside = true, canStart = true, screen: ModeScreen | null = null;
  const registry = new ModeRegistry({ read: () => screen, set: (value) => { screen = value; } });
  const rig = new CameraRig(1.6);
  rig.mode = "interior";
  rig.target.copy(player.root.position);
  rig.snap();
  rig.applyPose();
  const place = vi.fn((x: number, z: number, rot: number) => {
    player.root.position.set(x, 0, z);
    player.root.rotation.y = rot;
    rig.target.set(x, 0, z);
    rig.yaw = rot;
    rig.snap();
  });
  const host = {
    player: () => player, rig, canStart: () => canStart, prepare: vi.fn(), updatePose: (dt: number) => player.update(dt),
    entered: (id: string) => registry.entered(id), left: (id: string) => registry.left(id),
  } as unknown as ModeHost;
  const mode = new KaraokeMode(host, { room: () => inside ? room : null, audience: () => guests, place }, radio);
  registry.register(mode);
  return { mode, registry, player, guests, dock, out, radio, rig, place,
    screen: () => screen, setInside: (value: boolean) => { inside = value; }, setCanStart: (value: boolean) => { canStart = value; } };
}
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
afterEach(() => { resetKaraokeUi(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("the café karaoke mode", () => {
  it("starts the word mode and routes its Reveal and native speed actions to the borrowed take", async () => {
    const f = await fixture();
    f.registry.start("karaoke"); await flush();
    f.mode.action("select", "G01"); f.mode.action("mode", "word"); f.mode.action("start"); await flush();
    const take = f.radio.store.getState().karaoke!;
    expect(take.store.getState().practice?.mode).toBe("word");
    const reveal = vi.spyOn(take, "revealWord"), rate = vi.spyOn(take, "setRate");
    f.mode.action("reveal"); f.mode.action("rate", "0.8");
    expect(reveal).toHaveBeenCalledOnce(); expect(rate).toHaveBeenCalledExactlyOnceWith(0.8);
    f.registry.exit(true);
  });

  it("celebrates a natural finish once, waits for a hold to clear and uses still feedback with reduced motion", async () => {
    const cheer = vi.spyOn(audio, "sfx").mockImplementation(() => {});
    const f = await fixture();
    f.guests.forEach((guest) => { guest.react = vi.fn(); });
    f.registry.start("karaoke"); await flush();
    f.mode.action("select", "G01"); f.mode.action("start"); await flush();
    const take = f.radio.store.getState().karaoke!;
    take.store.setState({ held: true });
    const ended = f.out.onEnded!;
    ended();
    expect(cheer).not.toHaveBeenCalledWith("crowdCheer", 0.5);
    take.store.setState({ held: false });
    expect(cheer).toHaveBeenCalledExactlyOnceWith("crowdCheer", 0.5);
    expect(f.guests[0].react).toHaveBeenCalledExactlyOnceWith("clap");
    ended(); take.store.setState({ held: false });
    expect(cheer).toHaveBeenCalledTimes(1);
    f.mode.action("back");
    expect(f.guests[0].react).toHaveBeenLastCalledWith(null);
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    f.mode.action("start"); await flush();
    f.out.onEnded!();
    expect(vi.mocked(f.guests[0].react!).mock.calls.filter(([reaction]) => reaction === "clap")).toHaveLength(1);
    expect(cheer).toHaveBeenCalledTimes(2);
    f.registry.exit(true);
  });
  it("offers only the configured indoor stand and refuses another conversation or mode", async () => {
    const f = await fixture();
    expect(f.registry.prompt(KARAOKE_PROMPT.x, KARAOKE_PROMPT.z, Infinity, false)).toBeNull();
    expect(f.registry.prompt(KARAOKE_PROMPT.x, KARAOKE_PROMPT.z, Infinity, true)?.kind).toBe("karaoke");
    expect(f.mode.prompt(0, 4)).toBeNull();
    f.setInside(false);
    expect(f.mode.start()).toBe(false);
    f.setInside(true); f.setCanStart(false);
    expect(f.registry.start("karaoke")).toBe(false);
    f.setCanStart(true);
    expect(f.registry.start("karaoke")).toBe(true);
    expect(f.screen()).toMatchObject({ id: "karaoke", kind: "menu" });
    expect(f.registry.start("barista")).toBe(false);
    expect(f.out.play).not.toHaveBeenCalled();
    f.registry.exit(true);
    expect(f.screen()).toBeNull();
    const off = await fixture({ configured: false });
    expect(off.mode.prompt(KARAOKE_PROMPT.x, KARAOKE_PROMPT.z)).toBeNull();
    expect(off.mode.start()).toBe(false);
  });

  it("browses silently, restores list state, stages the avatar and returns the exact scene", async () => {
    const f = await fixture();
    const playerPosition = f.player.root.position.clone(), camera = f.rig.cam.position.clone();
    const cameraLook = f.rig.cam.quaternion.clone(), target = f.rig.target.clone(), watched = f.guests[0].watch;
    const keepsake = new Group(); f.player.rightHand.add(keepsake);
    expect(f.registry.start("karaoke")).toBe(true);
    await flush();
    f.mode.action("filter", "grammar");
    useKaraoke.setState({ scroll: 412 });
    f.mode.action("select", "G01");
    expect(f.out.play).not.toHaveBeenCalled();
    f.mode.action("back");
    expect(useKaraoke.getState()).toMatchObject({ detail: null, selected: "G01", scroll: 412, filter: "grammar" });
    f.mode.action("select", "G01"); f.mode.action("start");
    await flush();
    expect(f.mode.performing).toBe(true);
    expect(f.player.root.position).toEqual(new Vector3(KARAOKE_MARK.x, KARAOKE_MARK.y, KARAOKE_MARK.z));
    expect(f.player.rightHand.getObjectByName("karaoke-hand-mic")).toBeTruthy();
    expect(f.dock.visible).toBe(false);
    expect(f.rig.mode).toBe("stage");
    expect(f.rig.cam.position).toEqual(f.rig.stage!.pos); // first playable frame, before the mode's next update
    f.mode.update({ dt: 0.05, time: 1, x: 0, y: 0, blocked: true, brake: false });
    expect(f.guests[0].steady).toBe(true);
    f.mode.action("back");
    expect(useKaraoke.getState()).toMatchObject({ phase: "picker", detail: "G01", scroll: 412 });
    expect(f.mode.performing).toBe(false);
    expect(f.player.root.position).toEqual(playerPosition);
    expect(f.guests[0].watch).toBe(watched);
    f.mode.action("start"); await flush();
    f.mode.action("leave");
    expect(f.registry.engaged).toBe(false);
    expect(f.player.root.position).toEqual(playerPosition);
    expect(f.player.root.rotation.y).toBeCloseTo(0.72);
    expect(f.player.joint("foreR").rotation.x).toBeCloseTo(0.3);
    expect(f.player.rightHand.children).toEqual([keepsake]);
    expect(f.rig.cam.position).toEqual(camera);
    expect(f.rig.cam.quaternion.toArray()).toEqual(cameraLook.toArray());
    expect(f.rig.target).toEqual(target);
    expect(f.rig.mode).toBe("interior");
    expect(f.dock.visible).toBe(true);
    expect(f.radio.store.getState().karaoke).toBeNull();
    expect(useKaraoke.getState().phase).toBe("closed");
    f.mode.dispose();
    expect(f.registry.start("karaoke")).toBe(true);
    f.registry.exit(true);
  });

  it("cancels a pending take and late catalog work on disposal", async () => {
    const f = await fixture({ ready: false });
    f.registry.start("karaoke"); f.mode.dispose(); await flush();
    expect(useKaraoke.getState().phase).toBe("closed");
    f.registry.start("karaoke"); await flush();
    let finish!: (value: boolean) => void;
    f.out.play = vi.fn(() => new Promise<boolean>((resolve) => { finish = resolve; }));
    f.mode.action("select", "G01"); f.mode.action("start"); await flush();
    f.mode.dispose(); finish(true); await flush();
    expect(f.mode.active).toBe(false);
    expect(f.mode.performing).toBe(false);
    expect(f.player.rightHand.children).toHaveLength(0);
    expect(f.registry.engaged).toBe(false);
  });

  it("attaches and releases the mic on both avatar rigs and cleans up an externally closed session", async () => {
    vi.stubGlobal("document", townCanvasDocument());
    for (const player of [new Character(NPCS.mia.look), new StyledCharacter(NPCS.rosa.look)]) {
      const f = await fixture({ player });
      f.registry.start("karaoke"); await flush();
      f.mode.action("select", "G01"); f.mode.action("start"); await flush();
      f.mode.update({ dt: 0.05, time: 1, x: 0, y: 0, blocked: true, brake: false });
      player.root.updateMatrixWorld(true);
      const mic = player.rightHand.getObjectByName("karaoke-hand-mic")!;
      expect(mic).toBeTruthy();
      expect(mic.getWorldPosition(new Vector3()).toArray().every(Number.isFinite)).toBe(true);
      const palm = player.joint("foreR").worldToLocal(mic.getWorldPosition(new Vector3()));
      expect(palm.x).toBeCloseTo(0);
      expect(palm.y).toBeCloseTo(player.rightHand.position.y);
      expect(palm.z).toBeCloseTo(player.rightHand.position.z * 0.45);
      const grip = mic.getWorldPosition(new Vector3());
      expect(grip.y - player.root.position.y).toBeGreaterThan(player.height * 0.6);
      const mouth = player.root.localToWorld(new Vector3(0.04, player.height * 0.83, 0.18));
      const grille = mic.localToWorld(new Vector3(0, 0.15, 0));
      expect(grille.distanceTo(mouth)).toBeLessThan(grip.distanceTo(mouth));
      expect(grille.y).toBeGreaterThan(grip.y);
      f.radio.shutdown();
      expect(f.mode.active).toBe(false);
      expect(f.registry.engaged).toBe(false);
      expect(player.rightHand.getObjectByName("karaoke-hand-mic")).toBeUndefined();
      if (player instanceof Character) player.dispose();
    }
  });

  it("restores the walking yaw and both seated guests across repeated takes and applause", async () => {
    vi.stubGlobal("document", townCanvasDocument());
    vi.spyOn(audio, "sfx").mockImplementation(() => {});
    const player = new Character(NPCS.mia.look);
    const guests: GameCharacter[] = [new Character(NPCS.mia.look), new StyledCharacter(NPCS.rosa.look)];
    const f = await fixture({ player, guests });
    // The walk from the café door ends beyond 90°. Quaternion → Euler conversion can instead return a
    // smaller yaw with 180° pitch/roll: equivalent now, but wrong when walking next updates yaw alone.
    player.root.rotation.y = 2.35;
    guests.forEach((guest, i) => {
      guest.root.position.set(3, 0, i ? -0.45 : 1.45);
      guest.root.rotation.y = i ? 0 : Math.PI;
      guest.seatY = 0.5; guest.setAnim("sit"); guest.update(0.05);
    });
    const actors = [player, ...guests];
    const before = actors.map(({ root }) => ({ position: root.position.toArray(), rotation: root.rotation.toArray() }));
    const checkRestored = () => expect(actors.map(({ root }) => ({
      position: root.position.toArray(), rotation: root.rotation.toArray(),
    }))).toEqual(before);
    f.registry.start("karaoke"); await flush();
    f.mode.action("select", "G01");
    for (let take = 0; take < 2; take++) {
      f.mode.action("start"); await flush();
      for (let frame = 0; frame < 10; frame++) {
        f.mode.update({ dt: 0.05, time: frame * 0.05, x: 0, y: 0, blocked: true, brake: false });
        guests.forEach((guest) => guest.update(0.05));
      }
      f.out.onEnded!();
      guests.forEach((guest) => guest.update(0.05));
      f.mode.action(take ? "leave" : "back");
      checkRestored();
    }
    actors.forEach((actor) => actor.update(0.05));
    checkRestored();
    expect(guests.every((guest) => guest.anim === "sit")).toBe(true);
    expect(player.rightHand.getObjectByName("karaoke-hand-mic")).toBeUndefined();
    player.dispose(); guests.forEach((guest) => guest.dispose?.());
  });

  it("updates both camera coordinates on rotation and snaps the new shot with reduced motion", async () => {
    const f = await fixture();
    f.registry.start("karaoke"); await flush();
    f.mode.action("select", "G01"); f.mode.action("start"); await flush();
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    for (const aspect of [390 / 844, 0.9, 844 / 390, 390 / 664]) {
      f.rig.cam.aspect = aspect;
      f.mode.update({ dt: 0.05, time: 1, x: 0, y: 0, blocked: true, brake: false });
      expect(f.rig.stage!.pos.toArray()).toEqual(aspect < 0.9 ? [0.65, 1.5, 2.3] : [1.5, 1.5, 3]);
      expect(f.rig.stage!.fov).toBe(aspect < 0.9 ? 48 : 43);
      expect(f.rig.cam.position).toEqual(f.rig.stage!.pos);
    }
    f.registry.exit(true);
  });

  it.each([[390, 844], [390, 664], [844, 390], [1280, 800]])("frames a clear singer with the foreground shoulder at the edge at %s × %s", async (w, h) => {
    const f = await fixture();
    f.rig.cam.aspect = w / h;
    f.rig.stage = karaokeShot(w / h);
    f.rig.stageSnap();
    f.rig.applyPose();
    f.player.root.position.set(KARAOKE_MARK.x, KARAOKE_MARK.y, KARAOKE_MARK.z);
    // The short phone's title can grow at A++; the face must remain below that measured header.
    const titleBottom = h === 664 ? 140 : h * 0.1;
    f.mode.frameView(w, h, titleBottom);
    const project = (x: number, y: number, z: number) => {
      const p = new Vector3(x, y, z).project(f.rig.cam);
      return { x: p.x * 0.5 + 0.5, y: 0.5 - p.y * 0.5 };
    };
    const head = project(KARAOKE_MARK.x, KARAOKE_MARK.y + f.player.height, KARAOKE_MARK.z);
    const knees = project(KARAOKE_MARK.x, 0.55, KARAOKE_MARK.z);
    const nearShoulder = project(2.67, 1.15, 1.45);
    expect(head.y).toBeGreaterThan(titleBottom / h);
    expect(head.y).toBeLessThan(0.3);
    expect(knees.y - head.y).toBeLessThan(0.4);
    expect(knees.y).toBeLessThan(0.56);
    if (w / h < 0.9) {
      expect(f.rig.stage.pos.z).toBe(2.3);
      expect(nearShoulder.x).toBeLessThan(0.05); // the foreground guest stays outside the narrow singer picture
    } else {
      expect(f.rig.stage.pos.toArray()).toEqual([1.5, 1.5, 3]);
      expect(nearShoulder.x).toBeLessThan(0.05);
      expect(head.x - nearShoulder.x).toBeGreaterThan(0.2);
    }
    if (w < h) expect(head.y * h).toBeGreaterThanOrEqual(titleBottom + 11.9);
    if (w > h && h < 520) expect(head.x).toBeLessThan(0.34);
    const front = new Vector3(Math.sin(KARAOKE_MARK.rot), 0, Math.cos(KARAOKE_MARK.rot));
    const toCamera = f.rig.stage.pos.clone().sub(f.player.root.position).setY(0).normalize();
    expect(front.angleTo(toCamera)).toBeGreaterThan(Math.PI / 7);
    expect(front.angleTo(toCamera)).toBeLessThan(Math.PI / 3);
  });

  it("keeps the booth and its approach within the small prop budget", () => {
    const draw = () => {};
    const context = new Proxy({ measureText: (text: string) => ({ width: text.length * 8 }) }, { get: (target, key) => Reflect.get(target, key) ?? draw });
    vi.stubGlobal("document", { createElement: () => ({ getContext: () => context }) });
    const room = new Group(), col = new Colliders();
    const booth = addKaraokeBooth(room, col), mic = makeKaraokeMic();
    let meshes = 0, triangles = 0;
    for (const root of [booth, mic]) root.traverse((part) => {
      if (!(part instanceof Mesh)) return;
      meshes++; triangles += (part.geometry.index?.count ?? part.geometry.attributes.position.count) / 3;
    });
    expect(meshes).toBeLessThanOrEqual(8);
    expect(triangles).toBeLessThanOrEqual(2000);
    expect(col.blocked(KARAOKE_PROMPT.x, KARAOKE_PROMPT.z, 0.38)).toBe(false);
    expect(col.blocked(0, 5.8, 0.38)).toBe(false);
    expect(col.blocked(-1.2, -2.05, 0.38)).toBe(false);
    expect(col.blocked(KARAOKE_MARK.x, KARAOKE_MARK.z, 0.38)).toBe(true);
  });

  it("replaces only the empty table when configured and keeps a real café route to the stand and counter", async () => {
    vi.stubGlobal("document", townCanvasDocument());
    vi.stubEnv("VITE_RADIO_INDEX", "/songs/index.json");
    vi.resetModules();
    const { getInterior } = await import("../src/game/world/interiors");
    const room = getInterior("sunny-cup")!;
    expect(room.group.getObjectByName("karaoke-booth")).toBeTruthy();
    const cue = room.group.getObjectByName("karaoke-wayfinding") as Mesh;
    expect(cue).toBeTruthy();
    expect(cue.position.x).toBe(0); expect(cue.position.y).toBe(0.70); expect(cue.position.z).toBeCloseTo(-2.63);
    expect(cue.rotation.y).toBe(0);
    cue.geometry.computeBoundingBox();
    expect(cue.geometry.boundingBox!.max.x - cue.geometry.boundingBox!.min.x).toBe(2);
    expect(room.colliders.circles.some((c) => c.x === 5.8 && c.z === 2.6)).toBe(false);
    expect(room.colliders.circles.some((c) => c.x === 3 && c.z === 0.5)).toBe(true);
    const nav = new NavGrid(-9, -7, 9, 9, 0.5, room.colliders, 0.35);
    const path = nav.path(room.spawn.x, room.spawn.z, KARAOKE_PROMPT.x, KARAOKE_PROMPT.z);
    expect(path?.length).toBeGreaterThan(0);
    const [x, z] = path!.at(-1)!;
    expect(Math.hypot(x - KARAOKE_PROMPT.x, z - KARAOKE_PROMPT.z)).toBeLessThan(1.2);
    expect(nav.path(x, z, -1.2, -2.05)?.length).toBeGreaterThan(0);
    vi.stubEnv("VITE_RADIO_INDEX", "");
    vi.resetModules();
    const ordinary = (await import("../src/game/world/interiors")).getInterior("sunny-cup")!;
    expect(ordinary.group.getObjectByName("karaoke-booth")).toBeUndefined();
    expect(ordinary.group.getObjectByName("karaoke-wayfinding")).toBeUndefined();
    expect(ordinary.colliders.circles.some((c) => c.x === 5.8 && c.z === 2.6)).toBe(true);
  });
});
