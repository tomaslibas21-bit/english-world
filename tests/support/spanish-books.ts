import { readFileSync } from "node:fs";
import { vi } from "vitest";

export const SITE = "https://course.test";
export const SM_FILES = "https://audio.dvikalbesdainos.lt/spanish-master";
export const SME_FILES = `${SM_FILES}-en`;
export const intro = { itemKey: "book/BK01/standard", chapterId: "BK01-00" } as const;
export const chapter = { ...intro, chapterId: "BK01-01" } as const;
export const story = { itemKey: "story/HIS-SG01/standard", chapterId: "HIS-SG01" } as const;
export const chapterIds = ["title", "intro-01", "intro-02", "intro-03", "001", "002", "003"].map(id => `BK01-01-${id}`);

/** The JSON fixtures preserve the two course checkouts' display paragraphs and source clocks.
 * BK01-01 keeps its first two paragraphs, including the voiced introduction, and the matching cue rows. */
export function mockBookFiles(fixtures: URL, replace?: (url: URL) => Response | undefined) {
  const read = (name: string) => JSON.parse(readFileSync(new URL(`${name}.json`, fixtures), "utf8"));
  const catalog = read("catalog");
  const fetcher = vi.fn<typeof fetch>(async (input) => {
    const url = new URL(String(input));
    const override = replace?.(url);
    if (override) return override;
    const [, section, dir, folder, file] = url.pathname.replace(/^\/spanish-master(?:-en)?(?=\/)/, "").split("/");
    if (dir === "index.json") return Response.json(catalog[section]);
    if (folder === "config.json") return Response.json(catalog.config);
    const id = (file ?? folder)?.replace(/\.json$/, "");
    if (id !== "BK01-00" && id !== "BK01-01" && id !== "HIS-SG01") return new Response(null, { status: 404 });
    return Response.json(read(id)[dir === "data" ? dir : folder]);
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

export function mockFileToken(initial: string) {
  const storage = new Map<string, string>();
  const setToken = (token: string) => storage.set("fs-files-token", JSON.stringify({ token, exp: Date.now() / 1000 + 600 }));
  setToken(initial);
  vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null });
  return setToken;
}
