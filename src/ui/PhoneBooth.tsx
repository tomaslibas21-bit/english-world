import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { townDirectory, PRACTICES, missionUrl, practiceTurns, type Contact, type PracticeId, type PracticeTurn } from "../content/phoneBooth";
import { invitationLocation } from "../content/phoneCalls";
import { LOCATIONS } from "../content/locations";
import { audio } from "../game/audio";
import { radio } from "../radio";
import { useStore } from "../state/store";
import { Icon } from "./icons";
import "./phoneBooth.css";

type Page = "index" | "detail" | "practice";

export default function PhoneBooth({ close }: { close: () => void }) {
  const contacts = useMemo(townDirectory, []);
  const [selected, select] = useState(contacts[0]);
  const [page, setPage] = useState<Page>("index");
  const book = useRef<HTMLDivElement>(null);
  const back = () => page === "index" ? close() : setPage("index");

  useLayoutEffect(() => {
    const selector = page === "index" ? '[aria-current="true"]' : "[data-entry-focus]";
    book.current?.querySelector<HTMLElement>(selector)?.focus();
  }, [page, selected]);

  // A tap on printed text can move native focus back to the document. B, Esc
  // and keyboard navigation still belong to this open book.
  useEffect(() => {
    function navigate(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!event.repeat) {
          if (page === "index") close();
          else setPage("index");
        }
        return;
      }
      if (!["Tab", "ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
      const controls = Array.from(book.current!.querySelectorAll<HTMLElement>("button:enabled, a[href]"))
        .filter(el => el.getClientRects().length);
      const current = controls.indexOf(document.activeElement as HTMLElement);
      const reverse = event.shiftKey || event.key === "ArrowUp" || event.key === "ArrowLeft";
      event.preventDefault();
      const next = current < 0 ? (reverse ? controls.length - 1 : 0) : (current + (reverse ? -1 : 1) + controls.length) % controls.length;
      controls[next]?.focus();
    }
    window.addEventListener("keydown", navigate, true);
    return () => window.removeEventListener("keydown", navigate, true);
  }, [page, close]);

  function names(group: Contact[], title: string) {
    return <section><h3>{title}</h3>{group.map(contact =>
      <button key={contact.npc.id} data-contact={contact.npc.id} aria-current={selected === contact}
        disabled={page === "practice"} onClick={() => { select(contact); setPage("detail"); }}>
        <strong>{contact.npc.name}</strong><span>{contact.npc.role.lt}</span>
      </button>)}</section>;
  }

  return <div ref={book} role="dialog" aria-modal="true" aria-labelledby="booth-title"
    className="booth-book" data-page={page}>
    <header className="booth-heading"><Icon name="phoneCall" size={24} /><h2 id="booth-title">Miesto telefonų knyga</h2>
      {page === "index" && <button className="booth-close" data-pad-back aria-label="Uždaryti" onClick={close}><Icon name="close" size={20} /></button>}
    </header>
    <div className="booth-pages">
      <nav className="booth-index" aria-labelledby="booth-title">
        {names(contacts.filter(c => c.practice), "Mokomieji skambučiai")}
        {names(contacts.filter(c => !c.practice), "Miesto žmonės")}
      </nav>
      <div className="booth-leaf">
        {page === "practice" && selected.practice
          ? <Practice id={selected.practice} contact={selected} hangUp={back} />
          : <Details contact={selected} detailOpen={page === "detail"} back={back} start={() => setPage("practice")} />}
      </div>
    </div>
  </div>;
}

function Details({ contact, detailOpen, back, start }: { contact: Contact; detailOpen: boolean; back: () => void; start: () => void }) {
  const phone = useStore(s => s.progress.phone);
  const { npc, practice, calls } = contact;
  const meeting = npc.id === "lizzie" && phone?.invitation && invitationLocation(phone.invitation.place);
  const places = meeting ? [...contact.places, LOCATIONS[meeting]] : contact.places;
  return <>
    <div className="booth-body">
      <h3 className="booth-name">{npc.name}</h3>
      <p>{[npc.role.lt, ...contact.organizations.filter(org => !npc.role.lt.includes(org))].join(" · ")}</p>
      {places.length > 0 && <section><h4>Galima sutikti mieste</h4>{places.map(p =>
        <p key={p.id}><span lang="en">{p.name}</span><br />{p.lt}</p>)}</section>}
      <section className="booth-offer"><h4>Mokomieji skambučiai</h4>
        {practice ? <div className="booth-offer-row">
          <p>{PRACTICES[practice].topic}</p>
          <button className="booth-primary" data-entry-focus onClick={start}>Pradėti mokomąjį skambutį</button>
        </div> : <p>Mokomojo skambučio nėra</p>}
      </section>
      {!!calls.length && <section><h4>Tavo telefone</h4>{calls.map(s => <div className="booth-personal" key={s.id}>
        <span>{s.title.lt}{s.mode === "video" && " · Vaizdo skambutis"}</span>
        {phone?.missed[s.id] && <button onClick={() => {
          const st = useStore.getState();
          if (st.progress.phone?.missed[s.id]) st.setHud({ panel: "phone", phoneMissedFocus: s.id, textThread: null });
        }} aria-label={`Atverti savo telefone · ${s.title.lt}`}>Atverti savo telefone</button>}
      </div>)}</section>}
    </div>
    {detailOpen && <footer className="booth-actions">
      <button data-pad-back data-entry-focus={!practice || undefined} onClick={back}>Grįžti į telefonų knygą</button>
    </footer>}
  </>;
}

