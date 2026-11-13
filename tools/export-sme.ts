// Builds the Spanish edition (Puerto Colibrí) for Spanish Master English (the spanish-master-english site) and copies
// it into that repository's public/game/ folder, where the site serves it at /game/ (its docs/GAME.md: the page, the
// door, the lock). Maple Harbor and its English Master export (tools/export-fluent-steps.ts) are untouched by it.
// - the code, the scene pictures (scenes-es/) and the clip list (audio-es/manifest.json, repair-versions.json) go into
//   the folder; Maple Harbor's clips and their lists (audio/, audio-v2/) are left out, as is every MP3 a local
//   `install` put into public/audio-es/;
// - the voice clips stay on Cloudflare R2: bucket fluent-steps-audio, folder spanish-master-en/game/audio-es/, served
//   by the course's files Worker (spanish-master-en-files) at https://audio.dvikalbesdainos.lt/spanish-master-en/
//   game/audio-es/ only to a learner with the course's files token (src/game/audio.ts: clipUrl, filesToken; the upload
//   is the course's scripts/game/upload-game-clips.mjs);
// - the game starts in neutral Latin American Spanish until the learner chooses (VITE_DEFAULT_VARIETY=neutral,
//   src/state/variety.ts): the course shows the game's phrase cards in the Spanish chosen in the game (its key
//   "puerto-colibri-variety"), neutral before any choice, and a word saved in the game keeps the wording it was saved in;
// - words the learner saves also go into the course's own flashcards (VITE_CARDS_TARGET=fluentsteps: the course keeps
//   English Master's storage key "fluentsteps.songcards.v1" and its card format, src/state/cards.ts), and a home
//   button leads back to the course (VITE_BACK_URL=/);
// - the town's radio plays the course's own songs (src/radio/songs.ts, docs/RADIO.md): the list is the site's
//   /songs/index.json, the words and recordings come from the files Worker with the learner's files token;
// - the course's own file in that folder, fs-theme.css (the game's look in the course's themes), is kept; version.json
//   says which commit the build came from.
//   npx tsx tools/export-sme.ts <path to a spanish-master-english or spanish-master checkout> [--audio=<clip base URL>]
// For Spanish Master (Lithuanian learners) it builds with the learner layer (VITE_LEARNER=lt) and the clips of its
// own folder, spanish-master/game/audio-es/.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { audioKey } from "../src/audio-key";

const ROOT = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith("--"));
/** The Spanish edition's clip folder (src/editions/es/content/voices.ts: audioDir). */
const DIR = "audio-es/";
/** The Spanish the game starts in, inside the course (src/state/variety.ts). */
const DEFAULT_VARIETY = "neutral";
/** The course, known by its files Worker config: Spanish Master English (wrangler.spanish-en.jsonc: the learner's
 *  language is English) or Spanish Master (wrangler.spanish.jsonc: Lithuanian, docs/es/LEARNER-LT.md). Each has its
 *  own clip folder on R2, under its own Worker. */
const COURSES = {
  sme: { worker: "wrangler.spanish-en.jsonc", folder: "spanish-master-en", learner: "" },
  sm: { worker: "wrangler.spanish.jsonc", folder: "spanish-master", learner: "lt" },
} as const;
const course = target && (Object.keys(COURSES) as (keyof typeof COURSES)[]).find((c) => existsSync(path.join(target, "workers/files", COURSES[c].worker)));
if (!target || !course || !existsSync(path.join(target, "src/components/AppShell.tsx"))) {
  console.error("Usage: npx tsx tools/export-sme.ts <path to a spanish-master-english or spanish-master checkout>");
  process.exit(1);
}
const { folder, learner } = COURSES[course];
/** The radio's sources per course (src/radio/songs.ts, docs/RADIO.md). */
const RADIO: Record<keyof typeof COURSES, Record<string, string>> = {
  sme: { VITE_RADIO_INDEX: "/songs/index.json", VITE_RADIO_FILES: "https://audio.dvikalbesdainos.lt/spanish-master-en", VITE_RADIO_RECORDINGS: "https://audio.dvikalbesdainos.lt/spanish-master" },
  sm: { VITE_RADIO_INDEX: "/songs/index.json", VITE_RADIO_FILES: "https://audio.dvikalbesdainos.lt/spanish-master" },
};
const audio = args.find((a) => a.startsWith("--audio="))?.slice(8) ?? `https://audio.dvikalbesdainos.lt/${folder}/game/${DIR}`;

const git = (...a: string[]) => { try { return execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim(); } catch { return ""; } };
const commit = git("rev-parse", "--short=8", "HEAD");
const branch = git("branch", "--show-current");
const dirty = git("status", "--porcelain", "--", "src", "public", "index.html", "vite.config.ts") !== "";

