import { useEffect, useMemo, useState } from "react";
import { useStore } from "../state/store";
import { PROGRESS_KEY, type Progress } from "../state/progress";
import { useCards } from "../state/cards";
import { FAVORITES_EVENT, FAVORITES_KEY, likedSongs, readFavorites } from "../radio/favorites";
import { COURSE_EVENT, COURSE_KEY, courseStamps, inEnglishMaster, loadCatalog, needsCatalog, readCourse, type Catalogs, type CourseSection } from "./course";
import { townStamps } from "./stamps";
import { presentation, presentationPrefix } from "./presentation";
import type { Section } from "./words";

function storage() { try { return window.localStorage; } catch { return null; } }
function raw(key: string) { try { return storage()?.getItem(key) ?? null; } catch { return null; } }
function courseSnapshot() {
  return {
    items: readCourse(inEnglishMaster ? raw(COURSE_KEY) : null),
    likes: likedSongs(readFavorites(inEnglishMaster ? raw(FAVORITES_KEY) : null)),
  };
}
export function usePassport(section: Section) {
  const live = useStore(s => s.progress), cards = useCards(s => s.cards);
  const [remote, setRemote] = useState<{ local: Progress; progress: Progress } | null>(null);
  const progress = remote?.local === live ? remote.progress : live;
  const [snapshot, setSnapshot] = useState(courseSnapshot);
  const [catalogs, setCatalogs] = useState<Catalogs>({});
  const [missing, setMissing] = useState<CourseSection[]>([]);
  const [revision, refresh] = useState(0);
  const prefix = presentationPrefix(inEnglishMaster, progress.started);
  const history = useMemo(() => presentation(prefix, storage()), [prefix]);
  useEffect(() => {
    const onCourse = () => setSnapshot(courseSnapshot());
    const changed = (e: StorageEvent) => {
      if (!e.key || e.key === COURSE_KEY || e.key === FAVORITES_KEY) onCourse();
      if (e.key === PROGRESS_KEY && e.newValue) {
        try {
          const saved = JSON.parse(e.newValue);
          if (saved?.version === 1 && Number.isFinite(saved.started))
            setRemote({ local: useStore.getState().progress, progress: saved });
        } catch { /* ignore a damaged remote write */ }
      }
      if (!e.key || e.key.startsWith(prefix)) refresh(n => n + 1);
    };
    window.addEventListener("storage", changed);
    window.addEventListener("focus", onCourse);
    window.addEventListener("pageshow", onCourse);
    window.addEventListener(COURSE_EVENT, onCourse);
    window.addEventListener(FAVORITES_EVENT, onCourse);
    return () => {
      window.removeEventListener("storage", changed);
      window.removeEventListener("focus", onCourse);
      window.removeEventListener("pageshow", onCourse);
      window.removeEventListener(COURSE_EVENT, onCourse);
      window.removeEventListener(FAVORITES_EVENT, onCourse);
    };
  }, [prefix]);
  // Empty course pages wait for their section. If a return visit already has proof,
  // that section is relevant now: its catalog is needed to choose the opening impression.
  const needed = (key: CourseSection) => inEnglishMaster && !catalogs[key] && !missing.includes(key) &&
    (section === key || needsCatalog(snapshot.items, key));
  const songs = needed("songs"), books = needed("books");
  useEffect(() => {
    const controller = new AbortController();
    for (const key of ["songs", "books"] as const) if (key === "songs" ? songs : books) {
      loadCatalog(key, controller.signal).then(part => {
        if (!controller.signal.aborted) setCatalogs(old => ({ ...old, ...part }));
      }).catch(() => {
        if (!controller.signal.aborted) setMissing(old => [...old, key]);
      });
    }
    return () => controller.abort();
  }, [songs, books]);
  const town = useMemo(() => townStamps(progress, cards.length, inEnglishMaster), [progress, cards]);
  const rows = useMemo(() => [...town, ...courseStamps(catalogs, snapshot.items)], [town, catalogs, snapshot.items]);
  const favorites = useMemo(() => {
    const liked = new Set(snapshot.likes);
    return catalogs.songs?.filter(s => liked.has(s.id)) ?? [];
  }, [catalogs.songs, snapshot.likes]);
  return { rows, favorites, catalogs, missing, history, prefix, revision, loading: books || songs };
}
