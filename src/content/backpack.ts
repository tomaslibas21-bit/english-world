import { Color } from "three";

/** The same fabric swatch on the player's pack, the menu button and the notebook spine. */
export function backpackColor(top: string) {
  const { h } = new Color(top).getHSL({ h: 0, s: 0, l: 0 });
  return h < 0.17 || h > 0.92 ? "#1d3557" : "#e9a23b";
}
