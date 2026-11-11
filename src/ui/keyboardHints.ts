import { useSyncExternalStore } from "react";

// Touch-only devices have no space bar. Keep real shortcuts available; only their
// explanatory hints follow the input device, including when a mouse is attached.
const query = "(hover: none) and (pointer: coarse)";
const touchOnly = () => typeof window !== "undefined" && !!window.matchMedia?.(query).matches;
function subscribe(notify: () => void) {
  const media = window.matchMedia?.(query);
  media?.addEventListener("change", notify);
  return () => media?.removeEventListener("change", notify);
}
export const useKeyboardHints = () => !useSyncExternalStore(subscribe, touchOnly, () => false);
