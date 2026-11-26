import { useEffect, useRef, useState } from "react";
import { useStore, type PlayMode } from "../state/store";
import type { Game } from "../game/Game";
import { setGame, game } from "../game/gameRef";
import { coach } from "../game/coach";
import { prepareExteriorCars } from "../game/exteriorAssets";
import { loadStartupModule } from "../game/startupTask";
import { Title } from "./Title";
import { GlyphCard } from "./Cave";
import { Hud } from "./Hud";
import { Conversation } from "./Conversation";
import { SceneBackdrop } from "./SceneBackdrop";
import { ViewSwitch } from "./ViewSwitch";
import { Panels } from "./Panels";
import { Toasts } from "./Toasts";
import { LightPlay } from "./LightHome";
import { debugBilliardsLink, debugBaristaLink, linkedSituation, takeAutoStart, takeLinkedSituation } from "./playMode";
import { refreshLocalState } from "../convo/speech";
import { L } from "./i18n";
import { audio } from "../game/audio";
import { radio } from "../radio";
import { AudioDiagnostics } from "./AudioDiagnostics";
import { Loading } from "./Loading";
import { EDITION } from "../edition";
import { startPlayStats } from "../state/playStats";
import type { PlayWay } from "../game/road/save";
import { useSurf } from "../game/surf/store";

export function App() {
  const screen = useStore((s) => s.screen);
  const textSize = useStore((s) => s.settings.textSize);
  // the mode is fixed once playing: switching modes reloads the page (playMode.ts)
  const [mode, setMode] = useState<PlayMode | null>(() => takeAutoStart());
  useEffect(() => { document.documentElement.style.setProperty("--scale", String(textSize)); }, [textSize]);
  useEffect(() => audio.bindGestures(), []);
  useEffect(() => startPlayStats({ playing: () => {
    const { playing, spot } = radio.store.getState();
    return playing && !spot;
  }, subscribe: (fn) => radio.store.subscribe(fn) }), []);
  useEffect(() => {
    const state = useStore.getState();
    if (!mode) state.setScreen("title");
    if (state.settings.onDevice) void refreshLocalState();
  }, []);
  if (!mode) return <><Title onPlay={() => setMode(useStore.getState().settings.play)} /><Toasts />{EDITION.id === "en" && <AudioDiagnostics />}</>;
  return <>{mode === "light" ? <LightPlay /> : <Play onBack={() => { useStore.getState().setScreen("title"); setMode(null); }} />}{EDITION.id === "en" && <AudioDiagnostics />}</>;
  void screen;
}

function Play({ onBack }: { onBack: () => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const tags = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [failure, setFailure] = useState<{ retry(): void; back(): void } | null>(null);
  const panelsMounted = ready && !!game;
  useEffect(() => {
    // Start all three requests in this effect, before either module is available.
    useStore.getState().setScreen("loading");
    const models = prepareExteriorCars();
    const module = loadStartupModule(import("../game/Game"));
    const debugStart = debugBilliardsLink ? "billiards" : debugBaristaLink ? "barista" : undefined;
    const linked = linkedSituation();
    let g: Game | null = null, gone = false;
    const debugWindow = window as Window & { __ew?: { game: Game } };
    const release = () => {
      if (g && game === g) setGame(null);
      if (debugWindow.__ew?.game === g) delete debugWindow.__ew;
      g?.dispose();
      g = null;
    };
    void module.then(({ Game }) => {
      if (gone || !stage.current || !tags.current) return;
      const instance = g = new Game(stage.current, tags.current, models);
      instance.onExteriorError = (retry, back) => {
        if (!gone && g === instance) setFailure({ retry, back });
      };
      instance.onReady = () => {
        if (gone || g !== instance) return;
        setGame(instance);
        const debug = {
          game: instance, store: useStore, radio, voice: audio.getState, audio, coach, surf: useSurf, carStats: () => instance.carStats(),
          ...(import.meta.env.DEV ? {
            sea: () => instance.seaDebug(), seaSteer: (lane: number) => instance.seaSteer(lane),
            seaTimer: (seconds?: number) => instance.seaTimer(seconds),
            seaPlaceBoat: (x: number, z: number, heading?: number) => instance.seaPlaceBoat(x, z, heading),
            seaWay: (way?: PlayWay) => instance.wordGameWay("sea", way),
            seaStart: (way?: PlayWay) => instance.wordGameStart("sea", way),
            seaForceGate: (correct: boolean) => instance.wordGameForceGate("sea", correct),
          } : {}),
          road: { state: () => instance.roadDebug(), steer: (lane: number) => instance.roadSteer(lane), jumpTimer: (seconds?: number) => instance.roadJumpTimer(seconds),
            ...(import.meta.env.DEV ? {
              previewOptions: (options?: readonly string[]) => instance.roadPreviewOptions(options),
              way: (way?: PlayWay) => instance.wordGameWay("road", way),
              start: (way?: PlayWay) => instance.wordGameStart("road", way),
              forceGate: (correct: boolean) => instance.wordGameForceGate("road", correct),
            } : {}) },
          billiards: instance.debugBilliards(), barista: instance.debugBarista(), loteria: instance.debugLoteria(),
        };
        debugWindow.__ew = debug;
        // The initialized game and HUD become visible together after the first draw.
        useStore.getState().setScreen("play");
        setReady(true);
        const sit = takeLinkedSituation();
        if (debugBilliardsLink) instance.debugBilliards()?.start();
        else if (debugBaristaLink) instance.debugBarista()?.start();
        else if (sit) instance.startScenario(sit, sit === linked);
      };
      return instance.init(linked, debugStart);
    }).catch((error) => {
      if (gone) return;
      release();
      setReady(false);
      console.error("Town startup failed", error);
      setFailure({ retry: () => setAttempt((previous) => previous + 1), back: onBack });
    });
    return () => { gone = true; release(); };
  }, [attempt]);
  return (
    <>
      <div className="stage" ref={stage} />
      <div className="tag-layer" ref={tags} />
      {panelsMounted && <><Hud /><SceneBackdrop /><ViewSwitch /><Conversation /><Panels /><GlyphCard /></>}
      <Toasts panelsMounted={panelsMounted} />
      {!ready && <Loading />}
      {failure && <div className="startup-error" role="alert">
        <p>{L("Nepavyko įkelti žaidimo")}.</p>
        <button className="btn" onClick={() => { setFailure(null); failure.retry(); }}>{L("Bandyti dar kartą")}</button>
        <button className="btn ghost" onClick={() => { setFailure(null); failure.back(); }}>{L("Grįžti")}</button>
      </div>}
    </>
  );
}
