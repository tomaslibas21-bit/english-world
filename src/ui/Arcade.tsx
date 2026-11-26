import { useEffect, useRef } from "react";
import { CABINETS } from "../game/arcade/cabinets";
import { useArcade } from "../game/arcade/mode";
import { game } from "../game/gameRef";
import { readBest } from "../game/road/ghost";
import { readPlayStats } from "../state/playStats";
import { useStore } from "../state/store";
import "./arcade.css";

export default function Arcade() {
  const id = useArcade((s) => s.cabinet);
  const progress = useStore((s) => s.progress);
  const primary = useRef<HTMLButtonElement>(null);
  useEffect(() => { primary.current?.focus(); }, [id]);
  if (!id) return null;
  const cabinet = CABINETS[id];
  const points = id === "road" ? readBest("maple-harbor")?.points : undefined;
  return <div className="arcade" data-pad-scope="arcade" lang="lt">
    <section className="arcade-panel" role="dialog" aria-modal="true" aria-labelledby="arcade-title">
      <header><h2>Žaidimų automatai</h2><button data-pad-back onClick={() => game?.modeExit()}>Uždaryti</button></header>
      <div className="arcade-body">
        <div className="arcade-detail">
          <h3 id="arcade-title" lang="en">{cabinet.title}</h3><p>{cabinet.lt}</p>
          <p>{id === "road" ? "Prie šio vairo." : "Prie biliardo stalo su Tina."}</p>
          <dl><dt>{id === "road" ? "Asmeninis rekordas · Taškai" : "Pradėtų žaidimų skaičius"}</dt>
            <dd>{id === "road" ? points ?? "Rezultato dar nėra" : readPlayStats(progress).games.billiards ?? 0}</dd></dl>
        </div>
        <button className="arcade-primary" ref={primary} onClick={() => game?.modeAction("arcade", "play")}>{cabinet.action}</button>
      </div>
    </section>
  </div>;
}
