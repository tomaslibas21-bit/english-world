import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ComponentType, type CSSProperties, type KeyboardEvent } from "react";
import { ROAD_UI } from "../content/road";
import { townRide, usesTownNotes, useStore, type HudState } from "../state/store";
import { townNote } from "../state/townNotes";
import { SectionHelpButton, useSectionHelp } from "./sectionHelp";
import { useSurf } from "../game/surf/store";
import { TaxiOverlay } from "./Taxi";
import { PoolOverlay } from "./Pool";
import { SurfOverlay, SurfPicker } from "./Surf";
import { BaristaOffer, BaristaOverlay } from "./Barista";
import { game } from "../game/gameRef";
import { CAVE_ZONE } from "../game/cave/groundsPlan";
import { SITUATION_BY_ID } from "../content/situations/catalog";
import { sitProgress, stars } from "../state/progress";
import { Icon, InlineIcon, Stars, splitLead, type IconName } from "./icons";
import { isPhone } from "./objective";
import { drawRideMarks } from "./mapMarks";
import { caveBounds, drawCaveMap, drawTownMap, mapPoint, mapWindow } from "./worldMap";
import { switchPlayMode } from "./playMode";
import { useCards, dueCards } from "../state/cards";
import { LyricStrip, RadioTool } from "./Radio";
import { useRadio } from "../radio";
import { L, Lx } from "./i18n";
import { EDITION } from "../edition";
import { CaveCard } from "./Cave";
import { Guide } from "./Guide";
import { TownToast } from "./Toasts";
import { PhoneRing } from "./PhoneRing";
import { portraitToolbarRows } from "./toolbarLayout";
import "./light.css";
import "./townPhone.css";

/** Inside English Master (VITE_BACK_URL, e.g. "/"): the way back to the course site. */
export const COURSE_URL = import.meta.env.VITE_BACK_URL as string | undefined;

function ToolButton({ icon, title, panel, hotkey, badge, shortcuts = true }: { icon: IconName; title: string; panel: "scenarios" | "map" | "journal" | "phone" | "phrasebook" | "settings"; hotkey?: string; badge?: number; shortcuts?: boolean }) {
  const label = shortcuts ? title : title.replace(/ \((?:M|J|P|Esc)\)$/, "");
  return (
    <button className="icon-btn" onClick={() => useStore.getState().setHud({ panel })} title={label} aria-label={badge ? `${label} (${badge})` : label}>
      <Icon name={icon} size={25} />{shortcuts && hotkey && <span className="key" aria-hidden>{hotkey}</span>}
      {!!badge && <span className="due-badge" aria-hidden>{badge}</span>}
    </button>
  );
}

/** How many saved cards are due for review today. */
export function useDueCards(): number {
  const cards = useCards((c) => c.cards);
  return dueCards(cards, Date.now()).length;
}

/** The four arrow keys, for the hints at a wheel and in the water. */
const RIDE_ARROWS = () => <><kbd><Icon name="arrowUp" size="1em" strokeWidth={2.25} label={L("aukštyn")} /></kbd><kbd><Icon name="arrowDown" size="1em" strokeWidth={2.25} label={L("žemyn")} /></kbd><kbd><Icon name="arrowLeft" size="1em" strokeWidth={2.25} label={L("kairėn")} /></kbd><kbd><Icon name="arrowRight" size="1em" strokeWidth={2.25} label={L("dešinėn")} /></kbd></>;

const FriendMeeting = lazy(() => import("./FriendMeeting"));
const RoadOverlay = lazy(() => import("./Road").then(({ RoadOverlay }) => ({ default: RoadOverlay })));
const modeOverlays: Record<string, ComponentType<{ touch: boolean }>> = { taxi: TaxiOverlay, road: RoadOverlay, barista: BaristaOverlay, pool: PoolOverlay };

