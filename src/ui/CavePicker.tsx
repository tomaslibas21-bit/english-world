import { useId, useState, type ReactNode } from "react";
import { LOCATIONS } from "../content/locations";
import { SITUATIONS } from "../content/situations/catalog";
import type { SituationMeta } from "../content/types";
import { Icon } from "./icons";

export function CavePicker({ grid, card }: { grid: string; card: (s: SituationMeta) => ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const cave = LOCATIONS.gruta;
  return (
    <section className="cave-picker">
      <button type="button" className="btn soft cave-picker-toggle" aria-expanded={open} aria-controls={id}
        onClick={() => setOpen((value) => !value)}>
        <span><b lang="lt">{cave.lt}</b>{" "}<i lang="en">{cave.name}</i></span>
        <Icon name="chevronDown" size={20} />
      </button>
      <div id={id} hidden={!open}>
        {open && <div className={grid}>{SITUATIONS.filter((s) => s.bonus && s.location === "gruta").map(card)}</div>}
      </div>
    </section>
  );
}
