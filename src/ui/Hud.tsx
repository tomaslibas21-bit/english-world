import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentType, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { ROAD_UI } from "../content/road";
import { townRide, usesTownNotes, useStore, type HudState } from "../state/store";
import { townNote } from "../state/townNotes";
import { SectionHelpButton, useSectionHelp } from "./sectionHelp";
import { useSurf } from "../game/surf/store";
import { useBarista } from "../game/barista/store";
import { useTownQuests } from "../game/photowalk/store";
import { ASK_WAY_SITUATION } from "../content/ask-way-lines";
import { DirectionsCard, PhotoChip, PhotoWalkOverlay, QuestArrival } from "./PhotoWalk";
import { TaxiOverlay } from "./Taxi";
import { PoolOverlay } from "./Pool";
import { LoteriaOverlay } from "./Loteria";
import { SurfOverlay, SurfPicker } from "./Surf";
import { BaristaOffer, BaristaOverlay } from "./Barista";
import { game } from "../game/gameRef";
import { coach } from "../game/coach";
import { CAVE_ZONE } from "../game/cave/groundsPlan";
import { SITUATION_BY_ID } from "../content/situations/catalog";
import { LOCATIONS } from "../content/locations";
import { NPCS } from "../content/npcs";
import { SitIcon } from "./SitIcon";
import { sitProgress, stars } from "../state/progress";
import { Icon, InlineIcon, Stars, splitLead, type IconName } from "./icons";
import { isPhone } from "./objective";
import { drawRideMarks } from "./mapMarks";
import { caveBounds, drawCaveMap, drawTownMap, mapPoint, mapWindow } from "./worldMap";
import { switchPlayMode } from "./playMode";
import { useCards, dueCards } from "../state/cards";
import { LyricStrip, RadioMenuLamp, RadioSetLayer, RadioTool } from "./Radio";
import { radio, useRadio } from "../radio";
import { HL, L, Lx, TL } from "./i18n";
import { EDITION } from "../edition";
import { CaveCard } from "./Cave";
import { Guide } from "./Guide";
import { useTownToast } from "./Toasts";
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
import { openMap } from "./mapOpener";
import "./light.css";
import "./townPhone.css";

/** Inside English Master (VITE_BACK_URL, e.g. "/"): the way back to the course site. */
export const COURSE_URL = import.meta.env.VITE_BACK_URL as string | undefined;

