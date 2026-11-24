import { isTownQuest } from "../content/townQuests";
import { clearPhotos } from "../game/photowalk/photos";
import { PhotoBookContact } from "./PhotoWalk";
import { useKeyboardHints } from "./keyboardHints";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { picturesOn, useStore } from "../state/store";
import { game } from "../game/gameRef";
import { switchPlayMode } from "./playMode";
// The route is the town's tasks. Off-route conversations appear in the journal once completed.
import { SITUATION_BY_ID, SITUATIONS as CATALOG } from "../content/situations/catalog";
import { ROUTE as SITUATIONS } from "../content/route";
import { LOCATIONS, TOWN_LT, placeLt } from "../content/locations";
import { keepsakeFor } from "../content/keepsakes";
import { PHONE_CALLS } from "../content/phoneCalls";
import { TEXT_THREADS } from "../content/texts";
import { TextList, TextThread } from "./TextThread";
import { NPCS } from "../content/npcs";
import { coachVoice } from "../content/voices";
import { OUTDOOR_NPCS, AIRPORT_EXIT } from "../game/world/layout";
import { CAVE_ZONE, preferredCaveEntry } from "../game/cave/groundsPlan";
import { drawTownMap, groundBounds, mapPoint, townBounds } from "./worldMap";
import { sitProgress, stars, emptyProgress } from "../state/progress";
import { audio } from "../game/audio";
import { STYLES_ENABLED } from "../game/worldStyles";
import { speechSupported, localAvailability, installLocal, refreshLocalState, type LocalAvailability } from "../convo/speech";
import { avatarColor } from "./Conversation";
import { isPhone, locIcon, walkToSituation } from "./objective";
import { SitIcon } from "./SitIcon";
import { Icon, InlineIcon, KeepsakeIcon, Stars, type IconName } from "./icons";
import type { SituationMeta } from "../content/types";
import { useCards, cardKey, dueCards, ipaFor, type CardInput } from "../state/cards";
import { MyCards, Glyph } from "./Cards";
import { showToast } from "./Toasts";
import { HL, L, Lx, TL } from "./i18n";
import { EDITION } from "../edition";
import { chooseVariety, loadVariety } from "../state/variety";
import { courseGuideUrl, setSectionHelp, useSectionHelp } from "./sectionHelp";
import { COACH_STEPS, coach } from "../game/coach";
import { COACH_ICON, coachWords } from "./Guide";
import { useRadio } from "../radio";
import { GYM_ENTRY } from "../content/gym-entry";
import { SURF } from "../content/surf";

export const CHAPTERS: Record<number, string> = { 1: L("Atvykimas"), 2: L("Pirmosios dienos mieste"), 3: L("Įsikūrimas"), 4: L("Darbas"), 5: L("Žmonės"), 6: L("Kelionės"), 7: L("Pagalba"), 8: L("Pažengusiems"), 9: L("Gyva kalba") };

/** The NPC shown for a situation (the date is with the partner the player chose). */
function mainNpc(s: SituationMeta) {
  if (s.npc !== "sam" && s.npc !== "emma") return NPCS[s.npc];
  const p = useStore.getState().progress.profile;
  return NPCS[p?.datePartner ?? (p?.gender === "f" ? "sam" : "emma")];
}

/** The Spanish edition: Mexican Spanish (the default), neutral Latin American Spanish or Spain's Spanish
 *  (docs/es/STYLE.md). Its words are English: it is only shown in that edition. */
function VarietyToggle() {
  const [v, setV] = useState(loadVariety);
  const OPTIONS = [["default", "México"], ["neutral", "Latinoamérica"], ["spain", "España"]] as const;
  return (
    <div className="set-row">
      <div className="txt"><b>{L("Kokia ispanų kalba")}</b><span>{L("Meksikietiška (ahorita, el camión, ¿mande?), neutrali Lotynų Amerikos arba Ispanijos (vosotros, coche, vale; kavinėje ir parduotuvėse – tú). Kartu keičiasi ir balsai. Tavo atsakymai suprantami bet kuria iš jų.")}</span></div>
      <div className="seg seg-variety">{OPTIONS.map(([k, n]) => <button key={k} className={v === k ? "on" : ""} aria-pressed={v === k} onClick={() => { chooseVariety(k); setV(k); game?.refreshNameTags(); }}>{n}</button>)}</div>
    </div>
  );
}

