// Repeatable risk screening, not an automatic translator. Review flagged rows in their situation.
import fs from "node:fs";
import { createHash } from "node:crypto";
import { SITUATIONS } from "../src/content/situations";
import { mergeKey, mergeRecord } from "../src/content/merges";
const rows: any[] = [];
for (const sit of SITUATIONS) {
  const add = (key: string, s: any) => {
    if (!s?.en || !s?.lt) return;
    rows.push({
      situation: sit.id,
      key,
      en: s.en,
      lt: s.lt,
      nat: s.nat ?? "",
      merges: s.en.split(" | ").filter((u: string) => {
        const k = mergeKey(u);
        return /\s/.test(k) && !!(sit.merges?.[k] || mergeRecord(k));
      }),
    });
  };
  for (const [id, lines] of Object.entries(sit.lines))
    lines.forEach((s, i) => add(`line:${id}:${i}`, s));
  for (const [id, g] of Object.entries(sit.hints))
    for (const item of g.items) add(`hint:${id}:${item.id}`, item.s);
}
const rules: [string, RegExp, RegExp][] = [
  ["spot-gym", /\bspot(?:ting)?\b/i, /draus/i],
  ["work-out", /\bwork(?:ing)? out\b/i, /išdirb|iš.?dirb/i],
  ["make-it", /\bmake it\b/i, /pagamin/i],
  ["on-the-house", /\bon the house\b/i, /ant nam|namuose/i],
  ["my-treat", /\bmy treat\b/i, /gydym/i],
  ["take-your-time", /\btake your time\b/i, /imk.*laik/i],
  ["rain-check", /\brain check\b/i, /liet.*patikr/i],
  ["under-weather", /\bunder the weather\b/i, /po or/i],
  ["pull-leg", /\bpull(?:ing)? .*leg\b/i, /temp.*koj/i],
  ["beat-tired", /\bi.m beat\b/i, /sumušt/i],
  ["break-ice", /\bbreak the ice\b/i, /lauž.*led/i],
];
const flags = rows.flatMap((r) =>
  rules
    .filter(
      ([, en, lt]) =>
        en.test(r.en.replaceAll(" | ", " ")) && lt.test(r.lt + " " + r.nat),
    )
    .map(([rule]) => ({ ...r, rule })),
);
const entities = SITUATIONS.flatMap((s) =>
  Object.entries(s.entities || {}).flatMap(([group, list]) =>
    list.map((e) => ({ situation: s.id, group, id: e.id, en: e.en, lt: e.lt })),
  ),
);
const report = {
  entities,
  version: 1,
  sourceHash: createHash("sha256").update(JSON.stringify(rows)).digest("hex"),
  situations: SITUATIONS.length,
  sentences: rows.length,
  riskRules: rules.map((r) => r[0]),
  flags,
  idioms: rows.filter((r) => r.merges.length),
};
const out = process.argv[2] || "/private/tmp/lt-semantic-audit.json";
fs.writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify({
    situations: report.situations,
    sentences: report.sentences,
    idiomRows: report.idioms.length,
    flags: report.flags.length,
    output: out,
  }),
);
