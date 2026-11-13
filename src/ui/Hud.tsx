import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useStore } from "../state/store";
import { SectionHelpButton } from "./sectionHelp";
import { game } from "../game/gameRef";
import { WORLD, SEA_Z } from "../game/world/layout";
import { LOCATIONS } from "../content/locations";
import { SITUATION_BY_ID } from "../content/situations";
import { sitProgress, stars } from "../state/progress";
import { Icon, InlineIcon, Stars, iconForEmoji, splitLead, type IconName } from "./icons";
import { switchPlayMode } from "./playMode";
import { useCards, dueCards } from "../state/cards";
import { LyricStrip, RadioTool } from "./Radio";
import { useRadio } from "../radio";
import { L, Lx } from "./i18n";
import { EDITION } from "../edition";
import { Guide } from "./Guide";
import "./light.css";

/** Inside English Master (VITE_BACK_URL, e.g. "/"): the way back to the course site. */
export const COURSE_URL = import.meta.env.VITE_BACK_URL as string | undefined;

function ToolButton({ icon, title, panel, hotkey, badge }: { icon: IconName; title: string; panel: "scenarios" | "map" | "journal" | "phone" | "phrasebook" | "settings"; hotkey?: string; badge?: number }) {
  return (
    <button className="icon-btn" onClick={() => useStore.getState().setHud({ panel })} title={title} aria-label={badge ? `${title} (${badge})` : title}>
      <Icon name={icon} size={25} />{hotkey && <span className="key" aria-hidden>{hotkey}</span>}
      {!!badge && <span className="due-badge" aria-hidden>{badge}</span>}
    </button>
  );
}

/** How many saved cards are due for review today. */
export function useDueCards(): number {
  const cards = useCards((c) => c.cards);
  return dueCards(cards, Date.now()).length;
}

export function Hud() {
  const hud = useStore((s) => s.hud);
  const conv = useStore((s) => s.conv);
  const due = useDueCards();
  const hasRadio = useRadio((s) => s.available);
  const [helpOpen, setHelpOpen] = useState(() => { try { return localStorage.getItem("ew-help-closed") !== "1"; } catch { return true; } });
  if (conv.active) return <Fade />;
  const banner = hud.zoneBanner ? splitLead(hud.zoneBanner.title) : null;
  return (
    <div className={"hud" + (hud.showTouch ? " has-touch" : "")}>
      <Objective />
      <Minimap />
      <div className={"toolbar" + (hasRadio ? " has-radio" : "")}>
        <div className="toolbar-tools">
          {COURSE_URL && <a className="icon-btn" href={COURSE_URL} title={L("Grįžti į kursą")} aria-label={L("Grįžti į kursą")}><Icon name="home" size={25} /></a>}
          <ToolButton icon="clapper" title={L("Visos situacijos")} panel="scenarios" />
          <ToolButton icon="map" title={L("Žemėlapis (M)")} panel="map" hotkey="M" />
          <ToolButton icon="journal" title={L("Užduotys (J)")} panel="journal" hotkey="J" />
          <ToolButton icon="smartphone" title={L("Telefonas (P)")} panel="phone" hotkey="P" />
          <ToolButton icon="bookOpen" title={L("Frazių knygelė")} panel="phrasebook" badge={due} />
          <ToolButton icon="settings" title={L("Nustatymai (Esc)")} panel="settings" />
          <SectionHelpButton />
        </div>
        <div className="toolbar-extra">
          <RadioTool />
          <button className="icon-btn light-mode-btn" onClick={() => switchPlayMode("light")} title={L("Lengvas režimas")} aria-label={L("Lengvas režimas")}>
            <span aria-hidden>{L("LR")}</span>
            <span className="toolbar-tooltip" aria-hidden>{L("Lengvas režimas")}</span>
          </button>
        </div>
      </div>
      {!hud.panel && <LyricStrip />}
      {hud.zoneBanner && banner && <div className="zone-banner"><h2>{banner.icon && <Icon name={banner.icon} size="0.8em" className="zb-ico" />}{banner.rest}</h2>{hud.zoneBanner.sub && <p>{hud.zoneBanner.sub}</p>}</div>}
      {hud.prompt && !hud.panel && (
        <button className={"prompt" + (hud.showTouch ? " touch" : "")} onClick={() => game?.interact()}>
          <kbd>{hud.showTouch ? <Icon name="tap" size={18} /> : "E"}</kbd>
          <span className="prompt-text">{hud.prompt.label}{hud.prompt.lt && <small lang={EDITION.helper}>{hud.prompt.lt}</small>}</span>
        </button>
      )}
      <Guide />
      {helpOpen && !hud.showTouch && !hud.coach && (
        <div className="help-strip">
          {Lx("Vaikščiok {arrows} arba {wasd} · bėgti {shift} · pašokti {space}", {
            arrows: <><kbd><Icon name="arrowUp" size="1em" strokeWidth={2.25} label={L("aukštyn")} /></kbd><kbd><Icon name="arrowDown" size="1em" strokeWidth={2.25} label={L("žemyn")} /></kbd><kbd><Icon name="arrowLeft" size="1em" strokeWidth={2.25} label={L("kairėn")} /></kbd><kbd><Icon name="arrowRight" size="1em" strokeWidth={2.25} label={L("dešinėn")} /></kbd></>,
            wasd: <><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></>,
            shift: <kbd>Shift</kbd>,
            space: <kbd>{L("Tarpas")}</kbd>,
          })}<br />
          {Lx("Spustelėk žemę – nueisi ten · tempk pele – apsidairyk · {e} – kalbėtis / įeiti", { e: <kbd>E</kbd> })}<br />
          {Lx("{g} – nueiti iki užduoties · {m} žemėlapis · {j} užduotys · {p} telefonas", { g: <kbd>G</kbd>, m: <kbd>M</kbd>, j: <kbd>J</kbd>, p: <kbd>P</kbd> })}{hasRadio && Lx(" · {r} radijas", { r: <kbd>R</kbd> })}
          <button onClick={() => { setHelpOpen(false); try { localStorage.setItem("ew-help-closed", "1"); } catch { /* ignore */ } }}>{L("Supratau")} <Icon name="close" size={15} strokeWidth={2.25} /></button>
        </div>
      )}
      {hud.showTouch && <TouchControls />}
      <Fade />
    </div>
  );
}