export function Panels() {
  const panel = useStore((s) => s.hud.panel);
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); useStore.getState().setHud({ panel: null }); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);
  if (!panel) return null;
  const close = () => useStore.getState().setHud({ panel: null });
  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
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
  return <div ref={sheet} className="sheet narrow" role="dialog" aria-modal="true" aria-label={L("Kaip žaisti?")}
    onKeyDown={(e) => {
      if (e.key !== "Tab") return;
      const controls = [...e.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], summary")].filter((el) => el.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }}>
    <SheetHead icon="help" title={L("Kaip žaisti?")} close={close} />
    <div className="sheet-body">
      <p>{L("Pasirink situaciją, išklausyk pašnekovą ir atsakyk angliškai. Gali kalbėti arba rašyti. Atsakymų pavyzdžius rasi po užrašu „Tavo eilė“.")}</p>
      <details className="howto">
        <summary>{L("Žingsnis po žingsnio")} <Icon name="arrowRight" size={20} /></summary>
        <ol>
          <li>{L("Spausk „Visos situacijos“ ir pasirink pokalbį. Jei žaidi 3D mieste, gali prieiti prie pašnekovo.")}</li>
          <li>{L("Palauk, kol pašnekovas baigs kalbėti. Jei garsas sustoja, spausk „Klausyti“.")}</li>
          <li>{L("Pašnekovui baigus kalbėti, mikrofonas įsijungia automatiškai – atsakyk angliškai. Mikrofono mygtuku gali bandyti dar kartą arba baigti savo atsakymą. Jei nori rašyti, spausk klaviatūros ikonėlę. Garsiakalbio ikonėlė prie pavyzdžio leidžia išgirsti atsakymą, o „Pakartok“ – jį ištarti ir pasitikrinti.")}</li>
          <li>{L("Spausk „LT“, kad matytum vertimą, arba „IPA“, kad matytum tarimo užrašą. Vėžliuko ikonėlė sulėtina balsą, o „i“ prie paveikslėlio atveria informaciją apie pašnekovą ir vietą.")}</li>
        </ol>
      </details>
      <TownHelp open />
      {courseGuideUrl() && <a className="btn soft" href={courseGuideUrl()} target="_blank" rel="noopener noreferrer">{L("Išsamus naudojimo gidas")} <Icon name="arrowRight" size={18} /></a>}
    </div>
  </div>;
}

function SheetHead({ icon, title, close }: { icon: IconName; title: ReactNode; close: () => void }) {
  return (
    <div className="sheet-head">
      <span className="sheet-ico" aria-hidden><Icon name={icon} size={24} /></span>
      <h2>{title}</h2>
      <button className="close-x" onClick={close} aria-label={L("Uždaryti")}><Icon name="close" /></button>
    </div>
  );
}

function SitActions({ s, close }: { s: SituationMeta; close: () => void }) {
  const progress = useStore((st) => st.progress);
  const light = useStore((st) => st.settings.play === "light");
  const current = progress.objective === s.id, grotto = s.location === CAVE_ZONE, billiards = s.location === "pool-hall";
  return (
    <div className="sit-actions">
      {!grotto && <button className="btn small" onClick={() => { close(); game?.startScenario(s.id); }}><Icon name="play" size={15} /> {L("Pradėti dabar")}</button>}
      {!billiards && !current && !light && <button className="btn ghost small" onClick={() => { game?.setObjective(s.id); close(); }}><Icon name="target" size={17} /> {L("Pasirinkti užduotimi")}</button>}
      {light ? null : isPhone(s) ? (
        <button className="btn warm small" onClick={() => { close(); game?.call(s.id); }}><Icon name="smartphone" size={17} /> {L("Skambinti dabar")}</button>
      ) : (
        <>
          <button className="btn soft small" onClick={() => { if (billiards) { close(); game?.guideToPoolHall?.(); } else walkToSituation(s.id, close); }}><Icon name="walk" size={17} /> {L("Nuvesk mane")}</button>
          {!grotto && <button className="btn ghost small" onClick={() => { if (!billiards) game?.setObjective(s.id); close(); game?.teleportTo(s.location); }}><Icon name="taxi" size={17} /> {L("Nuvykti taksi")}</button>}
        </>
      )}
    </div>
  );
}

function SitCard({ s, onClick, open }: { s: SituationMeta; onClick?: () => void; open?: boolean }) {
  const progress = useStore((st) => st.progress);
  const sp = sitProgress(progress, s.id);
  const loc = LOCATIONS[s.location];
  const keepsake = keepsakeFor(s.id);
  const Row = onClick ? "button" : "div";
  return (
    <Row className={"sit-card" + (progress.objective === s.id ? " current" : "")} data-sit={s.id} onClick={onClick} aria-expanded={open}>
      <span className="ico"><SitIcon id={s.id} size={24} /></span>
      <span className="txt">
        <b>{s.title.lt}</b>
        <span><i style={{ fontFamily: "var(--en)", fontSize: "1.1em" }}>{s.title.en}</i> · {loc?.lt}{s.song !== "" && <> · {L("daina {song}", { song: s.song })}</>}</span>
      </span>
      {sp.completions > 0 && keepsake && <KeepsakeIcon kind={keepsake} named />}
      <Stars n={stars(sp)} />
    </Row>
  );
}

/** Pilot: a short, varied set to start with (shown first in the picker). */
export const START_WITH = ["s72-cafe", "s66-taxi", "s68-hotel", "s75-pharmacy", "s74-clothes", "s90-running-late", "s84-date"];

function HowToPlay({ open }: { open?: boolean }) {
  const keyboardHints = useKeyboardHints();
  const micKeys = { mic: <InlineIcon name="mic" label={L("Mikrofono mygtuku")} />, keyboard: <InlineIcon name="keyboard" label={L("klaviatūra")} /> };
  return (
    <details className="howto" open={open}>
      <summary><Icon name="help" size={21} className="howto-ico" /> {L("Kaip žaisti?")}<Icon name="chevronDown" size={18} className="chev" /></summary>
      <ol>
        <li>{L("Pasirink situaciją – iškart atsidursi pokalbyje.")}</li>
        <li>{Lx("Viršuje matysi užduočių sąrašą, o prie „{arrow}“ – ką daryti dabar.", { arrow: <InlineIcon name="next" label={L("rodyklės")} /> })}</li>
        <li>{(keyboardHints ? Lx("Pašnekovui baigus kalbėti, mikrofonas įsijungia automatiškai – kalbėk angliškai. {mic} (arba tarpo klavišu) gali bandyti dar kartą arba baigti atsakymą. Galima ir rašyti {keyboard}.", micKeys) : Lx("Pašnekovui baigus kalbėti, mikrofonas įsijungia automatiškai – kalbėk angliškai. {mic} gali bandyti dar kartą arba baigti atsakymą. Galima ir rašyti {keyboard}.", micKeys))}</li>
        <li>{Lx("Nežinai, ką pasakyti? Po „Tavo eilė“ yra pavyzdžiai – {speaker} juos perskaito. „Daugiau frazių“ – dar daugiau būdų tai pasakyti.", { speaker: <InlineIcon name="speaker" label={L("garsiakalbio mygtukas")} /> })}</li>
        <li>{Lx("Viršuje {lt} ir {ipa} įjungia pašnekovo sakinių vertimą ir tarimą, o prie „Tavo eilė“ esantys {translation} ir {ipa} – tavo atsakymų pavyzdžių. {restart} – pradėti iš naujo, {list} – kitos situacijos.", { lt: <b>{L("LT")}</b>, ipa: <b>IPA</b>, translation: <b>{L("Vertimas")}</b>, restart: <InlineIcon name="restart" label={L("Rodyklė ratu")} />, list: <InlineIcon name="list" label={L("Sąrašas")} /> })}</li>
        <li>{Lx("Paspausk bet kurį anglišką žodį – galėsi jį išsaugoti kortelėse ir vėliau pakartoti ({book} → „Mano kortelės“).", { book: <InlineIcon name="bookOpen" label={L("Frazių knygelė")} /> })}</li>
        <li>{Lx("Jei žaidimas tavęs nesupranta – spausk {copy} ir atsiųsk pokalbį mokytojui.", { copy: <b><InlineIcon name="clipboard" /> {L("Kopijuoti")}</b> })}</li>
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
      <summary><Icon name="walk" size={21} className="howto-ico" /> {L("Kaip judėti mieste?")}<Icon name="chevronDown" size={18} className="chev" /></summary>
      <ul>
        {COACH_STEPS.filter((s) => (s !== "radio" || hasRadio) && (s !== "surf" || hasSurf)).map((s) => {
          const [title, body] = coachWords(s, touch);
          return <li key={s}><Icon name={COACH_ICON[s]} size={19} strokeWidth={2} /><span><b>{title}.</b> {body}</span></li>;
        })}
        {!touch && <li><Icon name="keyboard" size={19} strokeWidth={2} /><span><b>{L("Klavišai.")}</b> {Lx("Spustelėk žemę – nueisi ten. {g} – nueiti iki užduoties, {m} – žemėlapis, {j} – užduotys, {p} – telefonas.", { g: <kbd>G</kbd>, m: <kbd>M</kbd>, j: <kbd>J</kbd>, p: <kbd>P</kbd> })}</span></li>}
        <li><Icon name="frame" size={19} strokeWidth={2} /><span><b>{L("Pokalbių vaizdas")}.</b> {L("Kalbiesi su žmogumi 3D mieste, jo lūpos juda pagal balsą. Įjungus iliustruotas scenas, pokalbio metu rodomas vietos piešinys. Per pokalbį vaizdą perjungsi mažu paveikslėliu vaizdo kampe.")}</span></li>
      </ul>
      <button className="btn ghost small" disabled={again} onClick={() => { useStore.getState().updateProgress((p) => { p.coach = { view: p.coach?.view }; }); coach.begin(); setAgain(true); }}>{again ? L("Patarimai vėl bus rodomi") : L("Rodyti patarimus iš naujo")}</button>
    </details>
  );
}

/** The situation picker: every conversation, one tap to start (no walking needed). */
function Scenarios({ close }: { close: () => void }) {
  const progress = useStore((st) => st.progress);
  const light = useStore((s) => s.settings.play === "light");
  const byCh = useMemo(() => {
    const m = new Map<number, SituationMeta[]>();
    for (const s of [...SITUATIONS].sort((a, b) => a.chapter - b.chapter || a.order - b.order)) {
      if (light && isTownQuest(s.id)) continue;
      const l = m.get(s.chapter) ?? []; l.push(s); m.set(s.chapter, l);
    }
    return [...m.entries()];
  }, [light]);
  const done = SITUATIONS.filter((s) => sitProgress(progress, s.id).completions > 0).length;
  return (
    <div className="sheet scenarios">
      <SheetHead icon="clapper" title={L("Pasirink situaciją · {done}/{total}", { done, total: SITUATIONS.length })} close={close} />
      <div className="sheet-body">
        <p className="scn-lead">{L("Paspausk situaciją – iškart atsidursi vietoje ir kalbėsi su žmogumi. Po pokalbio galėsi pakartoti arba rinktis kitą.")}</p>
        <HowToPlay />
        <TownHelp />
        <div className="chapter">
          <h3 className="start-here"><Icon name="star" size={18} /> {L("Pradėk nuo šių")}</h3>
          <div className="scn-grid">{START_WITH.map((id) => SITUATION_BY_ID[id]).filter(Boolean).map((s) => <ScenarioCard key={s.id} s={s} close={close} />)}</div>
        </div>
        {byCh.map(([ch, list]) => (
          <div className="chapter" key={ch}>
            <h3>{ch}. {CHAPTERS[ch] ?? ""}</h3>
            <div className="scn-grid">{list.map((s) => <ScenarioCard key={s.id} s={s} close={close} />)}</div>
          </div>
        ))}
        <div className="scn-foot" style={{ flexWrap: "wrap", gap: 8 }}>
          <button className="btn ghost" onClick={close}><Icon name="walk" size={19} /> {L("Vaikščioti po miestą")}</button>
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
  const n = mainNpc(s);
  const st = stars(sitProgress(progress, s.id));
  return (
    <button className={"scn-card" + (st ? " done" : "")} data-sit={s.id} onClick={() => { close(); game?.startScenario(s.id); }}>
      <span className="ico"><SitIcon id={s.id} size={24} /></span>
      <span className="txt">
        <b lang={HL}>{s.title.lt}</b>
        <i lang={TL}>{s.title.en}</i>
        <span>{n?.name} · {isPhone(s) ? (s.mode === "video" ? L("vaizdo skambutis") : L("skambutis")) : loc?.lt}{s.song !== "" && <> · {L("daina {song}", { song: s.song })}</>}</span>
      </span>
      <Stars n={st} />
    </button>
  );
}

function Journal({ close }: { close: () => void }) {
  const [open, setOpen] = useState<string | null>(useStore.getState().progress.objective);
  const byCh = useMemo(() => {
    const m = new Map<number, SituationMeta[]>();
    for (const s of [...CATALOG].sort((a, b) => a.chapter - b.chapter || a.order - b.order)) {
      const l = m.get(s.chapter) ?? []; l.push(s); m.set(s.chapter, l);
    }
    return [...m.entries()];
  }, []);
  const progress = useStore((st) => st.progress);
  const done = SITUATIONS.filter((s) => sitProgress(progress, s.id).completions > 0).length;
  const totalStars = SITUATIONS.reduce((a, s) => a + stars(sitProgress(progress, s.id)), 0);
  return (
    <div className="sheet narrow">
      <SheetHead icon="journal" title={<>{L("Užduotys")} · {done}/{SITUATIONS.length} · <span className="head-stars"><Icon name="star" size="0.9em" label={L("Žvaigždučių:")} /> {totalStars}</span></>} close={close} />
      <div className="sheet-body">
        <div className="info-box" style={{ marginBottom: 8 }}>
          {Lx("Rekomenduojama tvarka – iš viršaus į apačią, bet gali rinktis bet kurią užduotį. {one} – įveikta, {two} – pavartojai bent 6 skirtingas frazes, {three} – įveikei 3 kartus (žmonės kaskart kalba kitaip).", {
            one: <Stars n={1} of={1} size="1.05em" label={L("1 žvaigždutė")} />,
            two: <Stars n={2} of={2} size="1.05em" label={L("2 žvaigždutės")} />,
            three: <Stars n={3} of={3} size="1.05em" label={L("3 žvaigždutės")} />,
          })}
        </div>
        {byCh.map(([ch, list]) => [ch, list.filter((s) => !s.bonus || sitProgress(progress, s.id).completions > 0)] as const)
          .filter(([, list]) => list.length > 0).map(([ch, list]) => (
          <div className="chapter" key={ch}>
            <h3>{ch}. {CHAPTERS[ch] ?? ""}</h3>
            <div className="sit-list">
              {list.map((s) => (
                <div key={s.id}>
                  {s.bonus ? <SitCard s={s} /> : <SitCard s={s} open={open === s.id} onClick={() => setOpen(open === s.id ? null : s.id)} />}
                  {!s.bonus && open === s.id && (
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

function locationPoint(loc: string): { x: number; z: number } | null {
  if (loc === CAVE_ZONE) return preferredCaveEntry() ?? null;
  if (loc === "airport") return { x: AIRPORT_EXIT.x + 12, z: AIRPORT_EXIT.z };
  const d = game?.doors.find((dd) => dd.loc === loc);
  if (d) return { x: d.x, z: d.z };
  const s = SITUATIONS.find((x) => x.location === loc);
  const o = s ? OUTDOOR_NPCS.find((n) => n.npc === s.npc) : undefined;
  return o ? { x: o.x, z: o.z } : null;
}

function MapPanel({ close }: { close: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [sel, setSel] = useState<string | null>(null);
  const progress = useStore((s) => s.progress);
  const mm = useStore((s) => s.hud.minimap);
  useEffect(() => {
    const g = game?.groundCanvas, c = ref.current;
    if (!g || !c) return;
    const ppm = g.width / (groundBounds.maxX - groundBounds.minX);
    c.width = Math.round((townBounds.maxX - townBounds.minX) * ppm);
    c.height = Math.round((townBounds.maxZ - townBounds.minZ) * ppm);
    c.dataset.map = drawTownMap(c, g, townBounds) ? "cenote" : "town";
  }, []);
  const pct = (x: number, z: number) => {
    const [u, v] = mapPoint(townBounds, x, z);
    return { left: `${u * 100}%`, top: `${v * 100}%` };
  };
  const aluxSits = CATALOG.filter((s) => s.location === CAVE_ZONE && (s.npc === "alux_kin" || s.npc === "alux_nikte"));
  const mapSits = (loc: string) => loc === CAVE_ZONE ? aluxSits : (loc === "pool-hall" ? CATALOG : SITUATIONS).filter((s) => s.location === loc && !(game?.light && isTownQuest(s.id)));
  const locs = Object.values(LOCATIONS).filter((l) => l.kind !== "phone" && mapSits(l.id).length > 0);
  const selSits = sel ? mapSits(sel) : [];
  return (
    <div className="sheet">
      <SheetHead icon="map" title={EDITION.town} close={close} />
      <div className="sheet-body">
        <div className="town-lt" lang={EDITION.helper}>{TOWN_LT}</div>
        <div className="map-wrap">
          <div className="map-canvas">
            <canvas ref={ref} />
            {mm.zone === "town" && <div className="map-me" style={pct(mm.px, mm.pz)} title={L("Tu esi čia")} />}
            {locs.map((l) => {
              const p = locationPoint(l.id);
              if (!p) return null;
              const sits = mapSits(l.id);
              const allDone = sits.some((s) => !isTownQuest(s.id))
                && sits.every((s) => isTownQuest(s.id) || sitProgress(progress, s.id).completions > 0);
              return (
                <button key={l.id} className={"map-pin" + (sel === l.id ? " sel" : "") + (allDone ? " done" : "")} style={pct(p.x, p.z)} onClick={() => setSel(l.id)} title={l.name} aria-label={l.name} aria-pressed={sel === l.id}>
                  <Icon name={locIcon(l.id)} size={18} />
                  {allDone && <span className="pin-done"><Icon name="check" size={11} strokeWidth={3} label={L("įveikta")} /></span>}
                </button>
              );
            })}
          </div>
          <div>
            {!sel && <div className="info-box">{L("Pasirink vietą žemėlapyje. Geltonas taškas – tavo užduotis, raudonas – tu.")}<br /><br /><InlineIcon name="smartphone" /> {L("Kai kurios užduotys atliekamos telefonu (P).")}</div>}
            {sel && (
              <div>
                <h3 className="place-title"><span className="place-ico"><Icon name={locIcon(sel)} size={22} /></span>{LOCATIONS[sel].name}</h3>
                <div style={{ color: "var(--ink-soft)", marginBottom: 10 }}>{placeLt(sel)}</div>
                {sel === GYM_ENTRY.location && game?.light === false && <p>{GYM_ENTRY.mapLabel}</p>}
                <div className="sit-list">
                  {sel === CAVE_ZONE && !game?.light && mm.zone !== CAVE_ZONE && (
                    <button className="btn soft small" onClick={() => { close(); game?.autoWalkToObjective("cave"); }}>
                      <Icon name="walk" size={17} /> {L("Nuvesk mane")}
                    </button>
                  )}
                  {selSits.map((s) => (
                    <div key={s.id}>
                      <SitCard s={s} open onClick={() => {}} />
                      <div style={{ padding: "6px 4px" }}><div style={{ color: "var(--ink-soft)", fontSize: "0.9em" }}>{s.goal}</div><SitActions s={s} close={close} /></div>
                    </div>
                  ))}
                  {!selSits.length && <div className="info-box">{L("Čia kol kas nėra užduočių.")}</div>}
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
  const calls = SITUATIONS.filter(isPhone).sort((a, b) => a.chapter - b.chapter || a.order - b.order);
  const progress = useStore((s) => s.progress);
  const textId = useStore((s) => s.hud.textThread);
  const thread = TEXT_THREADS.find(({ id, from }) => id === textId && NPCS[from] && progress.texts?.got[id]);
  const missed = calls.filter((sit) => progress.phone?.missed[sit.id]);
  return (
    <div className={"phone" + (thread ? " thread-open" : "")} role="dialog" aria-label={L("Telefonas")}>
      <div className="phone-status">
        <span>9:41</span><button className="phone-close" onClick={close} aria-label={L("Uždaryti")}><Icon name="close" size={20} /></button>
      </div>
      {thread ? <TextThread key={thread.id} thread={thread} entry={progress.texts!.got[thread.id]} /> : <>
      <TextList got={progress.texts?.got} />
      <PhotoBookContact close={close} />
      {!!missed.length && <section className="missed-calls">
        <h2>{L("Praleisti skambučiai")}</h2>
        {missed.map((sit) => (
          <div className="contact missed-call" key={sit.id} data-call={sit.id}>
            <span className="txt"><b>{PHONE_CALLS[sit.id]?.name ?? NPCS[sit.npc]?.name}</b><span>{L("Praleistas skambutis")}</span></span>
            <button className="btn small" onClick={() => { close(); game?.call(sit.id); }}>{L("Perskambinti")}</button>
          </div>
        ))}
      </section>}
      <h2><Icon name="smartphone" size={22} /> {L("Skambučiai")}</h2>
      {calls.length === 0 && <div style={{ color: "#aab7c2", textAlign: "center" }}>{L("Kol kas nėra kam skambinti.")}</div>}
      {calls.map((s) => {
        const n = NPCS[s.npc];
        const st = stars(sitProgress(progress, s.id));
        return (
          <button key={s.id} className={"contact" + (progress.objective === s.id ? " current" : "")} data-sit={s.id} onClick={() => { close(); game?.call(s.id); }}>
            <span className="avatar" style={{ background: avatarColor(s.npc) }}>
              {s.mode === "video" ? <Icon name="video" size={20} /> : n?.name.replace(/^(Mr\.|Ms\.|Mrs\.) /, "").charAt(0)}
              <span className="contact-badge"><SitIcon id={s.id} size={13} /></span>
            </span>
            <span className="txt"><b>{n?.name}</b><span>{s.title.lt}{st ? <> · <Stars n={st} of={st} size={13} label={L("{n} iš 3", { n: st })} /></> : null}</span></span>
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
  useEffect(() => { localAvailability().then(setLocal); }, []);
  return (
    <div className="sheet narrow">
      <SheetHead icon="settings" title={L("Nustatymai")} close={close} />
      <div className="sheet-body settings-grid">
        <Toggle on={showHelp} onChange={setSectionHelp} label={L("Rodyti pagalbos klaustukus")} sub={L("Trumpa pagalba prie žaidimo ir pokalbių. Išsamų gidą gali atidaryti bet kada.")} />
        {courseGuideUrl() && <a className="btn soft" href={courseGuideUrl()} target="_blank" rel="noopener noreferrer">{L("Naudojimo gidas")} <Icon name="arrowRight" size={18} /></a>}
        <Toggle on={s.lt} onChange={(v) => set({ lt: v })} label={L("Lietuviški vertimai (L)")} sub={L("Žodis po žodžio po pašnekovo sakiniais.")} />
        <Toggle on={s.ltNatural} onChange={(v) => set({ ltNatural: v })} label={L("Visas sakinys lietuviškai (N)")} sub={L("Rodoma, kai įjungti vertimai.")} />
        <Toggle on={s.ipa} onChange={(v) => set({ ipa: v })} label={L("Tarimas IPA (I)")} sub={L("Amerikietiškas tarimas po kiekvienu pašnekovo žodžiu (sugeneruota, dar netikrinta su įrašais).")} />
        <Toggle on={s.sayLt} onChange={(v) => set({ sayLt: v })} label={L("Tavo atsakymų vertimas")} sub={L("Po pavyzdžiais „Tavo eilė“ ir „Daugiau frazių“.")} />
        <Toggle on={s.sayIpa} onChange={(v) => set({ sayIpa: v })} label={L("Tavo atsakymų tarimas IPA")} sub={L("Po kiekvienu pavyzdžių žodžiu.")} />
        <Toggle on={s.suggestions} onChange={(v) => set({ suggestions: v })} label={L("Pasiūlymai, ką pasakyti")} sub={L("Lietuviški pasiūlymai tavo eilėje.")} />
        <Toggle on={s.hintsOpen} onChange={(v) => set({ hintsOpen: v })} label={L("Frazės atidarytos iš karto")} sub={Lx("Kitaip atsidaro paspaudus {bulb} (H).", { bulb: <InlineIcon name="bulb" label={L("lemputę")} /> })} />
        <Toggle on={s.confirmSpeech} onChange={v=>set({confirmSpeech:v})} label={L("Patvirtinti atpažintą tekstą")} sub={L("Prieš išsiunčiant atsakymą parodyti, ką išgirdo. Galėsi pataisyti praleistą „ne“ ar kitą žodį.")} />
        <Toggle on={s.slowVoice} onChange={(v) => set({ slowVoice: v })} label={L("Žmonės kalba lėčiau")} />
        {EDITION.id === "es" && <VarietyToggle />}
        {(local === "available" || local === "downloadable" || local === "downloading") && (
          <Toggle on={s.onDevice} onChange={(v) => { set({ onDevice: v }); refreshLocalState(); }} label={L("Atpažinti kalbą šiame įrenginyje")} sub={L("Privačiau ir veikia be interneto, bet akcentą supranta prasčiau. Įprastai geriau palikti išjungtą.")} />
        )}
        <div className="set-row">
          <div className="txt"><b>{L("Režimas")}</b><span>{L("Lengvas – be 3D miesto, tik pokalbiai su piešiniais. Pakeitus puslapis persikrauna.")}</span></div>
          <div className="seg">{([["light", L("Lengvas")], ["town", L("3D miestas")]] as const).map(([v, n]) => <button key={v} className={s.play === v ? "on" : ""} onClick={() => { if (s.play !== v) switchPlayMode(v); }}>{n}</button>)}</div>
        </div>
        {s.play !== "light" && <Toggle on={s.phoneCalls} onChange={(v) => set({ phoneCalls: v })} label={L("Skambučiai einant po miestą")} sub={L("Telefonas kartais suskamba, kai vaikštai.")} />}
        {s.play !== "light" && <Toggle on={s.textMessages} onChange={(v) => set({ textMessages: v })} label={L("Žinutės einant po miestą")} sub={L("Draugai kartais parašo trumpą žinutę.")} />}
        {s.play !== "light" && <Toggle on={s.cameraFollow} onChange={(v) => set({ cameraFollow: v })} label={L("Kamera seka personažą")} />}
        <Toggle on={picturesOn(s)} onChange={(v) => set({ scenes: v })} label={L("Iliustruotos scenos")} sub={s.play === "light" ? L("Pokalbio metu vietoje 3D vaizdo rodomas piešinys, kuris keičiasi pagal pokalbio etapą.") : L("Pokalbio metu vietoje 3D vaizdo rodomas piešinys, kuris keičiasi pagal pokalbio etapą. Per pokalbį perjungsi mažu paveikslėliu vaizdo kampe arba klavišu P.")} />
        <div className="set-row">
          <div className="txt"><b>{L("Teksto dydis")}</b></div>
          <div className="seg">{[1, 1.15, 1.3].map((z, i) => <button key={z} className={s.textSize === z ? "on" : ""} onClick={() => set({ textSize: z })}>{["A", "A+", "A++"][i]}</button>)}</div>
        </div>
        <div className="set-row">
          <div className="txt"><b>{L("Garsumas")}</b></div>
          <input type="range" min={0} max={1} step={0.05} value={s.volume} onChange={(e) => { set({ volume: +e.target.value }); audio.volume = +e.target.value; }} style={{ width: 160 }} />
        </div>
        <div className="set-row">
          <div className="txt"><b>{L("Garsai")}</b><span>{L("Žingsniai, jūra, miestelio garsai – tyliau už balsus.")}</span></div>
          <input type="range" min={0} max={1} step={0.05} value={s.sounds} aria-label={L("Garsai")} onChange={(e) => { set({ sounds: +e.target.value }); audio.sounds = +e.target.value; if (+e.target.value > 0) audio.sfx("pop"); }} style={{ width: 160 }} />
        </div>
        {s.play !== "light" && STYLES_ENABLED && <div className="set-row">
          <div className="txt"><b>{L("Pasaulio stilius")}</b><span>{L("Bandomieji 3D miesto stiliai. Pakeitus puslapis persikrauna.")}</span></div>
          <div className="seg">{([["blocks", L("Kaladėlės")], ["toon", L("Animacija")], ["storybook", L("Iliustracija")], ["realistic", L("Tikroviškas")]] as const).map(([v, n]) => (
            <button key={v} className={s.worldStyle === v ? "on" : ""} onClick={() => { const u = new URL(location.href), forced = u.searchParams.has("style"); if (s.worldStyle === v && !forced) return; set({ worldStyle: v }); u.searchParams.delete("style"); setTimeout(() => forced ? location.replace(u.href) : location.reload(), 200); }}>{n}</button>
          ))}</div>
        </div>}
        {s.play !== "light" && <div className="set-row">
          <div className="txt"><b>{L("Grafika")}</b><span>{L("„Paprasta“ – jei kompiuteris lėtas.")}</span></div>
          <div className="seg">{(["high", "low"] as const).map((q) => <button key={q} className={s.quality === q ? "on" : ""} onClick={() => { set({ quality: q }); game?.setQuality(q); }}>{q === "high" ? L("Graži") : L("Paprasta")}</button>)}</div>
        </div>}
        {profile && (
          <div className="set-row">
            <div className="txt"><b>{L("Pasimatymas (daina 84)")}</b><span>{L("Su kuo eini į pasimatymą.")}</span></div>
            <div className="seg">{[["emma", NPCS.emma?.name ?? "Emma"], ["sam", NPCS.sam?.name ?? "Sam"]].map(([id, n]) => <button key={id} className={(profile.datePartner ?? (profile.gender === "f" ? "sam" : "emma")) === id ? "on" : ""} onClick={() => useStore.getState().updateProgress((p) => { if (p.profile) p.profile.datePartner = id; })}>{n}</button>)}</div>
          </div>
        )}
        <div className="info-box">
          <b><InlineIcon name="mic" /> {L("Kalbėjimas.")}</b> {speechSupported() ? L("Tavo naršyklė moka atpažinti kalbą.") : L("Ši naršyklė neturi balso atpažinimo (pvz., Firefox) – atsakymus gali rašyti. Balsui naudok Chrome, Edge arba Safari.")}{" "}
          {speechSupported() && (s.onDevice && local === "available"
            ? L("Anglų kalba atpažįstama šiame įrenginyje – garsas niekur nesiunčiamas ir veikia be interneto.")
            : L("Kalbą atpažįsta pati naršyklė, dažniausiai savo gamintojo serveriuose (Chrome – Google, Edge – Microsoft, Safari – Apple): taip geriausiai suprantamas akcentas. Tau ir žaidimui tai nieko nekainuoja, bet reikia interneto."))}
          {s.onDevice && (local === "downloadable" || local === "downloading") && <> {L("Kad atpažinimas vyktų šiame įrenginyje, Chrome turi atsisiųsti anglų kalbą.")} <button className="btn small" onClick={async () => { const ok = await installLocal(); await refreshLocalState(); setLocal(await localAvailability()); useStore.getState().toast({ kind: ok ? "success" : "info", title: ok ? L("Įdiegta!") : L("Nepavyko įdiegti"), body: ok ? L("Atpažinimas vyks šiame įrenginyje.") : L("Bus naudojamas naršyklės internetinis atpažinimas.") }); }}>{L("Įdiegti anglų kalbą")}</button></>}
          <br />{Lx("Žaidimas nenaudoja jokio mokamo dirbtinio intelekto: visi pokalbiai ir balsų įrašai paruošti iš anksto. Jei nenori kalbėti į mikrofoną, visada gali rašyti {keyboard}.", { keyboard: <InlineIcon name="keyboard" label={L("klaviatūra")} /> })}
        </div>
        {import.meta.env.BASE_URL === "/zaidimas/" && <div className="set-row"><a className="btn ghost small" href="/atsisiuntimai" target="_top">{L("Atsisiuntimai ir failų pašalinimas")}</a></div>}
        <div className="set-row">
          <div className="txt"><b>{L("Pradėti iš naujo")}</b><span>{L("Ištrina šios naršyklės išsaugotą progresą.")}</span></div>
          <button className="btn ghost small" onClick={() => {
            if (!confirm(L("Tikrai ištrinti progresą?"))) return;
            useStore.getState().updateProgress((p) => {
              delete p.phone;
              delete p.texts;
              delete p.photoWalk;
              Object.assign(p, emptyProgress());
            });
            clearPhotos();
            location.reload();
          }}>{L("Ištrinti")}</button>
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
    if (n) showToast({ kind: "success", title: L("Į korteles pridėta: {n}", { n }), body: L("Kartok {it} skiltyje „Mano kortelės“.", { it: n === 1 ? L("ją") : L("jas") }) });
  };
  return (
    <div className="sheet narrow">
      <SheetHead icon="bookOpen" title={L("Frazių knygelė")} close={close} />
      <div className="pb-tabs" role="tablist" aria-label={L("Frazių knygelė")}>
        <button role="tab" aria-selected={tab === "phrases"} className={"pb-tab" + (tab === "phrases" ? " on" : "")} onClick={() => setTab("phrases")}>
          {L("Frazės")} <span className="n">{entries.length}</span>
        </button>
        <button role="tab" aria-selected={tab === "cards"} className={"pb-tab" + (tab === "cards" ? " on" : "")} onClick={() => setTab("cards")}>
          <Glyph name="cards" size={19} /> {L("Mano kortelės")}
          {dueCount > 0 ? <span className="due" title={L("Šiandien kartoti")} aria-label={L("šiandien kartoti: {n}", { n: dueCount })}>{dueCount}</span> : <span className="n">{cardCount}</span>}
        </button>
      </div>
      <div className="sheet-body">
        {tab === "cards" ? <MyCards /> : (
          <>
            {entries.length === 0 && <div className="info-box">{L("Čia atsiras frazės, kurias sėkmingai pasakysi pokalbiuose. Stenkis kaskart pasakyti kitaip – taip surinksi daugiau žvaigždučių!")}</div>}
            {entries.length > 0 && (
              <div className="pb-bar">
                <p>{L("Frazės, kurias jau pasakei pokalbiuose. Pridėk jas prie kortelių ir kartok.")}</p>
                {missing.length > 0
                  ? <button className="btn soft small" onClick={addAll}><Glyph name="plus" size={16} /> {L("Visas į korteles")}</button>
                  : <span className="all-in"><Icon name="check" size={16} strokeWidth={2.25} /> {L("Visos kortelėse")}</span>}
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
                        <button className="play" onClick={() => audio.play(coachVoice(useStore.getState().progress.profile?.gender), 1, v.en)} title={L("Klausyti")} aria-label={L("Klausyti")}><Icon name="speaker" size={20} /></button>
                        {inCards
                          ? <span className="pb-in" role="img" title={L("Jau kortelėse")} aria-label={L("Jau kortelėse")}><Icon name="check" size={20} strokeWidth={2.25} /></span>
                          : <button className="play add" onClick={() => useCards.getState().add(asCard(v))} title={L("Į korteles")} aria-label={L("Į korteles")}><Glyph name="plus" size={20} /></button>}
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
