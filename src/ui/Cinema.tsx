import { useEffect, useRef } from "react";
import { game } from "../game/gameRef";
import { CINEMA_TITLE } from "../game/cinema/program";
import { useCinema } from "../game/cinema/state";
import "./cinema.css";

export function Cinema() {
  const { title, paused } = useCinema();
  const pause = useRef<HTMLButtonElement>(null);
  const skip = useRef<HTMLButtonElement>(null);
  useEffect(() => { pause.current?.focus({ preventScroll: true }); }, []);
  return <section className="cinema-view" role="dialog" aria-modal="true" aria-label={CINEMA_TITLE.en}
    data-pad-scope="info" onKeyDown={e => {
      if (e.key === "Tab") {
        e.preventDefault();
        (document.activeElement === pause.current ? skip : pause).current?.focus();
      }
    }}>
    {title && <header className="cinema-card">
      <h1 lang="en">{CINEMA_TITLE.en}</h1><small lang="lt">{CINEMA_TITLE.lt}</small>
    </header>}
    <div className="cinema-controls">
      <button ref={pause} data-pad-default onClick={() => game?.modeAction("cinema", "pause")}>
        {paused ? "Tęsti" : "Pristabdyti"}
      </button>
      <button ref={skip} data-pad-back onClick={() => game?.modeExit()}>Praleisti filmuką</button>
    </div>
  </section>;
}