function ToolButton({ icon, title, panel, hotkey, badge, unread, shortcuts = true }: { icon: IconName; title: string; panel: "scenarios" | "map" | "journal" | "phone" | "phrasebook" | "settings"; hotkey?: string; badge?: number; unread?: number; shortcuts?: boolean }) {
  const label = shortcuts ? title : title.replace(/ \((?:M|J|P|Esc)\)$/, "");
  return (
    <button className={"icon-btn" + (panel === "phrasebook" ? " phrasebook-tool" : "")} data-map-tool={panel === "map" || undefined} onClick={(e) => panel === "map" ? openMap(e.currentTarget) : useStore.getState().setHud({ panel })} title={label} aria-label={(badge ? `${label} (${badge})` : label) + (unread ? `, ${unread} ${L("neperskaitytos žinutės")}` : "")}>
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

type Screen = ReturnType<typeof useScreen>;

/** The four arrow keys, for the hints at a wheel and in the water. */
const RIDE_ARROWS = () => <><kbd><Icon name="arrowUp" size="1em" strokeWidth={2.25} label={L("aukštyn")} /></kbd><kbd><Icon name="arrowDown" size="1em" strokeWidth={2.25} label={L("žemyn")} /></kbd><kbd><Icon name="arrowLeft" size="1em" strokeWidth={2.25} label={L("kairėn")} /></kbd><kbd><Icon name="arrowRight" size="1em" strokeWidth={2.25} label={L("dešinėn")} /></kbd></>;

const FriendMeeting = lazy(() => import("./FriendMeeting"));
const BilliardsOverlay = lazy(() => import("./Billiards").then(({ BilliardsOverlay }) => ({ default: BilliardsOverlay })));
const modeOverlays: Record<string, ComponentType<{ touch: boolean }>> = { photowalk: PhotoWalkOverlay, taxi: TaxiOverlay, barista: BaristaOverlay, pool: PoolOverlay, loteria: LoteriaOverlay, billiards: BilliardsOverlay };

export function Hud() {
  const hud = useStore((s) => s.hud);
  const inConversation = useStore((s) => s.conv.active);
  const screen = useScreen();
  const layout = screen.sidewaysPhone ? "sideways" : screen.portraitPhone ? "portrait" : "full";
  const surfing = useSurf((s) => s.active);
  const picking = useSurf((s) => s.picking);
  const notesVisible = useStore(usesTownNotes);
  const note = notesVisible ? townNote(hud) : null;
  const ride = townRide(hud.ride);
  const riding = ride !== null;
  const taskId = hud.objective?.followUp ? hud.objective.title : hud.objective?.sitId ?? null;
  const toast = useTownToast(note === "toast");
  const questHud = hud.minimap.zone === "town" && !hud.ride && !hud.panel && !picking;
  const requested = useTownQuests((s) => s.directions?.id);
  const directions = useStore((s) => questHud && notesVisible && requested && !s.hud.cave
    && !s.townToasts.some(({ toast }) => toast.sitId === ASK_WAY_SITUATION && toast.kind === "stamp") ? requested : undefined);
  const narrow = useNarrowHud();
  const streetCard = useStreet((s) => s.moment !== null) && !hud.panel;
  const portrait = screen.portraitPhone;
  const baristaOffer = useBarista((s) => s.offered);
  const compactForPhoto = useTownQuests((s) => questHud && portrait && s.camera && (!!s.near || screen.h <= 720));
  const phoneToast = narrow && toast !== null;
  const task = useTaskCard(taskId, notesVisible && !hud.cave, directions, phoneToast && !hud.cave, layout);
  if (inConversation) return <Fade />;
  // the first visit's flight over the town has the screen to itself too: where one is, and what to do first
  if (hud.flight) return <div className="hud"><Flight /><Fade /></div>;
  // The surf lesson keeps her line, the answers, the score, and its own arrows.
  if (surfing) return (
    <div className={"hud" + (hud.showTouch ? " has-touch" : "")}>
      <SurfOverlay toolbar={<Toolbar key={"tools-" + layout} {...screen} riding touch={hud.showTouch} surf />} />
      <RadioSetLayer />
      <Fade />
    </div>
  );
  if (hud.modeScreen?.id === "friend-meeting") return (
    <div className="hud mode-hud"><Suspense><FriendMeeting /></Suspense><Fade /></div>
  );
  if (hud.modeScreen?.kind === "menu") {
    const road = hud.modeScreen.id === "road";
    const sea = hud.modeScreen.id === "sea";
    const Overlay = road ? getRoadOverlay() : sea ? getSeaOverlay() : modeOverlays[hud.modeScreen.id];
    const tools = !road && !sea && hud.modeScreen.id !== "barista" && hud.modeScreen.id !== "loteria" && hud.modeScreen.id !== "billiards" && hud.modeScreen.id !== "photowalk";
    return (
      <div className={"hud mode-hud" + (road ? " road-mode" : sea ? " sea-mode" : "") + (hud.showTouch ? " has-touch" : "")} onKeyDown={keepKeysOnHudButtons}>
        {(!hud.panel || sea) && Overlay && <Suspense fallback={null}><Overlay touch={hud.showTouch} /></Suspense>}
        {tools && <><Toolbar key={"tools-" + layout} {...screen} riding touch={hud.showTouch} modeExit={hud.modeScreen.exitLabel} /><RadioSetLayer /></>}
        {hud.showTouch && hud.ride && <TouchControls road={road} stickOnly={sea} />}
        <Fade />
      </div>
    );
  }
  const banner = note === "banner" && hud.zoneBanner ? splitLead(hud.zoneBanner.title) : null;
  const subtitle = hud.zoneBanner?.sub?.trim();
  const zone = hud.minimap.zone;
  const kind = hud.prompt?.kind;
  const talk = kind === "talk";
  const localOffer = talk || baristaOffer || kind === "barista" || kind === "pool" || kind === "billiards";
  const target = hud.objective?.targetLoc ?? SITUATION_BY_ID[hud.objective?.sitId ?? ""]?.location;
  const foldForContext = portrait && !hud.panel && target !== undefined && target !== zone
    && ((zone !== "town" && localOffer) || (talk && note === "guide" && !hud.roadApproach));
  const moving = hud.walking || riding;
  const step = hud.coach?.step;
  const compactGuide = portrait && (compactForPhoto || ((moving || talk) && step !== "walk" && step !== "list"));
  // A sideways phone keeps the task to one row unless it is opened by hand.
  const collapsed = !hud.cave && ((!directions && streetCard) || (directions || phoneToast ? !task.openedDuringNote
    : (task.manual ?? (screen.sidewaysPhone || foldForContext || (moving && (!task.fresh || !!hud.objective?.followUp))))));
  return (
    <div className={"hud" + (hud.showTouch ? " has-touch" : "")} onKeyDown={keepKeysOnHudButtons}>
      {hud.speedLines && !hud.panel && <div className="drive-wind" aria-hidden />}
      <div className="hud-top">
        <div className={"objective-notes" + (collapsed ? " task-folded" : "") + (hud.roadApproach ? " road-approach" : "")} onKeyDown={hud.cave ? activateHudButton : undefined}>
          {hud.cave ? <CaveCard arrow={Arrow} phoneToast={phoneToast} /> : <Objective key={taskId ?? "complete"} collapsed={collapsed} fresh={task.fresh && notesVisible} setCollapsed={task.setManual} />}
          {streetCard && portrait && <StreetCard />}
          {banner && <div className="zone-banner"><h2>{banner.icon && <Icon name={banner.icon} size="0.8em" className="zb-ico" />}{banner.rest}</h2>{subtitle && subtitle !== banner.rest.trim() && <p>{subtitle}</p>}</div>}
          {note === "phone" && hud.phoneCard && <PhoneRing id={hud.phoneCard} />}
          {note === "text" && hud.textArrival && <TextArrival id={hud.textArrival} />}
          <Guide visible={note === "guide"} compact={compactGuide} />
          <QuestArrival toast={toast} />
          {directions && <DirectionsCard />}
        </div>
        <Minimap {...screen} />
      </div>
      <Toolbar key={"tools-" + layout} {...screen} riding={riding || hud.wading} touch={hud.showTouch} hint={note === "guide"} />
      <RadioSetLayer />
      {streetCard && !portrait && <StreetCard />}
      {!hud.panel && <StreetBubbles />}
      {!hud.panel && <LyricStrip sidewaysPhone={screen.sidewaysPhone} />}
      {!hud.panel && hud.reaction && <ReactBubble key={hud.reaction.id} line={hud.reaction} />}
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
      {questHud && <PhotoChip />}
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

function useTaskCard(taskId: string | null, visible: boolean, directions: string | undefined, phoneToast: boolean, layout: string) {
  const [state, setState] = useState<{ id: string | null; layout: string; manual: boolean | null; fresh: boolean }>({ id: taskId, layout, manual: null, fresh: false });
  const note = directions ?? phoneToast;
  const [openedDuringNote, setOpenedDuringNote] = useState<string | boolean>(false);
  if (openedDuringNote && (openedDuringNote !== note || taskId !== state.id || (directions && layout !== state.layout))) setOpenedDuringNote(false);
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
    if (!directions) setState((current) => ({ ...current, manual }));
    setOpenedDuringNote(!manual && note);
  }
  return { ...state, openedDuringNote, setManual };
}

// Enter and Space belong to a button reached by keyboard, even while the game is listening for movement.
function activateHudButton(e: KeyboardEvent<HTMLElement>) {
  if ((e.key === "Enter" || e.key === " ") && (e.target as HTMLElement).matches(".minimap, [data-map-tool], :focus-visible")) e.stopPropagation();
}

// The same for the town's tools and the radio set, which opens over the town at the HUD's level.
function keepKeysOnHudButtons(e: KeyboardEvent<HTMLElement>) {
  if ((e.key === "Enter" || e.key === " ") && (e.target as HTMLElement).matches(":is(.toolbar, .radio-set, .street-card, .coach, .objective-card, .directions-card) :focus-visible, .street-bubble:focus-visible")) e.stopPropagation();
}

/** The town's tools. On a phone (upright or sideways) they always fold behind one round menu button; on a computer
 *  they fold only at a wheel, at the helm, in the water, in a mini-game or the surf lesson (`surf`: in its top bar,
 *  without the town's keys). Opened, the drawer is the fewest even columns that fit above the controls, the right
 *  column first (`toolbarColumns`): one column wherever it fits. */
function Toolbar({ w, h, portraitPhone, sidewaysPhone, riding, touch, surf = false, modeExit, hint = false }: Screen & { riding: boolean; touch: boolean; surf?: boolean; modeExit?: string; hint?: boolean }) {
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
  const listHint = useStore((s) => s.hud.coach?.step === "list" && !s.hud.coach.ok && !s.hud.walking && !s.hud.ride) && hint;
  const phone = portraitPhone || sidewaysPhone;
  const folds = phone || riding;
  // On a computer the radio stays beside the menu button during a ride; on a phone or in the surf lesson it is one of
  // the drawer's buttons.
  const radioInDrawer = phone || surf;
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
    // (the surf lesson's toolbar stands in its top bar: the controls are the lesson's arrows)
    const controls = (bar.closest(".hud") ?? bar.parentElement!).querySelectorAll<HTMLElement>(".prompt, .jump-btn, .act-btn, .surf-pad");
    const update = () => {
      const style = getComputedStyle(bar);
      const size = parseFloat(style.getPropertyValue("--tool-size"));
      const gap = parseFloat(style.getPropertyValue("--tool-gap"));
      const top = bar.getBoundingClientRect().top + size + gap;
      let bottom = limit.getBoundingClientRect().bottom;
      for (const control of controls) bottom = Math.min(bottom, control.getBoundingClientRect().top);
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
    timer.current = setTimeout(() => setMenuOpen(false), 5000);
  }, []);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      const target = e.target as Element;
      if (toolbar.current?.contains(target)) return;
      // Keep the guide mounted until its button handles the tap.
      if (target.closest?.(".coach-row, .coach-toggle")) setMenuOpen(false);
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
    if (open && menuOpen) keepOpen();
    return () => clearTimeout(timer.current);
  }, [open, menuOpen, keepOpen]);
  useLayoutEffect(() => {
    if (!folds) setMenuOpen(false);
    else if (panel || (phone && radioOpen)) {
      closeMenu();
      if (panel && radioOpen) radio.setOpen(false);
    }
  }, [folds, phone, panel, radioOpen, closeMenu]);

  const course = COURSE_URL && <a className="icon-btn course-link" href={COURSE_URL} title={L("Grįžti į kursą")} aria-label={L("Grįžti į kursą")}><Icon name="home" size={25} /></a>;
  const actions = [
    ...(hornInMenu ? [<HornButton key="horn" />] : []),
    ...(modeExit ? [<button key="exit" className="icon-btn mode-exit" title={modeExit} aria-label={modeExit} onClick={() => game?.modeExit()}><Icon name="walk" size={25} /></button>] : []),
    <ToolButton key="scenarios" icon="clapper" title={L("Visos situacijos")} panel="scenarios" />,
    <ToolButton key="map" icon="map" title={L("Žemėlapis (M)")} panel="map" hotkey="M" shortcuts={!surf} />,
    <ToolButton key="journal" icon={phone && !surf ? "clipboard" : "journal"} title={L("Užduotys (J)")} panel="journal" hotkey="J" shortcuts={!surf} />,
    <ToolButton key="phone" icon="smartphone" title={L("Telefonas (P)")} panel="phone" hotkey="P" badge={missedCalls + unread} unread={unread} shortcuts={!surf} />,
    <ToolButton key="phrasebook" icon="bookOpen" title={L("Frazių knygelė")} panel="phrasebook" badge={due} />,
    <ToolButton key="settings" icon="settings" title={L("Nustatymai (Esc)")} panel="settings" shortcuts={!surf} />,
    ...(hasHelp ? [<SectionHelpButton key="help" />] : []),
  ];
  const lightMode = (
    <button className="icon-btn light-mode-btn" onClick={() => switchPlayMode("light")} title={L("Lengvas režimas")} aria-label={L("Lengvas režimas")}>
      <span aria-hidden>{L("LR")}</span>
      <span className="toolbar-tooltip" aria-hidden>{L("Lengvas režimas")}</span>
    </button>
  );
  const className = "toolbar" + (hasRadio ? " has-radio" : "") + (surf ? " surf-toolbar" : "");
  // (the surf lesson's menu keeps the game's own word for it)
  const menuLabel = surf ? "Meniu" : L("Meniu");
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
      <button className="icon-btn ride-menu" title={menuLabel} aria-label={menuLabel} aria-expanded={open} aria-controls="town-tools"
        onClick={() => {
          if (open) closeMenu();
          else {
            if (phone && radioOpen) radio.setOpen(false);
            setMenuOpen(true);
          }
        }}>
        <Icon name="menu" size={25} />
        {!!due && !open && <span className="due-badge" aria-hidden>{due}</span>}
        {phone && !open && !radioOpen && <RadioMenuLamp />}
      </button>
      <div className="toolbar-fit-limit" ref={fitLimit} aria-hidden />
      <div className="toolbar-drawer" id="town-tools" inert={!open} style={{ "--drawer-rows": columns[0] } as CSSProperties} onPointerDown={menuOpen ? keepOpen : undefined} onClick={menuOpen ? keepOpen : undefined}>
        <div className="toolbar-tools">
          <div className="toolbar-actions">{actions.map(slot)}</div>
          {radioInDrawer && slot(<RadioTool phone={phone} shortcut={!surf} />, actions.length)}
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
  const situation = o && !o.followUp ? o.sitId : null;
  const sit = situation ? SITUATION_BY_ID[situation] : undefined;
  const phone = sit && isPhone(sit);
  const title = o?.title ?? L("Visos užduotys atliktos");
  const npc = sit?.npc;
  const profile = progress.profile;
  const person = npc === "sam" || npc === "emma" ? profile?.datePartner ?? (profile?.gender === "f" ? "sam" : "emma") : npc;
  const place = phone ? undefined : person && sit && LOCATIONS[sit.location]?.kind === "outdoor"
    ? NPCS[person]?.name ?? o?.where
    : o?.where;
  const meters = o?.dist != null ? `${o.dist} m` : null;
  const details = (place || meters) && <span className="objective-meta">
    {place && <span className="objective-destination">{place}</span>}
    {meters && <span className="dist">{o?.angle != null && <Arrow angle={o.angle} />}{meters}</span>}
  </span>;
  const st = !collapsed && situation ? stars(sitProgress(progress, situation)) : 0;
  return (
    <div className={"objective-card" + (collapsed ? " collapsed" : fresh ? " fresh" : "")} data-target-location={o?.targetLoc}>
      {/* The same native button keeps focus across both layouts. */}
      <button className={collapsed ? "collapse-btn objective-summary" : "collapse-btn"} aria-expanded={!collapsed}
        aria-label={collapsed ? [title, place, meters].filter(Boolean).join(", ") : L("Suskleisti")}
        onClick={() => setCollapsed(!collapsed)}>
        {collapsed && <>
          {situation ? <SitIcon id={situation} size={18} className="objective-ico" /> : <Icon name="target" size={16} strokeWidth={2} />}
          <span className="objective-title">{title}</span>
          {details}
        </>}
        <Icon name={collapsed ? "chevronDown" : "chevronUp"} size={collapsed ? 16 : 18} strokeWidth={2} />
      </button>
      {!collapsed && (o ? <>
        <div className={situation ? "objective-head" : undefined}>
          <div className="kicker">
            <span className="kicker-label"><Icon name="target" size={15} strokeWidth={2} /> {L("Užduotis")}</span>
            {st > 0 && <Stars n={st} size={14} />}
          </div>
          {situation && <SitIcon id={situation} size={32} className="objective-ico" />}
          <h3 lang={HL}>{title}{sit && <> <span lang={TL} className="en-title">· {sit.title.en}</span></>}</h3>
        </div>
        {o.goal && <p>{o.goal}</p>}
        <div className="row">
          {details}
          {phone ?
            <button className="btn small" onClick={() => useStore.getState().setHud({ panel: "phone" })}><Icon name="smartphone" size={17} /> {L("Paskambinti")}</button> :
            <button className="btn small" onClick={() => game?.autoWalkToObjective(o.followUp ? "objective" : undefined)} title="G"><Icon name="walk" size={17} /> {L("Nuvesk mane")}</button>
          }
          {!o.followUp && <button className="btn ghost small" onClick={() => useStore.getState().setHud({ panel: "journal" })}>{L("Kita užduotis")}</button>}
        </div>
      </> : <>
        <div className="kicker">{title} <InlineIcon name="party" /></div>
        <p>{L("Grįžk į bet kurią vietą ir pabandyk pasakyti kitaip – žmonės kaskart kalba šiek tiek skirtingai.")}</p>
      </>)}
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
  const card = useRef<HTMLSpanElement>(null);
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
    document.fonts?.addEventListener?.("loadingdone", measure);
    return () => { ro?.disconnect(); document.fonts?.removeEventListener?.("loadingdone", measure); };
  }, [inside, zoneName, w, h]);
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
    if (cave && mm.questX !== undefined && mm.questZ !== undefined) {
      const [u, v] = mapPoint(bounds, mm.questX, mm.questZ);
      x.strokeStyle = "#fff"; x.lineWidth = 2; x.fillStyle = "#2d968d";
      x.beginPath(); x.arc(u * S, v * S, 9, 0, Math.PI * 2); x.fill(); x.stroke();
    }
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
    <button type="button" className={"minimap" + (inside ? " inside" : "") + (live ? " live" : "")}
      style={inside && box ? { width: box.w + 2, height: box.h + 2 } : undefined}
      onClick={(e) => openMap(e.currentTarget)} onKeyDown={activateHudButton}
      title={L("Žemėlapis (M)")} aria-label={L("Miesto žemėlapis")} aria-describedby={inside ? "minimap-place" : undefined}>
      <canvas ref={ref} aria-hidden />
      <span className="label">{inside ? "" : zoneName}</span>
      <span className="mm-card" id="minimap-place" ref={card} aria-hidden={!inside}>
        <span className="mm-ico"><Icon name="home" size={21} strokeWidth={2} /></span>
        <small>{L("Viduje")}</small>
        <b><span>{place.current}</span></b>
        <span className="mm-go"><Icon name="map" size={18} strokeWidth={2} /></span>
      </span>
    </button>
  );
}

