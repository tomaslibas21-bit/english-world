import type { RadioScene, SceneInfo, SceneLine } from "../content/radioScenes/types";
import { unpackScene, type PackedRadioScene } from "../content/radioScenes/pack";
import { learnerTake, learnerVoices, type LearnerVoice } from "../content/radioScenes/voice";
import { audio, clipUrl, filesToken } from "../game/audio";

import { SITUATIONS } from "../content/situations/catalog";

declare const __PLAYABLE_SCENE_IDS__: string[];

// The small local catalog determines dial availability without opening a situation or its recordings.
export const playableScenes = SITUATIONS.filter((scene) => __PLAYABLE_SCENE_IDS__.includes(scene.id));

const sceneFiles = import.meta.glob<PackedRadioScene>([
  "../generated/convfm/*.json",
  "!../generated/convfm/index.json",
], { import: "default" });

export async function loadSceneIndex(): Promise<SceneInfo[]> {
  return (await import("../generated/convfm/index.json")).default as SceneInfo[];
}

export async function loadScene(id: string): Promise<RadioScene | null> {
  const scene = await sceneFiles[`../generated/convfm/${id}.json`]?.();
  return scene ? unpackScene(scene) : null;
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
    const take = "to" in turn ? learnerTake(turn.to, turn.speed, turn.text, manifest, learnerVoice) : turn;
    if (!take || !(manifest[take.clipKey] > 0)) return null;
    turns.push({
      speaker: turn.speaker, text: turn.text, translation: turn.translation, speed: turn.speed,
      voice: take.voice, clipKey: take.clipKey, duration: manifest[take.clipKey],
      url: clipUrl(base, take.clipKey, repairVersions[take.clipKey], token),
    });
  }
  return turns;
}
