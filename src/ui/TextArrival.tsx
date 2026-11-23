import { NPCS } from "../content/npcs";
import { TEXT_THREADS } from "../content/texts";
import { openText, TextFace } from "./TextThread";

const LABELS = { new: "Nauja žinutė", read: "Skaityti" };

export function TextArrival({ id }: { id: string }) {
  const thread = TEXT_THREADS.find((t) => t.id === id);
  const npc = thread && NPCS[thread.from];
  if (!npc) return null;
  return <section className="phone-ring text-arrival" data-thread={id} aria-label={LABELS.new}>
    <TextFace npc={npc.id} name={npc.name} />
    <div className="text-arrival-copy" aria-live="polite">
      <small>{LABELS.new}</small><strong>{npc.name}</strong>
      <span lang="en">{thread.lines[0]?.en}</span>
    </div>
    <button className="btn small" onClick={() => openText(id)}>{LABELS.read}</button>
  </section>;
}
