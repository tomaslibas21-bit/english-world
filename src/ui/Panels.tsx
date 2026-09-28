import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useStore } from "../state/store";
import { game } from "../game/gameRef";
import { switchPlayMode } from "./playMode";
import { SITUATIONS, SITUATION_BY_ID } from "../content/situations";
import { LOCATIONS } from "../content/locations";
import { NPCS, COACH_VOICE } from "../content/npcs";
import { OUTDOOR_NPCS, WORLD, SEA_Z, AIRPORT_EXIT } from "../game/world/layout";
import { sitProgress, stars, emptyProgress } from "../state/progress";
import { audio } from "../game/audio";
import { STYLES_ENABLED } from "../game/worldStyles";
import { speechSupported, localAvailability, installLocal, refreshLocalState, type LocalAvailability } from "../convo/speech";
import { avatarColor } from "./Conversation";
import { locIcon } from "./Hud";
import { Icon, InlineIcon, Stars, type IconName } from "./icons";
import type { SituationDef } from "../content/types";
import { useCards, cardKey, dueCards, ipaFor, type CardInput } from "../state/cards";
import { MyCards, Glyph } from "./Cards";
import { showToast } from "./Toasts";

export const CHAPTERS: Record<number, string> = { 1: "Atvykimas", 2: "Pirmosios dienos mieste", 3: "Įsikūrimas", 4: "Darbas", 5: "Žmonės", 6: "Kelionės", 7: "Pagalba" };

/** The icon of a situation: the phone or camera for calls, else its place. */
function sitIcon(s: SituationDef): IconName {
  return isPhone(s) ? (s.mode === "video" ? "video" : "phoneCall") : locIcon(s.location);
}

/** The NPC shown for a situation (the date is with the partner the player chose). */
function mainNpc(s: SituationDef) {
  if (s.npc !== "sam" && s.npc !== "emma") return NPCS[s.npc];
  const p = useStore.getState().progress.profile;
  return NPCS[p?.datePartner ?? (p?.gender === "f" ? "sam" : "emma")];
}

function isPhone(s: SituationDef) { return s.mode === "phone" || s.mode === "video" || s.location === "phone"; }

export function Panels() {
  const panel = useStore((s) => s.hud.panel);
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
    </div>
  );
}

function SheetHead({ icon, title, close }: { icon: IconName; title: ReactNode; close: () => void }) {
  return (
    <div className="sheet-head">
      <span className="sheet-ico" aria-hidden><Icon name={icon} size={24} /></span>
      <h2>{title}</h2>
      <button className="close-x" onClick={close} aria-label="Uždaryti"><Icon name="close" /></button>
    </div>
  );
}

function SitActions({ s, close }: { s: SituationDef; close: () => void }) {
  const progress = useStore((st) => st.progress);
  const light = useStore((st) => st.settings.play === "light");
  const current = progress.objective === s.id;
  return (
    <div className="sit-actions">
      <button className="btn small" onClick={() => { close(); game?.startScenario(s.id); }}><Icon name="play" size={15} /> Pradėti dabar</button>
      {!current && !light && <button className="btn ghost small" onClick={() => { game?.setObjective(s.id); close(); }}><Icon name="target" size={17} /> Pasirinkti užduotimi</button>}
      {light ? null : isPhone(s) ? (
        <button className="btn warm small" onClick={() => { close(); game?.call(s.id); }}><Icon name="smartphone" size={17} /> Skambinti dabar</button>
      ) : (
        <>
          <button className="btn soft small" onClick={() => { game?.setObjective(s.id); close(); setTimeout(() => game?.autoWalkToObjective(), 50); }}><Icon name="walk" size={17} /> Nuvesk mane</button>
          <button className="btn ghost small" onClick={() => { game?.setObjective(s.id); close(); game?.teleportTo(s.location); }}><Icon name="taxi" size={17} /> Nuvykti taksi</button>
        </>
      )}
    </div>
  );
}

