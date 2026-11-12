// Puerto Colibrí's first-start choice of Spanish (replaces src/ui/variety-choice.tsx, the edition overlay): on the
// title form, while no choice is saved, three buttons (México / Latinoamérica neutro / España) and a note that
// Settings can change it later. A tap saves the choice (state/variety.ts chooseVariety, the key that Spanish Master
// English's Settings also writes), so after a reload, or once the course's Settings has chosen, it isn't shown again.
// Until then the game speaks the build's default (Mexican; neutral in the course), the button shown as selected;
// starting without a tap saves that one (commitVarietyChoice), so the question is asked only once.
import { useState, type ReactElement } from "react";
import { chooseVariety, hasVarietyChoice, loadVariety, type Variety } from "../../../state/variety";
import { L } from "../../../ui/i18n";

// [choice, name, the short name shown on a phone, where the three share one row in equal thirds]
const OPTIONS: [Variety, string, string?][] = [["default", "México"], ["neutral", "Latinoamérica neutro", "Neutro"], ["spain", "España"]];

export function VarietyChoice(): ReactElement | null {
  // decided once per view: after a tap the buttons stay (showing the choice) until the form is left
  const [shown] = useState(() => !hasVarietyChoice());
  const [v, setV] = useState<Variety>(loadVariety);
  if (!shown) return null;
  return (
    <div className="ts-field ts-variety">
      <span className="ts-label" id="ts-variety">{L("Kokią ispanų kalbą nori girdėti?")}</span>
      <div className="ts-pills ts-pills-3" role="radiogroup" aria-labelledby="ts-variety" aria-describedby="ts-variety-note">
        {OPTIONS.map(([k, name, short]) => (
          <button key={k} type="button" role="radio" aria-checked={v === k} aria-label={short ? name : undefined} className={"ts-pill" + (v === k ? " on" : "")} lang="es"
            onClick={() => { chooseVariety(k); setV(k); }}>
            {short ? <><span className="ts-pill-long">{name}</span><span className="ts-pill-short">{short}</span></> : name}
          </button>
        ))}
      </div>
      <p className="ts-help ts-variety-note" id="ts-variety-note">{L("Vėliau galėsi pakeisti Nustatymuose.")}</p>
    </div>
  );
}

/** Start / Continue on the title form: the Spanish shown as selected becomes the saved choice if none was tapped,
 *  so the question is asked once, never again on the next start. */
export function commitVarietyChoice(): void {
  if (!hasVarietyChoice()) chooseVariety(loadVariety());
}
