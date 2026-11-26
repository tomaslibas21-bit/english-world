import { Fragment, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { KIND, type KeepsakeKind } from "../content/keepsakes";
import { SITUATION_BY_ID } from "../content/situations/catalog";
import { cardKey, dueCards, useCards, type Card } from "../state/cards";
import { useStore } from "../state/store";
import { usePackFabric } from "./BackpackTool";
import { CardTools, ExportCards, Glyph, marked, nextReviewLabel, Review, startReview } from "./Cards";
import { Icon, KeepsakeIcon } from "./icons";
import { NotebookSound } from "./NotebookSound";
import { courseCardsUrl, keepsakePockets, phraseCard, practicedRows, sourceName, type PracticedPhrase } from "./notebookData";
import { SitIcon } from "./SitIcon";
import { useReviewDay } from "./useReviewDay";
import "./notebook.css";

const leaves = { cards: "Išsaugotos kortelės", phrases: "Kartotos frazės", keepsakes: "Suvenyrai" };
type Leaf = keyof typeof leaves;
let lastLeaf: Leaf = "cards";
const BATCH = 30;
const empty = {
  cards: "Pokalbyje išsaugok žodį arba sakinį.",
  phrases: "Čia rasi pokalbiuose vartotas frazes.",
  keepsakes: "Užbaik pokalbį ir gausi suvenyrą.",
};

function PocketName({ kind }: { kind: KeepsakeKind }) {
  const { en, nominative } = KIND[kind];
  return <span className="nb-pocket-name"><span lang="en">{en}</span>{" "}<span lang="lt">{nominative}</span></span>;
}

function Source({ id, label }: { id: string; label?: string }) {
  const name = sourceName(id, label);
  return name ? <span className="nb-source">{Object.hasOwn(SITUATION_BY_ID, id) && <SitIcon id={id} size="16" />}{name}</span> : null;
}

function Reading({ card, phrase, now, afterRemove }: { card?: Card; phrase?: PracticedPhrase; now: number; afterRemove: () => void }) {
  const [meaning, setMeaning] = useState(false);
  const hasContext = card && (card.sentence.en !== card.en || card.sentence.lt !== card.lt);
  const inCards = useCards((s) => s.keys.has(cardKey((card ?? phrase)!.en)));
  const line = card ?? phrase!;
  return <article className="nb-reading">
    <Source id={card?.situationId ?? phrase!.sitId} label={card?.sourceLabel} />
    <h3 lang="en" tabIndex={-1} data-reading-title>{line.en}</h3>
    <button className="nb-reveal" aria-expanded={meaning} onClick={() => setMeaning(!meaning)}>
      {meaning ? "Slėpti reikšmę" : "Rodyti reikšmę"}<Icon name={meaning ? "chevronUp" : "chevronDown"} size={15} /></button>
    {meaning && <p lang="lt" className="nb-meaning">{line.lt}</p>}
    {card?.ipa && <p className="rv-ipa">{card.ipa}</p>}
    {hasContext && <section className="nb-context">
      <h4>Sakinys, iš kurio išsaugojai kortelę</h4>
      <p lang="en">{marked(card.sentence.en, card.en)}</p>
      {meaning && <p lang="lt">{card.sentence.lt}</p>}
    </section>}
    <NotebookSound line={card ?? { en: line.en, sentence: { en: line.en, lt: line.lt } }} />
    {card ? <CardTools c={card} now={now} afterRemove={afterRemove} /> :
      <button disabled={inCards} onClick={() => useCards.getState().add(phraseCard(phrase!))}>
        <Icon name={inCards ? "check" : "plus"} size={16} />{inCards ? "Tavo kortelėse" : "Išsaugoti kortelėse"}</button>}
  </article>;
}

function CourseLink() {
  const href = courseCardsUrl(import.meta.env.VITE_CARDS_TARGET, import.meta.env.VITE_BACK_URL, location.origin);
  const link = useRef<HTMLAnchorElement>(null);
  const leaving = useRef(false);
  useLayoutEffect(() => {
    if (!href) return;
    const resume = () => {
      if (leaving.current && !document.hidden) {
        leaving.current = false;
        link.current?.focus({ preventScroll: true });
      }
    };
    window.addEventListener("focus", resume);
    return () => window.removeEventListener("focus", resume);
  }, [href]);
  return href ? <a ref={link} href={href} target="_blank" rel="noopener" onClick={() => { leaving.current = true; }}>
    Atverti kurso korteles <Icon name="arrowRight" size={16} /></a> : null;
}

export function Notebook({ close }: { close: () => void }) {
  const [leaf, setLeaf] = useState(lastLeaf);
  const visit = (tab: Leaf) => { lastLeaf = tab; setLeaf(tab); };
  const [selection, select] = useState<string | null>(null);
  const [source, setSource] = useState<{ id: string; pocket: KeepsakeKind } | null>(null);
  const [limit, setLimit] = useState(BATCH);
  const [round, setRound] = useState<{ ids: string[]; n: number } | null>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const nextFocus = useRef<string | null>('[aria-selected="true"]');
  const fabric = usePackFabric();
  const [spreadQuery] = useState(() => window.matchMedia("(min-width: 671px)"));
  const [wide, setWide] = useState(spreadQuery.matches);
  useLayoutEffect(() => {
    const resize = () => setWide(spreadQuery.matches);
    spreadQuery.addEventListener("change", resize);
    return () => spreadQuery.removeEventListener("change", resize);
  }, [spreadQuery]);
  const today = useReviewDay();
  const cards = useCards((s) => s.cards);
  const keys = useCards((s) => s.keys);
  const progress = useStore((s) => s.progress);
  const saved = useMemo(() => [...cards].reverse().sort((a, b) => b.createdAt - a.createdAt), [cards]);
  const rows = useMemo(() => leaf === "phrases" ? practicedRows(progress.phrases, source?.id) : [], [progress.phrases, source, leaf]);
  const phraseCount = useMemo(() => Object.keys(progress.phrases).length, [progress.phrases]);
  const pockets = useMemo(() => keepsakePockets(progress), [progress]);
  const due = useMemo(() => dueCards(cards, today).length, [cards, today]);
  const counts = { cards: cards.length, phrases: source ? rows.length : phraseCount, keepsakes: pockets.size };
  const returnTo = (id: string) => { nextFocus.current = '[data-entry="' + CSS.escape(id) + '"]'; };
  const changeLeaf = (tab: Leaf) => {
    visit(tab);
    setSource(null); select(null); setRound(null); setLimit(BATCH);
    nextFocus.current = '[aria-selected="true"]';
  };
  const show = (id: string) => {
    select(id);
    nextFocus.current = "[data-reading-title]";
    if (id === selection) sheet.current?.querySelector<HTMLElement>("[data-reading-title]")?.focus();
  };
  const review = () => {
    const ids = startReview();
    if (ids.length) setRound((r) => ({ ids, n: (r?.n ?? 0) + 1 }));
  };
  const endReview = () => {
    setRound(null);
    if (selection) returnTo(selection);
    else nextFocus.current = due ? "[data-review]" : '[aria-selected="true"]';
  };
  const back = () => {
    if (round) { endReview(); return; }
    if (selection) { returnTo(selection); select(null); return; }
    if (source) {
      visit("keepsakes"); select(source.pocket);
      nextFocus.current = '[data-source="' + CSS.escape(source.id) + '"]';
      setSource(null); setLimit(BATCH); return;
    }
    close();
  };
  const filteredPhrases = (pocket: KeepsakeKind, id: string) => {
    setSource({ id, pocket }); visit("phrases");
    setLimit(BATCH); select(null); nextFocus.current = "[data-source-title]";
  };
  const card = saved.find((c) => c.id === selection) ?? saved[0];
  const phrase = rows.find(([id]) => id === selection) ?? rows[0];
  const kind = pockets.has(selection as KeepsakeKind) ? selection as KeepsakeKind : pockets.keys().next().value;
  const hasDetail = selection !== null;
  const remove = () => { nextFocus.current = '[aria-selected="true"]'; select(null); };
  useLayoutEffect(() => {
    if (leaf === "cards" && selection && !cards.some((c) => c.id === selection)) { remove(); return; }
    if (!nextFocus.current) return;
    const node = sheet.current?.querySelector<HTMLElement>(nextFocus.current);
    (node ?? sheet.current?.querySelector<HTMLElement>('[aria-selected="true"]'))?.focus();
    nextFocus.current = null;
  });
  // A controller disconnect or a removed row can briefly put focus outside the dialog.
  useLayoutEffect(() => {
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault(); event.stopImmediatePropagation();
      sheet.current?.querySelector<HTMLButtonElement>("[data-pad-back]")?.click();
    };
    window.addEventListener("keydown", escape, true);
    return () => window.removeEventListener("keydown", escape, true);
  }, []);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const buttons = [...e.currentTarget.querySelectorAll<HTMLElement>("button:enabled, a[href]")]
      .filter((el) => el.getClientRects().length && !el.closest("[inert]"));
    if (e.shiftKey && buttons[0] === document.activeElement) { e.preventDefault(); buttons.at(-1)?.focus(); }
    if (!e.shiftKey && buttons.at(-1) === document.activeElement) { e.preventDefault(); buttons[0]?.focus(); }
  };
  const previewId = leaf === "cards" ? card?.id : leaf === "phrases" ? phrase?.[0] : kind;
  const entry = (id: string) => ({
    "data-entry": id, "aria-pressed": (selection ?? (wide ? previewId : undefined)) === id, onClick: () => show(id),
  });
  const read = leaf === "cards" ? card && <Reading key={card.id} card={card} now={today} afterRemove={remove} /> :
    leaf === "phrases" ? phrase && <Reading key={phrase[0]} phrase={phrase[1]} now={today} afterRemove={remove} /> :
    kind && <article className="nb-reading nb-pocket">
      <div className="nb-envelope"><KeepsakeIcon kind={kind} /></div>
      <h3 data-reading-title tabIndex={-1}><PocketName kind={kind} /></h3>
      <h4>Peržiūrėti frazes</h4>
      {pockets.get(kind)!.map((sit) => <button key={sit.id} data-source={sit.id}
        onClick={() => filteredPhrases(kind, sit.id)}><SitIcon id={sit.id} size={18} />{sit.title.lt}<Icon name="arrowRight" size={16} /></button>)}
    </article>;
  return <div ref={sheet} className="sheet notebook" role="dialog" aria-modal="true" lang="lt"
    aria-labelledby="nb-title" style={fabric} onKeyDown={onKey}>
    <header className="nb-head"><span className="nb-ribbon" aria-hidden><Icon name="backpack" size={22} /></span>
      <h2 id="nb-title">Mano užrašinė</h2>
      <button aria-label="Uždaryti" onClick={close}><Icon name="close" size={20} /></button></header>
    <div className="nb-tabs pb-tabs" role="tablist" aria-label="Mano užrašinė">
      {(Object.keys(leaves) as Leaf[]).map((tab) => <button key={tab} role="tab" id={"nb-tab-" + tab}
        aria-selected={leaf === tab} aria-controls="nb-page" onClick={() => changeLeaf(tab)}
        onKeyDown={(e) => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          const tabs = Object.keys(leaves) as Leaf[];
          changeLeaf(tabs[(tabs.indexOf(tab) + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length]);
        }}>
        {leaves[tab]} <span>{counts[tab]}</span></button>)}
    </div>
    <div id="nb-page" role="tabpanel" aria-labelledby={"nb-tab-" + leaf} className={"nb-spread" + (hasDetail || round ? " reading" : "")}>
      {round ? <Review key={round.n} ids={round.ids} onExit={endReview} onMore={review} /> : <>
        <div className="nb-index" key={leaf + (source?.id ?? "")}>
          {leaf === "cards" && <>
            {due ? <button data-review className="nb-primary" onClick={review}><Icon name="play" size={16} />Kartoti korteles · {due}</button> :
              cards.length > 0 && <p className="nb-next">{nextReviewLabel(cards, today)}</p>}
            <div className="cd-list">{saved.slice(0, limit).map((c) =>
              <button key={c.id} className="nb-entry cd-row" {...entry(c.id)}>
                <span className="cd-en" lang="en">{c.en}</span>
                {(!wide || c.id !== card?.id) && <span className="cd-lt" lang="lt">{c.lt}</span>}
                <Source id={c.situationId} label={c.sourceLabel} />
              </button>)}</div>
          </>}
          {leaf === "phrases" && <>
            {source && <h3 data-source-title tabIndex={-1} aria-label={`${leaves.phrases} ${rows.length} · ${sourceName(source.id)}`}><Source id={source.id} /></h3>}
            {rows.some(([, v]) => !keys.has(cardKey(v.en))) &&
              <button className="nb-primary" onClick={() => useCards.getState().addMany(rows
                .filter(([, v]) => !keys.has(cardKey(v.en))).map(([, v]) => phraseCard(v)))}>
                <Glyph name="plus" size={16} />Išsaugoti visas</button>}
            {rows.slice(0, limit).map(([id, v], i) => <Fragment key={id}>
              {!source && (!i || rows[i - 1][1].sitId !== v.sitId) && <h3 className="nb-group"><Source id={v.sitId} /></h3>}
              <button className="nb-entry" {...entry(id)}>
                <span lang="en">{v.en}</span><span lang="lt" className="cd-lt">{v.lt}</span>
                <small>× {v.count}{keys.has(cardKey(v.en)) && " · Tavo kortelėse"}</small>
              </button></Fragment>)}
          </>}
          {leaf === "keepsakes" && [...pockets].slice(0, limit).map(([k, sources]) =>
            <button className="nb-pocket-row" key={k} {...entry(k)}>
              <span className="nb-envelope"><KeepsakeIcon kind={k} /></span><PocketName kind={k} /><small>{sources.length}</small>
            </button>)}
          {counts[leaf] > limit && <button onClick={() => {
            const first = leaf === "cards" ? saved[limit].id : rows[limit][0];
            returnTo(first); setLimit(limit + BATCH);
          }}>Rodyti daugiau</button>}
          {!counts[leaf] && <p className="nb-empty">{empty[leaf]}</p>}
          {leaf === "cards" && <div className="nb-links"><CourseLink />{cards.length > 0 && <ExportCards />}</div>}
        </div>
        <div className="nb-detail" key={leaf + selection}>
          {(wide || hasDetail) && (read ?? <Icon name={leaf === "keepsakes" ? "gift" : "bookOpen"} size={52} />)}
        </div>
      </>}
    </div>
    <footer><button data-pad-back onClick={back}><Icon name="arrowLeft" size={17} />Grįžti</button></footer>
  </div>;
}
