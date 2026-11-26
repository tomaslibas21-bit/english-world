import { HL, L, TL } from "./i18n";
import { useLayoutEffect, useMemo, useRef, type KeyboardEvent } from "react";
import { CABINETS, TOWN_GAMES, type Cabinet } from "../game/arcade/cabinets";
import { useArcade } from "../game/arcade/mode";
import { arcadeRecord, formatArcadeMetric, prerequisite, TOWN_DETAILS } from "../game/arcade/records";
import { game } from "../game/gameRef";
import { useStore } from "../state/store";
import { paintCabinetArt } from "../game/arcade/art";
import { Icon } from "./icons";
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

function CabinetPrint({ cabinet }: { cabinet: Cabinet }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.save(); ctx.scale(2, 2); paintCabinetArt(ctx, cabinet); ctx.restore();
  }, [cabinet]);
  return <canvas className="arcade-print" ref={canvas} width={512} height={272} aria-hidden="true" />;
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
  const townGame = page === "featured" ? null : selected;
  const current = townGame ?? cabinet;
  const record = useMemo(() => current && arcadeRecord(current, progress), [current, progress]);
  if (!cabinet || !current || !record) return null;
  const best = current === "road" || current === "sea" || current === "pool";
  const featured = CABINETS[cabinet];
  const details = townGame ? TOWN_DETAILS[townGame] : featured;
  const where = townGame ? TOWN_DETAILS[townGame].place : cabinet === "road" ? L("Prie šio vairo.") : L("Prie biliardo stalo su Don Memu.");
  const firstStep = prerequisite(townGame ?? cabinet, progress);
  return <div className="arcade" data-pad-scope="arcade" data-pad-phase={page} lang={HL}>
    <section ref={panel} className="arcade-panel" data-cabinet={cabinet} data-page={page} role="dialog" aria-modal="true" aria-labelledby="arcade-title"
      onKeyDown={keepTabInMenu}>
      <header>
        <div className="arcade-bar"><span><b lang={TL}>Maquinitas</b> · {L("Žaidimų automatai")}</span>
          <button data-pad-back onClick={() => action("back")}>{page === "featured" ? L("Uždaryti") : L("Grįžti")}</button>
        </div>
        <div className="arcade-hero">
          <h2 id="arcade-title"><span lang={TL}>{featured.title}</span><small>{featured.helper}</small></h2>
          <CabinetPrint cabinet={cabinet} />
        </div>
      </header>
      <div className="arcade-columns">
        <div className="arcade-body">
          <div className="arcade-detail">
            {townGame && <><h3 lang={TL}>{townGame === "pool" && <Icon name="poolBall" size={22} />}{details.title}</h3><p className="arcade-subtitle">{details.helper}</p></>}
            <p>{where}</p>
            <dl className="arcade-metric" data-best={best && typeof record.value === "number" || undefined}>
              <dt><Icon name={best ? "medal" : "ticket"} size={18} />{record.label}</dt>
              <dd>{formatArcadeMetric(current, record.value)}</dd>
            </dl>
            {firstStep && <p className="arcade-step">{firstStep}</p>}
          </div>
          {page !== "list" && <button className="arcade-primary" data-pad-default onClick={() => action(townGame ? "visit" : "play")}>
            {townGame ? L("Nuvykti į žaidimo vietą") : featured.action}
          </button>}
        </div>
        <nav aria-label={L("Miesto žaidimai")} className="arcade-nav">
          {page === "featured" ? <button className="arcade-directory" onClick={() => action("list")}>{L("Miesto žaidimai")}</button> :
            <><h3>{L("Miesto žaidimai")}</h3><div className="arcade-list">
              {TOWN_GAMES[cabinet].map((id) => <button key={id} data-game={id} aria-current={id === selected || undefined}
                data-pad-default={page === "list" && id === selected || undefined} onClick={() => action("select", id)}>
                <span lang={TL}>{id === "pool" && <Icon name="poolBall" size={18} />}{TOWN_DETAILS[id].title}</span><small>{TOWN_DETAILS[id].helper}</small>
              </button>)}
            </div></>}
        </nav>
      </div>
    </section>
  </div>;
}
