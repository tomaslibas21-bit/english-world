// Prints hint groups' items (id: Spanish): EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/es-hint-dump.ts <sit>[:group,group] …
import { SITUATION_BY_ID } from "../src/content/situations";
for (const arg of process.argv.slice(2)) {
  const [id, gl] = arg.split(":");
  const gs = gl ? gl.split(",") : [];
  const sit = SITUATION_BY_ID[Object.keys(SITUATION_BY_ID).find((k) => k.startsWith(id))!];
  for (const [g, grp] of Object.entries(sit.hints)) {
    if (gs.length && !gs.includes(g)) continue;
    console.log(`${id} ${g} «${grp.lt}»: ` + grp.items.map((it: any) => `${it.id}=${(it.s.en ?? JSON.stringify(it.s)).replace(/ \| /g, " ")}`).join(" ‖ "));
  }
}
