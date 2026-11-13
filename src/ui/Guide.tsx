// The first-time guide's card in the 3D town (game/coach.ts): one hint at a time, low in the picture and out of the
// way of the task card, the map and the controls. It never takes the keys or blocks a tap on the town.
import { useEffect } from "react";
import { useStore } from "../state/store";
import { coach, type CoachStep } from "../game/coach";
import { useRadio } from "../radio";
import { Icon, type IconName } from "./icons";

const ICON: Record<CoachStep, IconName> = { walk: "walk", run: "next", jump: "chevronUp", talk: "mic", radio: "radio", scenes: "frame" };

/** A hint's title and what it says, with the keys on a computer or the on-screen controls on a phone. */
function words(step: CoachStep, touch: boolean): [string, string] {
  switch (step) {
    case "walk": return ["Vaikščiok", touch ? "Vesk vairalazdę kairėje. Pirštu tempk vaizdą – apsidairysi." : "Rodyklės arba W A S D. Tempk pele – apsidairysi."];
    case "run": return ["Bėk", touch ? "Eidamas tiesiai pats pradedi bėgti risčia. Patrauk vairalazdę iki krašto – bėgsi greičiau." : "Eidamas tiesiai pats pradedi bėgti risčia. Laikyk Shift – bėgsi greičiau."];
    case "jump": return ["Pašok", touch ? "Mygtukas dešinėje – pašokti. Užšok ant suoliuko, įbrisk į jūrą." : "Tarpas – pašokti. Užšok ant suoliuko, įbrisk į jūrą."];
    case "talk": return ["Kalbėkis", touch ? "Prieik prie žmogaus ir bakstelėk „Kalbėti“. Užduoties kortelė rodo, pas ką eiti, o „Nuvesk mane“ nuveda." : "Prieik prie žmogaus ir spausk E. Užduoties kortelė rodo, pas ką eiti, o „Nuvesk mane“ nuveda."];
    case "radio": return ["Radijas", touch ? "Radijo mygtukas dešinėje: kurso dainos, kol vaikštai." : "R arba radijo mygtukas dešinėje: kurso dainos, kol vaikštai."];
    case "scenes": return ["Pokalbių vaizdas", "Pokalbio metu rodomas piešinys. Išjunk „Iliustruotos scenos“ – pokalbis vyks 3D mieste, o žmogaus lūpos judės pagal balsą."];
  }
}

export function Guide() {
  const c = useStore((s) => s.hud.coach);
  const panel = useStore((s) => s.hud.panel);
  const touch = useStore((s) => s.hud.showTouch);
  const scenes = useStore((s) => s.settings.scenes);
  const radioOn = useRadio((s) => s.on);
  // the radio's hint is done when the radio is switched on (by its button or R)
  useEffect(() => { if (radioOn) coach.did("radio"); }, [radioOn, c?.step]);
  if (!c || panel) return null;
  const [title, body] = words(c.step, touch);
  const last = c.n === c.of;
  return (
    <div className={"coach" + (c.ok ? " ok" : "")} role="status" aria-live="polite">
      <span className="coach-icon" aria-hidden><Icon name={c.ok ? "check" : ICON[c.step]} size={24} strokeWidth={2} /></span>
      <div className="coach-text">
        <b>{title}</b>
        <p>{body}</p>
        {c.step === "scenes" && (
          <label className="coach-switch">
            <button className={"switch" + (scenes ? " on" : "")} onClick={() => useStore.getState().setSettings({ scenes: !scenes })} role="switch" aria-checked={scenes} aria-label="Iliustruotos scenos" />
            <span>Iliustruotos scenos</span>
          </label>
        )}
      </div>
      <div className="coach-row">
        <span className="coach-dots" aria-label={`${c.n} / ${c.of}`}>{Array.from({ length: c.of }, (_, i) => <i key={i} className={i < c.n ? "on" : ""} />)}</span>
        {!last && <button className="coach-skip" onClick={() => coach.finish()}>Praleisti</button>}
        <button className="btn small coach-next" onClick={() => (last ? coach.finish() : coach.next())}>{last ? "Baigti" : "Toliau"}</button>
      </div>
    </div>
  );
}
