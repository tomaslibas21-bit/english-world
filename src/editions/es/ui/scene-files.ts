// The Spanish edition's scene files (replaces src/ui/scene-files.ts): ./scene-data/<situation id>.json, made from the
// picture manifests by tools/es-pictures/scene_file.py, with their pictures in public/scenes-es/<situation id>/
// (docs/es/PICTURES.md). A conversation without a scene file shows the 3D view.
import type { SceneFile } from "../../../ui/scenes";

export const SCENE_FILES: Record<string, SceneFile> = import.meta.glob<SceneFile>("./scene-data/*.json", { eager: true, import: "default" });

/** The folder under public/ with this edition's pictures. */
export const SCENE_DIR = "scenes-es";
