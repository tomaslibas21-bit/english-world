import { bookSource } from "../content/bookSource";
import { createBookOutput } from "./bookOutput";
import { TalkPlayer } from "./talkPlayer";
import { TALK_LANGUAGES, TALK_RATES, TalkProgress, isTalkMode } from "./talkProgress";

const languageNames = { en: "English", lt: "Lithuanian", es: "Spanish" };

export async function mountBookHarness(root: HTMLElement): Promise<void> {
  const panel = document.createElement("main");
  const status = document.createElement("p");
  const source = bookSource();
  root.replaceChildren(panel);
  root.style.overflow = "auto";
  document.title = "Book FM review";
  if (!source) {
    status.textContent = "Book source unavailable";
    panel.append(status);
    return;
  }

  const output = createBookOutput();
  const progress = new TalkProgress(source.profile);
  const player = new TalkPlayer({
    load: source.load, output, progress,
    clock: { now: Date.now, setTimeout: (callback, delay) => {
      const timer = window.setTimeout(callback, delay);
      return () => window.clearTimeout(timer);
    } },
  });
  const { target, helper } = TALK_LANGUAGES[source.profile];

  function select(label: string, options: readonly (readonly [string, string])[], change: (value: string) => void) {
    const line = document.createElement("p");
    const description = document.createElement("label");
    const control = document.createElement("select");
    control.style.maxWidth = "100%";
    description.append(label + " ", control);
    line.append(description);
    for (const [value, text] of options) control.add(new Option(text, value));
    control.onchange = () => change(control.value);
    panel.append(line);
    return control;
  }

  function button(label: string, action: () => void) {
    const control = document.createElement("button");
    control.textContent = label;
    control.onclick = action;
    panel.append(control);
    return control;
  }

  status.textContent = "Loading chapters…";
  panel.append(status);
  const catalog = await source.catalog().catch(() => null);
  if (!catalog) {
    status.textContent = "Could not load chapters";
    return;
  }
  const chapters = [...catalog.books.flatMap((book) => book.chapters), ...catalog.stories].filter((chapter) => chapter.hasAudio);
  const selected = select("Chapter", chapters.map((chapter) => [chapter.id, `${chapter.id} · ${chapter.title}`]), (id) => {
    const chapter = chapters.find((row) => row.id === id);
    if (chapter) void player.select(chapter.selection, player.getSnapshot().playIntent);
  });
  const mode = select("Mode", [
    ["paired", `${languageNames[helper]} → ${languageNames[target]}`],
    ["target", languageNames[target]], ["helper", languageNames[helper]],
  ], (value) => { if (isTalkMode(value)) player.changeMode(value); });
  const targetRate = select(`${languageNames[target]} rate`, TALK_RATES.target.map((rate) => [String(rate), `${rate}×`]),
    (value) => player.setRate(target, Number(value)));
  const helperRate = select(`${languageNames[helper]} rate`, TALK_RATES.helper.map((rate) => [String(rate), `${rate}×`]),
    (value) => player.setRate(helper, Number(value)));

  const previous = button("Previous line", () => player.stepSentence(-1));
  const toggle = button("Play", () => {
    const { playIntent, status } = player.getSnapshot();
    if (playIntent) player.pause();
    else if (status === "error") void player.retry(true);
    else player.play();
  });
  const next = button("Next line", () => player.stepSentence(1));
  const cue = document.createElement("p");
  const time = document.createElement("output");
  time.setAttribute("aria-label", "Media time");
  panel.append(cue, time);

  const update = () => {
    const state = player.getSnapshot();
    selected.value = state.selection?.chapterId ?? "";
    mode.value = state.prefs.mode;
    targetRate.value = String(state.prefs.rates[target]);
    helperRate.value = String(state.prefs.rates[helper]);
    const error = state.error === "blocked" ? null : state.error;
    status.textContent = output.unavailable ? "No in-game audio" : error ?? state.status;
    toggle.textContent = state.playIntent ? "Pause" : error ? "Try again" : "Play";
    toggle.disabled = !!output.unavailable || !state.selection || state.status === "loading";
    next.disabled = previous.disabled = !state.cue;
    cue.textContent = state.cue ? `${languageNames[state.cue.language]} · ${state.cue.text}` : "";
    time.value = `${state.position.toFixed(3)} s`;
  };
  player.subscribe(update);
  window.addEventListener("pagehide", () => player.pause());
  document.addEventListener("visibilitychange", () => player.tick());
  if (chapters[0]) await player.select(chapters[0].selection);
  else update();
}
