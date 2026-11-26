import { useLayoutEffect, useRef, type ReactNode } from "react";
import { bookLocale, bookWord as w } from "../content/bookCopy";
import { BOOK_STATION, RADIO_SKIN } from "../content/radio";
import { radio } from "../radio";
import type { BookChannel } from "../radio/bookChannel";
import type { SleepChoice } from "../radio/talkPlayer";
import { TALK_LANGUAGES, TALK_RATES, type TalkMode } from "../radio/talkProgress";
import { Icon } from "./icons";
import { useBookState } from "./bookHooks";
import "./books.css";

function Selector({ label, value, change, children }: {
  label: string; value: string | number; change: (value: string) => void; children: ReactNode;
}) {
  return <label className="select-row"><span>{label}</span><span className="select-wrap">
    <select value={value} data-pad-adjust onChange={(event) => change(event.currentTarget.value)}>{children}</select>
    <Icon name="chevronDown" />
  </span></label>;
}

export function ListeningForm({ channel }: { channel: BookChannel }) {
  const { player } = channel;
  const prefs = useBookState(channel, (s) => s.prefs);
  const sleep = useBookState(channel, (s) => s.sleep);
  const selection = useBookState(channel, (s) => s.selection);
  const { target, helper } = TALK_LANGUAGES[channel.source.profile];
  const modes = [
    { mode: "target", label: w(`only_${target}`) },
    { mode: "helper", label: w(`only_${helper}`) },
    { mode: "paired", label: w(channel.source.profile === "em-lt" ? "paired_em" : channel.source.profile === "sm-lt" ? "paired_sm" : "paired_sme") },
  ] as const;
  const sleepChoice: SleepChoice = sleep?.kind === "timed" ? sleep.minutes : sleep?.kind === "end" ? "end" : "off";
  const boundary = selection?.itemKey.startsWith("story/") ? "endStory" : selection?.itemKey.startsWith("scene/") ? "endScene" : "endChapter";
  return <form className="settings-form scroll" onSubmit={(event) => event.preventDefault()}>
    <h1>{w("settings")}</h1>
    <fieldset>
      <legend id="book-mode-label">{w("mode")}</legend>
      <div className="mode-group" role="radiogroup" aria-labelledby="book-mode-label">
        {modes.map(({ mode, label }) => <button type="button" role="radio" className="mode" key={mode}
          aria-checked={prefs.mode === mode} tabIndex={prefs.mode === mode ? 0 : -1} data-pad-default={prefs.mode === mode || undefined}
          onClick={() => player.changeMode(mode)} onKeyDown={(event) => {
            if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const i = modes.findIndex((row) => row.mode === mode);
            const next = event.key === "Home" ? 0 : event.key === "End" ? 2 : (i + (["ArrowUp", "ArrowLeft"].includes(event.key) ? 2 : 1)) % 3;
            player.changeMode(modes[next].mode as TalkMode);
            const buttons = event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>("button");
            buttons[next].focus();
          }}><span className="mode-dot" aria-hidden /><span>{label}</span></button>)}
      </div>
    </fieldset>
    <div className="rates">
      {(["target", "helper"] as const).map((role) => {
        const lang = role === "target" ? target : helper;
        return <Selector key={role} label={w(`speed_${lang}`)} value={prefs.rates[lang] ?? (role === "target" ? 0.75 : 1)}
          change={(value) => player.setRate(lang, Number(value))}>
          {TALK_RATES[role].map((rate) => <option key={rate} value={rate}>{w("rate", { rate: rate.toLocaleString(bookLocale) })}</option>)}
        </Selector>;
      })}
    </div>
    <button type="button" role="switch" className="toggle-row" aria-checked={prefs.autoplay} onClick={() => player.setAutoplay(!prefs.autoplay)}>
      <span>{w("autoplay")}</span><span className="toggle-track" aria-hidden><i /></span>
    </button>
    <Selector label={w("sleep")} value={sleepChoice} change={(choice) => {
      player.setSleep(choice === "15" || choice === "30" ? Number(choice) as 15 | 30 : choice === "end" ? "end" : "off");
    }}>
      <option value="off">{w("off")}</option>
      <option value="15">{w("minutes", { n: 15 })}</option>
      <option value="30">{w("minutes", { n: 30 })}</option>
      <option value="end">{w(boundary)}</option>
    </Selector>
  </form>;
}

export function TalkSettings({ channel }: { channel: BookChannel }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const el = dialog.current!;
    const opener = document.activeElement as HTMLElement | null;
    el.showModal();
    el.querySelector<HTMLElement>("[data-pad-default]")?.focus({ preventScroll: true });
    return () => {
      el.close();
      if (opener?.isConnected && !opener.closest("[inert]")) opener.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={dialog} className={`book-picker book-settings radio-skin-${RADIO_SKIN}`}
    data-pad-scope="book-settings" aria-label={w("settings")}
    onCancel={(event) => { event.preventDefault(); radio.closeSettings(); }}
    onClick={(event) => { if (event.target === event.currentTarget) radio.closeSettings(); }}
    onKeyDown={(event) => { if (event.key.toLowerCase() !== "r") event.stopPropagation(); }}>
    <section className="book-sheet settings">
      <header className="mast">
        <button className="round back" data-pad-back aria-label={w("back")} onClick={() => radio.closeSettings()}><Icon name="arrowLeft" /></button>
        <span className="brand" lang="en"><Icon name="bookOpen" />{BOOK_STATION.name}</span>
        <span className="frequency">{BOOK_STATION.freq.toLocaleString(bookLocale)} <small>{w("mhz")}</small></span>
      </header>
      <ListeningForm channel={channel} />
    </section>
  </dialog>;
}
