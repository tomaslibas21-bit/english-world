import { useState } from "react";
import { useStore, type PlayMode } from "../state/store";
import type { Look } from "../content/npcs";
import { SITUATIONS } from "../content/situations";
import { ltCount } from "./lt";
import { Icon } from "./icons";
import "./light.css";

/** The 3D town or the light mode (no 3D: the situation list and the conversations with their pictures). */
function ModeChoice({ inForm }: { inForm?: boolean }) {
  const play = useStore((s) => s.settings.play);
  const set = (p: PlayMode) => useStore.getState().setSettings({ play: p });
  return (
    <div className={"mode-choice" + (inForm ? " in-form" : "")}>
      {!inForm && <span className="mode-label" id="mode-label">Kaip nori žaisti?</span>}
      <div className="seg" role="group" aria-labelledby="mode-label">
        <button type="button" className={play === "light" ? "on" : ""} aria-pressed={play === "light"} onClick={() => set("light")}>Lengvas režimas</button>
        <button type="button" className={play === "town" ? "on" : ""} aria-pressed={play === "town"} onClick={() => set("town")}>3D miestas</button>
      </div>
      <p className="mode-sub">{play === "light"
        ? "Tik pokalbiai su piešiniais – greitai atsidaro ir taupo bateriją."
        : "Vaikščiok po 3D miestą ir kalbėkis su jo žmonėmis. Geriausia – kompiuteryje."}</p>
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
  const [creating, setCreating] = useState(false);
  if (creating || !profile) return <Create onDone={onPlay} canCancel={!!profile} onCancel={() => setCreating(false)} started={creating} />;
  return (
    <div className="title-screen">
      <div className="title-card">
        <h1 className="logo">English World<small>Maple Harbor · JAV</small></h1>
        <p className="lead">{profile.gender === "f" ? "Sveika sugrįžusi" : "Sveikas sugrįžęs"}, <b>{profile.name}</b>! Tavo miestelis laukia – kavinė, stotis, parduotuvės ir {SITUATIONS.length} {ltCount(SITUATIONS.length, "pokalbis", "pokalbiai", "pokalbių")} su jo žmonėmis.</p>
        <div className="actions">
          <button className="btn" onClick={onPlay} autoFocus><Icon name="play" size={16} /> Tęsti</button>
          <button className="btn ghost" onClick={() => setCreating(true)}>Keisti vardą</button>
        </div>
        <ModeChoice />
        <p className="fine">Kalbėk su personažais balsu arba rašyk. Lietuviški pasiūlymai padeda nuspręsti, ką pasakyti, o angliškos frazės – kaip.</p>
      </div>
    </div>
  );
}

function Create({ onDone, canCancel, onCancel }: { onDone: () => void; canCancel: boolean; onCancel: () => void; started: boolean }) {
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
    <div className="title-screen">
      <form className="title-card" style={{ textAlign: "left" }} onSubmit={(e) => { e.preventDefault(); start(); }}>
        <h1 className="logo" style={{ textAlign: "center" }}>English World<small>Kalbėk angliškai amerikietiškose situacijose</small></h1>
        <p className="lead" style={{ textAlign: "center" }}>41 trumpas pokalbis pagal dainas: kavinė, viešbutis, gydytojas, darbo susirinkimas… Kiekviename pokalbyje matysi, ką daryti ir ką pasakyti.</p>
        <div className="field">
          <label htmlFor="nm">Tavo vardas</label>
          <input id="nm" value={name} onChange={(e) => setName(e.target.value)} placeholder="Pvz., Rūta" autoComplete="given-name" autoFocus />
        </div>
        <div className="field">
          <label>Lytis <span style={{ fontWeight: 600, color: "var(--ink-faint)" }}>(kad žaidimo veikėjai žinotų, kaip į Tave kreiptis)</span></label>
          <div className="seg" style={{ alignSelf: "flex-start" }}>
            <button type="button" className={gender === "m" ? "on" : ""} onClick={() => setGender("m")}>Vyras</button>
            <button type="button" className={gender === "f" ? "on" : ""} onClick={() => setGender("f")}>Moteris</button>
          </div>
        </div>
        <div className="field">
          <label htmlFor="sn">Pavardė <span style={{ fontWeight: 600, color: "var(--ink-faint)" }}>(nebūtina – pravers, kai paprašys paraidžiui)</span></label>
          <input id="sn" value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="Pvz., Mikalauskienė" autoComplete="family-name" />
        </div>
        <div className="field">
          <label id="mode-label">Kaip nori žaisti?</label>
          <ModeChoice inForm />
        </div>
        <div className="actions" style={{ justifyContent: "center", marginTop: 16 }}>
          {canCancel && <button type="button" className="btn ghost" onClick={onCancel}>Atgal</button>}
          <button className="btn" type="submit" disabled={!ready}>Pradėti <Icon name="play" size={16} /></button>
        </div>
        <p className="fine" style={{ textAlign: "center" }}>Geriausia – kompiuteris su mikrofonu ir Chrome naršyklė. Galima ir rašyti. Pažanga saugoma šioje naršyklėje.</p>
      </form>
    </div>
  );
}
