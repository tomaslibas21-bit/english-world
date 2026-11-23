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
import { debugBaristaLink, takeAutoStart, takeLinkedSituation } from "./playMode";
import { refreshLocalState } from "../convo/speech";
import { L } from "./i18n";
import { audio } from "../game/audio";
import { radio } from "../radio";
import { AudioDiagnostics } from "./AudioDiagnostics";
import { Loading } from "./Loading";
import { EDITION } from "../edition";
import { startPlayStats } from "../state/playStats";
import { useSurf } from "../game/surf/store";

export function App() {
  const screen = useStore((s) => s.screen);
  const textSize = useStore((s) => s.settings.textSize);
  // the mode is fixed once playing: switching modes reloads the page (playMode.ts)
  const [mode, setMode] = useState<PlayMode | null>(() => takeAutoStart());
  useEffect(() => { document.documentElement.style.setProperty("--scale", String(textSize)); }, [textSize]);
  useEffect(() => audio.bindGestures(), []);
  useEffect(() => startPlayStats({ playing: () => radio.store.getState().playing, subscribe: (fn) => radio.store.subscribe(fn) }), []);
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
    import("../game/Game").then(({ Game }) => {
      if (gone) return;
      g = new Game(stage.current!, tags.current!);
      setGame(g);
      g.onReady = () => {
        // (the 3D game opens with the town itself: from the air on a first visit, Game.beginFlight; where the learner
        // left off on later ones. The list of situations opens from its button; owner, 18 Nov 2026. The pictures-only
        // mode's home is the list, LightHome.tsx.)
        setReady(true); useStore.getState().setScreen("play");
        const sit = takeLinkedSituation();
        if (debugBaristaLink) g!.debugBarista()?.start();
        else if (sit) g!.startScenario(sit);
      };
      g.init();
      (window as any).__ew = {
        game: g, store: useStore, radio, voice: audio.getState, audio, coach, surf: useSurf, carStats: () => g!.carStats(),
        ...(import.meta.env.DEV ? {
          sea: () => g!.seaDebug(), seaSteer: (lane: number) => g!.seaSteer(lane),
          seaTimer: (seconds?: number) => g!.seaTimer(seconds),
          seaPlaceBoat: (x: number, z: number, heading?: number) => g!.seaPlaceBoat(x, z, heading),
        } : {}),
        road: { state: () => g!.roadDebug(), steer: (lane: number) => g!.roadSteer(lane), jumpTimer: (seconds?: number) => g!.roadJumpTimer(seconds) },
        barista: g.debugBarista(),
      };
    });
    return () => { gone = true; g?.dispose(); setGame(null); };
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
