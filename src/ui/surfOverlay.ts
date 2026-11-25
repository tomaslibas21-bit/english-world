// The picker and overlay are ready before their state takes over the town HUD.
let ui: typeof import("./Surf") | undefined;

export async function preloadSurfOverlay() {
  ui ??= await import("./Surf");
}

export function getSurfOverlay() { return ui; }