export function Hud() {
  const hud = useStore((s) => s.hud);
  const inConversation = useStore((s) => s.conv.active);
  const surfing = useSurf((s) => s.active);
  const picking = useSurf((s) => s.picking);
  const notesVisible = useStore(usesTownNotes);
  const ride = townRide(hud.ride);
  const riding = ride !== null;
  const taskId = hud.objective?.followUp ? hud.objective.title : hud.objective?.sitId ?? null;
  const task = useTaskCard(taskId, notesVisible && !hud.cave);
  if (inConversation) return <Fade />;
  // the first visit's flight over the town has the screen to itself too: where one is, and what to do first
  if (hud.flight) return <div className="hud"><Flight /><Fade /></div>;
  // The surf lesson keeps her line, the answers, the score, and the phone's controls.
  if (surfing) return (
    <div className={"hud" + (hud.showTouch ? " has-touch" : "")}>
      <SurfOverlay toolbar={<Toolbar riding touch={hud.showTouch} surf />} />
      {hud.showTouch && <TouchControls />}
      <Fade />
    </div>
  );
  if (hud.modeScreen?.id === "friend-meeting") return (
    <div className="hud mode-hud"><Suspense><FriendMeeting /></Suspense><Fade /></div>
  );
  if (hud.modeScreen?.kind === "menu") {
    const Overlay = modeOverlays[hud.modeScreen.id];
    const road = hud.modeScreen.id === "road";
    return (
      <div className={"hud mode-hud" + (road ? " road-mode" : "") + (hud.showTouch ? " has-touch" : "")}>
        {!hud.panel && Overlay && <Suspense fallback={null}><Overlay touch={hud.showTouch} /></Suspense>}
        {!road && hud.modeScreen.id !== "barista" && <Toolbar riding touch={hud.showTouch} modeExit={hud.modeScreen.exitLabel} />}
        {hud.showTouch && hud.ride && <TouchControls road={road} />}
        <Fade />
      </div>
    );
  }
  const note = notesVisible ? townNote(hud) : null;
  const banner = note === "banner" && hud.zoneBanner ? splitLead(hud.zoneBanner.title) : null;
  const moving = hud.walking || riding;
  const collapsed = !hud.cave && ((moving && !!hud.objective?.followUp) || (task.manual ?? (!task.fresh && moving)));
  return (
    <div className={"hud" + (hud.showTouch ? " has-touch" : "")}>
      {hud.speedLines && !hud.panel && <div className="drive-wind" aria-hidden />}
      <div className="hud-top">
        <div className={"objective-notes" + (collapsed ? " task-folded" : "")} onKeyDown={hud.cave ? activateHudButton : undefined}>
          {hud.cave ? <CaveCard arrow={Arrow} /> : <Objective key={taskId ?? "complete"} collapsed={collapsed} fresh={task.fresh && notesVisible} setCollapsed={task.setManual} />}
          {hud.zoneBanner && banner && <div className="zone-banner"><h2>{banner.icon && <Icon name={banner.icon} size="0.8em" className="zb-ico" />}{banner.rest}</h2>{hud.zoneBanner.sub && <p>{hud.zoneBanner.sub}</p>}</div>}
          {note === "phone" && hud.phoneCard && <PhoneRing id={hud.phoneCard} />}
          <Guide visible={note === "guide"} />
          <TownToast visible={note === "toast"} />
        </div>
        <Minimap />
      </div>
      <Toolbar riding={riding || hud.wading} touch={hud.showTouch} />
      {!hud.panel && <LyricStrip />}
      {/* (on a phone the way out of a car is the round button itself: no second label over it) */}
      {hud.prompt && !hud.panel && !(hud.showTouch && hud.prompt.kind === "out") && (
        <button className={"prompt" + (hud.showTouch ? " touch" : "")} onClick={() => game?.interact()}>
          <kbd>{hud.prompt.kind === "drive" && hud.prompt.label === L(ROAD_UI.drive) ? <Icon name="key" size={18} /> : hud.showTouch ? <Icon name="tap" size={18} /> : "E"}</kbd>
          <span className="prompt-text">{hud.prompt.label}{hud.prompt.lt && <small lang={EDITION.helper}>{hud.prompt.lt}</small>}</span>
        </button>
      )}
      {riding && hud.rideStartedAt !== null && !hud.showTouch && (
        <RideKeys key={`${ride}-${hud.rideStartedAt}`} ride={hud.ride} startedAt={hud.rideStartedAt} hidden={!!hud.panel || !!hud.glyph || picking || note === "guide"} />
      )}
      {hud.showTouch && <TouchControls />}
      {!hud.panel && <BaristaOffer />}
      <SurfPicker />
      <Fade />
    </div>
  );
}

