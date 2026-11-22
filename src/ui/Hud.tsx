import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useStore } from "../state/store";
import { SectionHelpButton, useSectionHelp } from "./sectionHelp";
import { useSurf } from "../game/surf/store";
import { SurfOverlay, SurfPicker } from "./Surf";
import { game } from "../game/gameRef";
import { coach } from "../game/coach";
import { WORLD, SEA_Z } from "../game/world/layout";
import { LOCATIONS } from "../content/locations";
import { SITUATION_BY_ID } from "../content/situations/catalog";
import { sitProgress, stars } from "../state/progress";
import { Icon, InlineIcon, Stars, iconForEmoji, splitLead, type IconName } from "./icons";
import { drawRideMarks } from "./mapMarks";
import { switchPlayMode } from "./playMode";
import { useCards, dueCards } from "../state/cards";
import { LyricStrip, RadioTool } from "./Radio";
import { radio, useRadio } from "../radio";
import { Guide } from "./Guide";
import { portraitToolbarRows, toolbarColumns } from "./toolbarLayout";
import { useScreen } from "./useScreen";
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

type Screen = ReturnType<typeof useScreen>;

function Toolbar({ w, h, portraitPhone, sidewaysPhone }: Screen) {
  const due = useDueCards();
  const hasRadio = useRadio((s) => s.available);
  const radioOpen = useRadio((s) => s.open);
  const hasHelp = useSectionHelp();
  const panel = useStore((s) => s.hud.panel);
  const touch = useStore((s) => s.hud.showTouch);
  const prompt = useStore((s) => s.hud.prompt?.kind);
  const listHint = useStore((s) => s.hud.coach?.step === "list" && !s.hud.coach.ok);
  const folds = portraitPhone || sidewaysPhone;
  const toolbar = useRef<HTMLDivElement>(null);
  const fitLimit = useRef<HTMLDivElement>(null);
  const { single, split } = portraitToolbarRows({ hasHelp, hasRadio, hasCourse: !!COURSE_URL });
  const [maxRows, setMaxRows] = useState(single);
  useLayoutEffect(() => {
    const bar = toolbar.current, limit = fitLimit.current;
    if (!folds || !bar || !limit) return;
    const controls = bar.parentElement!.querySelectorAll<HTMLElement>(".prompt, .jump-btn, .act-btn");
    const update = () => {
      const style = getComputedStyle(bar);
      const size = parseFloat(style.getPropertyValue("--tool-size"));
      const gap = parseFloat(style.getPropertyValue("--tool-gap"));
      const top = bar.getBoundingClientRect().top + size + gap;
      let bottom = limit.getBoundingClientRect().bottom;
      for (const control of controls) bottom = Math.min(bottom, control.offsetTop);
      // Count the rows that end above the controls, with room to tap them.
      setMaxRows(Math.floor((bottom - top - (portraitPhone ? 12 : 8) + gap) / (size + gap)));
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(limit);
    for (const control of controls) observer?.observe(control);
    update();
    return () => observer?.disconnect();
  }, [folds, portraitPhone, w, h, touch, prompt, panel]);
  const columns = toolbarColumns(single, portraitPhone ? Math.max(maxRows, split) : maxRows);
  const toolColumns = columns.flatMap((rows, column) => Array<number>(rows).fill(column + 1));

  const [menuOpen, setMenuOpen] = useState(false);
  const open = folds && !panel && (menuOpen || listHint || radioOpen);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    if (radio.store.getState().open) radio.setOpen(false);
    const hint = useStore.getState().hud.coach;
    if (hint?.step === "list" && !hint.ok) coach.next();
  }, []);
  const keepOpen = useCallback(() => {
    clearTimeout(timer.current);
    if (!radioOpen && !listHint) {
      timer.current = setTimeout(() => {
        if (!radio.store.getState().open) setMenuOpen(false);
      }, 5000);
    }
  }, [radioOpen, listHint]);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      const target = e.target as Element;
      if (toolbar.current?.contains(target)) return;
      // The guide's buttons dismiss their own hint when the tap finishes.
      if (target.closest?.(".coach-row")) setMenuOpen(false);
      else closeMenu();
    };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") closeMenu(); };
    document.addEventListener("pointerdown", outside, true);
    window.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("keydown", escape, true);
    };
  }, [open, closeMenu]);
  useEffect(() => {
    if (open) keepOpen();
    return () => clearTimeout(timer.current);
  }, [open, keepOpen]);
  useLayoutEffect(() => {
    if (!folds) setMenuOpen(false);
    else if (panel) closeMenu();
    else if (radioOpen) setMenuOpen(true);
  }, [folds, panel, radioOpen, closeMenu]);

  const course = COURSE_URL && <a className="icon-btn course-link" href={COURSE_URL} title="Grįžti į kursą" aria-label="Grįžti į kursą"><Icon name="home" size={25} /></a>;
  const actions = [
    <ToolButton key="scenarios" icon="clapper" title="Visos situacijos" panel="scenarios" />,
    <ToolButton key="map" icon="map" title="Žemėlapis (M)" panel="map" hotkey="M" />,
    <ToolButton key="journal" icon="journal" title="Užduotys (J)" panel="journal" hotkey="J" />,
    <ToolButton key="phone" icon="smartphone" title="Telefonas (P)" panel="phone" hotkey="P" />,
    <ToolButton key="phrasebook" icon="bookOpen" title="Frazių knygelė" panel="phrasebook" badge={due} />,
    <ToolButton key="settings" icon="settings" title="Nustatymai (Esc)" panel="settings" />,
    ...(hasHelp ? [<SectionHelpButton key="help" />] : []),
  ];
  const lightMode = (
    <button className="icon-btn light-mode-btn" onClick={() => switchPlayMode("light")} title="Lengvas režimas" aria-label="Lengvas režimas">
      <span aria-hidden>LR</span>
      <span className="toolbar-tooltip" aria-hidden>Lengvas režimas</span>
    </button>
  );
  const className = "toolbar" + (hasRadio ? " has-radio" : "");
  if (!folds) return (
    <div className={className}>
      <div className="toolbar-tools">{course}{actions}</div>
      <div className="toolbar-extra"><RadioTool />{lightMode}</div>
    </div>
  );
  const slot = (item: ReactNode, index: number) => (
    <div className="drawer-tool" key={index} style={{ "--tool-column": toolColumns[index] } as CSSProperties}>{item}</div>
  );
  return (
    <div ref={toolbar} className={className + " in-ride folds" + (portraitPhone ? " portrait-toolbar" : "") + (open ? " menu-open" : "") + (columns.length === 2 ? " two-columns" : "")}
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && (e.target as HTMLElement).matches(":focus-visible")) e.stopPropagation(); }}>
      <button className="icon-btn ride-menu" title="Meniu" aria-label="Meniu" aria-expanded={open} aria-controls="town-tools"
        onClick={() => { if (open) closeMenu(); else setMenuOpen(true); }}>
        <Icon name="menu" size={25} />
        {!!due && !open && <span className="due-badge" aria-hidden>{due}</span>}
      </button>
      <div className="toolbar-fit-limit" ref={fitLimit} aria-hidden />
      <div className="toolbar-drawer" id="town-tools" inert={!open} style={{ "--drawer-rows": columns[0] } as CSSProperties} onPointerDown={keepOpen} onClick={keepOpen}>
        <div className="toolbar-tools">
          <div className="toolbar-actions">{actions.map(slot)}</div>
          {slot(<RadioTool />, actions.length)}
        </div>
        <div className="toolbar-shortcuts">
          {slot(lightMode, actions.length + Number(hasRadio))}
          {course && slot(course, single - 1)}
        </div>
      </div>
    </div>
  );
}

