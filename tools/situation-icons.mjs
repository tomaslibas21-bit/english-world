// Writes src/ui/situationIconNodes.gen.ts: the shapes of the Lucide icons that src/content/situationIcons.ts names.
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
const missing = names.filter((n) => !nodes[n]);
if (missing.length) { console.error("not in Lucide: " + missing.join(", ")); process.exit(1); }
const out = [
  `// Written by tools/situation-icons.mjs from lucide-static ${version} (ISC license, docs/licenses/lucide.txt): the shapes of`,
  "// the conversations' icons (src/content/situationIcons.ts), each a list of SVG elements on a 24×24 grid.",
  "export type IconNode = [tag: string, attrs: Record<string, string | number>];",
  "export const SITUATION_ICON_NODES: Record<string, IconNode[]> = {",
  ...names.map((n) => `  ${JSON.stringify(n)}: ${JSON.stringify(nodes[n])},`),
  "};",
  "",
];
fs.writeFileSync("src/ui/situationIconNodes.gen.ts", out.join("\n"));
console.log(`${names.length} icons from lucide-static ${version}`);
