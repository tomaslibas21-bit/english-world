// The light mode (no 3D town): the situation list is the home screen, and a tap starts the conversation
// at once. Face-to-face conversations show their illustrated pictures (SceneBackdrop); calls, and
// conversations without a picture, a calm call screen (CallBackdrop).
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../state/store";
import { setGame, game } from "../game/gameRef";
import { LightGame } from "../game/LightGame";
import { SITUATIONS, SITUATION_BY_ID } from "../content/situations";
import { LOCATIONS } from "../content/locations";
import { NPCS } from "../content/npcs";
import type { SituationDef } from "../content/types";
import { sitProgress, stars } from "../state/progress";
import { Conversation, avatarColor } from "./Conversation";
import { SceneBackdrop } from "./SceneBackdrop";
import { Panels, CHAPTERS, START_WITH } from "./Panels";
import { useDueCards, COURSE_URL } from "./Hud";
import { Toasts } from "./Toasts";
import { sceneFor } from "./scenes";
import { switchPlayMode, takeLinkedSituation } from "./playMode";
import { Icon, InlineIcon, Stars, iconForEmoji, type IconName } from "./icons";
import "./light.css";

/** The same short, varied set to start with as in the situation picker (Panels). */

const isCall = (s: SituationDef) => s.mode === "phone" || s.mode === "video" || s.location === "phone";
const sitIcon = (s: SituationDef): IconName => isCall(s) ? (s.mode === "video" ? "video" : "phoneCall") : iconForEmoji(LOCATIONS[s.location]?.icon) ?? "pin";
/** Who the situation is with (the date is with the partner the learner chose). */
function mainNpc(s: SituationDef) {
  if (s.npc !== "sam" && s.npc !== "emma") return NPCS[s.npc];
  const p = useStore.getState().progress.profile;
  return NPCS[p?.datePartner ?? (p?.gender === "f" ? "sam" : "emma")];
}

