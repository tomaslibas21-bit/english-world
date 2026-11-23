import { NPCS } from "../content/npcs";
import { TEXT_THREADS } from "../content/texts";
import { townLineText } from "../game/life/lineText";
import { L, TL } from "./i18n";
import { openText, TextFace } from "./TextThread";

const LABELS = { new: L("Nauja žinutė"), read: L("Skaityti") };

export function TextArrival({ id }: { id: string }) {
  const thread = TEXT_THREADS.find((t) => t.id === id);
  const npc = thread && NPCS[thread.from];
  if (!npc) return null;
  return <section className="phone-ring text-arrival" data-thread={id} aria-label={LABELS.new}>
    <TextFace npc={npc.id} name={npc.name} />
    <div className="text-arrival-copy" aria-live="polite">
      <small>{LABELS.new}</small><strong>{npc.name}</strong>
      {thread.lines[0] && <span lang={TL}>{townLineText(thread.lines[0])}</span>}
    </div>
    <button className="btn small" onClick={() => openText(id)}>{LABELS.read}</button>
  </section>;
}
