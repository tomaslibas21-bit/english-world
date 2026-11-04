// This edition's scene files (./scene-data/*.json, see scenes.ts): Maple Harbor's pictures, in public/scenes/. The
// Spanish edition has its own list and folder (src/editions/es/ui/scene-files.ts, docs/es/PICTURES.md).
import type { SceneFile } from "./scenes";

export const SCENE_FILES: Record<string, SceneFile> = import.meta.glob<SceneFile>("./scene-data/*.json", { eager: true, import: "default" });

/** The folder under public/ with this edition's pictures. */
export const SCENE_DIR = "scenes";
