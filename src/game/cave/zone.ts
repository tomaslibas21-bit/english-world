import type { Vector3 } from "three";
import { NavGrid } from "../nav";
import { Colliders } from "../world/util";
import type { Interior } from "../world/interiors";
import { CAVE_COPY } from "../../content/cave-copy";
import { SLATE_CAVE } from "../world/slateCave";
import { CAVE_ZONE, PREFERRED_COVE_DOOR } from "../world/slateCovePlan";
import { buildCave } from "./Cave";
import * as P from "./plan";
import { CaveQuest, type CaveSave } from "./quest";
import { createStoneLibrary, type StonePhrase } from "./stonePhrases";
import { useStore } from "../../state/store";
import { createCaveRouting } from "./routing";
import { CaveRules } from "./progress";
import { createCavePrompts } from "./interactions";
import { createCaveMap } from "./map";
import { countPlay } from "../../state/playStats";

export const caveRules = new CaveRules(SLATE_CAVE);
export const caveRouting = createCaveRouting(caveRules);
export const stonePhrases = createStoneLibrary(SLATE_CAVE.treeSituation, SLATE_CAVE.chambers);
export const { keeperLooks, treeSituation } = SLATE_CAVE;
export const drawCaveMap = createCaveMap(SLATE_CAVE, SLATE_CAVE);

const exitLabel = CAVE_COPY.door.dryExit.en;
const exit = P.EXITS.find((way) => way.id === PREFERRED_COVE_DOOR)!;
const exitTarget = { kind: "exit", id: exit.id, x: exit.x, z: exit.z, label: exitLabel } as const;

const noProps = new Colliders();
let permanentCells: Uint8Array | undefined;

export function caveWaterLevel(x: number, z: number) {
  let level = 0;
  for (let i = 0; i < P.FALLS.length; i++) {
    const fall = P.FALLS[i];
    const near = Math.max(0, 1 - Math.hypot(x - fall.x, z - fall.z) / 16);
    level = Math.max(level, near * near * 0.28);
  }
  return level;
}

export function saveCaveProgress(save: CaveSave, phrase?: StonePhrase) {
  useStore.getState().updateProgress((progress) => {
    progress.cave = save;
    if (!phrase) return;
    const key = treeSituation + ":" + phrase.id;
    progress.phrases[key] = { en: phrase.en, lt: phrase.lt, sitId: treeSituation, count: (progress.phrases[key]?.count ?? 0) + 1, last: Date.now() };
  });
}

export function buildCaveZone(initial: CaveSave | undefined, persist = saveCaveProgress) {
  const view = buildCave(CAVE_ZONE, SLATE_CAVE, SLATE_CAVE, caveRouting.gateStops), bounds = P.BOUNDS;
  const { colliders, group } = view;
  for (const keeper of SLATE_CAVE.keepers) colliders.addCircle(keeper.x, keeper.z, 0.36);
  const nav = new NavGrid(bounds.minX, bounds.minZ, bounds.maxX, bounds.maxZ, 0.55, permanentCells ? noProps : colliders, 0.38);
  if (permanentCells) nav.blocked.set(permanentCells);
  else {
    for (let i = 0; i < nav.blocked.length; i++) {
      const [x, z] = nav.center(i);
      if (!P.walkable(x, z, 0.4)) nav.blocked[i] = 1;
    }
    permanentCells = nav.blocked.slice();
  }
  const quest = new CaveQuest(view, initial, persist, caveRules, caveRouting, caveRouting.gateGrid(nav), stonePhrases);
  const interior: Interior = {
    id: CAVE_ZONE, group, colliders, w: bounds.maxX - bounds.minX, d: bounds.maxZ - bounds.minZ,
    exit: P.EXIT, spawn: P.ENTRY, npcs: SLATE_CAVE.keepers,
    wild: {
      fog: view.fog, background: SLATE_CAVE.fog, hemi: SLATE_CAVE.hemi, sun: SLATE_CAVE.sun,
      space: view.space, floor: P.floorY, walkable: P.walkable, bounds, exits: P.EXITS, spawns: P.SPAWNS,
      camera: SLATE_CAVE.camera, frame: view.update,
    },
  };
  function safeSpawn(spawn: { x: number; z: number; rot: number }) {
    return Number.isFinite(spawn.x) && Number.isFinite(spawn.z) && Number.isFinite(spawn.rot) && P.walkable(spawn.x, spawn.z) && !colliders.blocked(spawn.x, spawn.z, 0.37) ? spawn : P.ENTRY;
  }
  const resolveStep = (at: Vector3, previous: Vector3, radius: number) => colliders.resolveStep(at, previous, radius);
  function dispose() {
    quest.dispose();
    view.dispose();
  }
  function restoreProgress() {
    quest.close();
    const saved = useStore.getState().progress.cave;
    if (saved && saved !== quest.save) quest.restore(saved);
  }
  const nearOak = (at: { x: number; z: number }) => quest.treeNear(at);
  const prompt = createCavePrompts(quest, P.EXITS, exitLabel, CAVE_COPY.action.exit.lt, CAVE_COPY.action.stone, CAVE_COPY.action.oak.lt);
  return { id: CAVE_ZONE, oak: P.TREES[1], nearOak, group, interior, colliders, nav, view, quest,
    exitTarget, prompt, safeSpawn, resolveStep, dispose, restoreProgress };
}

export type CaveZone = ReturnType<typeof buildCaveZone>;

export { aimTree, fitTalkWild, wildPersonY } from "./framing";
export { applyCaveEvent, startCaveEncounter } from "./interactions";
export { applyCaveScene } from "./scene";
export { updateKeeper } from "./keepers";
export { BOUNDS } from "./plan";

export function announceCaveExit() {
  const { title, body } = CAVE_COPY.toast.exit;
  useStore.getState().toast({ kind: "info", title: title.lt, body: body.lt });
}

export function countCaveVisit() {
  countPlay("games", SLATE_CAVE.visitStat);
}
