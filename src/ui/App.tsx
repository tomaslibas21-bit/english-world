import { useEffect, useRef, useState } from "react";
import { useStore, type PlayMode } from "../state/store";
import type { Game } from "../game/Game";
import { setGame, game } from "../game/gameRef";
import { Title } from "./Title";
import { Hud } from "./Hud";
import { Conversation } from "./Conversation";
import { SceneBackdrop } from "./SceneBackdrop";
import { Panels } from "./Panels";
import { Toasts } from "./Toasts";
import { LightPlay } from "./LightHome";
import { takeAutoStart } from "./playMode";
import { refreshLocalState } from "../convo/speech";

export function App() {
  const screen = useStore((s) => s.screen);
  const textSize = useStore((s) => s.settings.textSize);
  // the mode is fixed once playing: switching modes reloads the page (playMode.ts)
  const [mode, setMode] = useState<PlayMode | null>(() => takeAutoStart());
  useEffect(() => { document.documentElement.style.setProperty("--scale", String(textSize)); }, [textSize]);
  useEffect(() => { if (!mode) useStore.getState().setScreen("title"); refreshLocalState(); }, []);
  if (!mode) return <><Title onPlay={() => setMode(useStore.getState().settings.play)} /><Toasts /></>;
  return mode === "light" ? <LightPlay /> : <Play />;
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
      g.onReady = () => { setReady(true); useStore.getState().setScreen("play"); useStore.getState().setHud({ panel: "scenarios" }); };
      g.init();
      (window as any).__ew = { game: g, store: useStore };
    });
    return () => { gone = true; g?.dispose(); setGame(null); };
  }, []);
  return (
    <>
      <div className="stage" ref={stage} />
      <div className="tag-layer" ref={tags} />
      {ready && game && <><Hud /><SceneBackdrop /><Conversation /><Panels /></>}
      <Toasts />
      {!ready && <div className="loading">Kuriamas Maple Harbor…</div>}
    </>
  );
}
