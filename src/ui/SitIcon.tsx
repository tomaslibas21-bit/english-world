import { createElement } from "react";
import { LOCATIONS } from "../content/locations";
import { SITUATION_ICONS } from "../content/situationIcons";
import { SITUATION_BY_ID } from "../content/situations/catalog";
import { Icon, iconForEmoji, type IconProps } from "./icons";
import { SITUATION_ICON_NODES } from "./situationIconNodes.gen";

export function hasSitIcon(id: string): boolean {
  return !!SITUATION_ICON_NODES[SITUATION_ICONS[id]]?.length;
}

/** A conversation has its own drawing. Until one is picked, show the kind of call or the place. */
export function SitIcon({ id, size = 20, className, label, strokeWidth = 1.75 }: Pick<IconProps, "size" | "className" | "label" | "strokeWidth"> & { id: string }) {
  const name = SITUATION_ICONS[id];
  const nodes = SITUATION_ICON_NODES[name];
  if (!nodes?.length) {
    const sit = SITUATION_BY_ID[id];
    const fallback = sit?.mode === "video" ? "video"
      : sit?.mode === "phone" || sit?.location === "phone" ? "phoneCall"
      : iconForEmoji(LOCATIONS[sit?.location]?.icon) ?? "pin";
    return <Icon name={fallback} size={size} className={className} label={label} strokeWidth={strokeWidth} />;
  }
  return (
    <svg className={"ui-icon" + (className ? " " + className : "")} data-sit-icon={name} width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      focusable="false" {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}>
      {nodes.map(([tag, attrs], i) => createElement(tag, { ...attrs, key: i }))}
    </svg>
  );
}
