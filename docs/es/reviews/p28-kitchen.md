# Review: p28-kitchen ("Pruébalo otra vez"), writer's commit 2277c2a8

The port is careful and close to the English file, and its Spanish is natural. The problems were meaning flips with Fátima, found by playing whole turns (rule 22). There is no money here; the binding answers are the consent, the second idea, the favor and the twist.

| Check | Before | After |
|---|---|---|
| tsc | clean | clean |
| check-content | 107/107 NLU, 14 sims 12/12, fuzz 80, 0/0 | 127/127 NLU, 15 sims 12/12, fuzz 80, 0/0 |
| corpus | 379/379, 0/64 false accepts | 399/399 (+20 review items), 0/64 |
| blind set (40, 10 traps) | **35/40 = 87.5%**, 0 traps | 39/40 = 97.5%, 0 traps (not blind for me) |

The one blind miss left is "Vale, me parece bien" at the second idea: read as thanks, but the outcome is the same as accept.

## Fixes (conversation: 96 lines added, 23 changed)
**meaning-safety, must-fix (~30 lines):**
1. "Nada me gustó" counted as praise. So did "La verdad, nada" in reply to "¿hay algo que te haya gustado?". Both are blunt now; only "Nada, está perfecto" praises.
2. "No más sal" recorded a salt suggestion. It is suggest_not now.
3. "Me gusta, pero no el cilantro" praised the cilantro. A part named next to "no" is now a problem (`negatedPart` and new patterns).
4. "No con tortilla, con galletas" accepted the strips (rule 10). Corrections now work both ways, and "Tortilla no, galletas" is understood.
5. "Así está bien" to the tortilla idea counted as rude (tip and a "¡Ja!" line). At the twist, "No, gracias" and "Así está bien" counted as defensive. Polite forms (`POLITE_NO`) now keep the learner's way at both steps.
6. "No vas bien" counted as encouragement (read as a bare "No" to "tan lenta"). It is rush now.

**understanding (~25 lines), now understood:**
- "Aquí está, pruébela por favor", "Sí, quiero saber qué opina", "No creo que le falte vida"
- "No te preocupes, vas muy bien" (one whole pattern; see the engine note), "Con la práctica vas a mejorar", "Eres lenta, pero vas a mejorar"
- "Más sal no, más limón", "No le pongas cilantro, ponle mango", "Le pondría menos sal", "Yo no le pondría nada", "Mejor así, gracias"
- "No es cierto" to "tan lenta" (now encouragement). "No entiendo" to "¿Me explico?" now gets the example, not a replay of "Bien. Esa es exactamente la reacción correcta."

**spanish (polish):** A second blunt answer no longer repeats "Ay… Ya sabía". "¡Ja! Dime lo que de verdad piensas" is now "¡Ja! No te guardes nada, ¿eh?" (the old line read as sincere). "Este... el chef" is lower case.

**gloss-english and flags (polish):** The defensive tip said "Thank him first" but also fires for Fátima; it now says "Say thanks first". Two flags moved to the word they explain: acabar de → "acabo", casi → "Casi".

**numbers, twins, facts, structure:** nothing to fix. Six Mexican-only lines, all with twins. El Muelle has no clock time, as in TOWN.md. The steps, intents, mission and twist match the English file.

