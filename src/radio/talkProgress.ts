export type TalkLanguage = "en" | "lt" | "es";
export type TalkMode = "target" | "helper" | "paired";
export type TalkProfile = "em-lt" | "sm-lt" | "sme-en";
export type TalkItemKey = `${"book" | "story" | "scene"}/${string}/${string}`;

export interface TalkSelection {
  itemKey: TalkItemKey;
  chapterId: string;
  nextChapterId?: string;
}

export interface TalkBookmark {
  sentence: string;
  leg: TalkLanguage;
  offsetSec: number;
  textHash?: string;
  fraction: number;
  complete: boolean;
  audioVersion: string;
  updatedAt: number;
}

export interface TalkPreferences {
  mode: TalkMode;
  rates: Partial<Record<TalkLanguage, number>>;
  autoplay: boolean;
  interlinear: boolean;
}

interface ItemProgress {
  lastChapter: string;
  chapters: Record<string, TalkBookmark>;
}

export interface TalkProgressData {
  v: 1;
  lastBook: TalkItemKey | null;
  lastScene: TalkItemKey | null;
  items: Partial<Record<TalkItemKey, ItemProgress>>;
  prefs: TalkPreferences;
  prefsUpdatedAt: number;
}

export const TALK_LANGUAGES = {
  "em-lt": { target: "en", helper: "lt" },
  "sm-lt": { target: "es", helper: "lt" },
  "sme-en": { target: "es", helper: "en" },
} as const satisfies Record<TalkProfile, { target: TalkLanguage; helper: TalkLanguage }>;
export const TALK_RATES = { target: [0.75, 0.8, 0.9, 1], helper: [0.75, 1, 1.25, 1.5, 1.75, 2] } as const;

export const isTalkMode = (v: unknown): v is TalkMode => v === "target" || v === "helper" || v === "paired";
export const safeTalkId = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/.test(v) &&
  !Object.hasOwn(Object.prototype, v);
export const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const fingerprint = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{1,64}$/i.test(v);

function itemKey(key: string): key is TalkItemKey {
  const [kind, id, edition, extra] = key.split("/");
  if (extra !== undefined || !safeTalkId(id)) return false;
  if (kind === "scene") return safeTalkId(edition);
  if (kind === "story") return edition === "standard";
  return kind === "book" && (edition === "author" || edition === "easy" || edition === "standard");
}

function validChapter(key: TalkItemKey, chapter: unknown): chapter is string {
  return safeTalkId(chapter) && (key.startsWith("book/") || chapter === key.split("/")[1]);
}

function preferences(profile: TalkProfile, value?: unknown): TalkPreferences {
  const raw = isRecord(value) ? value : {};
  const rates = isRecord(raw.rates) ? raw.rates : {};
  const { target, helper } = TALK_LANGUAGES[profile];
  const rate = (lang: TalkLanguage, role: keyof typeof TALK_RATES, fallback: number) =>
    (TALK_RATES[role] as readonly unknown[]).includes(rates[lang]) ? rates[lang] as number : fallback;
  return {
    mode: isTalkMode(raw.mode) ? raw.mode : "paired",
    rates: { [target]: rate(target, "target", 0.75), [helper]: rate(helper, "helper", 1) },
    autoplay: typeof raw.autoplay === "boolean" ? raw.autoplay : true,
    interlinear: typeof raw.interlinear === "boolean" ? raw.interlinear : true,
  };
}

function bookmark(profile: TalkProfile, raw: unknown): TalkBookmark | undefined {
  if (!isRecord(raw)) return;
  const { sentence, leg, offsetSec, textHash, fraction, complete, audioVersion, updatedAt } = raw;
  const { target, helper } = TALK_LANGUAGES[profile];
  if (!safeTalkId(sentence) || (leg !== target && leg !== helper) || !finite(offsetSec) || !finite(fraction) ||
      fraction > 1 || (textHash !== undefined && !fingerprint(textHash)) || !fingerprint(audioVersion) || typeof complete !== "boolean" ||
      !finite(updatedAt)) return;
  return { sentence, leg: leg === target ? target : helper, offsetSec, textHash, fraction, complete, audioVersion, updatedAt };
}