function HornButton({ touch }: { touch?: boolean }) {
  const label = L(ROAD_UI.horn);
  return <button className={touch ? "drive-horn" : "icon-btn"} type="button" aria-label={label}
    title={label} onClick={() => game?.horn?.()}><Icon name="horn" size={23} /></button>;
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
      {(ride === "car" || ride === "taxi") && <HornButton touch />}
      {/* the jump stays under the right thumb; with someone to talk to or a door to go through it moves over for that button
          (a second tap while in the air is a flip: every press goes to the game, which knows where the player is) */}
      {prompt && <button className="act-btn" onClick={() => game?.interact()}>{(prompt.kind === "taxi" || prompt.kind === "barista" || prompt.kind === "pool" || prompt.kind === "billiards") ? prompt.label : prompt.kind === "talk" ? L("Kalbėti") : prompt.kind === "exit" ? L("Išeiti") : prompt.kind === "drive" ? L("Vairuoti") : prompt.kind === "boat" ? L("Plaukti") : prompt.kind === "out" ? L("Išlipti") : prompt.kind === "climb" ? L("Užlipti") : prompt.kind === "listen" ? L("Klausyti") : prompt.kind === "surf" ? L("Banglentė") : prompt.kind === "paddle" ? L("Irkluoti") : L("Įeiti")}</button>}
      {/* (at a wheel the same button is the brake, for as long as it is held; in the water, a dive and the way back up) */}
      {ride === "car" || ride === "boat" || ride === "taxi"
        ? <button className={"jump-btn brake-btn" + (prompt ? " beside" : "")} aria-label={L(road ? ROAD_UI.drift : "Stabdyti")} title={L(road ? ROAD_UI.drift : "Stabdyti")} onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); game?.hold(true); }} onPointerUp={() => game?.hold(false)} onPointerCancel={() => game?.hold(false)} onLostPointerCapture={() => game?.hold(false)}><span aria-hidden>{road ? L(ROAD_UI.drift) : fast ? "DRIFT" : "STOP"}</span></button>
        : ride === "swim" || ride === "dive"
          ? <button className={"jump-btn" + (prompt ? " beside" : "")} aria-label={ride === "dive" ? L("Išnirti") : L("Panerti")} title={ride === "dive" ? L("Išnirti") : L("Panerti")} onPointerDown={(e) => { e.preventDefault(); game?.jump(); }}><Icon name={ride === "dive" ? "chevronUp" : "chevronDown"} size={34} strokeWidth={2.5} /></button>
          : <button className={"jump-btn" + (prompt ? " beside" : "")} aria-label={L("Pašokti")} title={L("Pašokti")} onPointerDown={(e) => { e.preventDefault(); game?.jump(); }}><Icon name="chevronUp" size={34} strokeWidth={2.5} /></button>}
    </>
  );
}
