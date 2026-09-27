// Illustrated conversation scenes: one still picture per phase of the conversation, with the person
// doing what that moment is about (showing cup sizes, handing over the key cards). Shown full-screen
// behind the conversation panel instead of the 3D view. Art: Nano Banana Pro via Higgsfield, one
// shared style, real English text only where it was specified and checked (see docs/SCENE-ART.md).
//
// Each scene is a file in ./scene-data/, named by situation id, or "<situation id>@<npc id>" when the
// person depends on the player (the date: Emma or Sam). Its pictures are public/scenes/<name>/*.webp,
// with "@" written as "-" in the folder name. tools/scene-walk.ts checks the files against the
// simulated conversations.

/** A scene file as written in ./scene-data/ (picture names without folder or extension). */
export interface SceneFile {
  /** Who is in the pictures (for people editing the file). */
  npc?: string;
  images: string[];
  /** Step or pending-question id → picture. Unlisted ids keep the current picture. */
  phases: Record<string, string>;
  /** The first picture. */
  start: string;
  /** The picture once the task is complete, for moments without their own picture (optional). */
  done?: string;
  /** Pictures that stay for the rest of the conversation once shown (optional): the rain in the
   *  small talk, so that no dry picture comes back after it. */
  sticky?: string[];
  /** Where the person is, in % of the picture (x, y): kept in view when the screen crops it. */
  focus: [number, number];
  /** Higgsfield job id per picture, for later edits (optional; not used by the game). */
  jobs?: Record<string, string>;
}

/** A scene with picture names resolved to stems ("<folder>/<name>"). */
export type SceneArt = Omit<SceneFile, "npc" | "jobs">;

export const sceneFolder = (key: string) => key.replace("@", "-");
export const sceneUrl = (stem: string) => `${import.meta.env.BASE_URL}scenes/${stem}.webp`;

function resolve(key: string, f: SceneFile): SceneArt {
  const dir = sceneFolder(key);
  const s = (n: string) => `${dir}/${n}`;
  return {
    images: f.images.map(s),
    phases: Object.fromEntries(Object.entries(f.phases).map(([k, v]) => [k, s(v)])),
    start: s(f.start),
    done: f.done ? s(f.done) : undefined,
    sticky: f.sticky?.map(s),
    focus: f.focus,
  };
}

const files = import.meta.glob<SceneFile>("./scene-data/*.json", { eager: true, import: "default" });

/** By situation id, or "<situation id>@<npc id>". */
export const SCENES: Record<string, SceneArt> = Object.fromEntries(
  Object.entries(files).map(([path, f]) => {
    const key = path.replace(/^.*\/|\.json$/g, "");
    return [key, resolve(key, f)];
  }),
);

export const sceneFor = (sitId: string | undefined, npcId?: string): SceneArt | undefined =>
  sitId ? (npcId && SCENES[`${sitId}@${npcId}`]) || SCENES[sitId] : undefined;
