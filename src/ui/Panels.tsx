import { isTownQuest } from "../content/townQuests";
import { clearPhotos } from "../game/photowalk/photos";
import { PhotoBookContact } from "./PhotoWalk";
import { ROUTE } from "../content/route";
import { useKeyboardHints } from "./keyboardHints";
import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { picturesOn, useStore } from "../state/store";
import { game } from "../game/gameRef";
import { switchPlayMode } from "./playMode";
import { KEEPER_SIT, SITUATIONS, SITUATION_BY_ID } from "../content/situations/catalog";
import { LOCATIONS, TOWN_LT, placeLt } from "../content/locations";
import { keepsakeFor } from "../content/keepsakes";
import { PHONE_CALLS } from "../content/phoneCalls";
import { TEXT_THREADS } from "../content/texts";
import { TextList, TextThread } from "./TextThread";
import { NPCS } from "../content/npcs";
import { coachVoice } from "../content/voices";
import { sitProgress, stars, emptyProgress } from "../state/progress";
import { audio } from "../game/audio";
import { STYLES_ENABLED } from "../game/worldStyles";
import { speechSupported, installLocal, refreshLocalState, type LocalAvailability } from "../convo/speech";
import { avatarColor } from "./Conversation";
import { OUTDOOR_NPCS, WORLD, SEA_Z, AIRPORT_EXIT } from "../game/world/layout";
import { LIGHTHOUSE_ISLAND } from "../game/world/island";
import { COVE_DOORS, RING_TARGET, inSlateCove } from "../game/world/slateCovePlan";
import { CAVE_COPY } from "../content/cave-copy";
import { drawIslandMap } from "./mapMarks";
import { isPhone, locIcon, walkToSituation } from "./objective";
import { SitIcon } from "./SitIcon";
import { Icon, InlineIcon, KeepsakeIcon, Stars, type IconName } from "./icons";
import type { SituationMeta } from "../content/types";
import { useCards, cardKey, dueCards, ipaFor, type CardInput } from "../state/cards";
import { MyCards, Glyph } from "./Cards";
import { showToast } from "./Toasts";
import { courseGuideUrl, setSectionHelp, useSectionHelp } from "./sectionHelp";
import { COACH_STEPS, coach } from "../game/coach";
import { COACH_ICON, coachWords } from "./Guide";
import { useRadio } from "../radio";
import { SURF } from "../content/surf";
import { HARBOR_SURF } from "../game/world/surf";
import { GYM_ENTRY } from "../content/gym-entry";
import { CavePicker } from "./CavePicker";

const Passport = lazy(() => import("./Passport"));
const WorldMapPanel = lazy(() => import("./worldMap"));

export const CHAPTERS: Record<number, string> = { 1: "Atvykimas", 2: "Pirmosios dienos mieste", 3: "Įsikūrimas", 4: "Darbas", 5: "Žmonės", 6: "Kelionės", 7: "Pagalba", 8: "Pažengusiems", 9: "Gyva kalba" };

/** The NPC shown for a situation (the date is with the partner the player chose). */
function mainNpc(s: SituationMeta) {
  if (s.npc !== "sam" && s.npc !== "emma") return NPCS[s.npc];
  const p = useStore.getState().progress.profile;
  return NPCS[p?.datePartner ?? (p?.gender === "f" ? "sam" : "emma")];
}

