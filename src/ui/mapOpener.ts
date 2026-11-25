import { useStore } from "../state/store";

let opener: HTMLButtonElement | undefined;

export function openMap(button: HTMLButtonElement) {
  opener = button;
  useStore.getState().setHud({ panel: "map" });
}

export function takeMapOpener() {
  const button = opener;
  opener = undefined;
  return button;
}