const out = mkdtempSync(path.join(tmpdir(), "puerto-colibri-sme-"));
console.log(`building the Spanish edition${learner ? ` for a ${learner} learner` : ""} for ${course}'s /game/ (${branch || "?"} ${commit || "?"}${dirty ? ", with uncommitted changes" : ""}; clips from ${audio}) …`);
execFileSync("npx", ["vite", "build", "--outDir", out, "--emptyOutDir"], {
  cwd: ROOT, stdio: ["ignore", "ignore", "inherit"],
  env: {
    ...process.env, EDITION: "es", VITE_EDITION: "es", VITE_LEARNER: learner, LEARNER: learner, GAME_BASE: "/game/", VITE_AUDIO_BASE: audio, VITE_CARDS_TARGET: "fluentsteps", VITE_BACK_URL: "/", VITE_DEFAULT_VARIETY: DEFAULT_VARIETY,
    // the town's radio (src/radio/songs.ts): the course's own songs (its list, /songs/index.json), through the
    // course's own files Worker; Spanish Master English's list names recordings in Spanish Master's folder too
    ...RADIO[course],
  },
});
const html = readFileSync(path.join(out, "index.html"), "utf8");
if (!html.includes("Puerto Colibrí")) { console.error("the build is not the Spanish edition (no Puerto Colibrí in its index.html)"); process.exit(1); }

// Maple Harbor's clips and lists never go along; of the Spanish clips only their list (the clips live on R2)
for (const d of ["audio/", "audio-v2/"]) rmSync(path.join(out, d), { recursive: true, force: true });
const clipDir = path.join(out, DIR);
let clips = 0;
if (existsSync(clipDir)) {
  for (const f of readdirSync(clipDir)) if (f !== "manifest.json" && f !== "repair-versions.json") rmSync(path.join(clipDir, f), { recursive: true, force: true });
  if (existsSync(path.join(clipDir, "manifest.json"))) clips = Object.keys(JSON.parse(readFileSync(path.join(clipDir, "manifest.json"), "utf8"))).length;
}
/** Clips per voice set (es_ Mexican, esn_ neutral, esp_ Spain's), counted from the voicing's line list when it is on
 *  this machine (~/puerto-colibri-voicing/lines.json + lines-extra.json; the manifest itself holds only keys). */
function voiceSets(): Record<string, number> | undefined {
  if (!clips) return undefined;
  const dir = path.join(homedir(), "puerto-colibri-voicing");
  const setOf = new Map<string, string>();
  for (const f of ["lines.json", "lines-extra.json"]) {
    const file = path.join(dir, f);
    if (!existsSync(file)) continue;
    for (const l of JSON.parse(readFileSync(file, "utf8")) as { voice: string; speed: number; say: string }[]) setOf.set(audioKey(l.voice, l.speed, l.say), l.voice.split("_")[0]);
  }
  if (!setOf.size) return undefined;
  const out: Record<string, number> = { es: 0, esn: 0, esp: 0, other: 0 };
  for (const k of Object.keys(JSON.parse(readFileSync(path.join(clipDir, "manifest.json"), "utf8")))) {
    const s = setOf.get(k);
    out[s && s in out ? s : "other"]++;
  }
  return out;
}
const sets = voiceSets();
if (!clips) console.warn(`no clip list (public/${DIR}manifest.json): the game will speak every line with the browser's voice`);
writeFileSync(path.join(out, "version.json"), JSON.stringify({ game: "Puerto Colibrí", edition: "es", learner: learner || "en", branch, commit, dirty, built: new Date().toISOString(), clips, voiceSets: sets, clipBase: audio, defaultVariety: DEFAULT_VARIETY }, null, 2) + "\n");

const dest = path.join(target, "public/game");
const themeFile = path.join(dest, "fs-theme.css");
const theme = existsSync(themeFile) ? readFileSync(themeFile) : null;
rmSync(dest, { recursive: true, force: true });
cpSync(out, dest, { recursive: true });
rmSync(out, { recursive: true, force: true });
if (theme) writeFileSync(themeFile, theme);

let files = 0, bytes = 0;
const walk = (d: string) => { for (const f of readdirSync(d)) { const p = path.join(d, f); const s = statSync(p); if (s.isDirectory()) walk(p); else { files++; bytes += s.size; } } };
walk(dest);
console.log(`copied into ${dest}: ${files} files, ${(bytes / 1048576).toFixed(1)} MB; ${clips} clips listed${sets ? ` (es_ ${sets.es}, esn_ ${sets.esn}, esp_ ${sets.esp}${sets.other ? `, ${sets.other} of no set known` : ""})` : ""} (they go to R2 separately); starts in ${DEFAULT_VARIETY} Spanish`);
