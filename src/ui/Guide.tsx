// The town guide's card in the 3D town (game/coach.ts): one hint, when its thing first matters, low in the picture and
// out of the way of the task card, the map, the controls and the talk / enter prompt. It never takes the keys or
// blocks a tap on the town. Its colours are the game's own variables, so it follows a course's theme (styles.css
// `.coach`). The same words are listed under "Kaip žaisti?" (Panels.tsx Help: `coachWords`).
import { useEffect, useLayoutEffect, useState } from "react";
import { useStore } from "../state/store";
import { coach, type CoachStep } from "../game/coach";
import { useRadio } from "../radio";
import { Icon, type IconName } from "./icons";
import { L } from "./i18n";

export const COACH_ICON: Record<CoachStep, IconName> = { walk: "walk", run: "next", jump: "chevronUp", talk: "mic", car: "car", boat: "sunset", water: "drop", radio: "radio" };

/** A hint's title and what it says, with the keys on a computer or the on-screen controls on a phone. */
export function coachWords(step: CoachStep, touch: boolean): [string, string] {
  switch (step) {
    case "walk": return [L("Vaikščiok"), touch ? L("Vesk vairalazdę kairėje. Pirštu tempk vaizdą – apsidairysi.") : L("Rodyklės arba W A S D. Tempk pele – apsidairysi.")];
    case "run": return [L("Bėk"), touch ? L("Eidamas tiesiai pats pradedi bėgti risčia. Patrauk vairalazdę iki krašto – bėgsi greičiau.") : L("Eidamas tiesiai pats pradedi bėgti risčia. Laikyk Shift – bėgsi greičiau.")];
    case "jump": return [L("Pašok"), touch ? L("Mygtukas dešinėje – pašokti. Du kartus – salto, tris – aukštas dvigubas salto. Užšok ant suoliuko.") : L("Tarpas – pašokti. Du kartus – salto, tris – aukštas dvigubas salto. Užšok ant suoliuko.")];
    case "talk": return [L("Kalbėkis"), touch ? L("Prieik prie žmogaus ir bakstelėk „Kalbėti“. Užduoties kortelė rodo, pas ką eiti, o „Nuvesk mane“ nuveda.") : L("Prieik prie žmogaus ir spausk E. Užduoties kortelė rodo, pas ką eiti, o „Nuvesk mane“ nuveda.")];
    case "car": return [L("Važiuok"), touch ? L("Prieik prie kabrioleto ir bakstelėk mygtuką – sėsi prie vairo. Vairalazdė vairuoja, STOP stabdo.") : L("Prieik prie kabrioleto ir spausk E – sėsi prie vairo. Rodyklės vairuoja, Tarpas stabdo, E – išlipti.")];
    case "boat": return [L("Plauk valtimi"), touch ? L("Prieik prie valties ir bakstelėk mygtuką – įlipsi. Vairalazdė vairuoja.") : L("Prieik prie valties ir spausk E – įlipsi. Rodyklės vairuoja, E – išlipti.")];
    case "water": return [L("Jūra"), touch ? L("Bristi galima tol, kol gilu, – toliau plauksi. Mygtukas su rodykle žemyn – panerti.") : L("Bristi galima tol, kol gilu, – toliau plauksi. Tarpas – panerti, Shift – plaukti greičiau.")];
    case "radio": return [L("Radijas"), touch ? L("Radijo mygtukas dešinėje: kurso dainos, kol vaikštai.") : L("R arba radijo mygtukas dešinėje: kurso dainos, kol vaikštai.")];
  }
}

export function Guide() {
  const c = useStore((s) => s.hud.coach);
  const panel = useStore((s) => s.hud.panel);
  const touch = useStore((s) => s.hud.showTouch);
  const radioOn = useRadio((s) => s.on);
  // the radio's hint is done when the radio is switched on (by its button or R)
  useEffect(() => { if (radioOn) coach.did("radio"); }, [radioOn, c?.step]);
  // on a phone held upright the card sits right under the task card, however tall that is (folded, or opened by hand)
  const [under, setUnder] = useState<number | null>(null);
  const shown = !!c && !panel;
  useLayoutEffect(() => {
    const card = document.querySelector(".objective-card");
    if (!shown || !card || typeof ResizeObserver === "undefined") return;
    const place = () => setUnder(window.innerWidth <= 600 && window.innerHeight > 520 ? Math.round(card.getBoundingClientRect().bottom) + 8 : null);
    const ro = new ResizeObserver(place);
    ro.observe(card);
    window.addEventListener("resize", place);
    place();
    return () => { ro.disconnect(); window.removeEventListener("resize", place); };
  }, [shown]);
  if (!c || panel) return null;
  const [title, body] = coachWords(c.step, touch);
  return (
    <div className={"coach" + (c.ok ? " ok" : "")} role="status" aria-live="polite" style={under !== null ? { top: under } : undefined}>
      <span className="coach-icon" aria-hidden><Icon name={c.ok ? "check" : COACH_ICON[c.step]} size={24} strokeWidth={2} /></span>
      <div className="coach-text">
        <b>{title}</b>
        <p>{body}</p>
      </div>
      <div className="coach-row">
        <button className="coach-skip" onClick={() => coach.finish()}>{L("Daugiau nerodyti")}</button>
        <button className="btn small coach-next" onClick={() => coach.next()}>{L("Gerai")}</button>
      </div>
    </div>
  );
}
