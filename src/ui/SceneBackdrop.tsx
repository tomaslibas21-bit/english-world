import { useEffect, useRef } from "react";
import { useStore } from "../state/store";
import { sceneFor, sceneUrl } from "./scenes";

/** The illustrated place behind the conversation panel: one picture per phase of the conversation
 *  (it changes as the person starts asking the next question), and the "done" picture once the task
 *  is complete. All pictures of the scene stay loaded, so each change is an instant crossfade. */
export function SceneBackdrop() {
  const conv = useStore((s) => s.conv);
  const on = useStore((s) => s.settings.scenes !== false);
  const art = on && conv.active && conv.mode === "talk" ? sceneFor(conv.sitId, conv.hostId) : undefined;

  // a moment with its own picture shows it; after the task, other moments show the "done" picture;
  // a side question (or any other moment without a picture) keeps the current one
  const last = useRef<{ sit: string; stem: string } | null>(null);
  let stem: string | undefined;
  if (art) {
    const kept = last.current?.sit === conv.sitId ? last.current.stem : undefined;
    stem = (conv.stepId && art.phases[conv.stepId]) || (conv.completed && art.done) || kept || art.start;
    last.current = { sit: conv.sitId, stem };
  }

  useEffect(() => {
    document.body.classList.toggle("scene-on", !!art);
    return () => document.body.classList.remove("scene-on");
  }, [art]);

  if (!art || !stem) return null;
  const pos = `${art.focus[0]}% ${art.focus[1]}%`;
  return (
    <div className="scene-backdrop" aria-hidden="true">
      {art.images.map((k) => (
        <img key={k} src={sceneUrl(k)} alt="" draggable={false} className={stem === k ? "on" : ""}
          style={{ objectPosition: pos, transformOrigin: pos }} />
      ))}
    </div>
  );
}
