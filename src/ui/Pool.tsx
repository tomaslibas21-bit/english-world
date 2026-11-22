import { game } from "../game/gameRef";
import { usePool } from "../game/pool/store";
import { Icon } from "./icons";
import { HL, L, TL } from "./i18n";
import { GlossLine } from "./kit/GlossLine";
import { ScoreCard } from "./kit/ScoreCard";
import "./pool.css";

const helpText = {
  long: "Kai vaikai sušunka „¡Tuya!“ (tavo!), kamuolys skrenda pas tave. Bakstelėk ekraną, spausk tarpą arba šuolio mygtuką ir atmušk.",
  short: "„¡Tuya!“ – mušk!",
  timing: "Atmušk, kai kamuolys leidžiasi pas tave.",
  wrong: "Šitas buvo kitam vaikui.",
} as const;

export function PoolOverlay({ touch }: { touch: boolean }) {
  const { cue, aside, help, streak, result } = usePool();
  if (result) return (
    <ScoreCard title={L("Kamuolys ore")}
      rows={[
        { label: L("Geriausia serija"), value: <>{result.best} {L("Iš eilės").toLocaleLowerCase(HL)}</> },
        { label: L("Tavo smūgiai"), value: result.learnerHits },
      ]}
      phrases={{ label: L("Frazių kortelės"), count: result.cards }}
      again={{ label: L("Žaisti dar kartą"), run: () => game?.modeAction("pool", "again") }}
      done={{ label: L("Baigti"), run: () => game?.modeExit() }}
    />
  );

  return (
    <div className="pool-overlay">
      <div className="pool-top">
        <div className="pool-counter" lang={HL}>{L("Kamuolys ore")} <b>{streak}</b></div>
        <div className="pool-cues">
          {cue && <div className="pool-cue" data-line={cue.key} lang={TL}><GlossLine sentence={cue.sentence} gloss /></div>}
          {aside && <div className="pool-aside" data-line={aside.key} lang={TL}><GlossLine sentence={aside.sentence} gloss /></div>}
        </div>
      </div>
      {help && <div key={help} className={`pool-help ${touch ? "pool-help-touch" : ""}`} lang={HL}>{L(helpText[help])}</div>}
      {touch && (
        <button type="button" className="jump-btn pool-hit" aria-label={L(helpText.short)}
          onPointerDown={(e) => { e.preventDefault(); game?.jump(); }}
          onClick={(e) => { if (e.detail === 0) game?.jump(); }}>
          <Icon name="chevronUp" size={34} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
