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
- **Usted to the chef (writer's "unsure", kept).** The brief says tú. The chef says tú to the learner, but the learner's hints to him use usted; both are understood. For tú both ways, only the serve-to-handoff hints change.
- **Engine.** A piece after a negative piece isn't split off unless it starts a new clause ("No te preocupes, vas muy bien"). Other conversations will hit this.
- **"No más sal".** This is now read as "no more salt". Mexican "nomás sal" ("just salt") would read the same way; that is rare from learners and safe (nothing is recorded).
