// Interface strings (src/ui/i18n.ts): lists every L("…") / Lx("…") string that the Spanish edition's dictionary
// (src/editions/es/ui/strings.ts) doesn't translate, and every line that still shows Lithuanian outside L()/Lx()
// (found by its letters ą č ę ė į š ų ū ž or „…“ quotes, and by a list of common plain-letter words).
// Usage: npx tsx tools/i18n-check.ts [--all]   (exit code 1 when something is missing)
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { STRINGS } from "../src/editions/es/ui/strings";

const ROOT = path.resolve(import.meta.dirname, "..");
const FILES = [
  ...readdirSync(path.join(ROOT, "src/ui")).filter((f) => /\.(tsx?|ts)$/.test(f) && f !== "strings.ts" && f !== "i18n.ts" && f !== "lt.ts").map((f) => `src/ui/${f}`),
  ...["src/game/Game.ts", "src/game/LightGame.ts", "src/game/given.ts", "src/game/session.ts", "src/game/convEvents.ts", "src/game/ambient.ts",
    "src/state/store.ts", "src/state/cards.ts", "src/state/progress.ts", "src/convo/suggest.ts"],
];
const LT_LETTERS = /[ąčęėįšųūžĄČĘĖĮŠŲŪŽ„“]/;
// Lithuanian words written without its own letters, common in the interface
const LT_WORDS = /\b(Kopijuoti|Baigti|Pradeti|Tavo|Kita|situacija|situacijos|Visos|Nustatymai|Rodyti|Paslepti|Kalbeti|Rasyti|Parasyk|Atgal|Toliau|Dar|Kartu|Garsas|Isjungti|Ijungti|Zaidimas|Pagalba|Klausyk|Spausk|Leisk|Girdejau|Pokalbis|Pokalbio|Uzduotis|Kortele|Korteles|Kursas|Miestas|Zemelapis|Vertimas|Tarimas|Lieciau|Pakartok|Sakinys|Vardas|Pavarde|Mano|Taip|Ne)\b/;

const missing = new Map<string, string>();
const unwrapped: string[] = [];
for (const f of FILES) {
  let src: string;
  try { src = readFileSync(path.join(ROOT, f), "utf8"); } catch { continue; }
  src.split("\n").forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "").replace(/^\s*(\/\*\*?|\*).*$/, "");
    for (const m of code.matchAll(/\bLx?\(\s*"((?:[^"\\]|\\.)*)"/g)) {
      const key = JSON.parse(`"${m[1]}"`);
      if (!(key in STRINGS)) missing.set(key, `${f}:${i + 1}`);
    }
    if (/\bltCount\(/.test(code) || /i18n-ok/.test(line)) return; // its Lithuanian forms are translated through the edition's lt.ts
    const rest = code.replace(/\bLx?\(\s*"((?:[^"\\]|\\.)*)"/g, "L(").replace(/className="[^"]*"/g, "");
    if (LT_LETTERS.test(rest) || (process.argv.includes("--all") && LT_WORDS.test(rest))) unwrapped.push(`${f}:${i + 1}: ${line.trim().slice(0, 140)}`);
  });
}
if (missing.size) {
  console.log(`Strings without an English translation in src/editions/es/ui/strings.ts (${missing.size}):`);
  for (const [k, w] of missing) console.log(`  ${JSON.stringify(k)}  (${w})`);
}
if (unwrapped.length) {
  console.log(`\nLithuanian outside L()/Lx() (${unwrapped.length}):`);
  for (const u of unwrapped) console.log("  " + u);
}
console.log(missing.size || unwrapped.length ? `\n✗ ${missing.size} untranslated, ${unwrapped.length} unwrapped` : "✓ every interface string is wrapped and translated");
process.exit(missing.size || unwrapped.length ? 1 : 0);
