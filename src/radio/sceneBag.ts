import type { RadioScene } from "../content/radioScenes/types";

export interface SceneBag {
  version: string;
  order: number[];
  position: number;
}

export type SceneBags = Partial<Record<`scene/${string}`, SceneBag>>;

export function validBag(value: unknown, scene: RadioScene): value is SceneBag {
  if (!value || typeof value !== "object") return false;
  const bag = value as SceneBag;
  return bag.version === scene.version && Array.isArray(bag.order) && bag.order.length === scene.routes.length &&
    new Set(bag.order).size === bag.order.length &&
    bag.order.every((n) => Number.isInteger(n) && n >= 0 && n < scene.routes.length) &&
    Number.isInteger(bag.position) && bag.position >= 0 && bag.position <= bag.order.length;
}

/** J5 persists the returned bag under its scene progress, keyed by scene/<id>. */
export function nextSceneRoute(
  scene: RadioScene,
  saved?: unknown,
  random: () => number = Math.random,
): { routeId: number; bag: SceneBag } | null {
  if (!scene.routes.length) return null;
  let bag: SceneBag;
  if (validBag(saved, scene) && saved.position < saved.order.length) {
    bag = { ...saved, order: [...saved.order] };
  } else {
    const order = Array.from({ length: scene.routes.length }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const draw = random();
      const fraction = Number.isFinite(draw) ? Math.max(0, Math.min(1 - Number.EPSILON, draw)) : 0;
      const j = Math.floor(fraction * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (validBag(saved, scene) && order.length > 1 && order[0] === saved.order.at(-1)) {
      [order[0], order[1]] = [order[1], order[0]];
    }
    bag = { version: scene.version, order, position: 0 };
  }
  return { routeId: bag.order[bag.position++], bag };
}

export function drawScene(
  scene: RadioScene,
  progress: Readonly<SceneBags>,
  random?: () => number,
): { routeId: number; progress: SceneBags } | null {
  const key = `scene/${scene.id}` as const;
  const next = nextSceneRoute(scene, progress[key], random);
  return next && { routeId: next.routeId, progress: { ...progress, [key]: next.bag } };
}
