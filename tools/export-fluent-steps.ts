// Builds the game for English Master (the fluent-steps site) and copies it into that repository's
// public/zaidimas/ folder, where the site serves it at /zaidimas/.
// - the code, the scene pictures and the clip list (audio/manifest.json) go into the folder;
// - the voice clips stay on Cloudflare R2: bucket fluent-steps-audio, folder fluent-steps/game/audio/,
//   served at https://audio.dvikalbesdainos.lt/fluent-steps/game/audio/ (the Gemini voices: …/game/audio-v2/; upload new clips there
//   after `npm run audio`; a site deploy has a 20,000-file limit, and there are about 21,500 clips);
// - words the learner saves also go into the course's own flashcards (VITE_CARDS_TARGET=fluentsteps,
//   see src/state/cards.ts), and a home button leads back to the course (VITE_BACK_URL=/).
//   npx tsx tools/export-fluent-steps.ts <path to a fluent-steps checkout> [--audio=<clip base URL>]
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { audioDir } from "../src/content/voices";

const ROOT = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith("--"));
// the voices in use (src/content/voices.ts, VITE_VOICES=v1|v2): their clips live in audio/ or audio-v2/
const dir = audioDir();
const audio = args.find((a) => a.startsWith("--audio="))?.slice(8) ?? `https://audio.dvikalbesdainos.lt/fluent-steps/game/${dir}`;
if (!target || !existsSync(path.join(target, "src/components/AppShell.tsx"))) {
  console.error("Usage: npx tsx tools/export-fluent-steps.ts <path to a fluent-steps checkout>");
  process.exit(1);
}

const out = mkdtempSync(path.join(tmpdir(), "english-world-fs-"));
console.log(`building for /zaidimas/ (clips from ${audio}) …`);
execFileSync("npx", ["vite", "build", "--outDir", out, "--emptyOutDir"], {
  cwd: ROOT, stdio: ["ignore", "ignore", "inherit"],
  env: { ...process.env, GAME_BASE: "/zaidimas/", VITE_AUDIO_BASE: audio, VITE_CARDS_TARGET: "fluentsteps", VITE_BACK_URL: "/" },
});

// the clips live on R2: keep only the clip list of the voices in use
for (const d of ["audio/", "audio-v2/"]) {
  const p = path.join(out, d);
  if (!existsSync(p)) continue;
  if (d !== dir) { rmSync(p, { recursive: true, force: true }); continue; }
  for (const f of readdirSync(p)) if (f !== "manifest.json" && f !== "repair-versions.json") rmSync(path.join(p, f));
}

const dest = path.join(target, "public/zaidimas");
rmSync(dest, { recursive: true, force: true });
cpSync(out, dest, { recursive: true });
rmSync(out, { recursive: true, force: true });

let files = 0, bytes = 0;
const walk = (d: string) => { for (const f of readdirSync(d)) { const p = path.join(d, f); const s = statSync(p); if (s.isDirectory()) walk(p); else { files++; bytes += s.size; } } };
walk(dest);
console.log(`copied into ${dest}: ${files} files, ${(bytes / 1048576).toFixed(1)} MB`);
