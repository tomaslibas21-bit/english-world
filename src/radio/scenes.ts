import type { RadioScene, SceneInfo, SceneLine } from "../content/radioScenes/types";
import { unpackScene } from "../content/radioScenes/pack";
import { learnerTake, learnerVoices, type LearnerVoice } from "../content/radioScenes/voice";
import { loadPackedScene, loadPackedSceneIndex } from "../content/radioScenes/data";
import { audioKey } from "../audio-key";
import { EDITION } from "../edition";
import { audio, clipUrl, filesToken } from "../game/audio";

import { SITUATIONS } from "../content/situations/catalog";

declare const __PLAYABLE_SCENE_IDS__: string[];

// The small local catalog determines dial availability without opening a situation or its recordings.
export const playableScenes = SITUATIONS.filter((scene) => __PLAYABLE_SCENE_IDS__.includes(scene.id));

export async function loadSceneIndex(): Promise<SceneInfo[]> {
  const index = await loadPackedSceneIndex();
  return index.map((scene) => ({ ...scene, title: sceneTitle(scene) }));
}

function sceneTitle(scene: Pick<RadioScene, "title" | "titleLt">) {
  return EDITION.id === "es" && EDITION.helper === "lt" && scene.titleLt !== undefined
    ? { ...scene.title, lt: scene.titleLt } : scene.title;
}

export async function loadScene(id: string): Promise<RadioScene | null> {
  const data = await loadPackedScene(id);
  if (!data) return null;
  const scene = unpackScene(data);
  return { ...scene, title: sceneTitle(scene) };
}

export interface PlayableSceneTurn extends SceneLine {
  speaker: string;
  voice: string;
  clipKey: string;
  duration: number;
  url: string;
}

interface SceneAudio {
  base: string;
  manifest: Readonly<Record<string, number>>;
  repairVersions: Readonly<Record<string, string>>;
  token?: string | null;
}

/** Call after audio.init() in the talk transport. A route is offered only when every clip resolves. */
export function routeTurns(
  scene: RadioScene,
  routeId: number,
  { learnerVoice = learnerVoices, assets }: { learnerVoice?: LearnerVoice; assets?: SceneAudio } = {},
): PlayableSceneTurn[] | null {
  if (!Number.isInteger(routeId)) return null;
  const route = scene.routes[routeId];
  if (!route?.length) return null;
  const { base, manifest, repairVersions, token } = assets ?? {
    base: audio.base, manifest: audio.manifest, repairVersions: audio.repairVersions, token: filesToken(),
  };
  const turns: PlayableSceneTurn[] = [];
  for (const index of route) {
    const turn = scene.turns[index];
    if (!turn || !turn.text.trim() || !turn.translation.trim()) return null;
    if (EDITION.id === "es" && !turn.translationLt?.trim()) return null;
    const translation = EDITION.helper === "lt" ? turn.translationLt ?? turn.translation : turn.translation;
    const take = "to" in turn ? learnerTake(turn.to, turn.speed, turn.text, manifest, learnerVoice) : turn;
    if (!take || take.clipKey !== audioKey(take.voice, turn.speed, turn.text)) return null;
    const duration = manifest[take.clipKey];
    if (!Number.isFinite(duration) || duration <= 0) return null;
    turns.push({
      speaker: turn.speaker, text: turn.text, translation, speed: turn.speed,
      voice: take.voice, clipKey: take.clipKey, duration,
      url: clipUrl(base, take.clipKey, repairVersions[take.clipKey], token),
    });
  }
  return turns;
}