function useTaskCard(taskId: string | null, visible: boolean) {
  const [state, setState] = useState<{ id: string | null; manual: boolean | null; fresh: boolean }>({ id: taskId, manual: null, fresh: false });
  // A manual choice belongs to one task. Give the next task its pop when the card is back on screen.
  if (taskId !== state.id) setState({ id: taskId, manual: null, fresh: taskId !== null });
  useEffect(() => {
    if (!state.fresh || !visible) return;
    const timer = setTimeout(() => setState((current) => current.id === state.id ? { ...current, fresh: false } : current), 3000);
    return () => clearTimeout(timer);
  }, [state.id, state.fresh, visible]);
  return { ...state, setManual: (manual: boolean) => setState((current) => ({ ...current, manual })) };
}

// Enter and Space belong to a button reached by keyboard, even while the game is listening for movement.
function activateHudButton(e: KeyboardEvent<HTMLElement>) {
  if ((e.key === "Enter" || e.key === " ") && (e.target as HTMLElement).matches(":focus-visible")) e.stopPropagation();
}

function Toolbar({ riding, touch, surf = false, modeExit }: { riding: boolean; touch: boolean; surf?: boolean; modeExit?: string }) {
  const due = useDueCards();
  const missedCalls = useStore((s) => Object.keys(s.progress.phone?.missed ?? {}).length);
  const hasRadio = useRadio((s) => s.available);
  const hasHelp = useSectionHelp();
  const hasTouchPrompt = useStore((s) => !s.hud.panel && !!s.hud.prompt && s.hud.prompt.kind !== "out");
  const canHonk = useStore((s) => s.hud.ride === "car" || s.hud.ride === "taxi");
  const [upright, setUpright] = useState(false);
  useLayoutEffect(() => {
    if (!touch) return;
    const view = window.matchMedia("(max-width: 600px) and (orientation: portrait)");
    const update = () => setUpright(view.matches);
    update();
    view.addEventListener("change", update);
    return () => view.removeEventListener("change", update);
  }, [touch]);
  const portrait = touch && upright;
  const toolbar = useRef<HTMLDivElement>(null);
  const fitLimit = useRef<HTMLDivElement>(null);
  const [twoColumns, setTwoColumns] = useState(false);
  const baseRows = portraitToolbarRows({ hasHelp, hasRadio, hasCourse: !!COURSE_URL, modeExit: !!modeExit });
  const hornInMenu = canHonk && !touch;
  const drawerRows = { single: baseRows.single + Number(hornInMenu), split: baseRows.split + Number(hornInMenu) };
  const rows = drawerRows.single + Number(riding);
  useLayoutEffect(() => {
    const bar = toolbar.current, limit = fitLimit.current;
    if (!portrait || !bar || !limit) return;
    const hud = bar.closest(".hud")!;
    const prompt = hud.querySelector<HTMLElement>(".prompt.touch");
    const jump = hud.querySelector<HTMLElement>(".jump-btn");
    const update = () => {
      const style = getComputedStyle(bar);
      const size = parseFloat(style.getPropertyValue("--tool-size"));
      const gap = parseFloat(style.getPropertyValue("--tool-gap"));
      // The column ends at its top offset + one button per row + the gaps between them. Leave 12 px above the controls.
      const end = bar.getBoundingClientRect().top + rows * size + (rows - 1) * gap;
      const clearUntil = Math.min(limit.getBoundingClientRect().bottom, prompt?.getBoundingClientRect().top ?? Infinity, jump?.getBoundingClientRect().top ?? Infinity);
      setTwoColumns(end + 12 > clearUntil);
    };
    const observer = new ResizeObserver(update);
    observer.observe(limit);
    if (prompt) observer.observe(prompt);
    update();
    return () => observer.disconnect();
  }, [portrait, riding, rows, hasTouchPrompt]);
  const [menuOpen, setMenuOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const keepOpen = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMenuOpen(false), 5000);
  };
  const open = riding && menuOpen;
  useEffect(() => {
    if (!riding) setMenuOpen(false);
    return () => clearTimeout(timer.current);
  }, [riding]);
  const toggleMenu = () => {
    if (open) clearTimeout(timer.current);
    else keepOpen();
    setMenuOpen(!open);
  };
  const course = COURSE_URL && <a className="icon-btn course-link" href={COURSE_URL} title={L("Grįžti į kursą")} aria-label={L("Grįžti į kursą")}><Icon name="home" size={25} /></a>;
  const lightMode = (
    <button className="icon-btn light-mode-btn" onClick={() => switchPlayMode("light")} title={L("Lengvas režimas")} aria-label={L("Lengvas režimas")}>
      <span aria-hidden>{L("LR")}</span>
      <span className="toolbar-tooltip" aria-hidden>{L("Lengvas režimas")}</span>
    </button>
  );
  const menuLabel = surf ? "Meniu" : L("Meniu");
  const menu = riding && <button className="icon-btn ride-menu" onClick={toggleMenu} title={menuLabel} aria-label={menuLabel} aria-expanded={open} aria-controls="town-tools">
    <Icon name="menu" size={25} />
    {!!due && <span className="due-badge" aria-hidden>{due}</span>}
  </button>;
  const actions = <>
    {modeExit && <button className="icon-btn mode-exit" title={modeExit} aria-label={modeExit} onClick={() => game?.modeExit()}><Icon name="walk" size={25} /></button>}
    {hornInMenu && <HornButton />}
    <ToolButton icon="clapper" title={L("Visos situacijos")} panel="scenarios" />
    <ToolButton icon="map" title={L("Žemėlapis (M)")} panel="map" hotkey="M" shortcuts={!surf} />
    <ToolButton icon="journal" title={L("Užduotys (J)")} panel="journal" hotkey="J" shortcuts={!surf} />
    <ToolButton icon="smartphone" title={L("Telefonas (P)")} panel="phone" hotkey="P" badge={missedCalls} shortcuts={!surf} />
    <ToolButton icon="bookOpen" title={L("Frazių knygelė")} panel="phrasebook" badge={due} />
    <ToolButton icon="settings" title={L("Nustatymai (Esc)")} panel="settings" shortcuts={!surf} />
    <SectionHelpButton />
  </>;
  const className = "toolbar" + (hasRadio ? " has-radio" : "") + (riding ? " in-ride" : "") + (open ? " menu-open" : "") + (surf ? " surf-toolbar" : "");
  const folded = riding && !open;
  const radioTool = (!surf || !folded) && <RadioTool shortcut={!surf} />;
  if (portrait) return (
    <div ref={toolbar} className={className + " portrait-toolbar" + (twoColumns ? " two-columns" : "")} onKeyDown={activateHudButton}>
      {menu}
      <div className="toolbar-fit-limit" ref={fitLimit} aria-hidden />
      <div className="toolbar-drawer" id="town-tools" style={{ "--drawer-rows": drawerRows.split } as CSSProperties} onClick={open ? keepOpen : undefined}>
        <div className="toolbar-tools">
          <div className="toolbar-actions" inert={folded}>{actions}</div>
          {radioTool}
        </div>
        <div className="toolbar-shortcuts" inert={folded}>{lightMode}{course}</div>
      </div>
    </div>
  );
  return (
    <div className={className} onKeyDown={activateHudButton}>
      {menu}
      <div className="toolbar-tools" id="town-tools" inert={folded} onClick={open ? keepOpen : undefined}>
        {course}
        {actions}
        {riding && lightMode}
        {surf && radioTool}
      </div>
      {!surf && <div className="toolbar-extra" onClick={open ? keepOpen : undefined}>
        {radioTool}
        {!riding && lightMode}
      </div>}
    </div>
  );
}