function Fade() {
  const fade = useStore((s) => s.hud.fade);
  return <div className="fade" style={{ opacity: fade }} />;
}

function Objective() {
  const o = useStore((s) => s.hud.objective);
  const progress = useStore((s) => s.progress);
  // a new task (the last one done, or another picked): the card pops up for a moment
  const [fresh, setFresh] = useState(false);
  const lastTask = useRef(o?.sitId);
  useEffect(() => {
    if (!o?.sitId || o.sitId === lastTask.current) return;
    const first = lastTask.current === undefined;
    lastTask.current = o.sitId;
    if (first) return;
    setFresh(true);
    const t = setTimeout(() => setFresh(false), 1300);
    return () => clearTimeout(t);
  }, [o?.sitId]);
  // on a phone it folds away by itself while you walk (and opens when you stop), until you fold or open it yourself
  const [manual, setManual] = useState<boolean | null>(null);
  const walking = useStore((s) => s.hud.walking);
  // (and while the first-time guide's card is up, which sits under it)
  const coachOn = useStore((s) => !!s.hud.coach);
  const collapsed = manual ?? ((walking || coachOn) && typeof window !== "undefined" && window.innerWidth < 600);
  const setCollapsed = (v: boolean) => setManual(v);
  if (!o) {
    return (
      <div className="objective-card">
        <div className="kicker">{L("Visos užduotys atliktos")} <InlineIcon name="party" /></div>
        <p>{L("Grįžk į bet kurią vietą ir pabandyk pasakyti kitaip – žmonės kaskart kalba šiek tiek skirtingai.")}</p>
      </div>
    );
  }
  const sit = SITUATION_BY_ID[o.sitId];
  const phone = sit?.mode === "phone" || sit?.mode === "video" || sit?.location === "phone";
  const st = stars(sitProgress(progress, o.sitId));
  return (
    <div className={"objective-card" + (collapsed ? " collapsed" : "") + (fresh ? " fresh" : "")}>
      <div className="kicker">
        <span className="kicker-label"><Icon name="target" size={15} strokeWidth={2} /> {L("Užduotis")}</span>
        {st > 0 && <Stars n={st} size={14} />}
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)} aria-label={L("Suskleisti")} aria-expanded={!collapsed}><Icon name={collapsed ? "chevronDown" : "chevronUp"} size={18} strokeWidth={2} /></button>
      </div>
      <h3>{o.title} <span className="en-title">· {sit?.title.en}</span></h3>
      <p>{o.goal}</p>
      <div className="row">
        {phone ? (
          <button className="btn small" onClick={() => useStore.getState().setHud({ panel: "phone" })}><Icon name="smartphone" size={17} /> {L("Paskambinti")}</button>
        ) : (
          <>
            <span className="dist">
              {o.angle !== null && <Arrow angle={o.angle} />}
              {o.inside && o.dist !== null && o.dist < 4 ? L("Čia pat!") : o.dist !== null ? `${o.dist} m` : ""} · {o.where}
            </span>
            <button className="btn small" onClick={() => game?.autoWalkToObjective()} title="G"><Icon name="walk" size={17} /> {L("Nuvesk mane")}</button>
          </>
        )}
        <button className="btn ghost small" onClick={() => useStore.getState().setHud({ panel: "journal" })}>{L("Kita užduotis")}</button>
      </div>
    </div>
  );
}

