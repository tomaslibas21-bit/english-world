// Only presentation history lives here. A baseline is one compact list. Subsequent impressions
// have independent keys so simultaneous tabs cannot overwrite one another's acknowledgments.
const memory = new Map<string, string>();
const root = "ew-passport-v1:";
export const presentationPrefix = (course: boolean, started: number) =>
  root + (course ? "em-lt" : "mh-lt") + ":" + (Number.isFinite(started) ? started : 0) + ":";

export function presentation(prefix: string, storage: Storage | null) {
  const get = (key: string) => {
    try { return storage?.getItem(key) ?? memory.get(key); } catch { return memory.get(key); }
  };
  const put = (key: string, value: string) => {
    memory.set(key, value);
    try { storage?.setItem(key, value); } catch { /* use the session copy */ }
  };
  const baselineKey = prefix + "baseline";
  const baseline = (): string[] | null => {
    try {
      const data: unknown = JSON.parse(get(baselineKey) ?? "null");
      if (Array.isArray(data) && data.every(id => typeof id === "string")) return data;
    } catch { /* rebuild a malformed presentation note */ }
    return null;
  };
  return {
    pending(ids: string[]): string[] | null {
      const dry = baseline();
      if (!dry) return null;
      const seen = new Set(dry);
      return ids.filter(id => !seen.has(id) && !get(prefix + id));
    },
    presentBaseline(ids: string[]) {
      if (baseline() !== null) return;
      // A stale tab may still have the old game open after another tab resets it.
      const scope = prefix.slice(0, prefix.lastIndexOf(":", prefix.length - 2) + 1);
      const stale = (key: string) => key.startsWith(scope) && !key.startsWith(prefix);
      try {
        const saved = JSON.parse(storage?.getItem("english-world-progress-v1") ?? "null");
        if (!saved || prefix === scope + saved.started + ":") {
          for (let i = (storage?.length ?? 0) - 1; i >= 0; i--) {
            const key = storage!.key(i);
            if (key && stale(key)) storage!.removeItem(key);
          }
        }
      } catch { /* denied storage */ }
      for (const key of memory.keys()) if (stale(key)) memory.delete(key);
      put(baselineKey, JSON.stringify(ids));
    },
    present(id: string) { put(prefix + id, "1"); },
  };
}