function RideKeys({ ride, startedAt, hidden }: { ride: HudState["ride"]; startedAt: number; hidden: boolean }) {
  const count = useStore((s) => s.progress.coach?.rides ?? 0);
  const [intro, setIntro] = useState(() => count <= 3 && Date.now() - startedAt < 8000);
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    if (!intro) return;
    const timer = setTimeout(() => setIntro(false), Math.max(0, startedAt + 8000 - Date.now()));
    return () => clearTimeout(timer);
  }, [intro, startedAt]);
  const expanded = intro || pinned || hovered;
  return (
    <div className="ride-keys" hidden={hidden} onMouseEnter={() => { if (!intro) setHovered(true); }} onMouseLeave={() => setHovered(false)}>
      {expanded && <div className="help-strip ride-strip" id="ride-key-help">
        {ride === "car"
          ? Lx("Vairuok {arrows} arba {wasd} · stabdyti {space} · išlipti {e}", { arrows: RIDE_ARROWS(), wasd: <><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></>, space: <kbd>{L("Tarpas")}</kbd>, e: <kbd>E</kbd> })
          : ride === "boat"
            ? Lx("Plauk {arrows} arba {wasd} · stabdyti {space} · išlipti {e}", { arrows: RIDE_ARROWS(), wasd: <><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></>, space: <kbd>{L("Tarpas")}</kbd>, e: <kbd>E</kbd> })
            : ride === "dive"
              ? Lx("Plauk {arrows} · greičiau {shift} · išnirti {space}", { arrows: RIDE_ARROWS(), shift: <kbd>Shift</kbd>, space: <kbd>{L("Tarpas")}</kbd> })
              : Lx("Plauk {arrows} · greičiau {shift} · panerti {space}", { arrows: RIDE_ARROWS(), shift: <kbd>Shift</kbd>, space: <kbd>{L("Tarpas")}</kbd> })}
      </div>}
      {!intro && <button className="ride-keys-chip" aria-expanded={expanded} aria-controls={expanded ? "ride-key-help" : undefined} onClick={() => setPinned(!pinned)} onKeyDown={activateHudButton}>
        <Icon name="keyboard" size={20} /> {L("Klavišai")}
      </button>}
    </div>
  );
}

