import { useEffect, useState } from "react";
import { useStore, type PlayMode } from "../state/store";
import type { Look } from "../content/npcs";
import { NPCS } from "../content/npcs";
import { LOCATIONS, TOWN_LT } from "../content/locations";
import { SITUATIONS, SITUATION_BY_ID } from "../content/situations";
import { sitProgress, stars } from "../state/progress";
import { ltCount } from "./lt";
import { Icon } from "./icons";
import { L, Lx, TL } from "./i18n";
import { EDITION } from "../edition";
import "./light.css";
import "./title.css";

// The start screen: a welcome with the form (or "Continue") on one side, and on the other the people of
// Maple Harbor, a small deck of scene pictures that turns every few seconds, each with the real first
// line of its conversation and an answer from the guide (the party's answer uses the learner's name).

type Pair = [en: string, lt: string];
interface Slide { img: string; sit: string; focus: string; npc: Pair; you: Pair | ((name: string) => Pair) }
const SLIDES: Slide[] = [
  { img: "cafe", sit: "s72-cafe", focus: "36% 28%", npc: ["Hi! What can I get you?", L("Sveiki! Ką jums paduoti?")], you: ["I'll have a latte.", L("Imsiu latę.")] },
  { img: "market", sit: "s69-local", focus: "33% 35%", npc: ["Hello there! Can I help you with something?", L("Sveiki! Ar galiu kuo nors padėti?")], you: ["What would you recommend?", L("Ką rekomenduotumėte?")] },
  { img: "taxi", sit: "s66-taxi", focus: "38% 30%", npc: ["Hi there! Hop in! Where to?", L("Sveiki! Lipkite! Kur važiuojame?")], you: ["To the Harborview Hotel, please.", L("Į „Harborview“ viešbutį, prašau.")] },
  { img: "passport", sit: "s65a-passport", focus: "32% 36%", npc: ["Next! Hi there. Passport, please.", L("Kitas! Sveiki. Pasą, prašau.")], you: ["Here you go.", L("Prašom.")] },
  { img: "party", sit: "s63-party", focus: "33% 32%", npc: ["Hi! So glad you came!", L("Labas! Kaip gerai, kad atėjai!")],
    you: (name) => (name ? [`Hi, I'm ${name}. Nice to meet you!`, L("Labas, aš {name}. Malonu susipažinti!", { name })] : ["Hi! Nice to meet you!", L("Labas! Malonu susipažinti!")]) },
  { img: "hotel", sit: "s68-hotel", focus: "28% 30%", npc: ["Good evening! Checking in?", L("Labas vakaras! Registruojatės?")], you: ["I have a reservation.", L("Turiu rezervaciją.")] },
];
const ART = (img: string) => `${import.meta.env.BASE_URL}title/${img}.webp`;
const TURN_MS = 6500;

function useReducedMotion() {
  const [r, setR] = useState(() => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    if (typeof matchMedia === "undefined") return;
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    const f = () => setR(m.matches);
    m.addEventListener?.("change", f);
    return () => m.removeEventListener?.("change", f);
  }, []);
  return r;
}

