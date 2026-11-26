import type { PackedRadioScene } from "../../../../content/radioScenes/pack";
import type { SceneInfo } from "../../../../content/radioScenes/types";

const sceneFiles = import.meta.glob<PackedRadioScene | SceneInfo[]>("../../generated/convfm/*.json", { import: "default" });

export async function loadPackedSceneIndex(): Promise<SceneInfo[]> {
  return (await sceneFiles["../../generated/convfm/index.json"]?.() as SceneInfo[] | undefined) ?? [];
}

export async function loadPackedScene(id: string): Promise<PackedRadioScene | undefined> {
  if (id === "index") return undefined;
  return await sceneFiles[`../../generated/convfm/${id}.json`]?.() as PackedRadioScene | undefined;
}