function Arrow({ angle }: { angle: number }) {
  // angle: direction to target in world space (atan2(dx, dz)); screen: north (-z) is up
  const deg = 180 - (angle * 180) / Math.PI;
  return (
    <svg className="arrow" viewBox="0 0 24 24" style={{ transform: `rotate(${deg}deg)` }} aria-hidden>
      <path d="M12 2 L20 20 L12 16 L4 20 Z" fill="currentColor" />
    </svg>
  );
}

function Minimap() {
  const ref = useRef<HTMLCanvasElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const mm = useStore((s) => s.hud.minimap);
  const zoneName = useStore((s) => s.hud.zoneName);
  // Indoors there is no map to show: the round map folds into a small card with the place's name (all of it, on as
  // many lines as it needs) and unfolds again at the door. The frame glides between the two shapes, so indoors it
  // takes the card's own size, measured here (styles.css ".minimap").
  const inside = mm.zone !== "town";
  const place = useRef("");
  if (inside) place.current = zoneName;
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  // it glides only once it has been drawn: a map that appears indoors (the game opens in a room, the buttons come
  // back after a conversation) is the card at once
  const [live, setLive] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => requestAnimationFrame(() => setLive(true))); return () => cancelAnimationFrame(id); }, []);
  useLayoutEffect(() => {
    const el = card.current;
    if (!inside || !el) { setBox(null); return; }
    const name = el.querySelector("b")!, words = name.firstElementChild as HTMLElement;
    const measure = () => {
      // a name on two lines leaves its box as wide as it may be: hold the box to the words themselves (layout
      // sizes, which the card's arriving scale does not touch; a pixel to spare, for the rounding)
      name.style.width = "";
      const w = words.offsetWidth + 1;
      if (w > 1 && w < name.clientWidth) name.style.width = `${w}px`;
      setBox((b) => (b && b.w === el.offsetWidth && b.h === el.offsetHeight ? b : { w: el.offsetWidth, h: el.offsetHeight }));
    };
    measure();
    // again when the card's size changes (the text size setting, a turned phone) or its font arrives
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    ro?.observe(el);
    window.addEventListener("resize", measure);
    document.fonts?.addEventListener?.("loadingdone", measure);
    return () => { ro?.disconnect(); window.removeEventListener("resize", measure); document.fonts?.removeEventListener?.("loadingdone", measure); };
  }, [inside, zoneName]);
  useEffect(() => {
    const c = ref.current;
    const g = game?.groundCanvas;
    // indoors the last picture of the town stays on the canvas while it fades out
    if (!c || !g || mm.zone !== "town") return;
    const x = c.getContext("2d")!;
    const S = 220;
    c.width = S; c.height = S;
    x.clearRect(0, 0, S, S);
    const PPM = g.width / (WORLD.maxX - WORLD.minX);
    const view = 90; // metres across
    const sx = (mm.px - WORLD.minX) * PPM - (view / 2) * PPM;
    const sz = (mm.pz - (SEA_Z - 2)) * PPM - (view / 2) * PPM;
    x.fillStyle = "#3f8fb5"; x.fillRect(0, 0, S, S);
    x.drawImage(g, sx, sz, view * PPM, view * PPM, 0, 0, S, S);
    // target
    if (mm.targetX !== undefined && mm.targetZ !== undefined) {
      const tx = ((mm.targetX - mm.px) / view + 0.5) * S, tz = ((mm.targetZ - mm.pz) / view + 0.5) * S;
      const inside = tx > 10 && tx < S - 10 && tz > 10 && tz < S - 10;
      const cx = Math.max(12, Math.min(S - 12, tx)), cz = Math.max(12, Math.min(S - 12, tz));
      x.fillStyle = "#ffb703"; x.strokeStyle = "#fff"; x.lineWidth = 3;
      x.beginPath(); x.arc(cx, cz, inside ? 9 : 7, 0, Math.PI * 2); x.fill(); x.stroke();
    }
    // player arrow
    x.save(); x.translate(S / 2, S / 2); x.rotate(Math.PI - mm.heading);
    x.fillStyle = "#e63946"; x.strokeStyle = "#fff"; x.lineWidth = 3;
    x.beginPath(); x.moveTo(0, -12); x.lineTo(9, 10); x.lineTo(0, 5); x.lineTo(-9, 10); x.closePath(); x.stroke(); x.fill();
    x.restore();
  }, [mm]);
  return (
    <div className={"minimap" + (inside ? " inside" : "") + (live ? " live" : "")}
      style={inside && box ? { width: box.w + 2, height: box.h + 2 } : undefined}
      onClick={() => useStore.getState().setHud({ panel: "map" })}
      title={L("Žemėlapis (M)")}>
      <canvas ref={ref} />
      <div className="label">{inside ? "" : zoneName}</div>
      <div className="mm-card" ref={card} aria-hidden={!inside}>
        <span className="mm-ico"><Icon name="home" size={21} strokeWidth={2} /></span>
        <small>{L("Viduje")}</small>
        <b><span>{place.current}</span></b>
        <span className="mm-go"><Icon name="map" size={18} strokeWidth={2} /></span>
      </div>
    </div>
  );
}

