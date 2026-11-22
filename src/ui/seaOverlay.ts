let overlay: typeof import("./Sea")["SeaOverlay"] | undefined;

export async function preloadSeaOverlay() {
  overlay ??= (await import("./Sea")).SeaOverlay;
}

// Sea entry waits for the preload so the HUD can mount the component in the first frame.
export function getSeaOverlay() {
  return overlay;
}