function itemProgress(chapters: Record<string, TalkBookmark>): ItemProgress | undefined {
  let lastChapter: string | undefined;
  for (const [id, value] of Object.entries(chapters)) {
    if (!lastChapter || value.updatedAt > chapters[lastChapter].updatedAt ||
        (value.updatedAt === chapters[lastChapter].updatedAt && id > lastChapter)) lastChapter = id;
  }
  return lastChapter ? { lastChapter, chapters } : undefined;
}

function withLastItems(data: TalkProgressData): TalkProgressData {
  let lastBook: TalkItemKey | null = null;
  let lastScene: TalkItemKey | null = null;
  const updatedAt = (key: TalkItemKey) => {
    const item = data.items[key]!;
    return item.chapters[item.lastChapter].updatedAt;
  };
  for (const key of Object.keys(data.items).filter(itemKey)) {
    const scene = key.startsWith("scene/");
    const last = scene ? lastScene : lastBook;
    if (last && (updatedAt(key) < updatedAt(last) || (updatedAt(key) === updatedAt(last) && key <= last))) continue;
    if (scene) lastScene = key;
    else lastBook = key;
  }
  return { ...data, lastBook, lastScene };
}

export function readTalkProgress(profile: TalkProfile, serialized: string | null): TalkProgressData {
  const empty: TalkProgressData = { v: 1, lastBook: null, lastScene: null, items: {}, prefs: preferences(profile), prefsUpdatedAt: 0 };
  if (!serialized) return empty;
  let raw: unknown;
  try { raw = JSON.parse(serialized); } catch { return empty; }
  if (!isRecord(raw) || raw.v !== 1 || !isRecord(raw.items)) return empty;
  const items: TalkProgressData["items"] = {};
  for (const [key, item] of Object.entries(raw.items)) {
    if (!itemKey(key) || !isRecord(item) || !isRecord(item.chapters)) continue;
    const chapters: ItemProgress["chapters"] = {};
    for (const [id, value] of Object.entries(item.chapters)) {
      const checked = validChapter(key, id) && bookmark(profile, value);
      if (checked) chapters[id] = checked;
    }
    const checked = itemProgress(chapters);
    if (checked) items[key] = checked;
  }
  return withLastItems({
    ...empty, items, prefs: preferences(profile, raw.prefs),
    prefsUpdatedAt: finite(raw.prefsUpdatedAt) ? raw.prefsUpdatedAt : 0,
  });
}

function mergeBookmark(local: TalkBookmark | undefined, remote: TalkBookmark): TalkBookmark {
  if (!local) return remote;
  const latest = remote.updatedAt > local.updatedAt ||
    (remote.updatedAt === local.updatedAt && JSON.stringify(remote) > JSON.stringify(local)) ? remote : local;
  return { ...latest, complete: local.complete || remote.complete };
}

function mergeProgress(local: TalkProgressData, remote: TalkProgressData): TalkProgressData {
  const items = { ...local.items };
  for (const key of Object.keys(remote.items).filter(itemKey)) {
    const incoming = remote.items[key]!;
    const chapters = { ...items[key]?.chapters };
    for (const [id, entry] of Object.entries(incoming.chapters)) chapters[id] = mergeBookmark(chapters[id], entry);
    items[key] = itemProgress(chapters);
  }
  const prefs = remote.prefsUpdatedAt > local.prefsUpdatedAt ||
    (remote.prefsUpdatedAt === local.prefsUpdatedAt && JSON.stringify(remote.prefs) > JSON.stringify(local.prefs)) ? remote : local;
  return withLastItems({ ...local, items, prefs: prefs.prefs, prefsUpdatedAt: prefs.prefsUpdatedAt });
}

function serialize(data: TalkProgressData): string {
  const items = Object.fromEntries(Object.keys(data.items).filter(itemKey).sort().map((key) => {
    const item = data.items[key]!;
    const chapters = Object.fromEntries(Object.keys(item.chapters).sort().map((id) => [id, item.chapters[id]]));
    return [key, { ...item, chapters }];
  }));
  return JSON.stringify({ ...data, items });
}

export interface TalkStorageEvent {
  key: string | null;
  newValue: string | null;
  storageArea?: Pick<Storage, "getItem" | "setItem"> | null;
}

interface ProgressOptions {
  storage?: Pick<Storage, "getItem" | "setItem"> | null;
  events?: Pick<Window, "addEventListener" | "removeEventListener"> | null;
  now?: () => number;
}

