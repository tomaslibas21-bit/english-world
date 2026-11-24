import { useEffect, useRef, useState } from "react";
import { useStore, type PlayMode } from "../state/store";
import type { Game } from "../game/Game";
import { setGame, game } from "../game/gameRef";
import { coach } from "../game/coach";
import { Title } from "./Title";
import { GlyphCard } from "./Cave";
import { Hud } from "./Hud";
import { Conversation } from "./Conversation";
import { SceneBackdrop } from "./SceneBackdrop";
import { ViewSwitch } from "./ViewSwitch";
import { Panels } from "./Panels";
import { Toasts } from "./Toasts";
import { LightPlay } from "./LightHome";
import { debugBilliardsLink, debugBaristaLink, takeAutoStart, takeLinkedSituation } from "./playMode";
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
  useEffect(() => { if (!mode) useStore.getState().setScreen("title"); refreshLocalState(); }, []);
  if (!mode) return <><Title onPlay={() => setMode(useStore.getState().settings.play)} /><Toasts />{EDITION.id === "en" && <AudioDiagnostics />}</>;
  return <>{mode === "light" ? <LightPlay /> : <Play />}{EDITION.id === "en" && <AudioDiagnostics />}</>;
  void screen;
}

function Play() {
  const stage = useRef<HTMLDivElement>(null);
  const tags = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // three.js and the town are a separate download, fetched only in town mode
    let g: Game | null = null, gone = false;
    const debugWindow = window as Window & { __ew?: { game: Game } };
    const release = () => {
      if (g && game === g) setGame(null);
      if (debugWindow.__ew?.game === g) delete debugWindow.__ew;
      g?.dispose();
      g = null;
    };
    void import("../game/Game").then(({ Game }) => {
      if (gone) return;
      const instance = g = new Game(stage.current!, tags.current!);
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
        // The town is the 3D game's home. Linked activities start once the first frame has been drawn.
        setReady(true); useStore.getState().setScreen("play");
        const sit = takeLinkedSituation();
        if (debugBilliardsLink) instance.debugBilliards()?.start();
        else if (debugBaristaLink) instance.debugBarista()?.start();
        else if (sit) instance.startScenario(sit);
      };
      return instance.init();
    }).catch((error) => {
      if (gone) return;
      release();
      console.error("Town startup failed", error);
    });
    return () => { gone = true; release(); };
  }, []);
  return (
    <>
      <div className="stage" ref={stage} />
      <div className="tag-layer" ref={tags} />
      {ready && game && <><Hud /><SceneBackdrop /><ViewSwitch /><Conversation /><Panels /><GlyphCard /></>}
      <Toasts />
      {!ready && <Loading />}
    </>
  );
}