function Practice({ id, contact, hangUp }: { id: PracticeId; contact: Contact; hangUp: () => void }) {
  const gender = useStore(s => s.progress.profile?.gender ?? "f");
  const [turns, setTurns] = useState<PracticeTurn[]>([]);
  const [loadAttempt, reload] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const [index, setIndex] = useState(0);
  const [listen, setListen] = useState(0);
  const [failed, setFailed] = useState(false);
  const [meaning, setMeaning] = useState(false);
  const [paused, setPaused] = useState(document.hidden);
  const clip = useRef<AbortController | null>(null);
  const line = turns[index];
  const complete = turns.length > 0 && index === turns.length;
  const href = missionUrl(id, import.meta.env.VITE_BACK_URL, location.href);
  const firstAction = useRef<HTMLButtonElement>(null);
  const dialogue = useRef<HTMLDivElement>(null);
  const translation = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    radio.hold("phonebooth", true);
    const pause = () => { clip.current?.abort(); setPaused(true); };
    const visibility = () => { if (document.hidden) pause(); };
    window.addEventListener("pagehide", pause);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clip.current?.abort();
      window.removeEventListener("pagehide", pause);
      document.removeEventListener("visibilitychange", visibility);
      radio.release("phonebooth");
    };
  }, []);

  useEffect(() => {
    let active = true;
    practiceTurns(id, gender).then(rows => { if (active) setTurns(rows); },
      () => { if (active) setLoadFailed(true); });
    return () => { active = false; };
  }, [id, gender, loadAttempt]);

  useEffect(() => {
    if (paused || document.hidden || !line || (line.learner && !listen)) return;
    const request = new AbortController();
    clip.current = request;
    const unavailable = () => { if (!request.signal.aborted) setFailed(true); };
    void audio.play(line.voice, 1, line.sentence.say, {
      recordingOnly: true, optional: true, signal: request.signal, onUnavailable: unavailable,
    }).then(ok => { if (!ok) unavailable(); }, unavailable);
    return () => request.abort();
  }, [paused, line, listen]);

  function move(next: number) {
    clip.current?.abort();
    setListen(0);
    setFailed(false);
    setMeaning(false);
    setIndex(next);
  }
  function replay() {
    clip.current?.abort();
    setFailed(false);
    setListen(n => n + 1);
  }

  useLayoutEffect(() => {
    if (dialogue.current) dialogue.current.scrollTop = 0;
    firstAction.current?.focus();
  }, [line, complete, paused, loadFailed]);
  useLayoutEffect(() => {
    if (meaning) translation.current?.scrollIntoView({ block: "nearest" });
  }, [meaning]);
  const speaker = line?.learner ? "Tavo eilė" : contact.npc.name;
  return <>
    <div ref={dialogue} className="booth-body">
      <h3 className="booth-name">{contact.npc.name}</h3>
      <p className="booth-topic">{PRACTICES[id].topic}</p>
      <div aria-live="polite" aria-atomic="true">
        {line && <><h4>{speaker} · {index + 1} / {turns.length}</h4>
          <p lang="en" className="booth-line">{line.sentence.en}</p>
          {line.learner && <p>Pabandyk pasakyti garsiai.</p>}</>}
        {complete && <h4>Praktika baigta</h4>}
      </div>
      {line && meaning && <p ref={translation} className="booth-meaning">{line.sentence.nat}</p>}
      {line && failed && !paused && <p role="status">Garso įrašas nepasiekiamas</p>}
      {!line && !complete && (loadFailed ? <><p role="status">Nepavyko atsisiųsti pokalbio</p>
        <button ref={firstAction} onClick={() => { setLoadFailed(false); reload(n => n + 1); }}>Bandyti dar kartą</button></> : <p role="status">Kraunamas pokalbis…</p>)}
      {complete && href && <a href={href} target="_blank" rel="noopener noreferrer" onClick={hangUp}>
        Atverti kurse · {contact.calls.find(s => s.id === id)?.topic.lt}</a>}
    </div>
    {line && <div className="booth-tools">
      <button aria-expanded={meaning} onClick={() => setMeaning(!meaning)}>{meaning ? "Slėpti reikšmę" : "Rodyti reikšmę"}</button>
      {paused
        ? <button ref={firstAction} onClick={() => { setFailed(false); setPaused(false); }}>Tęsti</button>
        : <button onClick={replay}><Icon name="speaker" size={18} />
          {failed ? "Bandyti dar kartą" : line.learner ? "Klausytis atsakymo pavyzdžio" : "Dar kartą klausytis eilutės"}</button>}
    </div>}
    <footer className="booth-actions">
      <button data-pad-back data-entry-focus onClick={hangUp}>Padėti ragelį</button>
      {line && <button ref={paused ? undefined : firstAction} className="booth-primary" disabled={paused} onClick={() => move(index + 1)}>Pereiti prie kitos replikos</button>}
      {complete && <button ref={firstAction} className="booth-primary" onClick={() => move(0)}>Kartoti skambutį</button>}
    </footer>
  </>;
}
