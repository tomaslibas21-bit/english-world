import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { DailyBoard } from "../game/noticeboard/posting";
import { audio, type FilePlayback } from "../game/audio";
import { useStore } from "../state/store";
import { PhraseSave } from "./kit/PhraseSave";
import { HL, L } from "./i18n";
import { Icon } from "./icons";
import "./noticeboard.css";

const labels = { add: L("Išsaugoti kortelėse"), inCards: L("Tavo kortelėse") };
const dateFormat = new Intl.DateTimeFormat(HL === "lt" ? "lt-LT" : "en-US", { dateStyle: "long" });

export function NoticeboardSheet({ board, close }: { board: DailyBoard; close: () => void }) {
  const { day, loading, row } = useSyncExternalStore(board.subscribe, board.snapshot);
  const dialog = useRef<HTMLDialogElement>(null);
  const clip = useRef<FilePlayback | null>(null);
  const [failed, setFailed] = useState(false);
  const [sessionOnly, setSessionOnly] = useState(false);

  function stop() {
    const playing = clip.current;
    clip.current = null;
    playing?.stop();
  }
  function checkClip() {
    if (clip.current?.status === "unavailable") { clip.current = null; setFailed(true); }
    else if (clip.current?.status === "ended") clip.current = null;
  }
  function hear(file: string) {
    stop();
    setFailed(false);
    clip.current = audio.playFile(file);
    checkClip();
  }

  useLayoutEffect(() => {
    const panel = dialog.current!;
    panel.showModal();
    panel.querySelector<HTMLButtonElement>(".posting-line")?.focus({ preventScroll: true });
    const unsubscribe = audio.subscribe(checkClip);
    const visibility = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", visibility);
      stop();
      panel.close();
      // The town prompt is remounted when the panel closes.
      queueMicrotask(() => {
        if (!useStore.getState().hud.panel && !useStore.getState().conv.active) {
          document.querySelector<HTMLButtonElement>(".hud .prompt")?.focus({ preventScroll: true });
        }
      });
    };
  }, []);

  function line(text: string, lang: string, file: string, label: string) {
    const code = lang.toUpperCase();
    return <button type="button" className="posting-line" data-pad-default={lang === "es" || undefined} aria-label={`${label} (${code}) · ${text}`} title={label}
      onClick={() => hear(file)}>
      <span lang={lang}>{text}</span>
      <span className="posting-voice" aria-hidden="true"><Icon name="speaker" size={19} />{code}</span>
    </button>;
  }

  return <dialog ref={dialog} className="posting-paper" aria-labelledby="posting-title"
    data-pad-scope="panel" data-pad-wrap data-pad-phase="noticeboard"
    onKeyDown={event => { if (event.repeat && ["Enter", " "].includes(event.key)) event.preventDefault(); }}
    onCancel={event => { event.preventDefault(); close(); }}>
    <header>
      <div><h2 id="posting-title">{L("Dienos frazė")}</h2>
        <time dateTime={day}>{dateFormat.format(new Date(day + "T12:00:00"))}</time></div>
      <button type="button" data-pad-back onClick={close} aria-label={L("Uždaryti")} title={L("Uždaryti")}><Icon name="close" /></button>
    </header>
    <div className="posting-reading">
      {row ? <>
        {line(row.f, "es", row.fClip, L("Klausytis frazės"))}
        {line(row.p, HL, row.pClip, L("Klausytis vertimo"))}
      </> : <p role="status">{loading ? L("Įkeliama…") : L("Šiandien frazės lentoje nėra.")}</p>}
      <div role="status" className="posting-error">{failed && L("Nepavyko paleisti garso įrašo")}</div>
    </div>
    {row && <footer aria-live="polite" aria-atomic="true">
      <PhraseSave showLabel labels={labels} sentence={{ en: row.f, nat: row.p, say: row.f, units: [{ en: row.f, lt: row.p }] }}
        situationId="" sourceLabel={L("Dienos frazė") + " · " + row.src} onSaved={persisted => setSessionOnly(!persisted)} />
      {sessionOnly && <small>{L("Kortelė išsaugota tik šiam kartui.")}</small>}
    </footer>}
  </dialog>;
}
