// Puerto Colibrí's grotto on the screen (src/game/cave): the chamber and quest card
// (which chamber, how many of its stones are lit, what opens next), and the card of the glyph stone the learner is
// at: the stone says its phrase; they pick what it means, or say it back.
import { useEffect, useState, type ComponentType } from "react";
import { useStore } from "../state/store";
import { game } from "../game/gameRef";
import { Icon } from "./icons";
import { SitIcon } from "./SitIcon";
import { Interlinear } from "./Interlinear";
import { L, TL } from "./i18n";
import { EDITION } from "../edition";

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
export function GlyphCard() {
  const g = useStore((s) => s.hud.glyph);
  const lt = useStore((s) => s.settings.lt);
  const ipa = useStore((s) => s.settings.ipa);
  const cave = game?.cave;
  useEffect(() => {
    if (!g) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { cave?.close(); return; }
      if (e.key.toLowerCase() === "r" || (!g.solved && e.key === " ")) {
        e.preventDefault();
        if (!e.repeat) cave?.say();
      } else if (!g.solved && ["1", "2", "3"].includes(e.key) && Number(e.key) <= g.options.length) {
        e.preventDefault();
        cave?.pick(Number(e.key) - 1);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [g, cave]);
  if (!g || !cave) return null;
  const listening = g.mic === "listening";
  return (
    <div className="glyph-veil" onClick={(e) => { if (e.target === e.currentTarget) cave.close(); }}>
      <div className={"glyph-card" + (g.solved ? " solved" : "")} data-pad-scope="glyph" role="dialog" aria-label={L("Kalbantis akmuo")}>
        <button className="glyph-x" onClick={() => cave.close()} title={L("Uždaryti")} aria-label={L("Uždaryti")}><Icon name="close" size={20} /></button>
        <div className="glyph-head">
          <span className="glyph-rune" aria-hidden><i /><i /><i /></span>
          <h2>{g.solved ? L("Akmuo užsidegė!") : L("Akmuo kalba. Ką jis sako?")}</h2>
        </div>
        <div className="glyph-say">
          <button className="glyph-play" onClick={() => cave.say()} title={L("Klausyti dar kartą")} aria-label={L("Klausyti dar kartą")}><Icon name="speaker" size={26} /></button>
          {g.shown
            // (a stone's own line, once lit: the words with their sounds and meanings, as in the conversations)
            ? g.solved && g.s ? <div className="glyph-text glyph-line" lang={TL}><Interlinear s={g.s} lt={lt} ipa={ipa} nat={lt} /></div>
              : <div className="glyph-text" lang={TL}>{g.text}{g.solved && lt && <small lang={EDITION.helper}>{g.lt}</small>}</div>
            : <button className="glyph-show" onClick={() => cave.showWords()}><span aria-hidden>· · ·</span> {L("Rodyti žodžius")}</button>}
        </div>
        {!g.solved && (
          <>
            <p className="glyph-q">{L("Pasirink, ką tai reiškia:")}</p>
            <div className="glyph-opts">
              {g.options.map((o, i) => (
                <button key={i} className={"glyph-opt" + (g.wrong.includes(i) ? " wrong" : "")} disabled={g.wrong.includes(i)} lang={EDITION.helper} onClick={() => cave.pick(i)}>
                  <kbd>{i + 1}</kbd><span>{o}</span>
                </button>
              ))}
            </div>
            {g.mic !== "unsupported" && (
              <div className="glyph-mic">
                <span className="glyph-or">{L("arba")}</span>
                <button className={"btn small" + (listening ? "" : " soft")} onClick={() => cave.listen()}>
                  <Icon name={listening ? "stop" : "mic"} size={18} /> {listening ? L("Klausau…") : L("Pasakyk tai balsu")}
                </button>
                {g.heard && <span className={"glyph-heard" + (g.mic === "missed" ? " miss" : "")} lang={TL}>{L("„{line}“", { line: g.heard })}</span>}
                {g.mic === "missed" && !g.heard && <span className="glyph-heard miss">{L("Neišgirdau. Bandyk dar kartą.")}</span>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

