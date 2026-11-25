import { lazy, Suspense, useEffect, useState } from "react";
import { CAVE_COPY } from "../content/cave-copy";
import { game, type GuideKind } from "../game/gameRef";
import { useStore } from "../state/store";
import { Icon } from "./icons";
import "./cave.css";

const Reader = lazy(() => import("./CaveGlyphReader"));

export default function Cave({ phoneToast }: { phoneToast: boolean }) {
  const card = useStore((s) => s.hud.cave);
  const glyph = useStore((s) => s.hud.glyph);
  const panel = useStore((s) => s.hud.panel);
  const cave = game?.cave;
  const [expanded, setExpanded] = useState(false);
  const [duringToast, setDuringToast] = useState(false);
  useEffect(() => { if (!phoneToast) setDuringToast(false); }, [phoneToast]);
  if (glyph && cave) return <Suspense fallback={
    <dialog className="glyph-loading" aria-label={CAVE_COPY.quiz.title.lt}
      ref={(node) => { if (node) { node.showModal(); return () => node.close(); } }}
      onCancel={(event) => { event.preventDefault(); cave.close(glyph.opening); }} />
  }><Reader key={glyph.opening} g={glyph} cave={cave} /></Suspense>;
  if (!card || panel) return null;

  const open = expanded && (!phoneToast || duringToast);
  const copy = CAVE_COPY.card;
  const count = <span className="cave-n" role="img" lang="lt" aria-label={copy.roomCount(card.n).lt}>{card.n} / {card.of}</span>;
  const stones = <span className="cave-stones" role="img" aria-label={copy.litCount(card.lit).lt}>
    {Array.from({ length: card.stones }, (_, index) => <i key={index} className={index < card.lit ? "on" : ""} />)}
  </span>;
  return <section className="cave-card" aria-label={copy.title.lt}
    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") event.stopPropagation(); }}>
    <button type="button" className="collapse-btn cave-toggle" aria-expanded={open} aria-controls="cave-details"
      title={(open ? copy.collapse : copy.expand).lt} onClick={() => { setExpanded(!open); setDuringToast(phoneToast && !open); }}>
      <b lang="en">{card.name}</b>{!open && stones}{count}<Icon name={open ? "chevronUp" : "chevronDown"} size={16} />
    </button>
    {open && <div id="cave-details" lang="lt">
      <div className="cave-description"><small>{card.lt}</small>{stones}</div>
      <p>{copy.hallsOpen(card.open).lt} · {card.count}</p>
      <CaveGuides next={card.next} />
    </div>}
  </section>;
}

function CaveGuides({ next }: { next: string }) {
  const map = useStore((s) => s.hud.minimap);
  const objective = useStore((s) => s.hud.objective);
  function row(kind: GuideKind, label: string, x?: number, z?: number) {
    const dist = x == null || z == null ? null : Math.round(Math.hypot(x - map.px, z - map.pz));
    const turn = x == null || z == null ? 0 : 180 - Math.atan2(x - map.px, z - map.pz) * 180 / Math.PI;
    return <div className="cave-guide">
      <div>{dist !== null && <Icon name="arrowUp" size={17} style={{ transform: `rotate(${turn}deg)` }} />}
        <span>{label}</span>{dist !== null && <small>{dist} m</small>}</div>
      {dist !== null && <button type="button" className="btn soft small" data-guide={kind}
        onClick={() => game?.autoWalkToObjective(kind)}><Icon name="walk" size={17} /> Nuvesk mane</button>}
    </div>;
  }
  return <>
    {row("cave", next, map.questX, map.questZ)}
    {objective && row("objective", `${objective.title} · ${CAVE_COPY.guide.exit.lt}`, map.exitX, map.exitZ)}
  </>;
}