export function Panels() {
  const panel = useStore((s) => s.hud.panel);
  useEffect(() => {
    if (!panel) return;
    if (panel === "passport") return () => {
      if (!useStore.getState().hud.panel) document.querySelector<HTMLButtonElement>(".hud .prompt")?.focus();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); useStore.getState().setHud({ panel: null }); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);
  if (!panel) return null;
  const close = () => useStore.getState().setHud({ panel: null });
  if (panel === "passport") return <div className="overlay passport-layer" data-pad-scope="panel" data-pad-phase="passport">
    <Suspense fallback={<button data-pad-back onClick={close} autoFocus>Uždaryti</button>}><Passport close={close} /></Suspense>
  </div>;
  return (
    <div className="overlay" data-pad-scope="panel" data-pad-phase={panel} onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      {panel === "map" && <MapPanel close={close} />}
      {panel === "journal" && <Journal close={close} />}
      {panel === "phone" && <Phone close={close} />}
      {panel === "settings" && <Settings close={close} />}
      {panel === "phrasebook" && <Phrasebook close={close} />}
      {panel === "scenarios" && <Scenarios close={close} />}
      {panel === "help" && <Help close={close} />}
    </div>
  );
}

function Help({ close }: { close: () => void }) {
  const sheet = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    sheet.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  return <div ref={sheet} className="sheet narrow" role="dialog" aria-modal="true" aria-label="Kaip žaisti?"
    onKeyDown={(e) => {
      if (e.key !== "Tab") return;
      const controls = [...e.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], summary")].filter((el) => el.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }}>
    <SheetHead icon="help" title="Kaip žaisti?" close={close} />
    <div className="sheet-body">
      <p>Pasirink situaciją, išklausyk pašnekovą ir atsakyk angliškai. Gali kalbėti arba rašyti. Atsakymų pavyzdžius rasi po užrašu „Tavo eilė“.</p>
      <details className="howto">
        <summary>Žingsnis po žingsnio <Icon name="arrowRight" size={20} /></summary>
        <ol>
          <li>Spausk „Visos situacijos“ ir pasirink pokalbį. Jei žaidi 3D mieste, gali prieiti prie pašnekovo.</li>
          <li>Palauk, kol pašnekovas baigs kalbėti. Jei garsas sustoja, spausk „Klausyti“.</li>
          <li>Pašnekovui baigus kalbėti, mikrofonas įsijungia automatiškai – atsakyk angliškai. Mikrofono mygtuku gali bandyti dar kartą arba baigti savo atsakymą. Jei nori rašyti, spausk klaviatūros ikonėlę. Garsiakalbio ikonėlė prie pavyzdžio leidžia išgirsti atsakymą, o „Pakartok“ – jį ištarti ir pasitikrinti.</li>
          <li>Spausk „LT“, kad matytum vertimą, arba „IPA“, kad matytum tarimo užrašą. Vėžliuko ikonėlė sulėtina balsą, o „i“ prie paveikslėlio atveria informaciją apie pašnekovą ir vietą.</li>
        </ol>
      </details>
      <TownHelp open />
      <a className="btn soft" href={courseGuideUrl()} target="_blank" rel="noopener noreferrer">Išsamus naudojimo gidas <Icon name="arrowRight" size={18} /></a>
    </div>
  </div>;
}

function SheetHead({ icon, title, close }: { icon: IconName; title: ReactNode; close: () => void }) {
  return (
    <div className="sheet-head">
      <span className="sheet-ico" aria-hidden><Icon name={icon} size={24} /></span>
      <h2>{title}</h2>
      <button className="close-x" data-pad-back onClick={close} aria-label="Uždaryti"><Icon name="close" /></button>
    </div>
  );
}

function SitActions({ s, close }: { s: SituationMeta; close: () => void }) {
  const progress = useStore((st) => st.progress);
  const light = useStore((st) => st.settings.play === "light");
  const current = progress.objective === s.id;
  if (!light && s.location === "gruta") {
    const guide = () => { close(); game?.guideToPlace?.(s.location, undefined, s.npc); };
    return <div className="sit-actions" data-place={s.location}>
      <button type="button" className="btn ghost small" onClick={guide}><Icon name="target" size={17} /> Rodyti kelią</button>
      <button type="button" className="btn soft small" onClick={() => { guide(); game?.autoWalkToObjective("cave"); }}><Icon name="walk" size={17} /> Nuvesk mane</button>
    </div>;
  }
  return (
    <div className="sit-actions">
      <button className="btn small" onClick={() => { close(); game?.startScenario(s.id); }}><Icon name="play" size={15} /> Pradėti dabar</button>
      {!s.bonus && !current && !light && <button className="btn ghost small" onClick={() => { game?.setObjective(s.id); close(); }}><Icon name="target" size={17} /> Pasirinkti užduotimi</button>}
      {light ? null : isPhone(s) ? (
        <button className="btn warm small" onClick={() => { close(); game?.call(s.id); }}><Icon name="smartphone" size={17} /> Skambinti dabar</button>
      ) : (
        <>
          <button className="btn soft small" onClick={() => {
            if (s.location === "lighthouse") { close(); game?.guideToLighthouse?.(); }
            else if (s.bonus) { close(); game?.guideToPlace?.(s.location); }
            else walkToSituation(s.id, close);
          }}><Icon name="walk" size={17} /> Nuvesk mane</button>
          {s.location !== "lighthouse" && <button className="btn ghost small" onClick={() => { if (!s.bonus) game?.setObjective(s.id); close(); game?.teleportTo(s.location); }}><Icon name="taxi" size={17} /> Nuvykti taksi</button>}
        </>
      )}
    </div>
  );
}

function SitCard({ s, onClick, open }: { s: SituationMeta; onClick: () => void; open: boolean }) {
  const progress = useStore((st) => st.progress);
  const sp = sitProgress(progress, s.id);
  const loc = LOCATIONS[s.location];
  return (
    <button className={"sit-card" + (progress.objective === s.id ? " current" : "")} data-sit={s.id} onClick={onClick} aria-expanded={open}>
      <span className="ico"><SitIcon id={s.id} size={24} /></span>
      <span className="txt">
        <b>{s.title.lt}</b>
        <span><i style={{ fontFamily: "var(--en)", fontSize: "1.1em" }}>{s.title.en}</i> · {loc?.lt}{s.song !== "" && <> · daina {s.song}</>}</span>
      </span>
      {sp.completions > 0 && <KeepsakeIcon kind={keepsakeFor(s.id)} named />}
      <Stars n={stars(sp)} />
    </button>
  );
}

/** Pilot: a short, varied set to start with (shown first in the picker). */
export const START_WITH = ["s72-cafe", "s66-taxi", "s68-hotel", "s75-pharmacy", "s74-clothes", "s90-running-late", "s84-date"];

function HowToPlay({ open }: { open?: boolean }) {
  const keyboardHints = useKeyboardHints();
  return (
    <details className="howto" open={open}>
      <summary><Icon name="help" size={21} className="howto-ico" /> Kaip žaisti?<Icon name="chevronDown" size={18} className="chev" /></summary>
      <ol>
        <li>Pasirink situaciją – iškart atsidursi pokalbyje.</li>
        <li>Viršuje matysi užduočių sąrašą, o prie „<InlineIcon name="next" label="rodyklės" />“ – ką daryti dabar.</li>
        <li>Pašnekovui baigus kalbėti, mikrofonas įsijungia automatiškai – kalbėk angliškai. <InlineIcon name="mic" label="Mikrofono mygtuku" />{keyboardHints && " (arba tarpo klavišu)"} gali bandyti dar kartą arba baigti atsakymą. Galima ir rašyti <InlineIcon name="keyboard" label="klaviatūra" />.</li>
        <li>Nežinai, ką pasakyti? Po „Tavo eilė“ yra pavyzdžiai – <InlineIcon name="speaker" label="garsiakalbio mygtukas" /> juos perskaito. „Daugiau frazių“ – dar daugiau būdų tai pasakyti.</li>
        <li>Viršuje <b>LT</b> ir <b>IPA</b> įjungia pašnekovo sakinių vertimą ir tarimą, o prie „Tavo eilė“ esantys <b>Vertimas</b> ir <b>IPA</b> – tavo atsakymų pavyzdžių. <InlineIcon name="restart" label="Rodyklė ratu" /> – pradėti iš naujo, <InlineIcon name="list" label="Sąrašas" /> – kitos situacijos.</li>
        <li>Paspausk bet kurį anglišką žodį – galėsi jį išsaugoti kortelėse ir vėliau pakartoti (<InlineIcon name="bookOpen" label="Frazių knygelė" /> → „Mano kortelės“).</li>
        <li>Jei žaidimas tavęs nesupranta – spausk <b><InlineIcon name="clipboard" /> Kopijuoti</b> ir atsiųsk pokalbį mokytojui.</li>
      </ol>
    </details>
  );
}

/** Everything the town's hints say (game/coach.ts: each comes up once, when its thing first matters), the other keys,
 *  and the choice between the 3D view and the pictures: here to come back to. Only in the 3D town. */
function TownHelp({ open }: { open?: boolean }) {
  const light = useStore((st) => st.settings.play === "light");
  const touch = useStore((st) => st.hud.showTouch);
  const hasRadio = useRadio((s) => s.available);
  // (the surf lesson's hint only where the town has a surf school)
  const hasSurf = !!SURF;
  const [again, setAgain] = useState(false);
  if (light) return null;
  return (
    <details className="howto town-help" open={open}>
      <summary><Icon name="walk" size={21} className="howto-ico" /> Kaip judėti mieste?<Icon name="chevronDown" size={18} className="chev" /></summary>
      <ul>
        {COACH_STEPS.filter((s) => (s !== "radio" || hasRadio) && (s !== "surf" || hasSurf)).map((s) => {
          const [title, body] = coachWords(s, touch);
          return <li key={s}><Icon name={COACH_ICON[s]} size={19} strokeWidth={2} /><span><b>{title}.</b> {body}</span></li>;
        })}
        {!touch && <li><Icon name="keyboard" size={19} strokeWidth={2} /><span><b>Klavišai.</b> Spustelėk žemę – nueisi ten. <kbd>G</kbd> – nueiti iki užduoties, <kbd>M</kbd> – žemėlapis, <kbd>J</kbd> – užduotys, <kbd>P</kbd> – telefonas.</span></li>}
        <li><Icon name="frame" size={19} strokeWidth={2} /><span><b>Pokalbių vaizdas.</b> Kalbiesi su žmogumi 3D mieste, jo lūpos juda pagal balsą. Įjungus iliustruotas scenas, pokalbio metu rodomas vietos piešinys. Per pokalbį vaizdą perjungsi mažu paveikslėliu vaizdo kampe.</span></li>
      </ul>
      <button className="btn ghost small" disabled={again} onClick={() => { useStore.getState().updateProgress((p) => { p.coach = { view: p.coach?.view }; }); coach.begin(); setAgain(true); }}>{again ? "Patarimai vėl bus rodomi" : "Rodyti patarimus iš naujo"}</button>
    </details>
  );
}

/** The situation picker: every conversation, one tap to start (no walking needed). */
function Scenarios({ close }: { close: () => void }) {
  const progress = useStore((st) => st.progress);
  const byCh = useMemo(() => {
    const m = new Map<number, SituationMeta[]>();
    for (const s of [...ROUTE].sort((a, b) => a.chapter - b.chapter || a.order - b.order)) {
      const l = m.get(s.chapter) ?? []; l.push(s); m.set(s.chapter, l);
    }
    return [...m.entries()];
  }, []);
  const done = ROUTE.filter((s) => sitProgress(progress, s.id).completions > 0).length;
  const light = useStore((s) => s.settings.play === "light");
  const bonus = SITUATIONS.filter((s) => s.bonus && s.location !== "gruta" && !(light && isTownQuest(s.id)) && sitProgress(progress, s.id).completions > 0);
  return (
    <div className="sheet scenarios">
      <SheetHead icon="clapper" title={`Pasirink situaciją · ${done}/${ROUTE.length}`} close={close} />
      <div className="sheet-body">
        <p className="scn-lead">Paspausk situaciją – iškart atsidursi vietoje ir kalbėsi su žmogumi. Po pokalbio galėsi pakartoti arba rinktis kitą.</p>
        <HowToPlay />
        <TownHelp />
        <div className="chapter">
          <h3 className="start-here"><Icon name="star" size={18} /> Pradėk nuo šių</h3>
          <div className="scn-grid">{START_WITH.map((id) => SITUATION_BY_ID[id]).filter(Boolean).map((s) => <ScenarioCard key={s.id} s={s} close={close} />)}</div>
        </div>
        {byCh.map(([ch, list]) => (
          <div className="chapter" key={ch}>
            <h3>{ch}. {CHAPTERS[ch] ?? ""}</h3>
            <div className="scn-grid">{list.map((s) => <ScenarioCard key={s.id} s={s} close={close} />)}</div>
          </div>
        ))}
        {bonus.length > 0 && <div className="chapter"><div className="scn-grid">
          {bonus.map((s) => <ScenarioCard key={s.id} s={s} close={close} />)}
        </div></div>}
        <CavePicker grid="scn-grid" card={(s) => <ScenarioCard key={s.id} s={s} close={close} />} />
        <div className="scn-foot" style={{ flexWrap: "wrap", gap: 8 }}>
          <button className="btn ghost" onClick={close}><Icon name="walk" size={19} /> Vaikščioti po miestą</button>
          {!light && <button type="button" className="btn soft small" style={{ minHeight: 44 }} onClick={() => { close(); game?.guideToPlace?.(GYM_ENTRY.location); }}>
            <Icon name="walk" size={19} /> {GYM_ENTRY.listAction}
          </button>}
        </div>
      </div>
    </div>
  );
}

function ScenarioCard({ s, close }: { s: SituationMeta; close: () => void }) {
  const progress = useStore((st) => st.progress);
  const loc = LOCATIONS[s.location];
  const n = mainNpc(s), cave = s.npc === "cave_bram";
  const st = stars(sitProgress(progress, s.id));
  return (
    <button className={"scn-card" + (st ? " done" : "")} data-sit={s.id} onClick={() => { close(); game?.startScenario(s.id); }}>
      <span className="ico"><SitIcon id={s.id} size={24} /></span>
      <span className="txt">
        <b lang="lt">{cave ? loc.lt : s.title.lt}</b>
        <i lang="en">{cave ? loc.name : s.title.en}</i>
        <span>{n?.name}{!cave && " · "}{cave ? null : isPhone(s) ? (s.mode === "video" ? "vaizdo skambutis" : "skambutis") : loc?.lt}{s.song !== "" && <> · daina {s.song}</>}</span>
      </span>
      <Stars n={st} />
    </button>
  );
}

function Journal({ close }: { close: () => void }) {
  const [open, setOpen] = useState<string | null>(useStore.getState().progress.objective);
  const byCh = useMemo(() => {
    const m = new Map<number, SituationMeta[]>();
    for (const s of [...ROUTE].sort((a, b) => a.chapter - b.chapter || a.order - b.order)) {
      const l = m.get(s.chapter) ?? []; l.push(s); m.set(s.chapter, l);
    }
    return [...m.entries()];
  }, []);
  const progress = useStore((st) => st.progress);
  const done = ROUTE.filter((s) => sitProgress(progress, s.id).completions > 0).length;
  const totalStars = ROUTE.reduce((a, s) => a + stars(sitProgress(progress, s.id)), 0);
  return (
    <div className="sheet narrow">
      <SheetHead icon="journal" title={<>Užduotys · {done}/{ROUTE.length} · <span className="head-stars"><Icon name="star" size="0.9em" label="Žvaigždučių:" /> {totalStars}</span></>} close={close} />
      <div className="sheet-body">
        <div className="info-box" style={{ marginBottom: 8 }}>
          Rekomenduojama tvarka – iš viršaus į apačią, bet gali rinktis bet kurią užduotį. <Stars n={1} of={1} size="1.05em" label="1 žvaigždutė" /> – įveikta, <Stars n={2} of={2} size="1.05em" label="2 žvaigždutės" /> – pavartojai bent 6 skirtingas frazes, <Stars n={3} of={3} size="1.05em" label="3 žvaigždutės" /> – įveikei 3 kartus (žmonės kaskart kalba kitaip).
        </div>
        {byCh.map(([ch, list]) => (
          <div className="chapter" key={ch}>
            <h3>{ch}. {CHAPTERS[ch] ?? ""}</h3>
            <div className="sit-list">
              {list.map((s) => (
                <div key={s.id}>
                  <SitCard s={s} open={open === s.id} onClick={() => setOpen(open === s.id ? null : s.id)} />
                  {open === s.id && (
                    <div style={{ padding: "8px 6px 4px" }}>
                      <div style={{ color: "var(--ink-soft)", lineHeight: 1.45 }}>{s.goal}</div>
                      <div style={{ fontSize: "0.85em", color: "var(--ink-faint)", marginTop: 4 }}>{mainNpc(s)?.name} · {mainNpc(s)?.role.lt}</div>
                      <SitActions s={s} close={close} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const MapPlaces = lazy(() => import("./MapPlaces"));

/** Slate Cove's two places (mh-cave): pins of their own on the town map, and a guide to each under it. */
const COVE_LANDMARKS = ["gruta", "old-stone-ring"];
const NO_LANDMARKS: string[] = [];

function locationPoint(loc: string): { x: number; z: number } | null {
  if (loc === "airport") return { x: AIRPORT_EXIT.x + 12, z: AIRPORT_EXIT.z };
  if (loc === HARBOR_SURF.location) return HARBOR_SURF.shack;
  if (loc === "gruta") return COVE_DOORS.main;
  if (loc === "old-stone-ring") return RING_TARGET;
  const d = game?.doors.find((dd) => dd.loc === loc);
  if (d) return { x: d.x, z: d.z };
  const s = SITUATIONS.find((x) => x.location === loc);
  const o = s ? OUTDOOR_NPCS.find((n) => n.npc === s.npc) : undefined;
  return o ? { x: o.x, z: o.z } : null;
}

function MapPlaceIcon({ loc, size }: { loc: string; size: number }) {
  return loc === HARBOR_SURF.location ? <SitIcon id={SURF.situation} size={size} /> : <Icon name={locIcon(loc)} size={size} />;
}

/** Inside the cave the big map is the cave's own (worldMap.tsx, with its switch to the cove's trails); in town, the
 *  town's map with its packed place pins, the cove's landmarks to the west. */
function MapPanel({ close }: { close: () => void }) {
  const inCave = useStore((s) => s.hud.minimap.zone === "gruta") && !!game?.caveMapBounds;
  return inCave ? <Suspense fallback={null}><WorldMapPanel close={close} {...{ SheetHead, SitCard, SitActions }} /></Suspense>
    : <TownMapPanel close={close} />;
}

function TownMapPanel({ close }: { close: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<string | null>(null);
  const progress = useStore((s) => s.progress);
  const caveArea = useStore((s) => s.hud.minimap.zone === "town" && inSlateCove(s.hud.minimap.px, s.hud.minimap.pz));
  const island = game?.guideToLighthouse ? LIGHTHOUSE_ISLAND : undefined;
  const lighthouse = LOCATIONS.lighthouse;
  const north = island ? WORLD.minZ : SEA_Z - 2;
  // the town and, to its west, Slate Cove's headland (drawn by the game: drawRegionMap)
  const west = game?.townMapWest ?? WORLD.minX;
  const region = game?.townMapWest !== undefined ? "slate-cove" : undefined;
  const landmarks = game?.guideToPlace && game.townMapWest !== undefined ? COVE_LANDMARKS : NO_LANDMARKS;
  const W = WORLD.maxX - west, D = WORLD.maxZ - north;
  useLayoutEffect(() => {
    const map = sheet.current!;
    const opener = document.activeElement as HTMLElement | null;
    map.querySelector<HTMLButtonElement>(".close-x")?.focus();
    const keepTabInMap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const controls = [...map.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]')].filter((el) => el.getClientRects().length);
      const edge = e.shiftKey ? controls[0] : controls.at(-1);
      if (document.activeElement !== edge) return;
      e.preventDefault();
      (e.shiftKey ? controls.at(-1) : controls[0])?.focus();
    };
    map.addEventListener("keydown", keepTabInMap);
    return () => {
      map.removeEventListener("keydown", keepTabInMap);
      if (useStore.getState().hud.panel) return;
      const target = opener !== document.body && opener?.isConnected && !opener.closest("[inert]")
        ? opener : document.querySelector<HTMLButtonElement>(".minimap");
      target?.focus();
    };
  }, []);
  useEffect(() => {
    const g = game?.groundCanvas, c = ref.current;
    if (!g || !c) return;
    const ppm = g.width / (WORLD.maxX - WORLD.minX), sea = (SEA_Z - 2 - north) * ppm, town = (WORLD.minX - west) * ppm;
    c.width = Math.round(W * ppm); c.height = Math.round(g.height + sea);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#3f8fb5";
    ctx.fillRect(0, 0, c.width, town ? c.height : sea);
    if (town) {
      ctx.fillStyle = "#86b866";
      ctx.fillRect(0, (SEA_Z + 1 - north) * ppm, town, c.height);
    }
    ctx.drawImage(g, town, sea);
    if (town) game?.drawRegionMap?.(ctx, west, north, ppm, true);
    if (island) drawIslandMap(ctx, island, west, north, ppm);
  }, [W, island, north, west]);
  const selSits = sel ? SITUATIONS.filter((s) => s.location === sel && !(game?.light && isTownQuest(s.id))) : [];
  const guideTo = (loc: string) => {
    close();
    game?.guideToPlace?.(loc);
    game?.autoWalkToObjective("cave");
  };
  return (
    <div className="sheet map-sheet" ref={sheet} role="dialog" aria-modal="true" aria-label="Maple Harbor">
      <SheetHead icon="map" title="Maple Harbor" close={close} />
      <div className="sheet-body">
        <div className="town-lt" lang="lt">{TOWN_LT}</div>
        <div className="map-wrap">
          <div>
            <div className="map-canvas" style={{ aspectRatio: W / D }}>
              <canvas ref={ref} data-map={region} />
            </div>
            {landmarks.length > 0 && <div className="cave-landmarks">
              {landmarks.map((id) => <button key={id} type="button" className="btn ghost small" aria-pressed={sel === id}
                aria-label={(id === "gruta" ? CAVE_COPY.map.entrancePin : CAVE_COPY.map.ringPin).lt}
                onClick={() => setSel(id)}><span lang="en">{LOCATIONS[id].name}</span>{" "}<span lang="lt">· {LOCATIONS[id].lt}</span></button>)}
            </div>}
          </div>
          <div>
            <Suspense fallback={null}>
              {/* Pass the existing UI and content through so opening the map is their only new chunk boundary. */}
              <MapPlaces canvas={ref} island={island} north={north} west={west} landmarks={landmarks} positionFor={locationPoint} progress={progress}
                selected={sel} onSelect={setSel} route={ROUTE} situations={SITUATIONS} doors={game?.doors}
                landmark={HARBOR_SURF.location} Icon={Icon} MapPlaceIcon={MapPlaceIcon} portal={createPortal} />
            </Suspense>
            {!sel && <div className="info-box">{caveArea ? CAVE_COPY.map.legend.lt : "Pasirink vietą žemėlapyje. Geltonas taškas – tavo užduotis, raudonas – tu."}<br /><br /><InlineIcon name="smartphone" /> Kai kurios užduotys atliekamos telefonu (P).</div>}
            {island && sel === "lighthouse" && (
              <div>
                <h3 className="place-title" tabIndex={0}>{lighthouse.name}</h3>
                <div lang="lt" style={{ color: "var(--ink-soft)", marginBottom: 10 }}>{lighthouse.lt}</div>
                <b lang="lt">{SITUATION_BY_ID[KEEPER_SIT].title.lt}</b>
                <p lang="lt">Prie namelio laukia švyturio prižiūrėtojas.</p>
                <button className="btn soft small" onClick={() => { close(); game?.guideToLighthouse?.(); }}><Icon name="walk" size={17} /> Nuvesk mane</button>
              </div>
            )}
            {sel && LOCATIONS[sel] && !(island && sel === "lighthouse") && (
              <div>
                <h3 className="place-title" tabIndex={0}><span className="place-ico"><MapPlaceIcon loc={sel} size={22} /></span>{LOCATIONS[sel].name}</h3>
                <div style={{ color: "var(--ink-soft)", marginBottom: 10 }}>{placeLt(sel)}</div>
                {sel === "town-hall" && <button type="button" className="btn soft" onClick={() => { close(); game?.guideToPlace?.(sel); }}><Icon name="walk" size={17} /> Nuvesk mane</button>}
                {sel === "pool-hall" && <p>Biliardo salė – partija su Tina</p>}
                {sel === GYM_ENTRY.location && game?.light === false && <p>{GYM_ENTRY.mapLabel}</p>}
                {landmarks.includes(sel) && <button type="button" className="btn soft" onClick={() => guideTo(sel)}><Icon name="walk" size={17} /> Nuvesk mane</button>}
                <div className="sit-list">
                  {selSits.map((s) => (
                    <div key={s.id}>
                      <SitCard s={s} open onClick={() => {}} />
                      <div style={{ padding: "6px 4px" }}><div style={{ color: "var(--ink-soft)", fontSize: "0.9em" }}>{s.goal}</div><SitActions s={s} close={close} /></div>
                    </div>
                  ))}
                  {!selSits.length && sel !== "town-hall" && !landmarks.includes(sel) && <div className="info-box">Čia kol kas nėra užduočių.</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Phone({ close }: { close: () => void }) {
  const calls = ROUTE.filter(isPhone).sort((a, b) => a.chapter - b.chapter || a.order - b.order);
  const progress = useStore((s) => s.progress);
  const textId = useStore((s) => s.hud.textThread);
  const thread = TEXT_THREADS.find(({ id, from }) => id === textId && NPCS[from] && progress.texts?.got[id]);
  const missed = calls.filter((sit) => progress.phone?.missed[sit.id]);
  return (
    <div className={"phone" + (thread ? " thread-open" : "")} role="dialog" aria-label="Telefonas">
      <div className="phone-status">
        <span>9:41</span><button className="phone-close" data-pad-back onClick={close} aria-label="Uždaryti"><Icon name="close" size={20} /></button>
      </div>
      {thread ? <TextThread key={thread.id} thread={thread} entry={progress.texts!.got[thread.id]} /> : <>
      <TextList got={progress.texts?.got} />
      <PhotoBookContact close={close} />
      {!!missed.length && <section className="missed-calls">
        <h2>Praleisti skambučiai</h2>
        {missed.map((sit) => (
          <div className="contact missed-call" key={sit.id} data-call={sit.id}>
            <span className="txt"><b>{PHONE_CALLS[sit.id]?.name ?? NPCS[sit.npc]?.name}</b><span>Praleistas skambutis</span></span>
            <button className="btn small" onClick={() => { close(); game?.call(sit.id); }}>Perskambinti</button>
          </div>
        ))}
      </section>}
      <h2><Icon name="smartphone" size={22} /> Skambučiai</h2>
      {calls.length === 0 && <div style={{ color: "#aab7c2", textAlign: "center" }}>Kol kas nėra kam skambinti.</div>}
      {calls.map((s) => {
        const n = NPCS[s.npc];
        const st = stars(sitProgress(progress, s.id));
        return (
          <button key={s.id} className={"contact" + (progress.objective === s.id ? " current" : "")} data-sit={s.id} onClick={() => { close(); game?.call(s.id); }}>
            <span className="avatar" style={{ background: avatarColor(s.npc) }}>
              {s.mode === "video" ? <Icon name="video" size={20} /> : n?.name.replace(/^(Mr\.|Ms\.|Mrs\.) /, "").charAt(0)}
              <span className="contact-badge"><SitIcon id={s.id} size={13} /></span>
            </span>
            <span className="txt"><b>{n?.name}</b><span>{s.title.lt}{st ? <> · <Stars n={st} of={st} size={13} label={`${st} iš 3`} /></> : null}</span></span>
            <span className="call"><Icon name={s.mode === "video" ? "video" : "phoneCall"} size={21} /></span>
          </button>
        );
      })}
      </>}
    </div>
  );
}

function Toggle({ on, onChange, label, sub }: { on: boolean; onChange: (v: boolean) => void; label: string; sub?: ReactNode }) {
  return (
    <div className="set-row">
      <div className="txt"><b>{label}</b>{sub && <span>{sub}</span>}</div>
      <button className={"switch" + (on ? " on" : "")} onClick={() => onChange(!on)} role="switch" aria-checked={on} aria-label={label} />
    </div>
  );
}

function Settings({ close }: { close: () => void }) {
  const showHelp = useSectionHelp();
  const s = useStore((st) => st.settings);
  const set = useStore((st) => st.setSettings);
  const profile = useStore((st) => st.progress.profile);
  const [local, setLocal] = useState<LocalAvailability | "…">("…");
  useEffect(() => { void refreshLocalState().then(setLocal); }, []);
  return (
    <div className="sheet narrow">
      <SheetHead icon="settings" title="Nustatymai" close={close} />
      <div className="sheet-body settings-grid">
        <Toggle on={showHelp} onChange={setSectionHelp} label="Rodyti pagalbos klaustukus" sub="Trumpa pagalba prie žaidimo ir pokalbių. Išsamų gidą gali atidaryti bet kada." />
        <a className="btn soft" href={courseGuideUrl()} target="_blank" rel="noopener noreferrer">Naudojimo gidas <Icon name="arrowRight" size={18} /></a>
        <Toggle on={s.lt} onChange={(v) => set({ lt: v })} label="Lietuviški vertimai (L)" sub="Žodis po žodžio po pašnekovo sakiniais." />
        <Toggle on={s.ltNatural} onChange={(v) => set({ ltNatural: v })} label="Visas sakinys lietuviškai (N)" sub="Rodoma, kai įjungti vertimai." />
        <Toggle on={s.ipa} onChange={(v) => set({ ipa: v })} label="Tarimas IPA (I)" sub="Amerikietiškas tarimas po kiekvienu pašnekovo žodžiu (sugeneruota, dar netikrinta su įrašais)." />
        <Toggle on={s.sayLt} onChange={(v) => set({ sayLt: v })} label="Tavo atsakymų vertimas" sub="Po pavyzdžiais „Tavo eilė“ ir „Daugiau frazių“." />
        <Toggle on={s.sayIpa} onChange={(v) => set({ sayIpa: v })} label="Tavo atsakymų tarimas IPA" sub="Po kiekvienu pavyzdžių žodžiu." />
        <Toggle on={s.suggestions} onChange={(v) => set({ suggestions: v })} label="Pasiūlymai, ką pasakyti" sub="Lietuviški pasiūlymai tavo eilėje." />
        <Toggle on={s.hintsOpen} onChange={(v) => set({ hintsOpen: v })} label="Frazės atidarytos iš karto" sub={<>Kitaip atsidaro paspaudus <InlineIcon name="bulb" label="lemputę" /> (H).</>} />
        <Toggle on={s.confirmSpeech} onChange={v=>set({confirmSpeech:v})} label="Patvirtinti atpažintą tekstą" sub="Prieš išsiunčiant atsakymą parodyti, ką išgirdo. Galėsi pataisyti praleistą „ne“ ar kitą žodį." />
        <Toggle on={s.slowVoice} onChange={(v) => set({ slowVoice: v })} label="Žmonės kalba lėčiau" />
        {(local === "available" || local === "downloadable" || local === "downloading") && (
          <Toggle on={s.onDevice} onChange={(v) => set({ onDevice: v })} label="Atpažinti kalbą šiame įrenginyje" sub="Privačiau ir veikia be interneto, bet akcentą supranta prasčiau. Įprastai geriau palikti išjungtą." />
        )}
        <div className="set-row">
          <div className="txt"><b>Režimas</b><span>Lengvas – be 3D miesto, tik pokalbiai su piešiniais. Pakeitus puslapis persikrauna.</span></div>
          <div className="seg">{([["light", "Lengvas"], ["town", "3D miestas"]] as const).map(([v, n]) => <button key={v} className={s.play === v ? "on" : ""} onClick={() => { if (s.play !== v) switchPlayMode(v); }}>{n}</button>)}</div>
        </div>
        {s.play !== "light" && <Toggle on={s.phoneCalls} onChange={(v) => set({ phoneCalls: v })} label="Skambučiai einant po miestą" sub="Telefonas kartais suskamba, kai vaikštai." />}
        {s.play !== "light" && <Toggle on={s.textMessages} onChange={(v) => set({ textMessages: v })} label="Žinutės einant po miestą" sub="Draugai kartais parašo trumpą žinutę." />}
        {s.play !== "light" && <Toggle on={s.cameraFollow} onChange={(v) => set({ cameraFollow: v })} label="Kamera seka personažą" />}
        <Toggle on={picturesOn(s)} onChange={(v) => set({ scenes: v })} label="Iliustruotos scenos" sub={s.play === "light" ? "Pokalbio metu vietoje 3D vaizdo rodomas piešinys, kuris keičiasi pagal pokalbio etapą." : "Pokalbio metu vietoje 3D vaizdo rodomas piešinys, kuris keičiasi pagal pokalbio etapą. Per pokalbį perjungsi mažu paveikslėliu vaizdo kampe arba klavišu P."} />
        <div className="set-row">
          <div className="txt"><b>Teksto dydis</b></div>
          <div className="seg">{[1, 1.15, 1.3].map((z, i) => <button key={z} className={s.textSize === z ? "on" : ""} onClick={() => set({ textSize: z })}>{["A", "A+", "A++"][i]}</button>)}</div>
        </div>
        <div className="set-row">
          <div className="txt"><b id="settings-volume">Garsumas</b></div>
          <input data-pad-adjust aria-labelledby="settings-volume" type="range" min={0} max={1} step={0.05} value={s.volume} onChange={(e) => { set({ volume: +e.target.value }); audio.volume = +e.target.value; }} style={{ width: 160 }} />
        </div>
        <div className="set-row">
          <div className="txt"><b>Garsai</b><span>Žingsniai, jūra, miestelio garsai – tyliau už balsus.</span></div>
          <input data-pad-adjust type="range" min={0} max={1} step={0.05} value={s.sounds} aria-label="Garsai" onChange={(e) => { set({ sounds: +e.target.value }); audio.sounds = +e.target.value; if (+e.target.value > 0) audio.sfx("pop"); }} style={{ width: 160 }} />
        </div>
        {s.play !== "light" && STYLES_ENABLED && <div className="set-row">
          <div className="txt"><b>Pasaulio stilius</b><span>Bandomieji 3D miesto stiliai. Pakeitus puslapis persikrauna.</span></div>
          <div className="seg">{([["blocks", "Kaladėlės"], ["toon", "Animacija"], ["storybook", "Iliustracija"], ["realistic", "Tikroviškas"]] as const).map(([v, n]) => (
            <button key={v} className={s.worldStyle === v ? "on" : ""} onClick={() => { const u = new URL(location.href), forced = u.searchParams.has("style"); if (s.worldStyle === v && !forced) return; set({ worldStyle: v }); u.searchParams.delete("style"); setTimeout(() => forced ? location.replace(u.href) : location.reload(), 200); }}>{n}</button>
          ))}</div>
        </div>}
        {s.play !== "light" && <div className="set-row">
          <div className="txt"><b>Grafika</b><span>„Paprasta“ – jei kompiuteris lėtas.</span></div>
          <div className="seg">{(["high", "low"] as const).map((q) => <button key={q} className={s.quality === q ? "on" : ""} onClick={() => { set({ quality: q }); game?.setQuality(q); }}>{q === "high" ? "Graži" : "Paprasta"}</button>)}</div>
        </div>}
        {profile && (
          <div className="set-row">
            <div className="txt"><b>Pasimatymas (daina 84)</b><span>Su kuo eini į pasimatymą.</span></div>
            <div className="seg">{[["emma", "Emma"], ["sam", "Sam"]].map(([id, n]) => <button key={id} className={(profile.datePartner ?? (profile.gender === "f" ? "sam" : "emma")) === id ? "on" : ""} onClick={() => useStore.getState().updateProgress((p) => { if (p.profile) p.profile.datePartner = id; })}>{n}</button>)}</div>
          </div>
        )}
        <div className="info-box">
          <b><InlineIcon name="mic" /> Kalbėjimas.</b> {speechSupported() ? "Tavo naršyklė moka atpažinti kalbą." : "Ši naršyklė neturi balso atpažinimo (pvz., Firefox) – atsakymus gali rašyti. Balsui naudok Chrome, Edge arba Safari."}{" "}
          {speechSupported() && (s.onDevice && local === "available"
            ? "Anglų kalba atpažįstama šiame įrenginyje – garsas niekur nesiunčiamas ir veikia be interneto."
            : "Kalbą atpažįsta pati naršyklė, dažniausiai savo gamintojo serveriuose (Chrome – Google, Edge – Microsoft, Safari – Apple): taip geriausiai suprantamas akcentas. Tau ir žaidimui tai nieko nekainuoja, bet reikia interneto.")}
          {s.onDevice && (local === "downloadable" || local === "downloading") && <> Kad atpažinimas vyktų šiame įrenginyje, Chrome turi atsisiųsti anglų kalbą. <button className="btn small" onClick={async () => { const ok = await installLocal(); setLocal(await refreshLocalState()); useStore.getState().toast({ kind: ok ? "success" : "info", title: ok ? "Įdiegta!" : "Nepavyko įdiegti", body: ok ? "Atpažinimas vyks šiame įrenginyje." : "Bus naudojamas naršyklės internetinis atpažinimas." }); }}>Įdiegti anglų kalbą</button></>}
          <br />Žaidimas nenaudoja jokio mokamo dirbtinio intelekto: visi pokalbiai ir balsų įrašai paruošti iš anksto. Jei nenori kalbėti į mikrofoną, visada gali rašyti <InlineIcon name="keyboard" label="klaviatūra" />.
        </div>
        {import.meta.env.BASE_URL === "/zaidimas/" && <div className="set-row"><a className="btn ghost small" href="/atsisiuntimai" target="_top">Atsisiuntimai ir failų pašalinimas</a></div>}
        <div className="set-row">
          <div className="txt"><b>Pradėti iš naujo</b><span>Ištrina šios naršyklės išsaugotą progresą.</span></div>
          <button className="btn ghost small" onClick={() => { if (confirm("Tikrai ištrinti progresą?")) { useStore.getState().updateProgress((p) => { delete p.phone; delete p.photoWalk; delete p.texts; Object.assign(p, emptyProgress()); }); clearPhotos(); location.reload(); } }}>Ištrinti</button>
        </div>
      </div>
    </div>
  );
}

/** The phrasebook's last tab (kept while the game runs). */
let pbTab: "phrases" | "cards" = "phrases";

function Phrasebook({ close }: { close: () => void }) {
  const phrases = useStore((s) => s.progress.phrases);
  const lt = useStore((s) => s.settings.lt);
  const cardKeys = useCards((c) => c.keys);
  const cardCount = useCards((c) => c.cards.length);
  const dueCount = useCards((c) => dueCards(c.cards, Date.now()).length);
  const [tab, setTabState] = useState(pbTab);
  const setTab = (t: typeof pbTab) => { pbTab = t; setTabState(t); };
  const entries = Object.entries(phrases).sort((a, b) => b[1].last - a[1].last);
  const bySit = new Map<string, typeof entries>();
  for (const e of entries) { const l = bySit.get(e[1].sitId) ?? []; l.push(e); bySit.set(e[1].sitId, l); }
  const asCard = (v: (typeof entries)[number][1]): CardInput => ({ en: v.en, lt: v.lt, ipa: ipaFor(v.en), sentence: { en: v.en, lt: v.lt }, situationId: v.sitId });
  const missing = entries.filter(([, v]) => !cardKeys.has(cardKey(v.en)));
  const addAll = () => {
    const n = useCards.getState().addMany(missing.map(([, v]) => asCard(v)));
    if (n) showToast({ kind: "success", title: `Į korteles pridėta: ${n}`, body: `Kartok ${n === 1 ? "ją" : "jas"} skiltyje „Mano kortelės“.` });
  };
  return (
    <div className="sheet narrow">
      <SheetHead icon="bookOpen" title="Frazių knygelė" close={close} />
      <div className="pb-tabs" role="tablist" aria-label="Frazių knygelė">
        <button role="tab" aria-selected={tab === "phrases"} className={"pb-tab" + (tab === "phrases" ? " on" : "")} onClick={() => setTab("phrases")}>
          Frazės <span className="n">{entries.length}</span>
        </button>
        <button role="tab" aria-selected={tab === "cards"} className={"pb-tab" + (tab === "cards" ? " on" : "")} onClick={() => setTab("cards")}>
          <Glyph name="cards" size={19} /> Mano kortelės
          {dueCount > 0 ? <span className="due" title="Šiandien kartoti" aria-label={`šiandien kartoti: ${dueCount}`}>{dueCount}</span> : <span className="n">{cardCount}</span>}
        </button>
      </div>
      <div className="sheet-body">
        {tab === "cards" ? <MyCards /> : (
          <>
            {entries.length === 0 && <div className="info-box">Čia atsiras frazės, kurias sėkmingai pasakysi pokalbiuose. Stenkis kaskart pasakyti kitaip – taip surinksi daugiau žvaigždučių!</div>}
            {entries.length > 0 && (
              <div className="pb-bar">
                <p>Frazės, kurias jau pasakei pokalbiuose. Pridėk jas prie kortelių ir kartok.</p>
                {missing.length > 0
                  ? <button className="btn soft small" onClick={addAll}><Glyph name="plus" size={16} /> Visas į korteles</button>
                  : <span className="all-in"><Icon name="check" size={16} strokeWidth={2.25} /> Visos kortelėse</span>}
              </div>
            )}
            {[...bySit.entries()].map(([sid, list]) => (
              <div key={sid} className="chapter">
                <h3><SitIcon id={sid} size="1.15em" />{SITUATION_BY_ID[sid]?.title.lt ?? sid}</h3>
                {list.map(([k, v]) => {
                  const inCards = cardKeys.has(cardKey(v.en));
                  return (
                    <div key={k} className="hint-row">
                      <div className="ex"><div style={{ fontFamily: "var(--en)", fontSize: "1.25em" }}>{v.en}</div>{lt && <div className="nat">{v.lt}</div>}</div>
                      <div className="pb-acts">
                        <button className="play" onClick={() => audio.play(coachVoice(useStore.getState().progress.profile?.gender), 1, v.en)} title="Klausyti" aria-label="Klausyti"><Icon name="speaker" size={20} /></button>
                        {inCards
                          ? <span className="pb-in" role="img" title="Jau kortelėse" aria-label="Jau kortelėse"><Icon name="check" size={20} strokeWidth={2.25} /></span>
                          : <button className="play add" onClick={() => useCards.getState().add(asCard(v))} title="Į korteles" aria-label="Į korteles"><Glyph name="plus" size={20} /></button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