**tests:** 20 NLU tests (the blind set's 10 traps among them) and 1 sim, "corrections and polite keeps" (twist pinned). It checks secondHow, good, fix and backHow.

## For the lead / the owner
- **Usted to the chef (writer's "unsure", kept).** The brief says tú. The chef says tú to the learner, but the learner's hints to him use usted; both are understood. For tú both ways, only the serve-to-handoff hints change. (Decided 5 Nov: kept as written; BRIEFS.md now says so.)
- **Engine.** A piece after a negative piece isn't split off unless it starts a new clause ("No te preocupes, vas muy bien"). Other conversations will hit this.
- **"No más sal".** This is now read as "no more salt". Mexican "nomás sal" ("just salt") would read the same way; that is rare from learners and safe (nothing is recorded).

## Audit (5 Nov 2026)

A fresh reviewer, both texts. Read: STYLE.md, AUTHORING-ES.md ("Rules from the reviews"), the brief (with the 5 Nov
register decision), the review above, AUDIT/cross and AUDIT/neutral for p28, the situation file, the corpus and the
held-out set; every sim at seeds 3 and 7, before and after; about 150 turns played with `tools/probe.ts` (every NPC
question with yes, no, "No sé", a side question and a short answer); a repeat fuzz (400 random conversations from the
corpus plus global skills: an NPC line said twice in a row, an understood turn with no reply); and the voice line list
for p28 alone (tools/es-voices/lines-es.ts `enumerateEs({ only })`: which voices hold every line, item and sound check).

**Found 23 (1:7 2:0 3:0 4:0 5:1 6:0 7:10 8:0 9:5 10:0), fixed 23.**

1. **Natural Spanish: no line twice in a row (rule 8).** The fuzz found the same line said again on the next turn in
   seven places: (a) Fátima's "¿Lo... quieres probar?" was asked twice before she held the plate out: now once, then
   "Ten. Nada más pruébalo." (also after a "No sé"); (b) the chef's "¿Y? ¿Qué opinas?" twice: the second time is "No
   tienes que estar de acuerdo. Nomás dime qué piensas."; (c) "Entonces, ¿con tortilla o sin tortilla?" twice: asked
   once, then "Piénsalo."; (d) rushed twice, Fátima said "Ya sé. Hago lo que puedo." and "Es que... no quiero quedar mal
   con el chef." twice: her reaction once, then "Bueno. Me voy a esforzar más." (item 7 not ticked, as before at the
   fourth ask); (e) "Hay algo, ¿verdad? Dímelo, aguanto." twice (a "nothing to change" after a "No le falta sal" or a
   "No sé"): it alternates with "¿Y cuál es la mala noticia?", and a second "nothing" right after it ends her asking;
   (f) "¿De veras? ¿Qué?" twice on a second "Sí.": that "Sí" is praise in general now ("Nada"/"No" there stay blunt);
   (g) "Tranquilo. Es un chowder…", "Porque me tiene miedo…", "Mucho gusto./Igualmente." and "Ah, sal no." said again
   when the learner said the same thing again: once each (the step's question follows).
2. **tú/usted:** as decided this morning. The chef and Fátima say tú in every line (the 13 shared lines that switch
   register are copied in tú; the global `g_bye` is never said: p28's own goodbye handler). The hints say usted to the
   chef (with the "Cooks often answer the head chef with usted; tú is fine too" note) and tú to Fátima; tú to the chef
   is understood with no tip (no `tu_staff` anywhere); the global hints follow the speaking cook (session.ts takes the
   register of `c.npcId`, set by whoever speaks). Usted to Fátima is understood too (point 9).
3. **Names:** Chef Villanueva and Fátima only; no other Villanueva or Fátima in the edition, BRIEFS.md or tests/es.
4. **Facts:** no place, street, price, time or direction; "en una hora empieza el servicio" (no clock time) agrees with
   s69's El Muelle. The kitchen and the cooking are right for the coast: ceviche with lime, red onion, tomato (tomate,
   as the Yucatán says), cucumber, cilantro, habanero and avocado; tostadas and saladas from the store; the chef's acid
   (lime, a splash of white wine) and fried tortilla strips; Fátima's habanero drops. "Quítale las semillas al chile"
   and "déjalo más tiempo en el limón" are sound advice.
5. **English:** mia_other said "There's no potatoes / beans in my ceviche": "{X}? My ceviche doesn't have any {X}."
   Everything else is American English; every flag sits on its unit (checked by script, new lines too).
6. **Spelling, ¿¡:** nothing (cross file and a read of every new line).
7. **Questions and wrong meanings.** (a) "¿Lo... quieres probar?" – "No." got "Gracias. Llevo una hora con este
   pescado…" or "Bueno. Sí. Porfa, sé honesto…": she holds the plate out ("Ten. Nada más pruébalo."). (b) "No le falta
   sal" / "No le pongas más limón" got "¿Sin sal? Bueno." ("without salt" is not "it doesn't need salt"): mia_no_x is
   "Ah, {X} no." (c) "Sí, me gusta." / "Me encanta." to the chef's tortilla idea was read as praise for Fátima and asked
   again: it takes the idea. (d) "¿Qué significa acidez?" got "Exacto. Nada más un poquito…" (read as a guess of lime):
   his example answers it now. (e) "¿Cuánto le pongo?" / "¿Limón o vino blanco?" while he waits for the lime got the
   example word for word again, and then he tasted before anything was added: new again_hint "Unas gotas de limón, nada
   más. Y lo vuelvo a probar." and he waits. Not understood before, answered now: (f) "¿Le gustó?" / "¿Qué le
   pareció?" / "¿No le gustó?": before the feedback it asks for it; after it, new liked_yes "Sí, me gustó. Nada más le
   falta vida."; after the second taste, (g) the board. "¿Lo puedo poner en el pizarrón?" (the learner's goal): new
   board_not_yet "Primero ajústalo. Luego vemos." / board_yes "Sí. Esta noche lo ponemos en los especiales."; at the
   goodbye, the chef's "Ándale. Y apunta ese chowder en el pizarrón." (h) "¿Quién es Fátima?": new handoff_who "La
   cocinera nueva. La del ceviche." (i) "¿Qué lleva? / ¿Qué le pusiste? / ¿Es de pescado o de camarón?": new mia_recipe
   "Pescado y camarón, limón, cebolla morada, tomate, pepino, cilantro y un poquito de habanero. Y aguacate arriba."
   (j) "¿En serio? / ¿Habanero en un chowder?" to her idea: new mia_twist_really "Sí, en serio. Nada más unas gotitas."
   (said where her question would come, so "En serio, no me gusta el picante" keeps the learner's way, and "No, en
   serio" is a no). Checked and fine: the consent's no's (table nine), the example's "¿Me explico?"/"¿Alguna duda?"
   yes and no, the plating's polite keeps and corrections, the favor's no/why/unsure, every Fátima question with yes,
   no and "No sé", the twist's yes/no/keep, the goodbye at every step.
8. **Hints:** all accepted (check-content), right register; nothing changed.
9. **Accepted answers.** Not understood before: "Todo." to "¿Qué?" / "¿Hay algo bueno?" (praise; "Todo mal" stays
   blunt); "No hay mala noticia" / "No tiene nada malo" (nothing to change); "No vas a quedar mal con el chef", "Al chef
   le va a gustar", "El chef va a estar contento" to her worry (encouragement); usted to Fátima "No se preocupe, es su
   primera semana"; "Sí, pero rápido" to the consent. Meaning safety of the new intents: "No me gustó" is defensive with
   the chef and blunt with Fátima, "No me gusta" to the idea is the rude no, never "¿Le gustó?" (one little word away);
   "El chef no va a estar contento" is no encouragement; "No lo voy a poner en el pizarrón" no board question.
10. **Neutral text:** the six twins are right (nomás → solo, ándale → anda, tantito → un momento, pizarrón → pizarra);
    the new lines have no Mexican-only word ("los especiales", not "el pizarrón"), so no new twin.

**Two speakers (who says it).** The chef's 60 lines are his alone (said through `C`), Fátima's 48 hers (`M`). Both can
say only the shared replies: p28's tú copies g_not_understood, g_yes_what, g_soundcheck, g_soundcheck_no,
g_slow_intro, g_learning, g_speak_slowly, g_take_time, g_no_worries, g_howareyou_reply, g_meaning, g_write, g_welcome,
and the global lines that don't switch register (g_hello, g_glad, g_asked_back, g_sorry_to_hear, g_repeat_intro,
g_dont_understand, g_no_ok, g_ack, g_which_word, g_nothing_to_write). The line list run on p28 holds every one of them,
every item line (mia_relief, mia_try_x, mia_no_x, mia_other, mia_bought) and every sound check in the right voices,
both accents (0 gaps). Two new sims make each cook say their own: "the chef's own replies" and "Fátima's own replies"
(how are you, glad, slower, learning, a moment, what does it mean, sorry, you're welcome). "Perdón, no te entendí"
can't be scripted (a sim's turns must be understood): random runs reach it in both voices. g_write and g_yes_what are
unreachable here (no line has `write`/`spell`; a step or a question is always open). No item list has `attrs.plural`;
other_food's bare plurals read right ("¿Papas? Mi ceviche no lleva papas.", "¿Tostadas? ¡Esas son de la tienda!").

**Tests:** NLU 127 → 151, sims 15 → 19 (the two speakers, "side questions", "no line twice in a row"), all 12/12;
corpus 399 → 436 understood (+42 items, 26 with `not`, 10 meaning traps), 0/69 false accepts; held-out 39/40, 0 traps
(unchanged: "Vale, me parece bien" at the idea is read as thanks, with the same outcome); the repeat fuzz: 0 lines
twice in a row (only "Ah, X no." for two different X), 0 understood turns without a reply. The 15 earlier sims'
transcripts are word for word the same at seeds 3 and 7.

**Spoken lines for the voices** (one speaker each, no twins): new for the chef liked_yes, board_not_yet, board_yes,
again_hint, handoff_who; new for Fátima mia_recipe, mia_twist_really; changed mia_no_x ("¿Sin {X}? Bueno." → "Ah, {X}
no.", 17 ingredients). mia_other changed its English only.

**For the lead (shared files):** global.ts g_meaning takes one word after "¿Qué significa…?": "¿Qué significa «en su
punto»?" / "«con tacto»?" aren't understood (NEEDS 4 in the file).

## Spain twins (11 Nov 2026)

- 52 Spain twins (lines and hints), 22 items in tests/es/spain/p28-kitchen.json (all understood, 0 false accepts).
- Register: no change between tú and usted (the chef says tú to the learner, the learner usted to the chef, Fátima and the learner tú). The chef's closing to the learner and Fátima together is vosotros in Spain: "Probad todo otra vez antes".
- Words: coger una cuchara, por la noche / esta noche, por encima (arriba), gambas (camarón: the entity gets attrs.spain "gamba", f, and forms gamba/gambas), Toma (Ten), Eh… (the filler este…), ¿De verdad? (¿De veras?), ¿El qué?, ¿No te enfadas?, Me alegro de que te sirva, Seguro que…, solo for "nada más", vale for "está bien", "¡Faltaría más!" for "¡Con gusto!", the closing hint "¡Oído, chef!". Spain's present perfect: te ha quedado / te ha salido, me ha gustado, ha hecho el ceviche, ha aprendido, el chef ha dicho, he probado tu chowder, no te he entendido, ¿has dicho…?, me he equivocado, le he puesto, me ha pedido que lo pruebe.
- Grammar: the Spain perfects in praise, i_added, chef_asked and ask_recipe; "lo que dice(s)"; ¿me pone(s) un ejemplo?; "no te agobies"; "me viene muy bien / me ha servido". Merges: 18 (perfects, seguro que, por encima, el qué, lo sé, faltaría más).
- Kept: limón glossed "lime" with its Mexican flag (the town is Mexican); tortilla, ceviche, habanero, Monterrey. Held-out "Vale, me parece bien" → thanks_helpful was already misread before the twins.

## Spain review (12 Nov 2026)

Fresh reviewer, all Spain twins and the untwinned lines as Spain hears them (NPC lines and hints), the Spain corpus.

Checked: the chef's tú, the learner's usted to the chef, Fátima tú both ways, closing_chef's "Probad" with {m:los dos|f:las dos} (agrees), the pictures' food words (chowder, tortilla strips, habanero kept).
Found and fixed: "Eso lo va a recordar por años" (→ "durante años"); "Olvida lo que dije" just said (→ "lo que he dicho", Perdona); "Ya sabía" (→ "Ya lo sabía", Vale, Perdona).
Gates: tsc clean; check-content Mexican, neutral and Spain 0 errors, 0 warnings; corpus 436/436 0/69; held-out 39/40 (unchanged); Spain 22/22 0/1; vitest es 178/178.
