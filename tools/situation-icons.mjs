// Writes src/ui/situationIconNodes.gen.ts from the Lucide icons and the game's seashell named in situationIcons.ts.
// Lucide is not a dependency of the game: unpack its `lucide-static` package somewhere (`npm pack lucide-static`, then
// `tar xzf`) and run   node tools/situation-icons.mjs /path/to/package
// after changing the list. ISC license: docs/licenses/lucide.txt.
import fs from "node:fs";
const dir = process.argv[2];
if (!dir) { console.error("usage: node tools/situation-icons.mjs /path/to/lucide-static/package"); process.exit(1); }
const nodes = JSON.parse(fs.readFileSync(`${dir}/icon-nodes.json`, "utf8"));
const version = JSON.parse(fs.readFileSync(`${dir}/package.json`, "utf8")).version;
const list = fs.readFileSync("src/content/situationIcons.ts", "utf8");
const names = [...new Set([...list.matchAll(/^\s*"[^"]+":\s*"([a-z0-9-]+)"/gm)].map((m) => m[1]))].sort();
const lucideNames = names.filter((n) => n !== "seashell");
const missing = lucideNames.filter((n) => !nodes[n]);
if (missing.length) { console.error("not in Lucide: " + missing.join(", ")); process.exit(1); }
const out = [
  "// Written by tools/situation-icons.mjs from the registry in src/content/situationIcons.ts.",
  `// Lucide shapes: lucide-static ${version} (ISC license, docs/licenses/lucide.txt). The seashell is the game's own glyph.`,
  ...(names.includes("seashell") ? ['import { SEASHELL_PATH } from "./icons";', ""] : []),
  "export type IconNode = [tag: string, attrs: Record<string, string | number>];",
  "export const SITUATION_ICON_NODES: Record<string, IconNode[]> = {",
  ...names.map((n) => n === "seashell"
    ? '  "seashell": [["path",{"d":SEASHELL_PATH}]],'
    : `  ${JSON.stringify(n)}: ${JSON.stringify(nodes[n])},`),
  "};",
  "",
];
fs.writeFileSync("src/ui/situationIconNodes.gen.ts", out.join("\n"));
console.log(`${lucideNames.length} icons from lucide-static ${version}, ${names.length - lucideNames.length} from the game`);