/** The light mode: no Three.js, no WebGL canvas. */
export function LightPlay() {
  const [ready, setReady] = useState(false);
  const panel = useStore((s) => s.hud.panel);
  const ignorePop = useRef(false);
  useEffect(() => {
    const g = new LightGame();
    setGame(g);
    g.onReady = () => {
      setReady(true); useStore.getState().setScreen("play");
      const sit = takeLinkedSituation();
      if (sit) g.startScenario(sit);
    };
    g.init();
    (window as any).__ew = { game: g, store: useStore };
    document.body.classList.add("light-mode");
    return () => { g.dispose(); setGame(null); document.body.classList.remove("light-mode"); };
  }, []);
  // the phone's back button closes the conversation or panel on top instead of leaving the game
  const overlay = useStore((s) => s.conv.active || (!!s.hud.panel && s.hud.panel !== "scenarios" && s.hud.panel !== "map"));
  useEffect(() => {
    if (!overlay) {
      // closed by a button: drop the history entry we added (its popstate is ignored below)
      if (history.state?.ewOverlay) { ignorePop.current = true; history.back(); }
      return;
    }
    if (!history.state?.ewOverlay) history.pushState({ ewOverlay: true }, "");
  }, [overlay]);
  useEffect(() => {
    const onPop = () => {
      if (ignorePop.current) { ignorePop.current = false; return; }
      const st = useStore.getState();
      if (st.conv.active) game?.closeConversation();
      else if (st.hud.panel) st.setHud({ panel: null });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  // the home screen is the situation list: "Visos situacijos" (and the town's map) just show it
  const homePanel = panel === "scenarios" || panel === "map";
  useEffect(() => { if (homePanel) useStore.getState().setHud({ panel: null }); }, [homePanel]);
  return (
    <>
      {ready && <><LightHome /><CallBackdrop /><SceneBackdrop /><Conversation />{!homePanel && <Panels />}</>}
      <Toasts />
    </>
  );
}

function LightHome() {
  const progress = useStore((s) => s.progress);
  const covered = useStore((s) => s.conv.active || !!s.hud.panel);
  const byCh = useMemo(() => {
    const m = new Map<number, SituationDef[]>();
    for (const s of [...SITUATIONS].sort((a, b) => a.chapter - b.chapter || a.order - b.order)) {
      const l = m.get(s.chapter) ?? []; l.push(s); m.set(s.chapter, l);
    }
    return [...m.entries()];
  }, []);
  const isDone = (s: SituationDef) => sitProgress(progress, s.id).completions > 0;
  const done = SITUATIONS.filter(isDone).length;
  const totalStars = SITUATIONS.reduce((a, s) => a + stars(sitProgress(progress, s.id)), 0);
  const open = (panel: "phrasebook" | "journal" | "settings") => useStore.getState().setHud({ panel });
  const due = useDueCards();
  return (
    <div className="lh" inert={covered} aria-hidden={covered || undefined}>
      <div className="lh-in">
        <header className="lh-top">
          <div className="lh-brand"><span className="lh-logo">English World</span><span className="lh-town">Maple Harbor</span></div>
          <button className="lh-tool lh-3d" onClick={() => switchPlayMode("town")} title="Vaikščiok po 3D miestą ir kalbėkis su jo žmonėmis"><Icon name="map" size={22} /><span>Atidaryti 3D miestą</span></button>
          <nav className="lh-tools" aria-label="Įrankiai">
            {COURSE_URL && <a className="lh-tool" href={COURSE_URL} title="Grįžti į kursą"><Icon name="home" size={24} /><span>Kursas</span></a>}
            <button className="lh-tool" onClick={() => open("phrasebook")} title="Frazių knygelė" aria-label={due ? `Frazių knygelė (${due})` : "Frazių knygelė"}><Icon name="bookOpen" size={24} /><span>Frazės</span>{!!due && <span className="due-badge" aria-hidden>{due}</span>}</button>
            <button className="lh-tool" onClick={() => open("journal")} title="Užduotys" aria-label="Užduotys"><Icon name="journal" size={24} /><span>Užduotys</span></button>
            <button className="lh-tool" onClick={() => open("settings")} title="Nustatymai" aria-label="Nustatymai"><Icon name="settings" size={24} /><span>Nustatymai</span></button>
          </nav>
        </header>

        <section className="lh-hello">
          <Skyline className="lh-hello-sky" />
          <h1>Labas{progress.profile?.name ? `, ${progress.profile.name}` : ""}!</h1>
          <p>Pasirink situaciją – pokalbis prasidės iš karto.</p>
          <div className="lh-progress">
            <div className="lh-bar" role="progressbar" aria-valuemin={0} aria-valuemax={SITUATIONS.length} aria-valuenow={done} aria-label="Įveiktos situacijos"><i style={{ width: `${(done / SITUATIONS.length) * 100}%` }} /></div>
            <span>Įveikta <b>{done}</b> iš {SITUATIONS.length}</span>
            <span className="lh-stars"><Icon name="star" size={17} label="Žvaigždučių:" /> {totalStars}</span>
          </div>
        </section>

        <details className="howto lh-howto" open={done === 0}>
          <summary><Icon name="help" size={21} className="howto-ico" /> Kaip žaisti?<Icon name="chevronDown" size={18} className="chev" /></summary>
          <ol>
            <li>Paspausk situaciją – iškart prasidės pokalbis.</li>
            <li>Spausk <InlineIcon name="mic" label="mikrofono mygtuką" /> ir kalbėk angliškai. Galima ir rašyti <InlineIcon name="keyboard" label="klaviatūra" />.</li>
            <li>Nežinai, ką pasakyti? Po „Tavo eilė“ yra pavyzdžių – <InlineIcon name="speaker" label="garsiakalbio mygtukas" /> juos perskaito.</li>
            <li>Po pokalbio rinkis kitą situaciją arba pabandyk dar kartą – žmonės kaskart kalba šiek tiek kitaip.</li>
          </ol>
        </details>

        <section className="lh-sec">
          <h2 className="start-here"><Icon name="star" size={18} /> Pradėk nuo šių</h2>
          <div className="lh-grid">{START_WITH.map((id) => SITUATION_BY_ID[id]).filter(Boolean).map((s) => <SitCard key={s.id} s={s} />)}</div>
        </section>
        {byCh.map(([ch, list]) => (
          <section className="lh-sec" key={ch}>
            <h2>{ch}. {CHAPTERS[ch] ?? ""}<span className="n">{list.filter(isDone).length}/{list.length}</span></h2>
            <div className="lh-grid">{list.map((s) => <SitCard key={s.id} s={s} />)}</div>
          </section>
        ))}

        <footer className="lh-foot">
          <button className="btn ghost" onClick={() => switchPlayMode("town")}><Icon name="map" size={19} /> Atidaryti 3D miestą</button>
          <span>Vaikščiok po Maple Harbor ir kalbėkis su sutiktais žmonėmis. Geriausia – kompiuteryje.</span>
        </footer>
      </div>
    </div>
  );
}

function SitCard({ s }: { s: SituationDef }) {
  const progress = useStore((st) => st.progress);
  const st = stars(sitProgress(progress, s.id));
  const n = mainNpc(s);
  const current = progress.objective === s.id;
  return (
    <button className={"lh-card" + (st ? " done" : "") + (current ? " current" : "")} data-sit={s.id} onClick={() => game?.startScenario(s.id)}>
      <span className="lh-ico"><Icon name={sitIcon(s)} size={25} /></span>
      <span className="lh-txt">
        <b>{s.title.lt}</b>
        <i lang="en">{s.title.en}</i>
        <span>{n?.name} · {isCall(s) ? (s.mode === "video" ? "vaizdo skambutis" : "skambutis") : LOCATIONS[s.location]?.lt} · daina {s.song}{current && <em className="lh-tag">Tavo užduotis</em>}</span>
      </span>
      <Stars n={st} />
    </button>
  );
}

/** Behind phone and video calls (and conversations without a picture): a calm call screen. */
function CallBackdrop() {
  const conv = useStore((s) => s.conv);
  const scenes = useStore((s) => s.settings.scenes !== false);
  if (!conv.active || (scenes && sceneFor(conv.sitId, conv.hostId))) return null;
  const npc = NPCS[conv.hostId];
  const sit = SITUATION_BY_ID[conv.sitId];
  const call = conv.mode !== "talk";
  const talking = conv.speaking !== null && conv.transcript.find((l) => l.id === conv.speaking)?.npc === conv.hostId;
  return (
    <div className="lc" aria-hidden="true">
      <Skyline className="lc-sky" />
      <div className="lc-center">
        <div className={"lc-avatar" + (talking ? " talking" : "")} style={{ background: avatarColor(conv.hostId) }}>
          {(npc?.name ?? "?").replace(/^(Mr\.|Ms\.|Mrs\.|Officer) /, "").charAt(0)}
        </div>
        <div className="lc-name">{npc?.name}</div>
        <div className="lc-sub">
          {call ? <><Icon name={conv.mode === "video" ? "video" : "phoneCall"} size={20} /> {conv.mode === "video" ? "Vaizdo skambutis" : "Skambutis"}</> : <>{npc?.role.lt ?? ""}{sit && LOCATIONS[sit.location] ? ` · ${LOCATIONS[sit.location].lt}` : ""}</>}
        </div>
      </div>
    </div>
  );
}

/** A soft drawing of the harbour town: hills, houses, the lighthouse and the sea (which run on to the
 *  right past the picture, under the conversation panel). */
function Skyline({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 600 160" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">
      <path d="M0 118 C80 92 150 96 230 110 S380 132 450 104 S560 86 600 98 C700 112 800 108 900 100 S1100 94 1400 104 V160 H0Z" fill="#dcebe3" />
      <g fill="#cfe3e0">
        <path d="M250 112 v-22 l16 -14 16 14 v24z" /><path d="M288 116 v-30 l20 -18 20 18 v30z" />
        <path d="M334 118 v-18 l13 -11 13 11 v18z" /><path d="M188 106 v-18 l14 -12 14 12 v17z" />
        <path d="M506 96 l6 -58 h10 l6 58z" /><path d="M503 38 h28 l-4 -9 h-20z" />
      </g>
      <path d="M509 70 h16 l1 9 h-18z M511 52 h12 l1 8 h-14z" fill="#f2d6bb" />
      <path d="M0 136 C60 128 120 144 180 136 S300 128 360 136 S480 146 540 136 S590 130 600 132 C700 140 800 128 900 136 S1100 140 1400 134 V160 H0Z" fill="#d3e8ef" />
      <path d="M40 146 q12 -6 24 0 M140 150 q12 -6 24 0 M300 148 q12 -6 24 0 M450 151 q12 -6 24 0" stroke="#bcd9e3" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
