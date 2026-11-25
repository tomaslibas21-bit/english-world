import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NPCS } from "../content/npcs";
import { TEXT_THREADS, type TextLine, type TextThread as Thread } from "../content/texts";
import { useStore } from "../state/store";
import type { TextProgress } from "../state/progress";
import { Icon } from "./icons";
import { usePortrait } from "./usePortrait";

const LABELS = {
  list: "Žinutės",
  back: "Atgal",
  hint: "Paliesk žinutę – pamatysi vertimą.",
  reply: "Atsakyk:",
  sent: "Išsiųsta",
};

export function TextFace({ npc, name }: { npc: string; name: string }) {
  const portrait = usePortrait(npc);
  return <span className="phone-ring-avatar text-face" aria-hidden>{portrait ? <img src={portrait} alt="" /> : name.charAt(0)}</span>;
}

export function openText(id: string) {
  const st = useStore.getState();
  if (!st.progress.texts?.got[id]) return;
  if (!st.progress.texts.got[id].read) st.updateProgress((p) => { p.texts!.got[id].read = true; });
  st.setHud({ panel: "phone", textThread: id, textArrival: null });
}

export function TextList({ got }: { got: TextProgress["got"] | undefined }) {
  if (!got) return null;
  const threads = TEXT_THREADS.filter(({ id, from }) => got[id] && NPCS[from]).sort((a, b) => got[b.id].at - got[a.id].at);
  if (!threads.length) return null;
  return <section className="text-list">
    <h2>{LABELS.list}</h2>
    {threads.map((thread) => {
      const npc = NPCS[thread.from], entry = got[thread.id], reply = thread.replies[entry.reply ?? -1];
      const line = reply?.answer.at(-1) ?? reply ?? thread.lines.at(-1);
      return <button key={thread.id} className="contact text-contact" data-thread={thread.id} onClick={() => openText(thread.id)}>
        <TextFace npc={npc.id} name={npc.name} />
        <span className="txt"><b>{npc.name}</b><span lang="en">{line?.en}</span></span>
        {!entry.read && <span className="text-unread" />}
      </button>;
    })}
  </section>;
}

function Bubble({ line, mine = false }: { line: TextLine; mine?: boolean }) {
  const [translated, show] = useState(false);
  const toggle = () => {
    show(!translated);
    const st = useStore.getState();
    if (!st.progress.texts?.translated) st.updateProgress((p) => { if (p.texts) p.texts.translated = true; });
  };
  return <div className={"text-message" + (mine ? " mine" : "")}>
    <button type="button" className="text-bubble" onClick={toggle} aria-expanded={translated}>
      <span lang="en">{line.en}</span>
      {translated && <small lang="lt">{line.lt}</small>}
    </button>
    {mine && <small className="text-sent">{LABELS.sent}</small>}
  </div>;
}

export function TextThread({ thread, entry }: { thread: Thread; entry: TextProgress["got"][string] }) {
  const npc = NPCS[thread.from];
  const translated = useStore((s) => s.progress.texts?.translated);
  const [typing, setTyping] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const body = useRef<HTMLDivElement>(null);
  const reply = thread.replies[entry.reply ?? -1];
  useEffect(() => () => clearTimeout(timer.current), []);
  useLayoutEffect(() => {
    const scroller = body.current;
    if (scroller) scroller.scrollTop = reply ? scroller.scrollHeight : 0;
  }, [thread.id, reply, typing]);

  const send = (index: number) => {
    const st = useStore.getState();
    if (st.progress.texts?.got[thread.id]?.reply !== undefined) return;
    setTyping(true);
    st.updateProgress((p) => { p.texts!.got[thread.id].reply = index; });
    timer.current = setTimeout(() => setTyping(false), 1200);
  };

  return <section className="text-thread" data-pad-scope="thread" data-thread={thread.id}>
    <header className="text-thread-head">
      <button className="phone-close" data-pad-back aria-label={LABELS.back} onClick={() => useStore.getState().setHud({ textThread: null })}><Icon name="arrowLeft" size={20} /></button>
      <TextFace npc={npc.id} name={npc.name} /><div><strong>{npc.name}</strong><small>{npc.role.lt}</small></div>
    </header>
    <div className="text-thread-body" ref={body}>
      {!translated && <p className="text-hint">{LABELS.hint}</p>}
      {thread.lines.map((line, i) => <Bubble key={i} line={line} />)}
      {reply && <>
        <Bubble line={reply} mine />
        {typing ? <div className="text-typing" aria-hidden><i /><i /><i /></div>
          : reply.answer.map((line, i) => <Bubble key={`a${i}`} line={line} />)}
      </>}
    </div>
    {!reply && <div className="text-replies">
      <strong>{LABELS.reply}</strong>
      {thread.replies.map((choice, i) => <button type="button" key={i} onClick={() => send(i)}><span lang="en">{choice.en}</span><small lang="lt">{choice.lt}</small></button>)}
    </div>}
  </section>;
}
