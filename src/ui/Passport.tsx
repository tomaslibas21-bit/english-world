import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { inEnglishMaster } from "../passport/course";
import { copy, sections, withCount, type Section, type Words } from "../passport/words";
import type { Stamp } from "../passport/stamps";
import { usePassport } from "../passport/usePassport";
import { useStore } from "../state/store";
import { Icon, KeepsakeIcon, Stars, type IconName } from "./icons";
import { SitIcon } from "./SitIcon";
import "./passport.css";

const pageSize = 8;
const sectionIcons: Record<Section, IconName> = {
  situations: "journal", places: "pin", games: "play", keepsakes: "gift", cards: "card", songs: "headphones", books: "bookOpen",
};
function Caption({ label }: { label: Words }) {
  return <><span lang="en">{label.en}</span>{label.lt && <small lang="lt">{label.lt}</small>}</>;
}
function Mark({ row }: { row: Stamp }) {
  return <span className="passport-mark" aria-hidden="true">
    {row.keepsake ? <KeepsakeIcon kind={row.keepsake} /> : row.situation ? <SitIcon id={row.situation} size={28} /> : <Icon name={sectionIcons[row.section]} size={28} />}
    <span>Maple Harbor</span>
  </span>;
}
function Proof({ row, press }: { row: Stamp; press: boolean }) {
  return <article className="passport-proof" data-earned={row.earned}>
    <div className={"passport-proof-mark" + (press ? " printing" : "")}><Mark row={row} /></div>
    <p className="passport-status"><Caption label={row.earned ? copy.earned : copy.available} /></p>
    {row.book && row.book.en !== row.title.en && <p className="passport-group"><Caption label={row.book} /></p>}
    <h3><Caption label={row.title} /></h3>
    {row.stars !== undefined && <Stars n={row.stars} />}
    {!row.earned && <p><Caption label={row.condition} /></p>}
    <ul>{row.proof.map((p, i) => <li key={i}><Caption label={p} /></li>)}</ul>
    {row.href && <a className="passport-link" target="_blank" rel="noopener noreferrer" href={row.href}><Caption label={copy.link} /><Icon name="arrowRight" size={18} /></a>}
  </article>;
}

