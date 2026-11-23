import { lazy } from "react";

let overlay: typeof import("./Road")["RoadOverlay"] | undefined;

export async function preloadRoadOverlay() {
  overlay ??= (await import("./Road")).RoadOverlay;
}

const LazyRoadOverlay = lazy(() => preloadRoadOverlay().then(() => ({ default: overlay! })));

export function getRoadOverlay() {
  return overlay ?? LazyRoadOverlay;
}
