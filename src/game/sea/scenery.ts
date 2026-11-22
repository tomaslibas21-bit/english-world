import { Group } from "three";

/** Horizon props can live here without depending on the word gates or steering. */
export function seaScenery() {
  const group = new Group();
  group.name = "sea-horizon";
  return group;
}
