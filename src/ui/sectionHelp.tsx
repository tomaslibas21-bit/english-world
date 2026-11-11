import { useSyncExternalStore } from "react";
import { useStore } from "../state/store";
import { Icon } from "./icons";
import { game } from "../game/gameRef";
import { L } from "./i18n";
import { EDITION } from "../edition";

const KEY = "fluentsteps.section-help.v1";
const EVENT = "fluentsteps:section-help";
const visible = () => { try { return localStorage.getItem(KEY) !== "off"; } catch { return true; } };
const subscribe = (notify: () => void) => {
  window.addEventListener("storage", notify);
  window.addEventListener(EVENT, notify);
  return () => { window.removeEventListener("storage", notify); window.removeEventListener(EVENT, notify); };
};
export const useSectionHelp = () => useSyncExternalStore(subscribe, visible, () => true);
export function setSectionHelp(on: boolean) {
  try { localStorage.setItem(KEY, on ? "on" : "off"); } catch { /* keep the setting usable when storage is available again */ }
  window.dispatchEvent(new Event(EVENT));
}

export function SectionHelpButton({ className = "icon-btn", onOpen }: { className?: string; onOpen?: () => void }) {
  const show = useSectionHelp();
  if (!show) return null;
  return <button className={className} aria-label={L("Kaip žaisti?")} title={L("Kaip žaisti?")} onClick={() => { onOpen?.(); game?.activeSession?.stopListening(); useStore.getState().setHud({ panel: "help" }); }}><Icon name="help" size={24} /></button>;
}

/** The course's guide page (English Master's /vadovas.html); the Spanish edition's course has none yet: "". */
export function courseGuideUrl() {
  if (EDITION.id !== "en") return "";
  return new URL("/vadovas.html", new URL(import.meta.env.VITE_BACK_URL || "https://kursas.skaitykangliskai.lt", location.href)).href;
}
