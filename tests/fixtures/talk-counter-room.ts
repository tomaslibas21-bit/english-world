import * as THREE from "three";
import { vi } from "vitest";
import { NPCS } from "../../src/content/npcs";
import { SITUATION_BY_ID } from "../../src/content/situations/catalog";
import { createCharacter, withBackpack } from "../../src/game/characters";
import { Game } from "../../src/game/Game";
import type { TalkLayout } from "../../src/game/talkLayout";
import { getInterior } from "../../src/game/world/interiors";

const learnerLook = withBackpack({ skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" });
const dt = 1 / 60;

export function roomFixture(id: string, approach: number) {
  vi.spyOn(Math, "random").mockReturnValue(0.43);
  const noop = () => {};
  const gradient = () => ({ addColorStop: noop });
  const ctx = new Proxy({ measureText: () => ({ width: 100 }), createLinearGradient: gradient, createRadialGradient: gradient },
    { get: (target, key) => Reflect.get(target, key) ?? noop });
  vi.stubGlobal("document", { createElement: () => ({ getContext: () => ctx }) });
  const sit = SITUATION_BY_ID[id];
  const room = getInterior(sit.location)!;
  const spot = room.npcs.find(({ npc }) => npc === sit.npc)!;
  const scene = new THREE.Scene(), npcLayer = new THREE.Group();
  const learner = createCharacter(learnerLook);
  scene.add(room.group, learner.root, npcLayer);
  // The list's authored approach, with the same lateral offsets as talk-view.
  learner.root.position.set(spot.ax! + approach, 0, spot.az!);
  learner.root.rotation.y = Math.atan2(spot.x - learner.root.position.x, spot.z - learner.root.position.z);

  const learnerAt = new THREE.Vector3();
  const npcs = room.npcs.map(({ npc, x, z, rot, sit, seat }) => {
    const def = NPCS[npc];
    const ch = createCharacter({ ...def.look, female: def.look.female ?? def.gender === "f" });
    ch.watch = learnerAt;
    ch.root.position.set(x, 0, z);
    ch.root.rotation.y = rot;
    if (sit) { ch.seatY = seat ?? 0.5; ch.setAnim("sit"); }
    npcLayer.add(ch.root);
    return { id: npc, ch, rot, sit, home: ch.root.position.clone(), waved: true };
  });
  const speaker = npcs.find(({ id }) => id === spot.npc)!;
  speaker.ch.busy = "type";
  const game: Game = Object.assign(Object.create(Game.prototype), {
    scene, zone: { id: room.id, interior: room, colliders: room.colliders, nav: { cell: 0.5, idx: () => -1 } },
    npcLayer, npcs, learnerAt, talkAt: new THREE.Vector3(), player: learner, talkNpc: speaker, session: { sit },
    extras: [], extraChats: [],
  });
  game["spawnRoomPeople"]();
  const people = [...npcs.map(({ ch }) => ch), ...game["extras"]];
  const step = (talking: boolean) => {
    game["updateNpcs"](dt, talking, null);
    learner.update(dt);
    scene.updateMatrixWorld(true);
  };
  for (let i = 0; i < (approach ? 24 : 9); i++) step(false);
  step(true);
  return { room, scene, learner, speaker, people, step, dispose: () => {
    for (const ch of [...people, learner]) ch.dispose?.();
  } };
}

export function screenFor([width, height, right, bottom]: number[]): TalkLayout {
  return {
    width, height, viewportHeight: height, shiftX: (width - right) / 2, shiftY: height / 2 - bottom * 0.46,
    picture: { x0: 10, x1: right - 10, y0: 10, y1: bottom - 10 },
    obstacles: [{ x0: right - 79, x1: right - 4, y0: bottom - 63, y1: bottom - 2 }],
  };
}
