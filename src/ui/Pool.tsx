import { game } from "../game/gameRef";
import { usePool } from "../game/pool/store";
import { POOL_SITUATION } from "../game/world/pool";
import { Icon } from "./icons";
import { HL, L, TL } from "./i18n";
import { GlossLine } from "./kit/GlossLine";
import { ScoreCard, ScoreNumber } from "./kit/ScoreCard";
import "./pool.css";

const helpText = {
  long: L("Kai vaikai sušunka „¡Tuya!“ (tavo!), kamuolys skrenda pas tave. Bakstelėk ekraną, spausk tarpą arba šuolio mygtuką ir atmušk."),
  short: L("„¡Tuya!“ – mušk!"),
  timing: L("Atmušk, kai kamuolys leidžiasi pas tave."),
  wrong: L("Šitas buvo kitam vaikui."),
} as const;

export function PoolOverlay({ touch }: { touch: boolean }) {
  const { cue, aside, help, notice, canHit, streak, result } = usePool();
  if (result) return (
    <ScoreCard title={L("Kamuolys ore")}
      ratio={result.learnerHits / Math.max(1, result.learnerHits + result.drops)}
      rows={[
        { label: L("Geriausia serija"), value: <><ScoreNumber value={result.best} /> {L("Iš eilės").toLocaleLowerCase(HL)}</> },
        { label: L("Tavo smūgiai"), value: result.learnerHits },
      ]}
      phrases={{ label: L("Frazių kortelės"), count: result.cards }}
      again={{ label: L("Žaisti dar kartą"), run: () => game?.modeAction("pool", "again") }}
      done={{ label: L("Baigti"), run: () => game?.modeExit() }}
    />
  );

  const timing = notice ?? (!touch && canHit ? "timing" : null);
  return (
    <div className="pool-overlay">
      <div className="pool-top">
        <div className="pool-counter" lang={HL}>{L("Kamuolys ore")} <b>{streak}</b></div>
        <div className="pool-cues">
          {cue && <div className="pool-cue" data-line={cue.key} lang={TL}><GlossLine sentence={cue.sentence} gloss source={{ situationId: POOL_SITUATION }} /></div>}
          {aside && <div className="pool-aside" data-line={aside.key} lang={TL}><GlossLine sentence={aside.sentence} gloss source={{ situationId: POOL_SITUATION }} /></div>}
        </div>
      </div>
      <div className={`pool-help-stack${touch ? " pool-help-touch" : ""}`} lang={HL}>
        {help && <div className="pool-help pool-instruction" data-help={help}>{helpText[help]}</div>}
        <div className="pool-help-slot" aria-live="polite">
          {timing && <div className="pool-help" data-help={timing}>{helpText[timing]}</div>}
        </div>
      </div>
      {touch && (
        <button type="button" className="jump-btn pool-hit" data-can-hit={canHit} aria-label={helpText.short}
          onPointerDown={(e) => { e.preventDefault(); game?.jump(); }}
          onClick={(e) => { if (e.detail === 0) game?.jump(); }}>
          <Icon name="chevronUp" size={34} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
