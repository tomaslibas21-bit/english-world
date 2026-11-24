import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentType, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { townRide, useStore, type HudState } from "../state/store";
import { townNote } from "../state/townNotes";
import { SectionHelpButton, useSectionHelp } from "./sectionHelp";
import { useSurf } from "../game/surf/store";
import { SurfOverlay, SurfPicker } from "./Surf";
import { TaxiOverlay } from "./Taxi";
import { BaristaOffer, BaristaOverlay } from "./Barista";
import { GoFishOffer, GoFishOverlay } from "./GoFish";
import { ROAD_UI } from "../content/road";
import { ASK_WAY_SITUATION } from "../content/ask-way-lines";
import { game } from "../game/gameRef";
import { coach } from "../game/coach";
import { WORLD, SEA_Z } from "../game/world/layout";
import { LIGHTHOUSE_ISLAND } from "../game/world/island";
import { SITUATION_BY_ID } from "../content/situations/catalog";
import { SitIcon } from "./SitIcon";
import { sitProgress, stars } from "../state/progress";
import { Icon, InlineIcon, Stars, splitLead, type IconName } from "./icons";
import { isPhone, objectiveLabels } from "./objective";
import { drawIslandMap, drawRideMarks } from "./mapMarks";
import { switchPlayMode } from "./playMode";
import { useCards, dueCards } from "../state/cards";
import { LyricStrip, RadioMenuLamp, RadioSetLayer, RadioTool } from "./Radio";
import { radio, useRadio } from "../radio";
import { DirectionsCard, PhotoChip, PhotoWalkOverlay, QuestArrival } from "./PhotoWalk";
import { Guide } from "./Guide";
import { TownToast, useTownToast } from "./Toasts";
import { useStreet } from "../game/street/StreetLife";
import { StreetCard } from "./street/StreetCard";
import { StreetBubbles } from "./street/StreetBubbles";
import { PhoneRing } from "./PhoneRing";
import { TextArrival } from "./TextArrival";
import { ReactBubble } from "./ReactBubble";
import { unreadTexts } from "../game/phone/texts";
import { portraitToolbarRows, toolbarColumns } from "./toolbarLayout";
import { getRoadOverlay } from "./roadOverlay";
import { getSeaOverlay } from "./seaOverlay";
import { useScreen } from "./useScreen";
import "./light.css";
import "./townPhone.css";

/** Inside English Master (VITE_BACK_URL, e.g. "/"): the way back to the course site. */
export const COURSE_URL = import.meta.env.VITE_BACK_URL as string | undefined;

function unreadTextSuffix(unread = 0) {
  return unread ? `, ${unread} neperskaitytos žinutės` : "";
}

