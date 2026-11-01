# Review: s62-visitor-center ("¿Me lo puede repetir?", Don Chuy), writer's commit df2af01b

**Gate.** Before: tsc clean; check-content 89/89 NLU, 10 sims 12/12, fuzz 80 OK, 0/0; corpus 137/137, 0/26 false accepts.
After: tsc clean; check-content **105/105 NLU, 12 sims 12/12**, fuzz 80 OK, 0 errors 0 warnings; corpus (163 + 97 review
probes) **223/228 = 97.8%, 0/32 false accepts**. All of the writer's gate claims held.

**Blind set** (`tests/es/heldout/s62-visitor-center.json`, 43 sentences, 7 traps, written before reading the draft):
before **40/43 = 93.0%**, 0 traps accepted, but 1 misread was a meaning flip. After: **43/43 = 100%**, 0 traps (not blind for me any more).
A second probe of 108 sentences, written after reading the draft: 78/92 at first, **103/108 (95%)** at the end, 0 false accepts.

## Fixes (25 lines changed, 68 added in the conversation file)
- **meaning-safety, must-fix (5 lines).**
  1. In the left-or-right quiz, "No a la derecha, a la izquierda" was read as *right*: the first `dir_ans_ctx` won, and the
     wrong answer was corrected. A new pattern takes the second direction.
  2. "Derecho, ¿no?" at the quiz was read as `confirm` (straight is part of the route), so Don Chuy said "¡Exacto!" without
     hearing left or right. That bypassed the writer's own derecho ≠ derecha guard. `straight_ans_ctx` now takes `[@ctail]`.
  3. "Sí, ya lo conozco" / "No, ya sé dónde está" to "¿Le digo cómo llegar?" gave the café route (or read "no sé"). These are now `decline_ctx`.
- **understanding, must-fix for the common ones (~16 pattern lines).** "¿Puede repetirlo?", "¿Lo puede repetir (más
  despacio)?", "¿Me lo escribe?", "Hable más despacio" (the lesson's own skill!). These are local `repeat_it` / `write_it` / `say_again_slowly`.
  Overriding `g_repeat` locally changed its ranking ("Perdón, no entendí" became a repeat), so I used separate intents.
  Also: "No, gracias, ya tengo uno en el celular"; "Acabo de llegar, es mi primera vez" ("primer vez" was in the pattern);
  "Hacia / Para la izquierda"; "A la derecha, creo"; "Quisiera saber cómo llegar…"; "¿Me lo puede marcar en el mapa?";
  "Estoy buscando un restaurante"; "Mejor al museo"; "A ningún lado"; "Prefiero el té"; "deletrear el nombre de la calle".
- **spanish / answers (polish, ~12 lines).** After a slow repeat he asked "¿Me explico?" for the third time in a row. A slow
  replay now asks "¿Así mejor? / ¿Ahora sí?". "¿Dónde compro boletos para el camión?" was answered with where the
  colectivo stops. It now gets `ticket_none` (no tickets here; you pay on board in cash; it has a neutral twin). "El domingo cerramos" →
  "Los domingos cerramos".
- **gloss-english (polish, 2 lines).** "¿Me entendió?" glossed `Me |` → `(Me) |`; "On | Sunday" → "On | Sundays".
- **numbers / twins / facts: no fixes.** No prices; hours and trip times invented for a fictional town; Xcacel and Chemuyil
  vague and right. Mexican-only words (pásele, tianguis, banqueta, camión) all have neutral twins, about 1 line in 12.
- **structure: no fixes.** Same steps, route engine and twists as the English one; dropping the bus-pass sale fits Mexico.
- **tests (~33 lines).** 16 NLU tests (5 meaning-safety) and 2 sims: the quiz with derecho + a correction, and "ya lo conozco".

## For the lead
- **NEEDS (shared global.ts):** `g_repeat` lacks "repetirlo / lo puede repetir", `g_write` lacks "¿Me lo escribe?", and
  `g_slower` lacks the imperative "hable más despacio". Every conversation will miss them; this one has local stand-ins.
- **Can't be solved without punctuation:** "No, es todo" (that's all) and "No es todo" (that's not all) are the same
  input. The common reading (that's all) wins. "No, no es todo, tengo otra pregunta" still gives both intents.
- "¿Es a la derecha?" stays not understood on purpose: "turn right" or "on the right"? A guess could correct a true statement.
- "Disculpe, no le escuché" → louder is fine (he apologizes and repeats). "Hablo como perico": natural, I believe; a native check is welcome.
