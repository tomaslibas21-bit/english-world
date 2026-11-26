import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { backpackColor } from "../content/backpack";
import { useStore } from "../state/store";
import { Icon } from "./icons";

export function usePackFabric() {
  const top = useStore((s) => s.progress.profile?.look.top);
  return { "--pack-fabric": top ? backpackColor(top) : "#1d3557" } as CSSProperties;
}

export function BackpackTool({ due, picture = false }: { due: number; picture?: boolean }) {
  const button = useRef<HTMLButtonElement>(null);
  const openedHere = useRef(false);
  const panel = useStore((s) => s.hud.panel);
  const fabric = usePackFabric();
  useLayoutEffect(() => {
    if (!openedHere.current || panel === "phrasebook") return;
    openedHere.current = false;
    if (!panel) button.current?.focus({ preventScroll: true });
  }, [panel]);
  return <button ref={button} className={(picture ? "lh-tool" : "icon-btn") + " phrasebook-tool"}
    data-pad-tool="phrasebook" title="Kuprinė" aria-label={due ? `Kuprinė (${due})` : "Kuprinė"}
    style={fabric} onClick={() => {
      openedHere.current = true;
      useStore.getState().setHud({ panel: "phrasebook" });
    }}>
    <Icon name="backpack" size={26} />{picture && <span>Kuprinė</span>}
    {!!due && <span className="due-badge" aria-hidden>{due}</span>}
  </button>;
}