function ToolButton({ icon, title, panel, hotkey, badge, unread }: { icon: IconName; title: string; panel: "scenarios" | "map" | "journal" | "phone" | "phrasebook" | "settings"; hotkey?: string; badge?: number; unread?: number }) {
  return (
    <button className="icon-btn" onClick={() => useStore.getState().setHud({ panel })} title={title} aria-label={(badge ? `${title} (${badge})` : title) + unreadTextSuffix(unread)}>
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

const BilliardsOverlay = lazy(() => import("./Billiards").then(({ BilliardsOverlay }) => ({ default: BilliardsOverlay })));
const modeOverlays: Record<string, ComponentType<{ touch: boolean }>> = {
  photowalk: PhotoWalkOverlay, taxi: TaxiOverlay, barista: BaristaOverlay, gofish: GoFishOverlay, billiards: BilliardsOverlay,
};
const LizzieMeeting = lazy(() => import("./LizzieMeeting"));

type Screen = ReturnType<typeof useScreen>;

export function Hud() {
  const hud = useStore((s) => s.hud);
  const inConversation = useStore((s) => s.conv.active);
  const screen = useScreen();
  const layout = screen.sidewaysPhone ? "sideways" : screen.portraitPhone ? "portrait" : "full";
  const surfing = useSurf((s) => s.active);
  const surfPicking = useSurf((s) => s.picking);
  const inTown = !inConversation && !hud.flight && !surfing && !hud.modeScreen;
  const ride = townRide(hud.ride);
  const riding = ride !== null;
  const questHud = inTown && !hud.ride && !hud.panel && !surfPicking;
  const taskId = hud.objective?.followUp ? hud.objective.title : hud.objective?.sitId ?? null;
  const toast = useTownToast();
  const directionsToast = toast?.kind === "stamp" && toast.sitId === ASK_WAY_SITUATION;
  const narrow = useNarrowHud();
  const streetCard = useStreet((s) => s.moment !== null) && !hud.panel;
  const portrait = screen.portraitPhone;
  const phoneToast = narrow && toast !== null;
  const task = useTaskCard(taskId, inTown && !hud.panel, phoneToast, layout);
  if (inConversation) return <Fade />;
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
  if (hud.modeScreen?.id === "lizzie-meeting") return (
    <div className="hud mode-hud"><Suspense><LizzieMeeting /></Suspense><Fade /></div>
  );
  if (hud.modeScreen?.kind === "menu") {
    const road = hud.modeScreen.id === "road";
    const sea = hud.modeScreen.id === "sea";
    const Overlay = road ? getRoadOverlay() : sea ? getSeaOverlay() : modeOverlays[hud.modeScreen.id];
    const tools = !road && !sea && hud.modeScreen.id !== "barista" && hud.modeScreen.id !== "gofish" && hud.modeScreen.id !== "billiards" && hud.modeScreen.id !== "photowalk";
    return (
      <div className={"hud mode-hud" + (road ? " road-mode" : sea ? " sea-mode" : "") + (hud.showTouch ? " has-touch" : "")} onKeyDown={keepKeysOnHudButtons}>
        {(!hud.panel || sea) && Overlay && <Suspense fallback={null}><Overlay touch={hud.showTouch} /></Suspense>}
        {tools && <><Toolbar key={"tools-" + layout} {...screen} riding touch={hud.showTouch} modeExit={hud.modeScreen.exitLabel} /><RadioSetLayer /></>}
        {hud.showTouch && hud.ride && <TouchControls road={road} stickOnly={sea} />}
        <Fade />
      </div>
    );
  }
  const note = townNote(hud);
  const banner = hud.zoneBanner && note === "banner" ? splitLead(hud.zoneBanner.title) : null;
  const guideVisible = !hud.panel && note === "guide";
  const moving = hud.walking || riding;
  // A sideways phone keeps the task to one row unless it is opened by hand.
  const collapsed = streetCard || (phoneToast ? !task.openedDuringToast
    : (moving && !!hud.objective?.followUp) || (task.manual ?? (screen.sidewaysPhone || (!task.fresh && moving))));
  return (
    <div className={"hud" + (hud.showTouch ? " has-touch" : "")} onKeyDown={keepKeysOnHudButtons}>
      <div className="hud-top">
          {hud.speedLines && <div className="drive-wind" aria-hidden />}
        <div className={"objective-notes" + (collapsed ? " task-folded" : "") + (hud.roadApproach ? " road-approach" : "")}>
          <Objective key={taskId ?? "complete"} collapsed={collapsed} fresh={task.fresh && !hud.panel} setCollapsed={task.setManual} />
          {streetCard && portrait && <StreetCard />}
          {hud.zoneBanner && banner && <div className="zone-banner"><h2>{banner.icon && <Icon name={banner.icon} size="0.8em" className="zb-ico" />}{banner.rest}</h2>{hud.zoneBanner.sub && <p>{hud.zoneBanner.sub}</p>}</div>}
          {!hud.panel && hud.phoneCard && <PhoneRing id={hud.phoneCard} />}
          {!hud.panel && hud.textArrival && <TextArrival id={hud.textArrival} />}
          <Guide visible={guideVisible} />
          <TownToast toast={toast} />
          {questHud && !directionsToast && <DirectionsCard />}
        </div>
        <Minimap {...screen} />
      </div>
      <Toolbar key={"tools-" + layout} {...screen} riding={riding} touch={hud.showTouch} hint={guideVisible} />
      <RadioSetLayer />
      {streetCard && !portrait && <StreetCard />}
      {!hud.panel && <StreetBubbles />}
      {!hud.panel && <LyricStrip sidewaysPhone={screen.sidewaysPhone} />}
      {!hud.panel && hud.reaction && <ReactBubble key={hud.reaction.id} line={hud.reaction} />}
      {/* (on a phone the way out of a car is the round button itself: no second label over it) */}
      {hud.prompt && !hud.panel && !(hud.showTouch && hud.prompt.kind === "out") && (
        <button className={"prompt" + (hud.showTouch ? " touch" : "")} onClick={() => game?.interact()}>
          <kbd>{hud.prompt.label === ROAD_UI.drive ? <Icon name="key" size={18} /> : hud.showTouch ? <Icon name="tap" size={18} /> : "E"}</kbd>
          <span className="prompt-text">{hud.prompt.label}{hud.prompt.lt && <small lang="lt">{hud.prompt.lt}</small>}</span>
        </button>
      )}
      {riding && hud.rideStartedAt !== null && !hud.showTouch && (
        <RideKeys key={`${ride}-${hud.rideStartedAt}`} ride={hud.ride} startedAt={hud.rideStartedAt} hidden={!!hud.panel || guideVisible} />
      )}
      {hud.showTouch && <TouchControls />}
      {!hud.panel && <><BaristaOffer /><GoFishOffer /></>}
      {questHud && <><PhotoChip /><QuestArrival /></>}
      <SurfPicker />
      <Fade />
    </div>
  );
}

function useNarrowHud() {
  const [view] = useState(() => window.matchMedia("(max-width: 480px)"));
  const [narrow, setNarrow] = useState(view.matches);
  useLayoutEffect(() => {
    const update = () => setNarrow(view.matches);
    update();
    view.addEventListener("change", update);
    return () => view.removeEventListener("change", update);
  }, [view]);
  return narrow;
}

function useTaskCard(taskId: string | null, visible: boolean, phoneToast: boolean, layout: string) {
  const [state, setState] = useState<{ id: string | null; layout: string; manual: boolean | null; fresh: boolean }>({ id: taskId, layout, manual: null, fresh: false });
  const [openedDuringToast, setOpenedDuringToast] = useState(false);
  if (openedDuringToast && (!phoneToast || taskId !== state.id)) setOpenedDuringToast(false);
  // A manual choice belongs to one task and one way of holding the phone. Give the next task its pop when the card
  // is back on screen.
  if (taskId !== state.id) setState({ id: taskId, layout, manual: null, fresh: taskId !== null });
  else if (layout !== state.layout) setState({ ...state, layout, manual: null });
  useEffect(() => {
    if (!state.fresh || !visible) return;
    const timer = setTimeout(() => setState((current) => current.id === state.id ? { ...current, fresh: false } : current), 3000);
    return () => clearTimeout(timer);
  }, [state.id, state.fresh, visible]);
  function setManual(manual: boolean) {
    setState((current) => ({ ...current, manual }));
    setOpenedDuringToast(phoneToast && !manual);
  }
  return { ...state, openedDuringToast, setManual };
}

// Enter and Space belong to a button reached by keyboard, even while the game is listening for movement.
function activateHudButton(e: KeyboardEvent<HTMLElement>) {
  if ((e.key === "Enter" || e.key === " ") && (e.target as HTMLElement).matches(":focus-visible")) e.stopPropagation();
}

// The same for the town's tools and the radio set, which opens over the town at the HUD's level.
function keepKeysOnHudButtons(e: KeyboardEvent<HTMLElement>) {
  if ((e.key === "Enter" || e.key === " ") && (e.target as HTMLElement).matches(":is(.toolbar, .radio-set, .street-card) :focus-visible, .street-bubble:focus-visible")) e.stopPropagation();
}

/** The town's tools. On a phone (upright or sideways) they always fold behind one round menu button; on a computer
 *  they fold only at a wheel, at the helm or in a mini-game. Opened, the drawer is the fewest even columns that fit
 *  above the controls, the right column first (`toolbarColumns`): one column wherever it fits. */
function Toolbar({ w, h, portraitPhone, sidewaysPhone, riding, touch, modeExit, hint = false }: Screen & { riding: boolean; touch: boolean; modeExit?: string; hint?: boolean }) {
  const due = useDueCards();
  const missedCalls = useStore((s) => Object.keys(s.progress.phone?.missed ?? {}).length);
  const unread = useStore((s) => unreadTexts(s.progress.texts));
  const hasRadio = useRadio((s) => s.available);
  const radioOpen = useRadio((s) => s.open);
  const canHonk = useStore((s) => s.hud.ride === "car" || s.hud.ride === "taxi");
  const hasHelp = useSectionHelp();
  const panel = useStore((s) => s.hud.panel);
  const prompt = useStore((s) => s.hud.prompt?.kind);
  // (`hint`: the town's guide is on screen; the hint that points at the list opens the menu while it shows)
  const listHint = useStore((s) => s.hud.coach?.step === "list" && !s.hud.coach.ok) && hint;
  const phone = portraitPhone || sidewaysPhone;
  const folds = phone || riding;
  // On a computer the radio stays beside the menu button during a ride; on a phone it is one of the drawer's buttons.
  const radioInDrawer = phone;
  const toolbar = useRef<HTMLDivElement>(null);
  const fitLimit = useRef<HTMLDivElement>(null);
  const hornInMenu = canHonk && !touch;
  const rows = portraitToolbarRows({ hasHelp, hasRadio: hasRadio && radioInDrawer, hasCourse: !!COURSE_URL, modeExit: !!modeExit });
  const single = rows.single + Number(hornInMenu);
  const split = Math.ceil(single / 2);
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
      setMaxRows(Math.max(1, Math.floor((bottom - top - (portraitPhone ? 12 : 8) + gap) / (size + gap))));
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(limit);
    for (const control of controls) observer?.observe(control);
    update();
    return () => observer?.disconnect();
  }, [folds, portraitPhone, w, h, touch, prompt, panel, riding, single]);
  const columns = toolbarColumns(single, portraitPhone ? Math.max(maxRows, split) : maxRows);
  const toolColumns = columns.flatMap((count, column) => Array<number>(count).fill(column + 1));

  const [menuOpen, setMenuOpen] = useState(false);
  const open = folds && !panel && !(phone && radioOpen) && (menuOpen || listHint);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    const hint = useStore.getState().hud.coach;
    if (hint?.step === "list" && !hint.ok) coach.next();
  }, []);
  const keepOpen = useCallback(() => {
    clearTimeout(timer.current);
    if (!listHint) timer.current = setTimeout(() => setMenuOpen(false), 5000);
  }, [listHint]);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      const target = e.target as Element;
      if (toolbar.current?.contains(target)) return;
      // The guide's buttons dismiss their own hint when the tap finishes.
      if (target.closest?.(".coach-row")) setMenuOpen(false);
      else closeMenu();
    };
    const escape = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") closeMenu(); };
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
    else if (panel || (phone && radioOpen)) {
      closeMenu();
      if (panel && radioOpen) radio.setOpen(false);
    }
  }, [folds, phone, panel, radioOpen, closeMenu]);

  const course = COURSE_URL && <a className="icon-btn course-link" href={COURSE_URL} title="Grįžti į kursą" aria-label="Grįžti į kursą"><Icon name="home" size={25} /></a>;
  const actions = [
    ...(hornInMenu ? [<HornButton key="horn" />] : []),
    ...(modeExit ? [<button key="exit" className="icon-btn mode-exit" title={modeExit} aria-label={modeExit} onClick={() => game?.modeExit()}><Icon name="walk" size={25} /></button>] : []),
    <ToolButton key="scenarios" icon="clapper" title="Visos situacijos" panel="scenarios" />,
    <ToolButton key="map" icon="map" title="Žemėlapis (M)" panel="map" hotkey="M" />,
    <ToolButton key="journal" icon="journal" title="Užduotys (J)" panel="journal" hotkey="J" />,
    <ToolButton key="phone" icon="smartphone" title="Telefonas (P)" panel="phone" hotkey="P" badge={missedCalls + unread} unread={unread} />,
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
    <div className={className} onKeyDown={activateHudButton}>
      <div className="toolbar-tools">{course}{actions}</div>
      <div className="toolbar-extra"><RadioTool />{lightMode}</div>
    </div>
  );
  const slot = (item: ReactNode, index: number) => (
    <div className="drawer-tool" key={index} style={{ "--tool-column": toolColumns[index] } as CSSProperties}>{item}</div>
  );
  const radioSlots = radioInDrawer && hasRadio ? 1 : 0;
  return (
    <div ref={toolbar} onKeyDown={activateHudButton}
      className={className + " in-ride folds" + (phone ? " phone-menu" : "") + (portraitPhone ? " portrait-toolbar" : "") + (open ? " menu-open" : "") + (columns.length === 2 ? " two-columns" : "")}>
      <button className="icon-btn ride-menu" title="Meniu" aria-label={"Meniu" + unreadTextSuffix(open ? 0 : unread)} aria-expanded={open} aria-controls="town-tools"
        onClick={() => {
          if (open) closeMenu();
          else {
            if (phone && radioOpen) radio.setOpen(false);
            setMenuOpen(true);
          }
        }}>
        <Icon name="menu" size={25} />
        {!!due && !open && <span className="due-badge" aria-hidden>{due}</span>}
        {!!unread && !open && <span className="unread-badge" aria-hidden><Icon name="mail" size={12} /></span>}
        {phone && !open && !radioOpen && <RadioMenuLamp />}
      </button>
      <div className="toolbar-fit-limit" ref={fitLimit} aria-hidden />
      <div className="toolbar-drawer" id="town-tools" inert={!open} style={{ "--drawer-rows": columns[0] } as CSSProperties} onPointerDown={keepOpen} onClick={keepOpen}>
        <div className="toolbar-tools">
          <div className="toolbar-actions">{actions.map(slot)}</div>
          {radioInDrawer && slot(<RadioTool phone />, actions.length)}
        </div>
        <div className="toolbar-shortcuts">
          {slot(lightMode, actions.length + radioSlots)}
          {course && slot(course, actions.length + radioSlots + 1)}
        </div>
      </div>
      {!radioInDrawer && <div className="toolbar-extra"><RadioTool /></div>}
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
        {ride === "car" ? "Vairuok" : "Plauk"} <kbd><Icon name="arrowUp" size="1em" strokeWidth={2.25} label="aukštyn" /></kbd><kbd><Icon name="arrowDown" size="1em" strokeWidth={2.25} label="žemyn" /></kbd><kbd><Icon name="arrowLeft" size="1em" strokeWidth={2.25} label="kairėn" /></kbd><kbd><Icon name="arrowRight" size="1em" strokeWidth={2.25} label="dešinėn" /></kbd>
        {ride === "car" || ride === "boat" ? <> arba <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> · stabdyti <kbd>Tarpas</kbd> · išlipti <kbd>E</kbd></> : <> · greičiau <kbd>Shift</kbd> · {ride === "dive" ? "išnirti" : "panerti"} <kbd>Tarpas</kbd></>}
      </div>}
      {!intro && <button className="ride-keys-chip" aria-expanded={expanded} aria-controls={expanded ? "ride-key-help" : undefined} onClick={() => setPinned(!pinned)} onKeyDown={activateHudButton}>
        <Icon name="keyboard" size={20} /> Klavišai
      </button>}
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
  const fadeOnFrames = useStore((s) => s.hud.fadeOnFrames);
  return <div className="fade" style={{ opacity: fade, transition: fadeOnFrames ? "none" : undefined }} />;
}