function SitCard({ s, onClick, open }: { s: SituationDef; onClick: () => void; open: boolean }) {
  const progress = useStore((st) => st.progress);
  const sp = sitProgress(progress, s.id);
  const loc = LOCATIONS[s.location];
  return (
    <button className={"sit-card" + (progress.objective === s.id ? " current" : "")} onClick={onClick} aria-expanded={open}>
      <span className="ico"><Icon name={locIcon(s.location)} size={24} /></span>
      <span className="txt">
        <b>{s.title.lt}</b>
        <span><i style={{ fontFamily: "var(--en)", fontSize: "1.1em" }}>{s.title.en}</i> · {loc?.lt} · daina {s.song}</span>
      </span>
      <Stars n={stars(sp)} />
    </button>
  );
}

/** Pilot: a short, varied set to start with (shown first in the picker). */
export const START_WITH = ["s72-cafe", "s66-taxi", "s68-hotel", "s75-pharmacy", "s74-clothes", "s90-running-late", "s84-date"];

function HowToPlay({ open }: { open?: boolean }) {
  return (
    <details className="howto" open={open}>
      <summary><Icon name="help" size={21} className="howto-ico" /> Kaip žaisti?<Icon name="chevronDown" size={18} className="chev" /></summary>
      <ol>
        <li>Pasirink situaciją – iškart atsidursi pokalbyje.</li>
        <li>Viršuje matysi užduočių sąrašą, o prie „<InlineIcon name="next" label="rodyklės" />“ – ką daryti dabar.</li>
        <li>Spausk <InlineIcon name="mic" label="mikrofono mygtuką" /> (arba tarpo klavišą) ir kalbėk angliškai. Galima ir rašyti <InlineIcon name="keyboard" label="klaviatūra" />.</li>
        <li>Nežinai, ką pasakyti? Po „Tavo eilė“ yra pavyzdžiai – <InlineIcon name="speaker" label="garsiakalbio mygtukas" /> juos perskaito. „Daugiau frazių“ – dar daugiau būdų tai pasakyti.</li>
        <li>Viršuje <b>LT</b> ir <b>IPA</b> įjungia pašnekovo sakinių vertimą ir tarimą, o prie „Tavo eilė“ esantys <b>Vertimas</b> ir <b>IPA</b> – tavo atsakymų pavyzdžių. <InlineIcon name="restart" label="Rodyklė ratu" /> – pradėti iš naujo, <InlineIcon name="list" label="Sąrašas" /> – kitos situacijos.</li>
        <li>Paspausk bet kurį anglišką žodį – galėsi jį išsaugoti kortelėse ir vėliau pakartoti (<InlineIcon name="bookOpen" label="Frazių knygelė" /> → „Mano kortelės“).</li>
        <li>Jei žaidimas tavęs nesupranta – spausk <b><InlineIcon name="clipboard" /> Kopijuoti</b> ir atsiųsk pokalbį mokytojui.</li>
      </ol>
    </details>
  );
}

/** The situation picker: every conversation, one tap to start (no walking needed). */
function Scenarios({ close }: { close: () => void }) {
  const progress = useStore((st) => st.progress);
  const byCh = useMemo(() => {
    const m = new Map<number, SituationDef[]>();
    for (const s of [...SITUATIONS].sort((a, b) => a.chapter - b.chapter || a.order - b.order)) {
      const l = m.get(s.chapter) ?? []; l.push(s); m.set(s.chapter, l);
    }
    return [...m.entries()];
  }, []);
  const done = SITUATIONS.filter((s) => sitProgress(progress, s.id).completions > 0).length;
  return (
    <div className="sheet scenarios">
      <SheetHead icon="clapper" title={`Pasirink situaciją · ${done}/${SITUATIONS.length}`} close={close} />
      <div className="sheet-body">
        <p className="scn-lead">Paspausk situaciją – iškart atsidursi vietoje ir kalbėsi su žmogumi. Po pokalbio galėsi pakartoti arba rinktis kitą.</p>
        <HowToPlay open={done === 0} />
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
        <div className="scn-foot">
          <button className="btn ghost" onClick={close}><Icon name="walk" size={19} /> Vaikščioti po miestą</button>
        </div>
      </div>
    </div>
  );
}