/** The deck of scene pictures with the conversation on the front one (decorative: the words are examples). */
function Showcase({ name }: { name: string }) {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  const [talk, setTalk] = useState(0); // 0: nothing yet, 1: the person spoke, 2: and you answered
  useEffect(() => {
    if (reduced) { setTalk(2); return; }
    setTalk(0);
    // the person speaks once the last picture has flown off, and the answer comes a moment later
    const a = setTimeout(() => setTalk(1), 1150);
    const b = setTimeout(() => setTalk(2), 2550);
    const c = setTimeout(() => setI((x) => (x + 1) % SLIDES.length), TURN_MS);
    return () => { clearTimeout(a); clearTimeout(b); clearTimeout(c); };
  }, [i, reduced]);
  const n = SLIDES.length;
  const s = SLIDES[i];
  const sit = SITUATION_BY_ID[s.sit];
  const who = NPCS[sit?.npc ?? ""]?.name;
  const where = sit ? LOCATIONS[sit.location]?.lt : undefined;
  const you = typeof s.you === "function" ? s.you(name.trim()) : s.you;
  return (
    <div className="ts-deck" aria-hidden="true">
      {SLIDES.map((sl, k) => {
        const rel = (k - i + n) % n;
        const pos = rel <= 2 ? String(rel) : rel === n - 1 ? "out" : "hidden";
        return (
          <div className="ts-slide" data-rel={pos} key={sl.img}>
            <img src={ART(sl.img)} alt="" decoding="async" style={{ objectPosition: sl.focus }} />
          </div>
        );
      })}
      <div className="ts-chat" key={i}>
        <div className={"ts-bubble ts-npc" + (talk >= 1 ? " in" : "")}>
          <span className="who">{who}{where ? ` · ${where}` : ""}</span>
          <span className="en" lang={TL}>{s.npc[0]}</span>
          <span className="lt">{s.npc[1]}</span>
        </div>
        <div className={"ts-bubble ts-you" + (talk >= 2 ? " in" : "")}>
          <span className="mic"><Icon name="mic" size={16} strokeWidth={2} /></span>
          <span className="txt">
            <span className="en" lang={TL}>{you[0]}</span>
            <span className="lt">{you[1]}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/** The 3D town or the light mode (no 3D: the situation list and the conversations with their pictures). */
function ModeChoice() {
  const play = useStore((s) => s.settings.play);
  const set = (p: PlayMode) => useStore.getState().setSettings({ play: p });
  const modes: { id: PlayMode; icon: "frame" | "walk"; name: string; sub: string }[] = [
    { id: "light", icon: "frame", name: L("Lengvas režimas"), sub: L("Pokalbiai su piešiniais. Greitai atsidaro, taupo bateriją.") },
    { id: "town", icon: "walk", name: L("3D miestas"), sub: L("Vaikščiok po miestą ir kalbink žmones. Geriausia – kompiuteryje.") },
  ];
  return (
    <div className="ts-field">
      <span className="ts-label" id="ts-mode">{L("Kaip nori žaisti?")}</span>
      <div className="ts-modes" role="radiogroup" aria-labelledby="ts-mode">
        {modes.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={play === m.id} aria-label={m.name} aria-describedby={`ts-mode-${m.id}`}
            className={"ts-mode" + (play === m.id ? " on" : "")} onClick={() => set(m.id)}>
            <b><Icon name={m.icon} size={22} />{m.name}</b>
            <span id={`ts-mode-${m.id}`}>{m.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Perks() {
  const n = SITUATIONS.length;
  return (
    <ul className="ts-perks">
      <li><Icon name="mic" size={18} /> {L("Kalbėk balsu arba rašyk")}</li>
      <li><Icon name="bulb" size={18} /> {L("Patarimai lietuviškai")}</li>
      <li><Icon name="star" size={18} /> {L("{n} {conversations} pagal dainas", { n, conversations: ltCount(n, "pokalbis", "pokalbiai", "pokalbių") })}</li>
    </ul>
  );
}

function Frame({ head, body, name }: { head: React.ReactNode; body: React.ReactNode; name: string }) {
  return (
    <div className="ts">
      <div className="ts-in">
        <header className="ts-head">
          <span className="ts-placewrap">
            <span className="ts-place"><Icon name="pin" size={15} strokeWidth={2} /> {L("Maple Harbor · JAV")}</span>
            <span className="ts-place-lt" lang={EDITION.helper}>{TOWN_LT}</span>
          </span>
          <h1 className="ts-title">{EDITION.brand.split(" ")[0]} <em>{EDITION.brand.split(" ").slice(1).join(" ")}</em> <small className="beta-badge">Beta</small></h1>
          {head}
        </header>
        <div className="ts-show">
          {EDITION.id === "en" && <Showcase name={name} />}
          <Perks />
        </div>
        <div className="ts-body">{body}</div>
      </div>
    </div>
  );
}

export const LOOKS: { id: string; gender: "m" | "f"; look: Look }[] = [
  { id: "f1", gender: "f", look: { skin: "#f2d3bd", hair: { style: "long", color: "#7b4a2a" }, top: "#3b8ea5", bottom: "#2d3142" } },
  { id: "f2", gender: "f", look: { skin: "#d9a47e", hair: { style: "bun", color: "#1f1a17" }, top: "#e76f51", bottom: "#264653" } },
  { id: "f3", gender: "f", look: { skin: "#f6dcc8", hair: { style: "bob", color: "#d9b36a" }, top: "#8e6bb0", bottom: "#3d405b", acc: ["earrings"] } },
  { id: "m1", gender: "m", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  { id: "m2", gender: "m", look: { skin: "#c68e63", hair: { style: "side", color: "#1f1a17" }, top: "#f4a261", bottom: "#3d405b", acc: ["beard"] } },
  { id: "m3", gender: "m", look: { skin: "#f6dcc8", hair: { style: "buzz", color: "#d9b36a" }, top: "#457b9d", bottom: "#2b2d42", acc: ["glasses"] } },
];

export function Title({ onPlay }: { onPlay: () => void }) {
  const profile = useStore((s) => s.progress.profile);
  const progress = useStore((s) => s.progress);
  const [creating, setCreating] = useState(false);
  if (creating || !profile) return <Create onDone={onPlay} canCancel={!!profile} onCancel={() => setCreating(false)} />;
  const done = SITUATIONS.filter((s) => sitProgress(progress, s.id).completions > 0).length;
  const totalStars = SITUATIONS.reduce((a, s) => a + stars(sitProgress(progress, s.id)), 0);
  return (
    <Frame name={profile.name}
      head={<p className="ts-lead">{L("Tavo miestelis laukia – kavinė, stotis, parduotuvės ir {n} {conversations} su jo žmonėmis.", { n: SITUATIONS.length, conversations: ltCount(SITUATIONS.length, "pokalbis", "pokalbiai", "pokalbių") })}</p>}
      body={
        <div className="ts-card">
          <p className="ts-hello">{profile.gender === "f" ? L("Sveika sugrįžusi") : L("Sveikas sugrįžęs")}, <b>{profile.name}</b>!</p>
          <div className="ts-progress">
            <div className="ts-bar" role="progressbar" aria-valuemin={0} aria-valuemax={SITUATIONS.length} aria-valuenow={done} aria-label={L("Įveiktos situacijos")}><i style={{ width: `${Math.max(3, (done / SITUATIONS.length) * 100)}%` }} /></div>
            <span>{Lx("Įveikta {done} iš {total}", { done: <b>{done}</b>, total: SITUATIONS.length })}</span>
            {totalStars > 0 && <span className="ts-stars"><Icon name="star" size={16} label={L("Žvaigždučių:")} /> {totalStars}</span>}
          </div>
          <button className="btn ts-go" onClick={onPlay} autoFocus>{L("Tęsti")} <Icon name="play" size={17} /></button>
          <ModeChoice />
          <button type="button" className="ts-link" onClick={() => setCreating(true)}><Icon name="pencil" size={16} /> {L("Keisti vardą")}</button>
        </div>
      } />
  );
}

function Create({ onDone, canCancel, onCancel }: { onDone: () => void; canCancel: boolean; onCancel: () => void }) {
  const prev = useStore((s) => s.progress.profile);
  const [name, setName] = useState(prev?.name ?? "");
  const [surname, setSurname] = useState(prev?.surname ?? "");
  const [gender, setGender] = useState<"m" | "f" | null>(prev?.gender ?? null);
  const ready = !!name.trim() && !!gender;
  const start = () => {
    if (!ready) return;
    // no avatar to design: a default look by gender (the conversations are what matters)
    const look = LOOKS.find((l) => l.id === (prev?.lookId ?? (gender === "f" ? "f1" : "m1"))) ?? LOOKS[0];
    useStore.getState().setProfile({ name: name.trim(), surname: surname.trim(), gender: gender!, look: look.look, lookId: look.id });
    onDone();
  };
  return (
    <Frame name={name}
      head={<p className="ts-lead">{L("Kalbėk angliškai su miestelio žmonėmis – kavinėje, taksi, oro uoste ar pas gydytoją. Kiekviename pokalbyje matysi, ką daryti ir ką pasakyti.")}</p>}
      body={
        <form className="ts-card" onSubmit={(e) => { e.preventDefault(); start(); }}>
          <div className="ts-row">
            <div className="ts-field">
              <label htmlFor="nm">{L("Tavo vardas")}</label>
              <input id="nm" className="ts-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={L("Pvz., Rūta")} autoComplete="given-name" autoFocus />
            </div>
            <div className="ts-field">
              <label htmlFor="sn">{L("Pavardė")} <small>{L("(nebūtina)")}</small></label>
              <input id="sn" className="ts-input" value={surname} onChange={(e) => setSurname(e.target.value)} placeholder={L("Pvz., Petraitė")} autoComplete="family-name" aria-describedby="sn-help" />
            </div>
          </div>
          <p className="ts-help" id="sn-help">{L("Pavardė pravers, kai kas nors paprašys ją pasakyti paraidžiui.")}</p>
          <div className="ts-field">
            <span className="ts-label" id="ts-gender">{L("Kaip į Tave kreiptis?")}</span>
            <div className="ts-pills" role="radiogroup" aria-labelledby="ts-gender">
              <button type="button" role="radio" aria-checked={gender === "m"} className={"ts-pill" + (gender === "m" ? " on" : "")} onClick={() => setGender("m")}>{L("Vyras")}</button>
              <button type="button" role="radio" aria-checked={gender === "f"} className={"ts-pill" + (gender === "f" ? " on" : "")} onClick={() => setGender("f")}>{L("Moteris")}</button>
            </div>
          </div>
          <ModeChoice />
          <div className="ts-actions">
            {canCancel && <button type="button" className="btn ghost" onClick={onCancel}>{L("Atgal")}</button>}
            <button className="btn ts-go" type="submit" disabled={!ready}>{L("Pradėti")} <Icon name="play" size={17} /></button>
          </div>
          <p className="ts-fine">{L("Geriausia – kompiuteris su mikrofonu ir Chrome naršyklė. Galima ir rašyti. Pažanga saugoma šioje naršyklėje.")}</p>
        </form>
      } />
  );
}
