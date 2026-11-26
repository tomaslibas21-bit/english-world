// Usage: node --import tsx tools/read-book-covers.ts <course checkout> [--em-revisions | --edition=es | --edition=es-lt]
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const course = process.argv[2];
if (!course) throw new Error("Pass the course checkout as the first argument.");
const edition = process.argv.find((arg) => arg.startsWith("--edition="))?.slice("--edition=".length);
if (edition !== undefined && edition !== "es" && edition !== "es-lt") throw new Error("Expected --edition=es or --edition=es-lt.");
if (edition && process.argv.includes("--em-revisions")) throw new Error("EM timing revisions belong to the default edition.");
const source = readFileSync(join(course, "src/lib/course/artwork.generated.ts"), "utf8");
const out = new URL(`../src/${edition ? `editions/${edition}/` : ""}content/book-covers/`, import.meta.url);
mkdirSync(out, { recursive: true });
for (const kind of ["books", "stories"] as const) {
  const widths = source.match(new RegExp(`^  ${kind}: \\[([\\d, ]+)\\],$`, "m"))?.[1].split(",").map(Number);
  if (!widths?.includes(160) || !widths.includes(320)) throw new Error(`Missing ${kind} thumbnail sizes.`);
  const block = source.match(new RegExp(`^  ${kind}: \\{\\n([\\s\\S]*?)^  \\},`, "m"));
  if (!block) throw new Error(`Missing ${kind} artwork in the course manifest.`);
  const entries = block[1].trimEnd().split("\n").map((line) => {
    const row = /^    (?:"([A-Z0-9-]+)"|([A-Z][A-Z0-9]*)): \["([a-f0-9]{8})", (\d+)\],$/.exec(line);
    if (!row) throw new Error(`Unexpected ${kind} artwork entry.`);
    const [, quotedId, bareId, hash, width] = row;
    return [quotedId ?? bareId, [hash, ...[160, 320].filter((size) => size <= Number(width))]] as const;
  });
  const data = entries.map(([id, entry]) => `  ${JSON.stringify(id)}: ${JSON.stringify(entry)}`).join(",\n");
  writeFileSync(new URL(`${kind}.json`, out), `{\n${data}\n}\n`);
}

// The course's pure resolver is the authority for repaired timing cache keys.
if (process.argv.includes("--em-revisions")) {
  const url = pathToFileURL(resolve(course, "src/lib/files/narration-version.ts"));
  const { narrationContentPath } = await import(url.href) as { narrationContentPath: (path: string) => string };
  const entries: string[] = [];
  for (const section of ["knygos", "stories"]) {
    for (const kind of ["timing", "lithuanian-timing", "word-timing"]) {
      const dir = `/${section}/audio/${kind}`;
      for (const file of readdirSync(join(course, "public", dir)).sort()) {
        if (!/^[A-Z0-9-]+(?:\.easy)?\.json$/.test(file)) continue;
        const revision = narrationContentPath(`${dir}/${file}`).split("?v=")[1];
        if (revision) entries.push(`  ${JSON.stringify(`${section}/${kind}/${file.slice(0, -5)}`)}: ${JSON.stringify(revision)}`);
      }
    }
  }
  writeFileSync(new URL("../src/content/book-narration-revisions.json", import.meta.url), `{\n${entries.join(",\n")}\n}\n`);
}
