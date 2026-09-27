import { useEffect, useRef } from "react";
import { useStore } from "../state/store";
import { sceneFor, sceneUrl } from "./scenes";

/** The illustrated place behind the conversation panel: one picture per phase of the conversation
 *  (it changes as the person starts asking the next question), and the "done" picture once the task
 *  is complete. All pictures of the scene stay loaded, so each change is an instant crossfade. */
export function SceneBackdrop() {
  const conv = useStore((s) => s.conv);
  const on = useStore((s) => s.settings.scenes !== false);
  // any conversation with a scene file, calls included (a call shows the person at their end of the line)
  const art = on && conv.active ? sceneFor(conv.sitId, conv.hostId) : undefined;

  // a moment with its own picture shows it; after the task, other moments show the "done" picture;
  // a side question (or any other moment without a picture) keeps the current one; a sticky picture
  // stays until the end. A new conversation starts fresh, even in the same situation.
  const last = useRef<{ run: number; stem: string } | null>(null);
  let stem: string | undefined;
  if (art) {
    const kept = last.current?.run === conv.run ? last.current.stem : undefined;
    stem = (kept && art.sticky?.includes(kept) && kept) || (conv.stepId && art.phases[conv.stepId]) || (conv.completed && art.done) || kept || art.start;
    last.current = { run: conv.run, stem };
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
