import { LOCATIONS } from "../content/locations";
import type { SituationMeta } from "../content/types";
import { iconForEmoji, type IconName } from "./icons";
import { game } from "../game/gameRef";
import { useStore } from "../state/store";

export function objectiveLabels(sit: SituationMeta) {
  return { title: sit.title.lt, where: LOCATIONS[sit.location]?.lt ?? "" };
}

export function isPhone(sit: SituationMeta) {
  return sit.mode === "phone" || sit.mode === "video" || sit.location === "phone";
}

export function locIcon(id: string): IconName {
  return iconForEmoji(LOCATIONS[id]?.icon) ?? "pin";
}

export function sitIcon(sit: SituationMeta): IconName {
  if (isPhone(sit)) return sit.mode === "video" ? "video" : "phoneCall";
  return locIcon(sit.location);
}

export function walkToSituation(sitId: string, close: () => void) {
  const town = game;
  if (!town) return;
  town.setObjective(sitId);
  close();
  const onFoot = ({ hud }: ReturnType<typeof useStore.getState>) =>
    !hud.fade && hud.ride !== "surf" && hud.modeScreen?.id !== "sea";
  if (onFoot(useStore.getState())) {
    town.autoWalkToObjective();
    return;
  }
  // Some conversations close into a scripted ride or a surf lesson. Route from where it leaves the player.
  const stop = useStore.subscribe((state) => {
    if (game !== town || state.conv.active || state.progress.objective !== sitId) {
      stop();
    } else if (onFoot(state)) {
      stop();
      town.autoWalkToObjective();
    }
  });
}