function ScenarioCard({ s, close }: { s: SituationDef; close: () => void }) {
  const progress = useStore((st) => st.progress);
  const loc = LOCATIONS[s.location];
  const n = mainNpc(s);
  const st = stars(sitProgress(progress, s.id));
  return (
    <button className={"scn-card" + (st ? " done" : "")} onClick={() => { close(); game?.startScenario(s.id); }}>
      <span className="ico"><Icon name={sitIcon(s)} size={24} /></span>
      <span className="txt">
        <b>{s.title.lt}</b>
        <i>{s.title.en}</i>
        <span>{n?.name} · {isPhone(s) ? (s.mode === "video" ? "vaizdo skambutis" : "skambutis") : loc?.lt} · daina {s.song}</span>
      </span>
      <Stars n={st} />
    </button>
  );
}

function Journal({ close }: { close: () => void }) {
  const [open, setOpen] = useState<string | null>(useStore.getState().progress.objective);
  const byCh = useMemo(() => {
    const m = new Map<number, SituationDef[]>();
    for (const s of [...SITUATIONS].sort((a, b) => a.chapter - b.chapter || a.order - b.order)) {
      const l = m.get(s.chapter) ?? []; l.push(s); m.set(s.chapter, l);
    }
    return [...m.entries()];
  }, []);
  const progress = useStore((st) => st.progress);
  const done = SITUATIONS.filter((s) => sitProgress(progress, s.id).completions > 0).length;
  const totalStars = SITUATIONS.reduce((a, s) => a + stars(sitProgress(progress, s.id)), 0);
  return (
    <div className="sheet narrow">
      <SheetHead icon="journal" title={<>Užduotys · {done}/{SITUATIONS.length} · <span className="head-stars"><Icon name="star" size="0.9em" label="Žvaigždučių:" /> {totalStars}</span></>} close={close} />
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

function locationPoint(loc: string): { x: number; z: number } | null {
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
    c.width = g.width; c.height = g.height;
    c.getContext("2d")!.drawImage(g, 0, 0);
  }, []);
  const W = WORLD.maxX - WORLD.minX, D = WORLD.maxZ - (SEA_Z - 2);
  const pct = (x: number, z: number) => ({ left: `${((x - WORLD.minX) / W) * 100}%`, top: `${((z - (SEA_Z - 2)) / D) * 100}%` });
  const locs = Object.values(LOCATIONS).filter((l) => l.kind !== "phone" && SITUATIONS.some((s) => s.location === l.id));
  const selSits = sel ? SITUATIONS.filter((s) => s.location === sel) : [];
  return (
    <div className="sheet">
      <SheetHead icon="map" title="Maple Harbor" close={close} />
      <div className="sheet-body">
        <div className="map-wrap">
          <div className="map-canvas">
            <canvas ref={ref} />
            {mm.zone === "town" && <div className="map-me" style={pct(mm.px, mm.pz)} title="Tu esi čia" />}
            {locs.map((l) => {
              const p = locationPoint(l.id);
              if (!p) return null;
              const sits = SITUATIONS.filter((s) => s.location === l.id);
              const allDone = sits.length > 0 && sits.every((s) => sitProgress(progress, s.id).completions > 0);
              return (
                <button key={l.id} className={"map-pin" + (sel === l.id ? " sel" : "") + (allDone ? " done" : "")} style={pct(p.x, p.z)} onClick={() => setSel(l.id)} title={l.name} aria-label={l.name} aria-pressed={sel === l.id}>
                  <Icon name={locIcon(l.id)} size={18} />
                  {allDone && <span className="pin-done"><Icon name="check" size={11} strokeWidth={3} label="įveikta" /></span>}
                </button>
              );
            })}
          </div>
          <div>
            {!sel && <div className="info-box">Pasirink vietą žemėlapyje. Geltonas taškas – tavo užduotis, raudonas – tu.<br /><br /><InlineIcon name="smartphone" /> Kai kurios užduotys atliekamos telefonu (P).</div>}
            {sel && (
              <div>
                <h3 className="place-title"><span className="place-ico"><Icon name={locIcon(sel)} size={22} /></span>{LOCATIONS[sel].name}</h3>
                <div style={{ color: "var(--ink-soft)", marginBottom: 10 }}>{LOCATIONS[sel].lt}</div>
                <div className="sit-list">
                  {selSits.map((s) => (
                    <div key={s.id}>
                      <SitCard s={s} open onClick={() => {}} />
                      <div style={{ padding: "6px 4px" }}><div style={{ color: "var(--ink-soft)", fontSize: "0.9em" }}>{s.goal}</div><SitActions s={s} close={close} /></div>
                    </div>
                  ))}
                  {!selSits.length && <div className="info-box">Čia kol kas nėra užduočių.</div>}
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
  return (
    <div className="phone" role="dialog" aria-label="Telefonas">
      <div className="phone-status">
        <span>9:41</span><button className="phone-close" onClick={close} aria-label="Uždaryti"><Icon name="close" size={20} /></button>
      </div>
      <h2><Icon name="smartphone" size={22} /> Skambučiai</h2>
      {calls.length === 0 && <div style={{ color: "#aab7c2", textAlign: "center" }}>Kol kas nėra kam skambinti.</div>}
      {calls.map((s) => {
        const n = NPCS[s.npc];
        const st = stars(sitProgress(progress, s.id));
        return (
          <button key={s.id} className={"contact" + (progress.objective === s.id ? " current" : "")} onClick={() => { close(); game?.call(s.id); }}>
            <span className="avatar" style={{ background: avatarColor(s.npc) }}>{s.mode === "video" ? <Icon name="video" size={20} /> : n?.name.replace(/^(Mr\.|Ms\.|Mrs\.) /, "").charAt(0)}</span>
            <span className="txt"><b>{n?.name}</b><span>{s.title.lt}{st ? <> · <Stars n={st} of={st} size={13} label={`${st} iš 3`} /></> : null}</span></span>
            <span className="call"><Icon name={s.mode === "video" ? "video" : "phoneCall"} size={21} /></span>
          </button>
        );
      })}
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
  const s = useStore((st) => st.settings);
  const set = useStore((st) => st.setSettings);
  const profile = useStore((st) => st.progress.profile);
  const [local, setLocal] = useState<LocalAvailability | "…">("…");
  useEffect(() => { localAvailability().then(setLocal); }, []);
  return (
    <div className="sheet narrow">
      <SheetHead icon="settings" title="Nustatymai" close={close} />
      <div className="sheet-body settings-grid">
        <Toggle on={s.lt} onChange={(v) => set({ lt: v })} label="Lietuviški vertimai (L)" sub="Žodis po žodžio po pašnekovo sakiniais." />
        <Toggle on={s.ltNatural} onChange={(v) => set({ ltNatural: v })} label="Visas sakinys lietuviškai" sub="Rodoma, kai įjungti vertimai." />
        <Toggle on={s.ipa} onChange={(v) => set({ ipa: v })} label="Tarimas IPA (I)" sub="Amerikietiškas tarimas po kiekvienu pašnekovo žodžiu (sugeneruota, dar netikrinta su įrašais)." />
        <Toggle on={s.sayLt} onChange={(v) => set({ sayLt: v })} label="Tavo atsakymų vertimas" sub="Po pavyzdžiais „Tavo eilė“ ir „Daugiau frazių“." />
        <Toggle on={s.sayIpa} onChange={(v) => set({ sayIpa: v })} label="Tavo atsakymų tarimas IPA" sub="Po kiekvienu pavyzdžių žodžiu." />
        <Toggle on={s.suggestions} onChange={(v) => set({ suggestions: v })} label="Pasiūlymai, ką pasakyti" sub="Lietuviški pasiūlymai tavo eilėje." />
        <Toggle on={s.hintsOpen} onChange={(v) => set({ hintsOpen: v })} label="Frazės atidarytos iš karto" sub={<>Kitaip atsidaro paspaudus <InlineIcon name="bulb" label="lemputę" /> (H).</>} />
        <Toggle on={s.autoListen} onChange={(v) => set({ autoListen: v })} label="Mikrofonas įsijungia automatiškai" sub="Kai pašnekovas baigia kalbėti." />
        <Toggle on={s.slowVoice} onChange={(v) => set({ slowVoice: v })} label="Žmonės kalba lėčiau" />
        <div className="set-row">
          <div className="txt"><b>Režimas</b><span>Lengvas – be 3D miesto, tik pokalbiai su piešiniais. Pakeitus puslapis persikrauna.</span></div>
          <div className="seg">{([["light", "Lengvas"], ["town", "3D miestas"]] as const).map(([v, n]) => <button key={v} className={s.play === v ? "on" : ""} onClick={() => { if (s.play !== v) switchPlayMode(v); }}>{n}</button>)}</div>
        </div>
        {s.play !== "light" && <Toggle on={s.cameraFollow} onChange={(v) => set({ cameraFollow: v })} label="Kamera seka personažą" />}
        <Toggle on={s.scenes} onChange={(v) => set({ scenes: v })} label="Iliustruotos scenos" sub="Pokalbio metu vietoje 3D vaizdo rodomas piešinys, kuris keičiasi pagal pokalbio etapą." />
        <div className="set-row">
          <div className="txt"><b>Teksto dydis</b></div>
          <div className="seg">{[1, 1.15, 1.3].map((z, i) => <button key={z} className={s.textSize === z ? "on" : ""} onClick={() => set({ textSize: z })}>{["A", "A+", "A++"][i]}</button>)}</div>
        </div>
        <div className="set-row">
          <div className="txt"><b>Garsumas</b></div>
          <input type="range" min={0} max={1} step={0.05} value={s.volume} onChange={(e) => { set({ volume: +e.target.value }); audio.volume = +e.target.value; }} style={{ width: 160 }} />
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
          {local === "available" && "Anglų kalbos atpažinimas įdiegtas šiame įrenginyje – garsas niekur nesiunčiamas ir veikia be interneto."}
          {(local === "downloadable" || local === "downloading") && <>Chrome gali atpažinti kalbą pačiame įrenginyje (be interneto, privačiau). <button className="btn small" onClick={async () => { const ok = await installLocal(); await refreshLocalState(); setLocal(await localAvailability()); useStore.getState().toast({ kind: ok ? "success" : "info", title: ok ? "Įdiegta!" : "Nepavyko įdiegti", body: ok ? "Atpažinimas vyks šiame įrenginyje." : "Bus naudojamas naršyklės internetinis atpažinimas." }); }}>Įdiegti anglų kalbą</button></>}
          {(local === "unavailable" || local === "unsupported") && speechSupported() && "Kalbą atpažįsta pati naršyklė, dažniausiai savo gamintojo serveriuose (Chrome – Google, Edge – Microsoft; Safari – Apple, kartais pačiame įrenginyje). Tau ir žaidimui tai nieko nekainuoja, bet reikia interneto."}
          <br />Žaidimas nenaudoja jokio mokamo dirbtinio intelekto: visi pokalbiai ir balsų įrašai paruošti iš anksto. Jei nenori kalbėti į mikrofoną, visada gali rašyti <InlineIcon name="keyboard" label="klaviatūra" />.
        </div>
        <div className="set-row">
          <div className="txt"><b>Pradėti iš naujo</b><span>Ištrina šios naršyklės išsaugotą progresą.</span></div>
          <button className="btn ghost small" onClick={() => { if (confirm("Tikrai ištrinti progresą?")) { useStore.getState().updateProgress((p) => { Object.assign(p, emptyProgress()); }); location.reload(); } }}>Ištrinti</button>
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
                <h3>{SITUATION_BY_ID[sid]?.title.lt ?? sid}</h3>
                {list.map(([k, v]) => {
                  const inCards = cardKeys.has(cardKey(v.en));
                  return (
                    <div key={k} className="hint-row">
                      <div className="ex"><div style={{ fontFamily: "var(--en)", fontSize: "1.25em" }}>{v.en}</div>{lt && <div className="nat">{v.lt}</div>}</div>
                      <div className="pb-acts">
                        <button className="play" onClick={() => audio.play(COACH_VOICE, 1, v.en)} title="Klausyti" aria-label="Klausyti"><Icon name="speaker" size={20} /></button>
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
