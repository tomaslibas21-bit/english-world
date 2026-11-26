import { useLayoutEffect, useRef, useSyncExternalStore, type KeyboardEvent } from "react";
import { KARAOKE_UI as words } from "../content/karaokeCopy";
import { STATIONS } from "../content/radio";
import { game } from "../game/gameRef";
import { karaokeSongs, karaokeStations, useKaraoke } from "../game/karaoke/store";
import { radio, useRadio } from "../radio";
import type { KaraokeState } from "../radio/karaokeSession";
import type { KaraokeCatalogEntry } from "../radio/songs";
import { Icon } from "./icons";
import { LyricStrip } from "./Radio";
import { SongCover } from "./SongCover";
import "./karaoke.css";

type View = ReturnType<typeof useKaraoke.getState>;
type Action = (name: string, value?: string | boolean) => void;
const action: Action = (name, value) => game?.modeAction("karaoke", name, value);
const idleTake: KaraokeState = { status: "idle", song: null, timeline: null, held: false, issue: null };
const noSubscription = () => () => {};

export function karaokeDuration(seconds: number) {
  const whole = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function takeMessage(take: KaraokeState) {
  if (take.status === "loading") return words.preparing;
  if (take.status === "error") return take.issue === "timing" ? words.timingError : words.audioError;
  if (take.status === "ended") return words.finished;
  if (take.held) return words.held;
  return "";
}

/** Modal keyboard handling stays on the visible surface, above the world's shortcuts. */
function dialogKeys(event: KeyboardEvent<HTMLElement>, act: Action) {
  event.stopPropagation();
  if (event.key === "Escape") { event.preventDefault(); act("back"); }
  if (event.key !== "Tab") return;
  const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), select:not(:disabled), input:not(:disabled)")];
  const first = controls[0], last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}

interface PickerProps {
  entries: readonly KaraokeCatalogEntry[];
  favorites: readonly string[];
  view: View;
  take?: KaraokeState;
  act: Action;
}

export function KaraokePicker({ entries, favorites, view, take = idleTake, act }: PickerProps) {
  const list = useRef<HTMLDivElement>(null);
  const start = useRef<HTMLButtonElement>(null);
  const filter = useRef<HTMLSelectElement>(null);
  const selected = entries.find(({ song }) => song.id === view.detail);
  const songs = karaokeSongs(entries, view.filter, STATIONS, favorites);
  const preview = songs.find(({ song }) => song.id === view.selected) ?? songs[0];
  const selectedTake = take.song?.id === view.detail ? take : idleTake;
  const waiting = selectedTake.status === "loading";
  useLayoutEffect(() => {
    if (selected) start.current?.focus();
    else if (list.current) {
      list.current.scrollTop = view.scroll;
      const target = [...list.current.querySelectorAll<HTMLElement>("[data-song]")]
        .find((row) => row.dataset.song === view.selected);
      (target ?? filter.current)?.focus({ preventScroll: true });
    }
  }, [view.detail, view.filter, view.loading, take.status]);
  const select = (id: string) => {
    useKaraoke.setState({ scroll: list.current?.scrollTop ?? 0 });
    act("select", id);
  };
  return (
    <div className="karaoke-shade">
      <section className="karaoke-picker" role="dialog" aria-modal="true" aria-labelledby="karaoke-heading"
        lang="lt" data-pad-scope="karaoke" data-detail={!!selected} onKeyDown={(event) => dialogKeys(event, act)}>
        <header className="karaoke-mast">
          <button type="button" className="karaoke-back" data-pad-back onClick={() => act("back")} aria-label={words.back}><Icon name="arrowLeft" /></button>
          <Icon name="mic" /><h1 id="karaoke-heading">{words.sign}</h1>
        </header>
        {selected ? <>
          <div className="karaoke-detail" data-song-detail={selected.song.id}>
            <div className="karaoke-jacket"><SongCover entry={selected} width={320} /></div>
            <div className="karaoke-song-info">
              <h2 lang="en">{selected.song.t}</h2>
              {selected.song.tl && <p>{selected.song.tl}</p>}
              <span className="karaoke-length">{karaokeDuration(selected.song.d)}</span>
              <fieldset className="karaoke-modes">
                <legend>{words.mode}</legend>
                <label><input type="radio" name="karaoke-mode" value="along" defaultChecked />{words.along}</label>
                <label className="karaoke-upcoming"><input type="radio" name="karaoke-mode" value="echo" disabled aria-describedby="karaoke-echo-note" />{words.echo}</label>
                <small id="karaoke-echo-note">{words.echoSoon}</small>
              </fieldset>
              <p className="karaoke-status" role="status">{takeMessage(selectedTake)}</p>
            </div>
          </div>
          <footer className="karaoke-picker-foot">
            <button ref={start} type="button" className="karaoke-primary" data-pad-default disabled={waiting}
              onClick={() => act(selectedTake.status === "error" ? "retry" : selectedTake.status === "blocked" ? "resume" : "start")}>
              <Icon name="play" />{selectedTake.status === "error" ? words.retry : selectedTake.status === "blocked" ? words.resume : words.start}
            </button>
          </footer>
        </> : <>
          <div className="karaoke-filter">
            <h2>{words.choose}</h2>
            <label htmlFor="karaoke-filter">{words.collection}</label>
            <select ref={filter} id="karaoke-filter" data-pad-adjust value={view.filter} onChange={(event) => act("filter", event.target.value)}>
              <option value="all">{words.all}</option>
              {karaokeStations(entries, STATIONS).map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}
              <option value="favorites">{words.favorites}</option>
            </select>
          </div>
          <div className="karaoke-catalog">
          <div ref={list} className="karaoke-list" aria-busy={view.loading}>
            {view.loading ? <p className="karaoke-empty" role="status">{words.loading}</p>
              : view.failed ? <div className="karaoke-empty" role="status"><p>{words.catalogError}</p><button type="button" onClick={() => act("catalog-retry")}>{words.retry}</button></div>
              : !songs.length ? <p className="karaoke-empty" role="status">{view.filter === "favorites" ? words.emptyFavorites : words.empty}</p>
              : songs.map((entry) => <button type="button" key={entry.song.id} className="karaoke-song" data-song={entry.song.id}
                data-selected={preview?.song.id === entry.song.id} onFocus={() => useKaraoke.setState({ selected: entry.song.id })}
                onClick={() => select(entry.song.id)}>
                <span className="karaoke-thumb"><SongCover entry={entry} /></span>
                <span className="karaoke-titles"><strong lang="en">{entry.song.t}</strong>{entry.song.tl && <span>{entry.song.tl}</span>}</span>
                <span className="karaoke-length">{karaokeDuration(entry.song.d)}</span><Icon name="chevronRight" />
              </button>)}
          </div>
          {preview && !view.loading && !view.failed && <div className="karaoke-preview" aria-hidden><SongCover entry={preview} width={320} /></div>}
          </div>
        </>}
      </section>
    </div>
  );
}

