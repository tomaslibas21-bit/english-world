import { useEffect, useRef, useState } from "react";
import { useStore, type PlayMode } from "../state/store";
import type { Game } from "../game/Game";
import { prepareExteriorCars } from "../game/exteriorAssets";
import { loadStartupModule } from "../game/startupTask";
import { setGame, game } from "../game/gameRef";
import { coach } from "../game/coach";
import { Title } from "./Title";
import { Hud } from "./Hud";
import { Conversation } from "./Conversation";
import { SceneBackdrop } from "./SceneBackdrop";
import { ViewSwitch } from "./ViewSwitch";
import { Panels } from "./Panels";
import { Toasts } from "./Toasts";
import { LightPlay } from "./LightHome";
import { debugBaristaLink, debugGoFishLink, debugBilliardsLink, takeAutoStart, linkedSituation, takeLinkedSituation } from "./playMode";
import { refreshLocalState } from "../convo/speech";
import { audio } from "../game/audio";
import { radio } from "../radio";
import { AudioDiagnostics } from "./AudioDiagnostics";
import { Loading } from "./Loading";
import { startPlayStats } from "../state/playStats";
import { useSurf } from "../game/surf/store";
import type { PlayWay } from "../game/road/save";

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
  useEffect(() => { if (!mode) useStore.getState().setScreen("title"); refreshLocalState(); }, []);
  if (!mode) return <><Title onPlay={() => setMode(useStore.getState().settings.play)} /><Toasts /><AudioDiagnostics /></>;
  return <>{mode === "light" ? <LightPlay /> : <Play onBack={() => { useStore.getState().setScreen("title"); setMode(null); }} />}<AudioDiagnostics /></>;
  void screen;
}

function Play({ onBack }: { onBack: () => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const tags = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    // three.js and the town are a separate download, fetched only in town mode
    let g: Game | null = null, gone = false;
    const dispose = () => {
      if (g && game === g) setGame(null);
      if (g && (window as any).__ew?.game === g) delete (window as any).__ew;
      g?.dispose();
      g = null;
    };
    useStore.getState().setScreen("loading");
    const gameModule = loadStartupModule(import("../game/Game"));
    const models = prepareExteriorCars();
    void models.catch(() => {});
    const debug = debugBaristaLink ? "barista" : debugGoFishLink ? "gofish" : debugBilliardsLink ? "billiards" : undefined;
    void gameModule.then(({ Game }) => {
      if (gone) return;
      const current = g = new Game(stage.current!, tags.current!, models);
      current.onReady = () => {
        if (gone) return;
        setGame(current);
        (window as any).__ew = {
          game: current, store: useStore, radio, voice: audio.getState, audio, coach, surf: useSurf,
          barista: current.debugBarista(), gofish: current.debugGoFish(), billiards: current.debugBilliards(), carStats: () => current.carStats(),
          ...(import.meta.env.DEV ? {
            sea: () => current.seaDebug(), seaSteer: (lane: number) => current.seaSteer(lane),
            seaTimer: (seconds?: number) => current.seaTimer(seconds),
            seaPlaceBoat: (x: number, z: number, heading?: number) => current.seaPlaceBoat(x, z, heading),
            seaWay: (way?: PlayWay) => current.wordGameWay("sea", way),
            seaStart: (way?: PlayWay) => current.wordGameStart("sea", way),
            seaForceGate: (correct: boolean) => current.wordGameForceGate("sea", correct),
          } : {}),
          road: { state: () => current.roadDebug(), steer: (lane: number) => current.roadSteer(lane), jumpTimer: (seconds?: number) => current.roadJumpTimer(seconds),
            ...(import.meta.env.DEV ? {
              previewOptions: (options?: readonly string[]) => current.roadPreviewOptions(options),
              way: (way?: PlayWay) => current.wordGameWay("road", way),
              start: (way?: PlayWay) => current.wordGameStart("road", way),
              forceGate: (correct: boolean) => current.wordGameForceGate("road", correct),
            } : {}) },
        };
        // (the 3D game opens with the town itself: from the air on a first visit, Game.beginFlight; where the learner
        // left off on later ones. The list of situations opens from its button; owner, 18 Nov 2026. The pictures-only
        // mode's home is the list, LightHome.tsx.)
        setReady(true); useStore.getState().setScreen("play");
        const sit = takeLinkedSituation();
        if (debugBaristaLink) current.debugBarista()?.start();
        else if (debugGoFishLink) current.debugGoFish()?.start();
        else if (debugBilliardsLink) current.debugBilliards()?.start();
        else if (sit) current.startScenario(sit, true);
      };
      return current.init(linkedSituation(), debug);
    }).catch((error) => {
      if (gone) return;
      console.warn("Game startup failed", error);
      dispose();
      setReady(false);
      useStore.getState().setScreen("loading");
      setFailed(true);
    });
    return () => {
      gone = true;
      dispose();
    };
  }, [attempt]);
  return (
    <>
      <div className="stage" ref={stage} />
      <div className="tag-layer" ref={tags} />
      {ready && game && <><Hud /><SceneBackdrop /><ViewSwitch /><Conversation /><Panels /></>}
      <Toasts />
      {!ready && <Loading />}
      {failed && <div className="startup-error" role="alert">
        <p>Nepavyko įkelti žaidimo. Patikrink interneto ryšį ir pabandyk dar kartą.</p>
        <button className="btn" onClick={() => { setFailed(false); setAttempt(attempt + 1); }}>Bandyti dar kartą</button>
        <button className="btn ghost" onClick={onBack}>Grįžti į pradžią</button>
      </div>}
    </>
  );
}