export function Hud() {
  const hud = useStore((s) => s.hud);
  const conv = useStore((s) => s.conv);
  const screen = useScreen();
  const surfing = useSurf((s) => s.active);
  if (conv.active) return <Fade />;
  // the first visit's flight over the town has the screen to itself too: where one is, and what to do first
  if (hud.flight) return <div className="hud"><Flight /><Fade /></div>;
  // the surf lesson has the screen to itself: her line, the answers, the score, and the phone's controls
  if (surfing) return (
    <div className={"hud" + (hud.showTouch ? " has-touch" : "")}>
      <SurfOverlay />
      {hud.showTouch && <TouchControls />}
      <Fade />
    </div>
  );
  const banner = hud.zoneBanner ? splitLead(hud.zoneBanner.title) : null;
  const layout = screen.sidewaysPhone ? "sideways" : screen.portraitPhone ? "portrait" : "full";
  return (
    <div className={"hud" + (hud.showTouch ? " has-touch" : "")}>
      <Objective key={"task-" + layout} {...screen} />
      <Minimap {...screen} />
      <Toolbar key={"tools-" + layout} {...screen} />
      {!hud.panel && <LyricStrip />}
      {hud.zoneBanner && banner && <div className="zone-banner"><h2>{banner.icon && <Icon name={banner.icon} size="0.8em" className="zb-ico" />}{banner.rest}</h2>{hud.zoneBanner.sub && <p>{hud.zoneBanner.sub}</p>}</div>}
      {/* (on a phone the way out of a car is the round button itself: no second label over it) */}
      {hud.prompt && !hud.panel && !(hud.showTouch && hud.prompt.kind === "out") && (
        <button className={"prompt" + (hud.showTouch ? " touch" : "")} onClick={() => game?.interact()}>
          <kbd>{hud.showTouch ? <Icon name="tap" size={18} /> : "E"}</kbd>
          <span className="prompt-text">{hud.prompt.label}{hud.prompt.lt && <small lang="lt">{hud.prompt.lt}</small>}</span>
        </button>
      )}
      <Guide {...screen} />
      {/* at a wheel, at the boat's helm or in the water: what the keys do there (a computer; a phone has its buttons) */}
      {hud.ride && !hud.showTouch && !hud.panel && !hud.coach && (
        <div className="help-strip ride-strip">
          {hud.ride === "car" || hud.ride === "boat" ? <>
            {hud.ride === "car" ? "Vairuok" : "Plauk"} <kbd><Icon name="arrowUp" size="1em" strokeWidth={2.25} label="aukštyn" /></kbd><kbd><Icon name="arrowDown" size="1em" strokeWidth={2.25} label="žemyn" /></kbd><kbd><Icon name="arrowLeft" size="1em" strokeWidth={2.25} label="kairėn" /></kbd><kbd><Icon name="arrowRight" size="1em" strokeWidth={2.25} label="dešinėn" /></kbd> arba <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> · stabdyti <kbd>Tarpas</kbd> · išlipti <kbd>E</kbd>
          </> : <>
            Plauk <kbd><Icon name="arrowUp" size="1em" strokeWidth={2.25} label="aukštyn" /></kbd><kbd><Icon name="arrowDown" size="1em" strokeWidth={2.25} label="žemyn" /></kbd><kbd><Icon name="arrowLeft" size="1em" strokeWidth={2.25} label="kairėn" /></kbd><kbd><Icon name="arrowRight" size="1em" strokeWidth={2.25} label="dešinėn" /></kbd> · greičiau <kbd>Shift</kbd> · {hud.ride === "dive" ? "išnirti" : "panerti"} <kbd>Tarpas</kbd>
          </>}
        </div>
      )}
      {hud.showTouch && <TouchControls />}
      <SurfPicker />
      <Fade />
    </div>
  );
}

