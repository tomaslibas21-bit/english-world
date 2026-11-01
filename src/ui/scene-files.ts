// This edition's scene files (./scene-data/*.json, see scenes.ts): Maple Harbor's pictures. The Spanish edition has
// its own list (src/editions/es/ui/scene-files.ts): none yet, so its conversations show the 3D view until the owner's
// pictures arrive (docs/es/PLAN.md "Pictures").
import type { SceneFile } from "./scenes";

export const SCENE_FILES: Record<string, SceneFile> = import.meta.glob<SceneFile>("./scene-data/*.json", { eager: true, import: "default" });