function Objective({ collapsed, fresh, setCollapsed }: { collapsed: boolean; fresh: boolean; setCollapsed: (collapsed: boolean) => void }) {
  const o = useStore((s) => s.hud.objective);
  const progress = useStore((s) => s.progress);
  const titleLt = o?.titleLt && <> <span lang="lt">· {o.titleLt}</span></>;
  // A conversation's own drawing stands before its title; a follow-up errand and "all done" keep the target.
  const situation = o && !o.followUp ? o.sitId : null;
  if (collapsed) {
    return (
      <div className="objective-card collapsed" data-target-location={o?.targetLoc}>
        <button className="collapse-btn objective-summary" aria-expanded={false} onClick={() => setCollapsed(false)} onKeyDown={activateHudButton}>
          {situation ? <SitIcon id={situation} size={18} className="objective-ico" /> : <Icon name="target" size={16} strokeWidth={2} />}
          <span className="objective-title" title={o?.followUp ? o.title : undefined}>{o?.title ?? "Visos užduotys atliktos"}{titleLt}</span>
          <Icon name="chevronDown" size={16} strokeWidth={2} />
          {o?.dist != null && <span className="dist">{o.angle !== null && <Arrow angle={o.angle} />}{o.dist} m</span>}
        </button>
      </div>
    );
  }
  const fold = <button className="collapse-btn" onClick={() => setCollapsed(true)} onKeyDown={activateHudButton} aria-label="Suskleisti" aria-expanded><Icon name="chevronUp" size={18} strokeWidth={2} /></button>;
  const className = "objective-card" + (fresh ? " fresh" : "");
  if (!o) {
    return (
      <div className={className}>
        <div className="kicker">Visos užduotys atliktos <InlineIcon name="party" />{fold}</div>
        <p>Grįžk į bet kurią vietą ir pabandyk pasakyti kitaip – žmonės kaskart kalba šiek tiek skirtingai.</p>
      </div>
    );
  }
  if (o.followUp) return (
    <div className={className} data-target-location={o.targetLoc}>
      <div className="kicker">
        <span className="kicker-label"><Icon name="target" size={15} strokeWidth={2} /> Užduotis</span>
        {fold}
      </div>
      <h3>{o.title}</h3>
      <div className="row">
        {o.dist !== null && <span className="dist">{o.angle !== null && <Arrow angle={o.angle} />}{o.dist} m</span>}
        <button className="btn small" onClick={() => game?.autoWalkToObjective()} title="G"><Icon name="walk" size={17} /> Nuvesk mane</button>
      </div>
    </div>
  );
  const sit = SITUATION_BY_ID[o.sitId];
  const phone = sit && isPhone(sit);
  const { title, where } = sit ? objectiveLabels(sit) : o;
  const st = stars(sitProgress(progress, o.sitId));
  return (
    <div className={className}>
      <div className="objective-head">
        <div className="kicker">
          <span className="kicker-label"><Icon name="target" size={15} strokeWidth={2} /> Užduotis</span>
          {st > 0 && <Stars n={st} size={14} />}
          {fold}
        </div>
        <SitIcon id={o.sitId} size={32} className="objective-ico" />
        <h3 lang="lt">{title}{titleLt}{sit && <> <span lang="en" className="en-title">· {sit.title.en}</span></>}</h3>
      </div>
      {o.goal && <p>{o.goal}</p>}
      <div className="row">
        {phone ? (
          <button className="btn small" onClick={() => useStore.getState().setHud({ panel: "phone" })}><Icon name="smartphone" size={17} /> Paskambinti</button>
        ) : (
          <>
            <span className="dist">
              {o.angle !== null && <Arrow angle={o.angle} />}
              {o.inside && o.dist !== null && o.dist < 4 ? "Čia pat!" : o.dist !== null ? `${o.dist} m` : ""}{where && ` · ${where}`}
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
    const island = LIGHTHOUSE_ISLAND;
    if (island && Math.abs(island.center.x - mm.px) < view / 2 + 20 && Math.abs(island.center.z - mm.pz) < view / 2 + 12) {
      drawIslandMap(x, island, mm.px - view / 2, mm.pz - view / 2, S / view);
    }
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

function HornButton({ touch }: { touch?: boolean }) {
  return <button className={touch ? "drive-horn" : "icon-btn"} type="button" aria-label={ROAD_UI.horn}
    title={ROAD_UI.horn} onClick={() => game?.horn?.()}><Icon name="horn" size={23} /></button>;
}

function TouchControls({ road = false, stickOnly = false }: { road?: boolean; stickOnly?: boolean }) {
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
  const stick = <div className="joy" ref={ref}><div className="knob" ref={knob} /></div>;
  if (stickOnly) return stick;
  return (
    <>
      {stick}
      {/* the jump stays under the right thumb; with someone to talk to or a door to go through it moves over for that button
          (a second tap while in the air is a flip: every press goes to the game, which knows where the player is) */}
      {prompt && <button className="act-btn" onClick={() => game?.interact()}>{prompt.kind === "talk" ? "Kalbėti" : prompt.kind === "exit" ? "Išeiti" : prompt.kind === "drive" ? "Vairuoti" : prompt.kind === "boat" ? "Plaukti" : prompt.kind === "out" ? "Išlipti" : prompt.kind === "climb" ? "Užlipti" : prompt.kind === "surf" ? "Banglentė" : prompt.kind === "paddle" ? "Irkluoti" : (prompt.kind === "taxi" || prompt.kind === "barista" || prompt.kind === "gofish" || prompt.kind === "billiards") ? prompt.label : "Įeiti"}</button>}
      {(ride === "car" || ride === "taxi") && <HornButton touch />}
      {/* (at a wheel the same button is the brake, for as long as it is held; in the water, a dive and the way back up) */}
      {ride === "car" || ride === "boat" || ride === "taxi"
        ? <button className={"jump-btn brake-btn" + (prompt ? " beside" : "")} aria-label={road ? ROAD_UI.drift : "Stabdyti"} title={road ? ROAD_UI.drift : "Stabdyti"} onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); game?.hold(true); }} onPointerUp={() => game?.hold(false)} onPointerCancel={() => game?.hold(false)} onLostPointerCapture={() => game?.hold(false)}><span aria-hidden>{road ? ROAD_UI.drift : fast ? "DRIFT" : "STOP"}</span></button>
        : ride === "swim" || ride === "dive"
          ? <button className={"jump-btn" + (prompt ? " beside" : "")} aria-label={ride === "dive" ? "Išnirti" : "Panerti"} title={ride === "dive" ? "Išnirti" : "Panerti"} onPointerDown={(e) => { e.preventDefault(); game?.jump(); }}><Icon name={ride === "dive" ? "chevronUp" : "chevronDown"} size={34} strokeWidth={2.5} /></button>
          : ride === "surf"
            ? <button className={"jump-btn" + (prompt ? " beside" : "")} aria-label="Atsistoti" title="Atsistoti" onPointerDown={(e) => { e.preventDefault(); game?.jump(); }}><Icon name="chevronUp" size={34} strokeWidth={2.5} /></button>
          : <button className={"jump-btn" + (prompt ? " beside" : "")} aria-label="Pašokti" title="Pašokti" onPointerDown={(e) => { e.preventDefault(); game?.jump(); }}><Icon name="chevronUp" size={34} strokeWidth={2.5} /></button>}
    </>
  );
}
