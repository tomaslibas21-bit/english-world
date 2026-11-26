import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { KARAOKE_SIGN, KARAOKE_UI as words } from "../content/karaokeCopy";
import { STATIONS } from "../content/radio";
import { game } from "../game/gameRef";
import { karaokeSongs, karaokeStations, useKaraoke } from "../game/karaoke/store";
import { radio, useRadio } from "../radio";
import type { KaraokeState } from "../radio/karaokeSession";
import type { KaraokeCatalogEntry } from "../radio/songs";
import { EDITION } from "../edition";
import { Icon } from "./icons";
import { KaraokeStage, karaokeDialogKeys, karaokeStatus } from "./KaraokeStage";
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
    <div className="karaoke-shade" data-booth-town={EDITION.id}>
      <section className="karaoke-picker" role="dialog" aria-modal="true" aria-labelledby="karaoke-heading"
        lang={EDITION.helper} data-pad-scope="karaoke" data-detail={!!selected} onKeyDown={(event) => karaokeDialogKeys(event, act)}>
        <header className="karaoke-mast">
          <button type="button" className="karaoke-back" data-pad-back onClick={() => act("back")} aria-label={words.back}><Icon name="arrowLeft" /></button>
          <Icon name="mic" /><h1 id="karaoke-heading" lang={EDITION.target}>{KARAOKE_SIGN}</h1>
        </header>
        {selected ? <>
          <div className="karaoke-detail" data-song-detail={selected.song.id}>
            <div className="karaoke-jacket"><SongCover entry={selected} width={320} /></div>
            <div className="karaoke-song-info">
              <h2 lang={EDITION.target}>{selected.song.t}</h2>
              {selected.song.tl && <p>{selected.song.tl}</p>}
              <span className="karaoke-length">{karaokeDuration(selected.song.d)}</span>
              <fieldset className="karaoke-modes" disabled={waiting}>
                <legend>{words.mode}</legend>
                <select data-pad-adjust aria-label={words.mode} aria-describedby="karaoke-mode-note" value={view.mode} onChange={(event) => act("mode", event.target.value)}>
                  <option value="along">{words.along}</option>
                  <option value="echo">{words.echo}</option>
                  <option value="word">{words.word}</option>
                </select>
                <small id="karaoke-mode-note">{view.mode === "word" ? words.wordHelp : words.echoHelp}</small>
              </fieldset>
              <p className="karaoke-status" role="status">{karaokeStatus(selectedTake)}</p>
            </div>
          </div>
          <footer className="karaoke-picker-foot">
            <button ref={start} type="button" className="karaoke-primary" data-pad-default disabled={waiting}
              onClick={() => act(selectedTake.status === "blocked" && selectedTake.practice?.mode === view.mode ? "resume" : "start")}>
              <Icon name="play" />{selectedTake.status === "error" ? words.retry : selectedTake.status === "blocked" ? words.resume : words.start}
            </button>
          </footer>
        </> : <>
          <div className="karaoke-filter">
            <h2>{words.choose}</h2>
            <label htmlFor="karaoke-filter">{words.collection}</label>
            <select ref={filter} id="karaoke-filter" data-pad-adjust value={view.filter} onChange={(event) => act("filter", event.target.value)}>
              <option value="all">{words.all}</option>
              {karaokeStations(entries, STATIONS).map((station) => <option key={station.id} value={station.id} lang={EDITION.target}>{station.name}</option>)}
              <option value="favorites">{words.favorites}</option>
            </select>
          </div>
          <div className="karaoke-catalog">
          <div ref={list} className="karaoke-list" aria-busy={view.loading}>
            {view.loading ? <p className="karaoke-empty" role="status">{words.loading}</p>
              : view.failed ? <div className="karaoke-empty" role="status"><p>{words.catalogError}</p><button type="button" onClick={() => act("catalog-retry")}>{words.retry}</button></div>
              : !songs.length ? <p className="karaoke-empty" role="status">{view.filter === "favorites" ? words.emptyFavorites : words.empty}</p>
              : songs.map((entry) => <button type="button" key={entry.song.id} className="karaoke-song" data-song={entry.song.id}
                aria-labelledby={`karaoke-title-${entry.song.id}`} data-selected={preview?.song.id === entry.song.id} onFocus={() => useKaraoke.setState({ selected: entry.song.id })}
                onClick={() => select(entry.song.id)}>
                <span className="karaoke-thumb"><SongCover entry={entry} /></span>
                <span className="karaoke-titles" id={`karaoke-title-${entry.song.id}`}><strong lang={EDITION.target}>{entry.song.t}</strong>{entry.song.tl && <span>{entry.song.tl}</span>}</span>
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

export function KaraokeOverlay() {
  const view = useKaraoke();
  useRadio((s) => s);
  const take = useSyncExternalStore(view.take?.store.subscribe ?? noSubscription,
    view.take ? () => view.take!.store.getState() : () => idleTake, () => idleTake);
  useLayoutEffect(() => () => {
    queueMicrotask(() => document.querySelector<HTMLElement>(".prompt")?.focus({ preventScroll: true }));
  }, []);
  if (view.phase === "closed") return null;
  return view.phase === "stage" && view.take ? <KaraokeStage session={view.take} take={take} />
    : <KaraokePicker entries={radio.karaokeCatalog()} favorites={radio.karaokeFavorites()} view={view} take={take} act={action} />;
}