export class TalkProgress {
  readonly key: string;
  private data: TalkProgressData;
  private readonly storage: ProgressOptions["storage"];
  private readonly events: ProgressOptions["events"];
  private readonly now: () => number;

  constructor(readonly profile: TalkProfile, options: ProgressOptions = {}) {
    this.key = `ew-talk-v1:${profile}`;
    this.events = options.events === undefined ? globalThis.window : options.events;
    this.now = options.now ?? Date.now;
    try { this.storage = options.storage === undefined ? globalThis.localStorage : options.storage; } catch { /* denied */ }
    this.data = readTalkProgress(profile, this.stored());
    this.events?.addEventListener("storage", this.onStorage);
  }

  private readonly listeners = new Set<() => void>();
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  getSnapshot = (): Readonly<TalkProgressData> => this.data;

  get(selection: TalkSelection): Readonly<TalkBookmark> | undefined {
    if (!itemKey(selection.itemKey) || !validChapter(selection.itemKey, selection.chapterId)) return;
    return this.data.items[selection.itemKey]?.chapters[selection.chapterId];
  }

  continueListening(): TalkSelection | null {
    let choice: { selection: TalkSelection; updatedAt: number } | null = null;
    for (const key of Object.keys(this.data.items).filter(itemKey).sort()) {
      if (key.startsWith("scene/")) continue;
      for (const [id, entry] of Object.entries(this.data.items[key]!.chapters).sort(([a], [b]) => a.localeCompare(b))) {
        if (!entry.complete && (!choice || entry.updatedAt > choice.updatedAt)) {
          choice = { selection: { itemKey: key, chapterId: id }, updatedAt: entry.updatedAt };
        }
      }
    }
    return choice?.selection ?? null;
  }

  checkpoint(selection: TalkSelection, position: Omit<TalkBookmark, "updatedAt">, prefs?: TalkPreferences): void {
    const { itemKey: key, chapterId } = selection;
    const now = this.now();
    if (!itemKey(key) || !validChapter(key, chapterId) || !bookmark(this.profile, { ...position, updatedAt: now })) return;
    this.update(prefs, now, (data) => {
      const previous = data.items[key]?.chapters[chapterId];
      const entry = bookmark(this.profile, {
        ...position, complete: !!(previous?.complete || position.complete),
        updatedAt: Math.max(now, (previous?.updatedAt ?? -1) + 1),
      })!;
      data.items[key] = itemProgress({ ...data.items[key]?.chapters, [chapterId]: entry });
    });
  }

  setPreferences(prefs: TalkPreferences): void { this.update(prefs, this.now()); }

  dispose(): void { this.events?.removeEventListener("storage", this.onStorage); }

  private stored(): string | null {
    try { return this.storage?.getItem(this.key) ?? null; } catch { return null; }
  }

  private onStorage = (event: TalkStorageEvent): void => {
    if (event.key !== this.key || !event.newValue || (event.storageArea && event.storageArea !== this.storage)) return;
    this.data = mergeProgress(this.data, readTalkProgress(this.profile, event.newValue));
    const raw = this.stored();
    if (!raw) { this.listeners.forEach((notify) => notify()); return; }
    const current = readTalkProgress(this.profile, raw);
    this.data = mergeProgress(this.data, current);
    this.listeners.forEach((notify) => notify());
    const merged = serialize(this.data);
    // Keep both chapters even when two tabs wrote from the same original snapshot.
    if (merged !== serialize(current)) this.persist(merged);
  };

  private update(prefs: TalkPreferences | undefined, now: number, change?: (data: TalkProgressData) => void): void {
    const serialized = this.stored();
    const data = serialized ? mergeProgress(this.data, readTalkProgress(this.profile, serialized)) : { ...this.data, items: { ...this.data.items } };
    if (prefs) {
      data.prefs = preferences(this.profile, prefs);
      data.prefsUpdatedAt = Math.max(now, data.prefsUpdatedAt + 1);
    }
    change?.(data);
    this.data = withLastItems(data);
    this.persist(serialize(this.data));
    this.listeners.forEach((notify) => notify());
  }

  private persist(serialized: string): void {
    try { this.storage?.setItem(this.key, serialized); } catch { /* keep the in-memory ledger */ }
  }
}