function TouchControls() {
  const ref = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const prompt = useStore((s) => s.hud.prompt);
  useEffect(() => {
    const el = ref.current!;
    let id: number | null = null;
    const R = 60;
    // pushed to the edge: a run (the ring shows it; the game's own thresholds, Game.updatePlayer)
    let run = false;
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      knob.current!.style.transform = `translate(${dx}px, ${dy}px)`;
      run = d / R > 0.9 || (run && d / R > 0.8);
      el.classList.toggle("run", run);
      game?.setJoystick(dx / R, -dy / R);
    };
    const stop = () => { id = null; if (knob.current) knob.current.style.transform = ""; run = false; el.classList.remove("run"); game?.setJoystick(0, 0); };
    const up = (e: PointerEvent) => { if (e.pointerId === id) stop(); };
    const down = (e: PointerEvent) => {
      if (id !== null || e.button !== 0) return;
      e.preventDefault();
      id = e.pointerId; el.setPointerCapture(e.pointerId); move(e);
    };
    const noMenu = (e: Event) => e.preventDefault();
    const hidden = () => { if (document.hidden) stop(); };
    el.addEventListener("pointerdown", down); el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up); el.addEventListener("lostpointercapture", up); el.addEventListener("contextmenu", noMenu);
    window.addEventListener("blur", stop); document.addEventListener("visibilitychange", hidden);
    return () => {
      el.removeEventListener("pointerdown", down); el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); el.removeEventListener("lostpointercapture", up); el.removeEventListener("contextmenu", noMenu);
      window.removeEventListener("blur", stop); document.removeEventListener("visibilitychange", hidden); stop();
    };
  }, []);
  return (
    <>
      <div className="joy" ref={ref}><div className="knob" ref={knob} /></div>
      {/* the jump stays under the right thumb; with someone to talk to or a door to go through it moves over for that button */}
      {prompt && <button className="act-btn" onClick={() => game?.interact()}>{prompt.kind === "talk" ? L("Kalbėti") : prompt.kind === "exit" ? L("Išeiti") : L("Įeiti")}</button>}
      <button className={"jump-btn" + (prompt ? " beside" : "")} aria-label={L("Pašokti")} title={L("Pašokti")} onPointerDown={(e) => { e.preventDefault(); game?.jump(); }}><Icon name="chevronUp" size={34} strokeWidth={2.5} /></button>
    </>
  );
}

/** The icon of a place (its emoji in the location data, drawn as one of our icons). */
export function locIcon(id: string): IconName { return iconForEmoji(LOCATIONS[id]?.icon) ?? "pin"; }
