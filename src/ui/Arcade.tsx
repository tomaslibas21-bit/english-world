import { useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { CABINETS, TOWN_GAMES } from "../game/arcade/cabinets";
import { useArcade } from "../game/arcade/mode";
import { arcadeRecord, prerequisite, TOWN_DETAILS } from "../game/arcade/records";
import { game } from "../game/gameRef";
import { useStore } from "../state/store";
import "./arcade.css";

const action = (name: string, value?: string) => game?.modeAction("arcade", name, value);

function keepTabInMenu(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== "Tab") return;
  const buttons = Array.from(event.currentTarget.querySelectorAll("button")).filter((b) => b.getClientRects().length);
  const end = event.shiftKey ? buttons[0] : buttons.at(-1);
  if (document.activeElement === end) {
    event.preventDefault();
    (event.shiftKey ? buttons.at(-1) : buttons[0])?.focus();
  }
}

export default function Arcade() {
  const { cabinet, selected, page } = useArcade();
  const progress = useStore((s) => s.progress);
  const panel = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const focus = panel.current?.querySelector<HTMLButtonElement>("[data-pad-default]");
    focus?.focus({ preventScroll: true });
    focus?.scrollIntoView({ block: "nearest" });
  }, [cabinet, selected, page]);
  if (!cabinet) return null;
  const featured = CABINETS[cabinet];
  const townGame = page === "featured" ? null : selected;
  const details = townGame ? TOWN_DETAILS[townGame] : featured;
  const where = townGame ? TOWN_DETAILS[townGame].place : cabinet === "road" ? "Prie šio vairo." : "Prie biliardo stalo su Tina.";
  const record = arcadeRecord(townGame ?? cabinet, progress);
  const firstStep = prerequisite(townGame ?? cabinet, progress);
  return <div className="arcade" data-pad-scope="arcade" data-pad-phase={page} lang="lt">
    <section ref={panel} className="arcade-panel" data-page={page} role="dialog" aria-modal="true" aria-labelledby="arcade-title"
      onKeyDown={keepTabInMenu}>
      <header><h2 id="arcade-title"><span lang="en">{featured.title}</span><small>Žaidimų automatai</small></h2>
        <button data-pad-back onClick={() => action("back")}>{page === "featured" ? "Uždaryti" : "Grįžti"}</button></header>
      <div className="arcade-columns">
        <nav aria-label="Miesto žaidimai" className="arcade-nav">
          {page === "featured" ? <button className="arcade-directory" onClick={() => action("list")}>Miesto žaidimai</button> :
            <><h3>Miesto žaidimai</h3><div className="arcade-list">
              {TOWN_GAMES[cabinet].map((id) => <button key={id} data-game={id} aria-current={id === selected || undefined}
                data-pad-default={page === "list" && id === selected || undefined} onClick={() => action("select", id)}>
                <span lang="en">{TOWN_DETAILS[id].title}</span><small>{TOWN_DETAILS[id].lt}</small>
              </button>)}
            </div></>}
        </nav>
        <div className="arcade-body">
          <div className="arcade-detail">
            {townGame && <h3 lang="en">{details.title}</h3>}<p className="arcade-subtitle">{details.lt}</p>
            <p>{where}</p>
            <dl><dt>{record.label}</dt><dd>{record.value}</dd></dl>
            {firstStep && <p className="arcade-step">{firstStep}</p>}
          </div>
          {page !== "list" && <button className="arcade-primary" data-pad-default onClick={() => action(townGame ? "visit" : "play")}>
            {townGame ? "Nuvykti į žaidimo vietą" : featured.action}
          </button>}
        </div>
      </div>
    </section>
  </div>;
}