/** The first visit's flight over the town (game/flyover.ts): the town's name, one sentence of what to do first, and
 *  the way to cut it short: any key (Game.onKeyDown), or a tap anywhere. */
function Flight() {
  const touch = useStore((s) => s.hud.showTouch);
  return (
    <button className="flight" onClick={() => game?.endFlight?.()} aria-label="Praleisti">
      <span className="flight-words">
        <span className="flight-kicker">Sveiki atvykę!</span>
        <b>Maple Harbor</b>
        <span className="flight-first">Tavo lėktuvas ką tik nusileido. Pirmiausia – pasų kontrolė: prieik ir pasikalbėk angliškai.</span>
      </span>
      <span className="flight-skip">{touch ? "Bakstelėk – praleisti" : "Bet kuris klavišas – praleisti"}</span>
    </button>
  );
}

function Fade() {
  const fade = useStore((s) => s.hud.fade);
  return <div className="fade" style={{ opacity: fade }} />;
}

function Objective({ portraitPhone, sidewaysPhone }: Screen) {
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
  // It folds while walking on an upright phone and stays folded sideways, unless changed by hand.
  const [manual, setManual] = useState<boolean | null>(null);
  const walking = useStore((s) => s.hud.walking);
  // (and while the first-time guide's card is up, which sits under it)
  const coachOn = useStore((s) => !!s.hud.coach);
  const collapsed = manual ?? (sidewaysPhone || (portraitPhone && (walking || coachOn)));
  const setCollapsed = (v: boolean) => setManual(v);
  if (!o) {
    return (
      <div className={"objective-card" + (sidewaysPhone ? " collapsed" : "")}>
        <div className="kicker">Visos užduotys atliktos <InlineIcon name="party" /></div>
        <p>Grįžk į bet kurią vietą ir pabandyk pasakyti kitaip – žmonės kaskart kalba šiek tiek skirtingai.</p>
      </div>
    );
  }
  const sit = SITUATION_BY_ID[o.sitId];
  const phone = sit?.mode === "phone" || sit?.mode === "video" || sit?.location === "phone";
  const st = stars(sitProgress(progress, o.sitId));
  return (
    <div className={"objective-card" + (collapsed ? " collapsed" : "") + (fresh ? " fresh" : "")}>
      <div className="kicker">
        <span className="kicker-label"><Icon name="target" size={15} strokeWidth={2} /> Užduotis</span>
        {st > 0 && <Stars n={st} size={14} />}
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)} aria-label="Suskleisti" aria-expanded={!collapsed}><Icon name={collapsed ? "chevronDown" : "chevronUp"} size={18} strokeWidth={2} /></button>
      </div>
      <h3>{o.title} <span className="en-title">· {sit?.title.en}</span></h3>
      <p>{o.goal}</p>
      <div className="row">
        {phone ? (
          <button className="btn small" onClick={() => useStore.getState().setHud({ panel: "phone" })}><Icon name="smartphone" size={17} /> Paskambinti</button>
        ) : (
          <>
            <span className="dist">
              {o.angle !== null && <Arrow angle={o.angle} />}
              {o.inside && o.dist !== null && o.dist < 4 ? "Čia pat!" : o.dist !== null ? `${o.dist} m` : ""} · {o.where}
            </span>
            <button className="btn small" onClick={() => game?.autoWalkToObjective()} title="G"><Icon name="walk" size={17} /> Nuvesk mane</button>
          </>
        )}
        <button className="btn ghost small" onClick={() => useStore.getState().setHud({ panel: "journal" })}>Kita užduotis</button>
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

