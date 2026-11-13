// The owner's native-speaker read of the Lithuanian layer (docs/es/LEARNER-LT.md): a self-contained HTML page per
// chosen conversation, made from the current es-lt tables, so it shows what a learner sees: the intro and the
// tasks, the conversation as played (each Spanish line, its Lithuanian, the word glosses and the notes), the tips,
// the phrase cards and the answer chips. The lines a reviewer flagged for the owner (the quotes in the "owner"
// section of ~/puerto-colibri-lt/review/<sit>.md) get a yellow margin. Everything is numbered for the reply.
//   EDITION=es LEARNER=lt npx tsx --import ./tools/edition-hook.mjs tools/es-learner/owner-read.ts <out.html> <sit>…
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SITUATION_BY_ID } from "../../src/content/situations";
import { NPCS } from "../../src/content/npcs";
import { setVariety } from "../../src/convo/compose";
import type { Sentence } from "../../src/convo/compose";
import { modelAnswers, playerVars } from "../../src/convo/suggest";
import { chipLabel } from "../../src/ui/chip-label";
import { playSim } from "../sim-play";

const [out, ...sits] = process.argv.slice(2);
const REVIEW = path.join(os.homedir(), "puerto-colibri-lt", "review");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fold = (s: string) => s.toLowerCase().replace(/[„“"'.,!?…–—:;()]/g, " ").replace(/\s+/g, " ").trim();

/** The review log's section for the owner (its bullets, as the reviewer wrote them). */
function ownerNotes(sit: string): string[] {
  const f = path.join(REVIEW, sit + ".md");
  if (!fs.existsSync(f)) return [];
  const m = /^#+[^\n]*(owner|native|savinink)[^\n]*\n([\s\S]*?)(?=^#+ |(?![\s\S]))/im.exec(fs.readFileSync(f, "utf8"));
  return m ? m[2].split(/\n(?=- )/).map((b) => b.replace(/^- /, "").replace(/\s+/g, " ").trim()).filter(Boolean) : [];
}

/** The quotes a reviewer left for the owner: „…“ in the review log's section whose heading mentions the owner. */
function flaggedQuotes(sit: string): string[] {
  const f = path.join(REVIEW, sit + ".md");
  if (!fs.existsSync(f)) return [];
  const text = fs.readFileSync(f, "utf8");
  const m = /^#+[^\n]*(owner|native|savinink)[^\n]*\n([\s\S]*?)(?=^#+ |(?![\s\S]))/im.exec(text);
  const part = m ? m[2] : "";
  return [...part.matchAll(/„([^“]{6,})“/g)].map((q) => fold(q[1])).filter((q) => q.length >= 6);
}

let n = 0;
const num = () => ++n;
const flagCount: Record<string, number> = {};

function sentenceHtml(s: Sentence, flagged: string[], sit: string, who?: string): string {
  const id = num();
  const hit = flagged.some((q) => fold(s.nat).includes(q) || q.includes(fold(s.nat)) && fold(s.nat).length > 12);
  if (hit) flagCount[sit] = (flagCount[sit] ?? 0) + 1;
  const units = s.units.map((u) => `<span class="u"><span class="es">${esc(u.en)}</span><span class="gl">${esc(u.lt)}</span></span>`).join(" ");
  const notes = s.units.filter((u) => u.flag).map((u) => `<li><b>${esc(u.en)}</b>: ${esc(u.flag!)}</li>`).join("");
  return `<div class="line${hit ? " flag" : ""}"><div class="num">#${id}</div><div class="body">${who ? `<div class="who">${esc(who)}</div>` : ""}
<div class="es-line" lang="es">${esc(s.en)}</div><div class="lt-line" lang="lt">${esc(s.nat)}</div>
<div class="units">${units}</div>${notes ? `<ul class="notes">${notes}</ul>` : ""}</div></div>`;
}

const parts: string[] = [];
setVariety("default");
for (const id of sits) {
  const sit: any = SITUATION_BY_ID[id];
  if (!sit) throw new Error(`no conversation ${id}`);
  const flagged = flaggedQuotes(id);
  const npc = NPCS[sit.npc];
  const sec: string[] = [];
  sec.push(`<h2 id="${id}">${esc(sit.title.en)} <small>· ${esc(sit.title.lt)}</small></h2>`);
  sec.push(`<p class="meta">${esc(id)} · ${esc(npc?.name ?? sit.npc)} (${esc(npc?.role.lt ?? "")})</p>`);
  const notes = ownerNotes(id);
  if (notes.length) sec.push(`<div class="review"><b>Peržiūrėtojo klausimai Jums</b> (angliškai, kaip jie užrašyti):<ul>${notes.map((b) => `<li><span class="num">#${num()}</span> ${esc(b)}</li>`).join("")}</ul></div>`);
  sec.push(`<div class="box"><div class="num">#${num()}</div><div><h3>Scena</h3><p lang="lt">${esc(sit.intro ?? "")}</p><h3>Tikslas</h3><p lang="lt">${esc(sit.goal ?? "")}</p>${sit.mission?.length ? `<h3>Užduotys</h3><ol>${sit.mission.map((m: any) => `<li lang="lt">${esc(m.lt)}</li>`).join("")}</ol>` : ""}</div></div>`);
  // the conversation as played: the first two sims, a man learner
  for (const sim of (sit.sims ?? []).slice(0, 2)) {
    sec.push(`<h3>Pokalbis: ${esc(sim.name)}</h3>`);
    const tips: string[] = [];
    let first = true;
    playSim(sit, sim, 3, {
      gender: "m",
      onTurn: (_conv: any, turn: any, o: any) => {
        if (turn && !first) sec.push(`<div class="learner"><span class="num">#${num()}</span> <b>Tu:</b> <span lang="es">${esc(turn.say)}</span></div>`);
        first = false;
        for (const l of o?.lines ?? []) sec.push(sentenceHtml(l.sentence, flagged, id, NPCS[l.npc]?.name));
        for (const t of o?.tips ?? []) if (!tips.includes(t.lt)) { tips.push(t.lt); sec.push(`<div class="tip"><span class="num">#${num()}</span> <b>Patarimas:</b> <span lang="lt">${esc(t.lt)}</span>${t.better ? ` <i lang="es">${esc(t.better)}</i>` : ""}</div>`); }
      },
    });
  }
  // the phrase cards: each group's goal and its sentences (the card front is the Lithuanian, the back the Spanish)
  sec.push(`<h3>Frazių kortelės</h3>`);
  const opts = { formal: !npc?.informal, gender: "m" as const, npcGender: npc?.gender ?? "f", vars: playerVars(null) };
  for (const [gid, g] of Object.entries<any>(sit.hints ?? {})) {
    sec.push(`<h4><span class="num">#${num()}</span> ${esc(g.lt)} <small>(${esc(gid)})</small></h4>`);
    const answers = modelAnswers(sit, g, undefined, opts, g.items.length);
    for (const s of answers) sec.push(sentenceHtml(s, flagged, id));
    for (const it of g.items) if (it.note) sec.push(`<div class="tip"><span class="num">#${num()}</span> <b>Pastaba:</b> <span lang="lt">${esc(it.note)}</span></div>`);
  }
  // the answer chips
  const chips: string[] = [];
  for (const [type, list] of Object.entries<any[]>(sit.entities ?? {})) for (const e of list) chips.push(`<span class="chip" title="${esc(type)}/${esc(e.id)}"><span class="num">#${num()}</span> ${esc(chipLabel(e))} <small lang="es">${esc(e.en.replace(/ \| /g, " "))}</small></span>`);
  if (chips.length) sec.push(`<h3>Atsakymų mygtukai</h3><div class="chips">${chips.join(" ")}</div>`);
  parts.push(`<section>${sec.join("\n")}</section>`);
}

const css = `
body{font:16px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#1d2433;background:#fbfaf7;margin:0;padding:16px;}
main{max-width:860px;margin:0 auto}h1{font-size:1.6em}h2{margin-top:2.2em;border-bottom:2px solid #d9d4c7;padding-bottom:4px}
h2 small{font-weight:400;color:#5b6475}h3{margin:1.4em 0 .4em}h4{margin:1em 0 .3em}.meta{color:#5b6475;margin-top:0}
.intro{background:#fff;border:1px solid #d9d4c7;border-radius:12px;padding:12px 16px}
.box,.line{display:flex;gap:10px;background:#fff;border:1px solid #e5e1d6;border-radius:10px;padding:8px 12px;margin:6px 0}
.line.flag{border-left:8px solid #f2c94c;background:#fffbea}.num{color:#8a6d00;font-weight:700;min-width:3.2em;font-size:.85em}
.who{font-size:.8em;color:#5b6475}.es-line{font-weight:600}.lt-line{font-size:1.05em}
.units{margin-top:4px;font-size:.78em;color:#5b6475;display:flex;flex-wrap:wrap;gap:4px 10px}
.u{display:inline-flex;flex-direction:column}.u .es{color:#1d2433}.notes{margin:4px 0 0;padding-left:18px;font-size:.85em;color:#3b4456}
.learner{margin:6px 0 6px 24px;color:#2b5d4a}.tip{margin:4px 0;font-size:.9em;color:#3b4456}
.chips{display:flex;flex-wrap:wrap;gap:6px}.chip{background:#fff;border:1px solid #d9d4c7;border-radius:999px;padding:2px 10px;font-size:.9em}
.chip small{color:#5b6475}.review{background:#fffbea;border:1px solid #f2c94c;border-radius:10px;padding:8px 14px;margin:8px 0;font-size:.92em}.review ul{margin:6px 0 0;padding-left:18px}@media (max-width:600px){body{font-size:15px}.box,.line{flex-direction:column;gap:2px}}`;

const intro = `<div class="intro" lang="lt">
<p><b>Puerto Colibrí lietuviškai: ką skaityti ir kaip atsakyti.</b> Čia keturi pokalbiai taip, kaip juos matys
besimokantis ispanų kalbos lietuvis: scena ir užduotys, kiekviena pašnekovo eilutė (ispaniškai, natūraliai lietuviškai
ir pažodžiui smulkiu šriftu), pastabos, patarimai, frazių kortelės ir atsakymų mygtukai.</p>
<p><b>Į ką atkreipti dėmesį:</b> ar lietuviškai skamba natūraliai (ne vertimas pažodžiui); ar mandagiai kreipiamasi
teisingai („Jūs“ didžiąja raide vienam asmeniui, „tu“ draugams); ar teisingos vyriškos ir moteriškos formos; ar
terminai ir vardai parinkti gerai.</p>
<p><b>Geltona juosta kairėje</b> pažymėtos eilutės, kurias peržiūrėtojai siūlo įvertinti „iš klausos“.</p>
<p><b>Kaip atsakyti:</b> parašykite numerį ir siūlomą formuluotę, pvz.: <i>„#12: Gal duotumėte sąskaitą?“</i>.
Jei viskas gerai, užtenka parašyti „gerai“.</p></div>`;

const html = `<!doctype html><html lang="lt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Puerto Colibrí lietuviškai – savininko skaitymas</title><style>${css}</style></head><body><main>
<h1>Puerto Colibrí lietuviškai</h1>${intro}
<p>Pokalbiai: ${sits.map((s) => `<a href="#${s}">${esc(s)}</a>`).join(" · ")}</p>
${parts.join("\n")}</main></body></html>`;
fs.writeFileSync(out, html);
console.log(`${out}: ${sits.length} conversations, ${n} numbered items; flagged lines: ${JSON.stringify(flagCount)}`);