/** The first visit's flight over the town (game/flyover.ts): the town's name, one sentence of what to do first, and
 *  the way to cut it short: any key (Game.onKeyDown), or a tap anywhere. */
function Flight() {
  const touch = useStore((s) => s.hud.showTouch);
  return (
    <button className="flight" onClick={() => game?.endFlight?.()} aria-label={L("Praleisti")}>
      <span className="flight-words">
        <span className="flight-kicker">{L("Sveiki atvykę!")}</span>
        <b>{EDITION.town}</b>
        <span className="flight-first">{L("Tavo lėktuvas ką tik nusileido. Pirmiausia – pasų kontrolė: prieik ir pasikalbėk angliškai.")}</span>
      </span>
      <span className="flight-skip">{touch ? L("Bakstelėk – praleisti") : L("Bet kuris klavišas – praleisti")}</span>
    </button>
  );
}

function Fade() {
  const fade = useStore((s) => s.hud.fade);
  const fadeOnFrames = useStore((s) => s.hud.fadeOnFrames);
  return <div className="fade" style={{ opacity: fade, transition: fadeOnFrames ? "none" : undefined }} />;
}

function Objective({ collapsed, fresh, setCollapsed }: { collapsed: boolean; fresh: boolean; setCollapsed: (collapsed: boolean) => void }) {
  const o = useStore((s) => s.hud.objective);
  const progress = useStore((s) => s.progress);
  if (collapsed) {
    return (
      <div className="objective-card collapsed" data-target-location={o?.targetLoc}>
        <button className="collapse-btn objective-summary" aria-expanded={false} onClick={() => setCollapsed(false)} onKeyDown={activateHudButton}>
          <Icon name="target" size={16} strokeWidth={2} />
          <span className="objective-title" title={o?.followUp ? o.title : undefined}>{o?.title ?? L("Visos užduotys atliktos")}</span>
          <Icon name="chevronDown" size={16} strokeWidth={2} />
          {o?.dist != null && <span className="dist">{o.angle !== null && <Arrow angle={o.angle} />}{o.dist} m</span>}
        </button>
      </div>
    );
  }
  const fold = <button className="collapse-btn" onClick={() => setCollapsed(true)} onKeyDown={activateHudButton} aria-label={L("Suskleisti")} aria-expanded><Icon name="chevronUp" size={18} strokeWidth={2} /></button>;
  const className = "objective-card" + (fresh ? " fresh" : "");
  if (!o) {
    return (
      <div className={className}>
        <div className="kicker">{L("Visos užduotys atliktos")} <InlineIcon name="party" />{fold}</div>
        <p>{L("Grįžk į bet kurią vietą ir pabandyk pasakyti kitaip – žmonės kaskart kalba šiek tiek skirtingai.")}</p>
      </div>
    );
  }
  if (o.followUp) return (
    <div className={className} data-target-location={o.targetLoc}>
      <div className="kicker">
        <span className="kicker-label"><Icon name="target" size={15} strokeWidth={2} /> {L("Užduotis")}</span>
        {fold}
      </div>
      <h3>{o.title}</h3>
      <div className="row">
        {o.dist !== null && <span className="dist">{o.angle !== null && <Arrow angle={o.angle} />}{o.dist} m</span>}
        <button className="btn small" onClick={() => game?.autoWalkToObjective("objective")} title="G"><Icon name="walk" size={17} /> {L("Nuvesk mane")}</button>
      </div>
    </div>
  );
  const sit = SITUATION_BY_ID[o.sitId];
  const phone = sit && isPhone(sit);
  const st = stars(sitProgress(progress, o.sitId));
  return (
    <div className={className}>
      <div className="kicker">
        <span className="kicker-label"><Icon name="target" size={15} strokeWidth={2} /> {L("Užduotis")}</span>
        {st > 0 && <Stars n={st} size={14} />}
        {fold}
      </div>
      <h3>{o.title}{sit && <> <span className="en-title">· {sit.title.en}</span></>}</h3>
      {o.goal && <p>{o.goal}</p>}
      <div className="row">
        {phone ? (
          <button className="btn small" onClick={() => useStore.getState().setHud({ panel: "phone" })}><Icon name="smartphone" size={17} /> {L("Paskambinti")}</button>
        ) : (
          <>
            <span className="dist">
              {o.angle !== null && <Arrow angle={o.angle} />}
              {o.inside && o.dist !== null && o.dist < 4 ? L("Čia pat!") : o.dist !== null ? `${o.dist} m` : ""}{o.where && ` · ${o.where}`}
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
  const cave = mm.zone === CAVE_ZONE;
  const inside = mm.zone !== "town" && !cave;
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
    if (!c || inside || (!cave && !g)) return;
    const x = c.getContext("2d")!;
    const S = 220, view = 90;
    c.width = S; c.height = S;
    const bounds = cave ? caveBounds : mapWindow(mm.px, mm.pz, view);
    const [px, pz] = mapPoint(bounds, mm.px, mm.pz);
    if (cave) drawCaveMap(c, mm.gates ?? 0);
    const grounds = !cave && drawTownMap(c, g!, bounds);
    c.dataset.map = cave ? "gruta" : grounds ? "cenote" : "town";
    c.dataset.player = `${px},${pz}`;
    c.dataset.gates = cave ? String(mm.gates ?? 0) : "";
    // target
    if (mm.targetX !== undefined && mm.targetZ !== undefined) {
      const [u, v] = mapPoint(bounds, mm.targetX, mm.targetZ);
      const tx = u * S, tz = v * S;
      const inside = tx > 10 && tx < S - 10 && tz > 10 && tz < S - 10;
      const cx = Math.max(12, Math.min(S - 12, tx)), cz = Math.max(12, Math.min(S - 12, tz));
      x.fillStyle = "#ffb703"; x.strokeStyle = "#fff"; x.lineWidth = 3;
      x.beginPath(); x.arc(cx, cz, cave ? 5 : inside ? 9 : 7, 0, Math.PI * 2); x.fill(); x.stroke();
    }
    // what one can take: the boats and the convertibles, where they are now
    if (!cave && game?.rideMarks) drawRideMarks(x, game.rideMarks(), mm.px, mm.pz, view, S);
    // player arrow
    x.save(); x.translate(px * S, pz * S); x.rotate(Math.PI - mm.heading);
    if (cave) x.scale(0.65, 0.65);
    x.fillStyle = "#e63946"; x.strokeStyle = "#fff"; x.lineWidth = 3;
    x.beginPath(); x.moveTo(0, -12); x.lineTo(9, 10); x.lineTo(0, 5); x.lineTo(-9, 10); x.closePath(); x.stroke(); x.fill();
    x.restore();
  }, [mm, cave, inside]);
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

function HornButton({ touch }: { touch?: boolean }) {
  const label = L(ROAD_UI.horn);
  return <button className={touch ? "drive-horn" : "icon-btn"} type="button" aria-label={label}
    title={label} onClick={() => game?.horn?.()}><Icon name="horn" size={23} /></button>;
}

function TouchControls({ road = false }: { road?: boolean }) {
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
      {(ride === "car" || ride === "taxi") && <HornButton touch />}
      {/* the jump stays under the right thumb; with someone to talk to or a door to go through it moves over for that button
          (a second tap while in the air is a flip: every press goes to the game, which knows where the player is) */}
      {prompt && <button className="act-btn" onClick={() => game?.interact()}>{(prompt.kind === "taxi" || prompt.kind === "barista" || prompt.kind === "pool") ? prompt.label : prompt.kind === "talk" ? L("Kalbėti") : prompt.kind === "exit" ? L("Išeiti") : prompt.kind === "drive" ? L("Vairuoti") : prompt.kind === "boat" ? L("Plaukti") : prompt.kind === "out" ? L("Išlipti") : prompt.kind === "climb" ? L("Užlipti") : prompt.kind === "listen" ? L("Klausyti") : prompt.kind === "surf" ? L("Banglentė") : prompt.kind === "paddle" ? L("Irkluoti") : L("Įeiti")}</button>}
      {/* (at a wheel the same button is the brake, for as long as it is held; in the water, a dive and the way back up) */}
      {ride === "car" || ride === "boat" || ride === "taxi"
        ? <button className={"jump-btn brake-btn" + (prompt ? " beside" : "")} aria-label={L(road ? ROAD_UI.drift : "Stabdyti")} title={L(road ? ROAD_UI.drift : "Stabdyti")} onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); game?.hold(true); }} onPointerUp={() => game?.hold(false)} onPointerCancel={() => game?.hold(false)} onLostPointerCapture={() => game?.hold(false)}><span aria-hidden>{road ? L(ROAD_UI.drift) : fast ? "DRIFT" : "STOP"}</span></button>
        : ride === "swim" || ride === "dive"
          ? <button className={"jump-btn" + (prompt ? " beside" : "")} aria-label={ride === "dive" ? L("Išnirti") : L("Panerti")} title={ride === "dive" ? L("Išnirti") : L("Panerti")} onPointerDown={(e) => { e.preventDefault(); game?.jump(); }}><Icon name={ride === "dive" ? "chevronUp" : "chevronDown"} size={34} strokeWidth={2.5} /></button>
          : ride === "surf"
            ? <button className={"jump-btn" + (prompt ? " beside" : "")} aria-label={L("Atsistoti")} title={L("Atsistoti")} onPointerDown={(e) => { e.preventDefault(); game?.jump(); }}><Icon name="chevronUp" size={34} strokeWidth={2.5} /></button>
          : <button className={"jump-btn" + (prompt ? " beside" : "")} aria-label={L("Pašokti")} title={L("Pašokti")} onPointerDown={(e) => { e.preventDefault(); game?.jump(); }}><Icon name="chevronUp" size={34} strokeWidth={2.5} /></button>}
    </>
  );
}