function Minimap({ w, h }: Screen) {
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
    document.fonts?.addEventListener?.("loadingdone", measure);
    return () => { ro?.disconnect(); document.fonts?.removeEventListener?.("loadingdone", measure); };
  }, [inside, zoneName, w, h]);
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
    // (beyond the town's own picture: the sea to the north, grass everywhere else)
    { const shore = ((SEA_Z + 1 - mm.pz) / view + 0.5) * S; if (shore < S) { x.fillStyle = "#86b866"; x.fillRect(0, Math.max(0, shore), S, S); } }
    x.drawImage(g, sx, sz, view * PPM, view * PPM, 0, 0, S, S);
    // target
    if (mm.targetX !== undefined && mm.targetZ !== undefined) {
      const tx = ((mm.targetX - mm.px) / view + 0.5) * S, tz = ((mm.targetZ - mm.pz) / view + 0.5) * S;
      const inside = tx > 10 && tx < S - 10 && tz > 10 && tz < S - 10;
      const cx = Math.max(12, Math.min(S - 12, tx)), cz = Math.max(12, Math.min(S - 12, tz));
      x.fillStyle = "#ffb703"; x.strokeStyle = "#fff"; x.lineWidth = 3;
      x.beginPath(); x.arc(cx, cz, inside ? 9 : 7, 0, Math.PI * 2); x.fill(); x.stroke();
    }
    // what one can take: the boats and the convertibles, where they are now
    if (game?.rideMarks) drawRideMarks(x, game.rideMarks(), mm.px, mm.pz, view, S);
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
      title="Žemėlapis (M)">
      <canvas ref={ref} />
      <div className="label">{inside ? "" : zoneName}</div>
      <div className="mm-card" ref={card} aria-hidden={!inside}>
        <span className="mm-ico"><Icon name="home" size={21} strokeWidth={2} /></span>
        <small>Viduje</small>
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
  const ride = useStore((s) => s.hud.ride);
  const fast = useStore((s) => s.hud.fast);
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
      {/* the jump stays under the right thumb; with someone to talk to or a door to go through it moves over for that button
          (a second tap while in the air is a flip: every press goes to the game, which knows where the player is) */}
      {prompt && <button className="act-btn" onClick={() => game?.interact()}>{prompt.kind === "talk" ? "Kalbėti" : prompt.kind === "exit" ? "Išeiti" : prompt.kind === "drive" ? "Vairuoti" : prompt.kind === "boat" ? "Plaukti" : prompt.kind === "out" ? "Išlipti" : prompt.kind === "climb" ? "Užlipti" : prompt.kind === "surf" ? "Banglentė" : prompt.kind === "paddle" ? "Irkluoti" : "Įeiti"}</button>}
      {/* (at a wheel the same button is the brake, for as long as it is held; in the water, a dive and the way back up) */}
      {ride === "car" || ride === "boat"
        ? <button className={"jump-btn brake-btn" + (prompt ? " beside" : "")} aria-label="Stabdyti" title="Stabdyti" onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); game?.hold(true); }} onPointerUp={() => game?.hold(false)} onPointerCancel={() => game?.hold(false)} onLostPointerCapture={() => game?.hold(false)}><span aria-hidden>{fast ? "DRIFT" : "STOP"}</span></button>
        : ride === "swim" || ride === "dive"
          ? <button className={"jump-btn" + (prompt ? " beside" : "")} aria-label={ride === "dive" ? "Išnirti" : "Panerti"} title={ride === "dive" ? "Išnirti" : "Panerti"} onPointerDown={(e) => { e.preventDefault(); game?.jump(); }}><Icon name={ride === "dive" ? "chevronUp" : "chevronDown"} size={34} strokeWidth={2.5} /></button>
          : ride === "surf"
            ? <button className={"jump-btn" + (prompt ? " beside" : "")} aria-label="Atsistoti" title="Atsistoti" onPointerDown={(e) => { e.preventDefault(); game?.jump(); }}><Icon name="chevronUp" size={34} strokeWidth={2.5} /></button>
          : <button className={"jump-btn" + (prompt ? " beside" : "")} aria-label="Pašokti" title="Pašokti" onPointerDown={(e) => { e.preventDefault(); game?.jump(); }}><Icon name="chevronUp" size={34} strokeWidth={2.5} /></button>}
    </>
  );
}

/** The icon of a place (its emoji in the location data, drawn as one of our icons). */
export function locIcon(id: string): IconName { return iconForEmoji(LOCATIONS[id]?.icon) ?? "pin"; }