export default function Passport({ close }: { close(): void }) {
  const [section, setSection] = useState<Section>("situations");
  const source = usePassport(section);
  const large = useStore(s => s.settings.textSize >= 1.3);
  const [page, setPage] = useState(0), [selected, select] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [pressed, setPressed] = useState<string | null>(null);
  const [announcement, announce] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const opened = useRef<string | null>(null), interacted = useRef(false);
  const focusAfter = useRef<string | null>(".passport-picker");
  const [tick, redraw] = useState(0);
  const bySection = useMemo(() => {
    const result = new Map<Section, Stamp[]>();
    for (const row of source.rows) {
      const list = result.get(row.section);
      if (list) list.push(row); else result.set(row.section, [row]);
    }
    for (const [key, list] of result) if (key !== "books") list.sort((a, b) => Number(b.earned) - Number(a.earned));
    return result;
  }, [source.rows]);
  const earned = useMemo(() => source.rows.filter(row => row.earned).map(row => row.id), [source.rows]);
  const pending = useMemo(() => source.history.pending(earned), [source.history, earned, tick, source.revision]);
  const visibleSections = (Object.keys(sections) as Section[]).filter(k =>
    (k !== "books" && k !== "songs") || (inEnglishMaster && !source.missing.includes(k)));
  const list = bySection.get(section) ?? [];
  const count = showFavorites ? source.favorites.length : list.length;
  const pages = Math.max(1, Math.ceil(count / pageSize)), leaf = Math.min(page, pages - 1);
  const start = leaf * pageSize, cells = list.slice(start, start + pageSize);
  const current = list.find(s => s.id === selected);
  const proof = current ?? cells[0];
  const pendingRows = pending ?? [];

  function openRow(row: Stamp, reveal = false) {
    const index = bySection.get(row.section)?.findIndex(s => s.id === row.id) ?? 0;
    setSection(row.section); setShowFavorites(false); setPage(Math.max(0, Math.floor(index / pageSize)));
    select(row.id); setPressed(reveal ? row.id : null);
    focusAfter.current = ".passport-proof h3";
  }
  function nextStamp(onOpen = false) {
    const present = () => {
      if (!root.current || root.current.dataset.save !== source.prefix) return;
      const fresh = source.history.pending(earned);
      if (fresh === null) {
        source.history.presentBaseline(earned);
      } else if (!(onOpen && interacted.current)) {
        const row = source.rows.find(s => s.id === fresh[0]);
        if (row) {
          // Hold the cross-tab lock until the detail is actually in the DOM.
          flushSync(() => openRow(row, true));
          source.history.present(row.id);
          announce(copy.earned.lt + " · " + row.title.lt);
        }
      }
      redraw(n => n + 1);
    };
    if (navigator.locks) void navigator.locks.request(source.prefix, present).catch(() => present());
    else void Promise.resolve().then(present);
  }
  useEffect(() => {
    if (opened.current === source.prefix || source.loading) return;
    if (opened.current) {
      select(null); setSection("situations"); setPage(0); setPressed(null); setShowFavorites(false);
      interacted.current = false;
    }
    opened.current = source.prefix;
    nextStamp(true);
  }, [source.prefix, source.loading]);
  useEffect(() => {
    if (!current?.earned || current.id === pressed || !source.history.pending(earned)?.includes(current.id)) return;
    source.history.present(current.id);
    redraw(n => n + 1);
  }, [current, pressed, source.history, earned]);
  useLayoutEffect(() => {
    const selector = focusAfter.current;
    if (!selector || !root.current) return;
    const target = root.current.querySelector<HTMLElement>(selector);
    const el = target?.getClientRects().length ? target : root.current.querySelector<HTMLElement>("nav button[aria-pressed=true]");
    if (el) {
      if (!el.matches("button,select,a")) el.tabIndex = -1;
      el.focus(); focusAfter.current = null;
    }
  });
  function choose(key: Section) {
    interacted.current = true;
    setSection(key); setPage(0); select(null); setPressed(null); setShowFavorites(false);
  }
  function back() {
    if (current) {
      focusAfter.current = '[data-stamp="' + current.id + '"]';
      setPage(Math.floor(list.indexOf(current) / pageSize)); select(null); setPressed(null);
    } else if (showFavorites) { focusAfter.current = ".passport-favorites"; setShowFavorites(false); setPage(0); }
    else close();
  }
  function turn(delta: number) {
    select(null); setPressed(null); setPage(leaf + delta);
    focusAfter.current = showFavorites ? ".passport-favorite-link" : ".passport-cell";
  }
  return <div ref={root} className="passport" role="dialog" aria-modal="true" aria-labelledby="passport-title"
    data-detail={!!current} data-large={large} data-save={source.prefix} onPointerDown={() => { interacted.current = true; }}
    onKeyDown={e => {
      interacted.current = true;
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); if (!e.repeat) back(); }
      if (e.key !== "Tab") return;
      const buttons = [...e.currentTarget.querySelectorAll<HTMLElement>("button:enabled, a[href], select")].filter(el => el.getClientRects().length);
      const target = e.shiftKey ? buttons[0] : buttons.at(-1);
      if (document.activeElement === target) { e.preventDefault(); (e.shiftKey ? buttons.at(-1) : buttons[0])?.focus(); }
    }}>
    <header><Icon name="passport" size={31} /><h2 id="passport-title"><Caption label={copy.title} /></h2>
      <button type="button" className="passport-close" aria-label={copy.close.lt} onClick={close}><Icon name="close" /></button>
    </header>
    <div className="passport-spread">
      <div className="passport-sections">
        <label htmlFor="passport-section"><Caption label={copy.index} /></label>
        <select id="passport-section" className="passport-picker" data-pad-adjust value={section} onChange={e => choose(e.target.value as Section)}>
          {visibleSections.map(k => <option key={k} value={k}>{sections[k].en} · {sections[k].lt}</option>)}
        </select>
        <nav>{visibleSections.map(k => <button type="button" key={k} aria-pressed={section === k} onClick={() => choose(k)}>
          <Icon name={sectionIcons[k]} size={17} /><Caption label={sections[k]} /></button>)}</nav>
      </div>
      <div className="passport-index">
        <div className="passport-page-title"><h3><Caption label={showFavorites ? copy.favorites : sections[section]} /></h3>
          {!!count && <span>{showFavorites ? count : list.filter(s => s.earned).length + " / " + count}</span>}</div>
        {section === "situations" && !list.some(s => s.earned) && <p className="passport-instruction"><Caption label={copy.empty} /></p>}
        {section === "songs" && !!source.favorites.length && !showFavorites && <button type="button" className="passport-favorites" onClick={() => {
          setShowFavorites(true); select(null); setPage(0); focusAfter.current = ".passport-favorite-link";
        }}><Caption label={copy.favorites} /></button>}
        {showFavorites ? source.favorites.slice(start, start + pageSize).map(s => <a key={s.id} className="passport-favorite-link" href={"/songs/" + s.id} target="_blank" rel="noopener noreferrer"><Caption label={s.title} /></a>)
          : <div className="passport-grid">{cells.map((row, i) => <Fragment key={row.id}>
            {row.book && (!i || row.book !== cells[i-1].book) && <h4><Caption label={row.book} /></h4>}
            <button type="button" title={copy.view.lt} data-stamp={row.id} className="passport-cell" data-earned={row.earned} aria-pressed={current?.id === row.id}
              onClick={() => openRow(row)}><Mark row={row} /><strong><Caption label={row.title} /></strong>
              <span className="passport-condition"><Caption label={row.earned ? copy.earned : row.condition} /></span></button>
          </Fragment>)}</div>}
        {!count && <p><Caption label={source.loading ? copy.loading : copy.unavailable} /></p>}
      </div>
      {proof && !showFavorites && <div className="passport-evidence"><Proof key={proof.id} row={proof} press={pressed === proof.id} /></div>}
    </div>
    <footer>
      <button type="button" data-pad-back onClick={back}><Icon name="arrowLeft" size={16} /><Caption label={current || showFavorites ? copy.back : copy.close} /></button>
      {pendingRows.length > 0 && <button type="button" className="passport-new" onClick={() => nextStamp()} title={copy.next.lt}>
        <Caption label={withCount(copy.fresh, pendingRows.length)} /></button>}
      <div className="passport-pages">
        <button type="button" aria-label={copy.prevPage.lt} disabled={leaf === 0} onClick={() => turn(-1)}><Icon name="arrowLeft" /></button>
        <span>{leaf + 1} / {pages}</span>
        <button type="button" aria-label={copy.nextPage.lt} disabled={leaf + 1 >= pages} onClick={() => turn(1)}><Icon name="arrowRight" /></button>
      </div>
    </footer>
    <span role="status" className="passport-sr">{announcement}</span>
  </div>;
}