function KaraokePerformance({ take }: { take: KaraokeState }) {
  const leave = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => { leave.current?.focus(); }, []);
  const playing = take.status === "playing";
  return <section className="karaoke-performance" role="dialog" aria-modal="true" aria-labelledby="karaoke-song-title"
    data-pad-scope="karaoke-stage" onKeyDown={(event) => dialogKeys(event, action)} lang="lt">
    <header className="karaoke-stage-head">
      <div><span>{words.sign}</span><h1 id="karaoke-song-title" lang="en">{take.song?.t}</h1></div>
      <button ref={leave} type="button" data-pad-default onClick={() => action("leave")}>{words.leave}</button>
    </header>
    <div className="karaoke-stage-bottom">
      <p className="karaoke-status" role="status">{takeMessage(take)}</p>
      <div className="karaoke-stage-actions">
        <button type="button" data-pad-back onClick={() => action("back")}>{words.another}</button>
        {take.status !== "ended" && <button type="button" className="karaoke-primary" disabled={take.held || take.status === "loading"}
          onClick={() => action(take.status === "error" ? "retry" : playing ? "pause" : "resume")}>
          {take.status === "error" ? words.retry : playing ? words.pause : words.resume}
        </button>}
      </div>
    </div>
    <LyricStrip sidewaysPhone={false} karaoke />
  </section>;
}

export function KaraokeOverlay() {
  const view = useKaraoke();
  useRadio((s) => s);
  const take = useSyncExternalStore(view.take?.store.subscribe ?? noSubscription,
    view.take ? () => view.take!.store.getState() : () => idleTake, () => idleTake);
  useLayoutEffect(() => () => {
    queueMicrotask(() => document.querySelector<HTMLElement>(".prompt")?.focus({ preventScroll: true }));
  }, []);
  if (view.phase === "closed") return null;
  return view.phase === "stage" ? <KaraokePerformance take={take} />
    : <KaraokePicker entries={radio.karaokeCatalog()} favorites={radio.karaokeFavorites()} view={view} take={take} act={action} />;
}
