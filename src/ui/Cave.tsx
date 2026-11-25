// Puerto Colibrí's grotto on the screen (src/game/cave): the chamber and quest card
// (which chamber, how many of its stones are lit, what opens next), and the card of the glyph stone the learner is
// at: the stone says its phrase; they pick what it means, or say it back.
import { lazy, Suspense, useState, type ComponentType } from "react";
import { useStore } from "../state/store";
import { game } from "../game/gameRef";
import { Icon } from "./icons";
import { SitIcon } from "./SitIcon";
import { L, TL } from "./i18n";
import { EDITION } from "../edition";
import { stoneReading } from "./kit/stoneReading";

/** Which chamber one is in and what comes next. */
export function CaveCard({ arrow: Arrow, phoneToast }: { arrow: ComponentType<{ angle: number }>; phoneToast: boolean }) {
  const cave = useStore((s) => s.hud.cave);
  const talking = useStore((s) => s.conv.active);
  const panel = useStore((s) => s.hud.panel);
  const glyph = useStore((s) => s.hud.glyph);
  const map = useStore((s) => s.hud.minimap);
  const objective = useStore((s) => s.hud.objective);
  const [card, setCard] = useState({ expanded: false, openedDuringToast: false });
  if (card.openedDuringToast && !phoneToast) setCard({ ...card, openedDuringToast: false });
  const expanded = card.expanded && (!phoneToast || card.openedDuringToast);
  const toggle = () => setCard({ expanded: !expanded, openedDuringToast: phoneToast && !expanded });
  if (!cave || talking || panel || glyph) return null;
  const name = <b lang={TL}>{cave.name}</b>;
  const count = <span className="cave-n">{cave.n} / {cave.of}</span>;
  const stonesLabel = L("Uždegta akmenų: {lit} iš {n}", { lit: cave.lit, n: cave.stones });
  const stones = Array.from({ length: cave.stones }, (_, i) => <i key={i} className={i < cave.lit ? "on" : ""} />);
  const objectiveLabel = objective?.where.trim() || objective?.title.trim();
  // (the conversation that comes next down here has its own icon, as everywhere else)
  const nextIcon = cave.nextSitId && <><SitIcon id={cave.nextSitId} size="1.15em" />{" "}</>;
  return (
    <div className="cave-card" role="status">
      <div className="cave-top">{name}{count}</div>
      <button className="collapse-btn objective-summary cave-toggle" aria-expanded={expanded} aria-controls="cave-details" onClick={toggle}>
        <span className="cave-summary-name">
          {name} {!expanded && <span className="cave-stones" role="img" aria-label={stonesLabel}>{stones}</span>}
        </span>
        {count}
        <Icon name={expanded ? "chevronUp" : "chevronDown"} size={16} strokeWidth={2} />
      </button>
      <div id="cave-details">
        <small lang={EDITION.helper}>{cave.lt}</small>
        <div className="cave-stones" aria-label={stonesLabel}>
          {stones}
          <span className="cave-rooms" aria-label={L("Atvirų salių: {open} iš {n}", { open: cave.open, n: cave.of })}>
            {Array.from({ length: cave.of }, (_, i) => <u key={i} className={i < cave.open ? (i + 1 === cave.n ? "here" : "open") : ""} />)}
          </span>
        </div>
        {map.questX !== undefined && map.questZ !== undefined && cave.next.trim() ? (
          <div className="cave-guide">
            <Arrow angle={Math.atan2(map.questX - map.px, map.questZ - map.pz)} />
            <p id="cave-quest-label">{nextIcon}{cave.next}</p>
            <button className="btn small" data-guide="cave" aria-describedby="cave-quest-label" onClick={() => game?.autoWalkToObjective("cave")}><Icon name="walk" size={17} /> {L("Nuvesk mane")}</button>
          </div>
        ) : <p>{nextIcon}{cave.next}</p>}
        {objective?.angle != null && objectiveLabel && (
          <div className="cave-guide">
            <Arrow angle={objective.angle} />
            <small id="cave-objective-label">{objectiveLabel}</small>
            <button className="btn small" data-guide="objective" aria-describedby="cave-objective-label" onClick={() => game?.autoWalkToObjective("objective")}><Icon name="walk" size={17} /> {L("Nuvesk mane")}</button>
          </div>
        )}
      </div>
    </div>
  );
}

/** At a glyph stone. */
const GlyphReader = lazy(() => import("./CaveGlyphReader"));

export function GlyphCard() {
  const glyph = useStore((s) => s.hud.glyph);
  const cave = game?.cave;
  if (!glyph || !cave) return null;
  return <Suspense fallback={<dialog className="glyph-loading" aria-label={L("Kalbantis akmuo")}
    ref={(node) => { if (node) { node.showModal(); return () => node.close(); } }}
    onCancel={(event) => { event.preventDefault(); cave.close(); }} />}>
    <GlyphReader key={glyph.opening} g={glyph} cave={cave} reader={stoneReading} />
  </Suspense>;
}

