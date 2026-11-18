# The surf lesson (15 Nov 2026)

The game's first mini-game: a surf lesson in the town's sea, driven by what the instructor says. The learner acts on
what they understand. The owner's design (13 Nov 2026); built for Puerto Colibrí's surf school, La Ola
(docs/es/TOWN.md "La Ola"), with the engine shared so that Maple Harbor can have one too.

## What the learner does

**Finding it** (16 Nov 2026, the owner: "not seeing a probamos una ola at the end of convo nor any notification when
I'm at the board"): every board at the school gives the prompt "Banglenčių pamoka" / "Surf lesson" (the rack, the
paddleboards, the kayak on the sand: `world/surf.ts` `boards`, with room; standing on one, it wins over the
instructor's talk prompt a step away), a pulsing ring marks the start on the sand (`play.ts` `marker`), the first time
one comes near the school the guide's hint "surf" says the lesson is there (`coach.ts`; `hintWithin`), and the end
card of the school's conversation leads with a wide "Surf lesson" button (`Game.surfAfter`, `surfFromConversation`):
after the conversation's yes it starts the lesson at its level, without one it opens the level's choice. The yes
starts it however the conversation closes ("Tęsti", ✕), but for picking another conversation. Test:
`tests/browser/surf-find.mjs`.

**It is a conversation** (18 Nov 2026, after the owner played it and met "Levántate en cuanto yo diga «ahora»" with
no idea what to press: back-and-forth speech like every other conversation, turn-taking at a calm pace, and the move
she asks for said large on the screen). She says one thing (never more than three short lines), then it is the
learner's turn, and she waits for it:

- **A turn to speak.** The learner's lines are on show ("¡Listo!", "¿Esta?", "¿Ahora?", "Estoy bien.", with their
  meaning), and the microphone opens by itself as she finishes, as in every conversation (`convo/speech.ts`; what is
  heard is held against each line with `compareRepeat`). Something else heard is shown ("Išgirdau „…“") and it listens
  again, three times, then rests. A tap (or 1–3) answers too: the line is then said for the learner, in the voice
  their examples have (`coachVoice`). The mic button (M) turns answering aloud off or on for the lesson.
- **A turn to act.** The move her line asks for stands right under it, large, with its key: "Irkluok – spausk E",
  "Nerk po banga – spausk ↓", "Suk lentą – spausk ← →", "Stokis – spausk ↑", "Svirk į kairę – spausk ←". On a phone
  it is the button to tap ("Stokis – bakstelėk"). Paddling shows its strokes as dots; the stand-up, where the wave
  won't wait, its time as a bar. A command of the ride heard seven times (only her voice is left of it) shows its
  move after two seconds of hesitation: first the learner's ear.
- **The sea waits with her.** A wave to duck under, or to ask about, hangs back until the learner has had their
  turn; a ride goes on a stretch per command.

1. **Starts it**: by saying yes to "¿Probamos una ola?" at the end of the conversation at the school (its event
   `c.event("surf", { level })`), or at the school's boards by the water (the prompt "Banglenčių pamoka", then a
   choice of level).
2. **On the sand**: "Hoy nos quedamos en la espuma…" → "¡Perfecto!" / "Está bien."; "¿Qué tabla quieres? Agarra la
   tabla larga, la de espuma." → the learner names it (the wrong one gets a word, "Esa no. ¡La otra!", not a penalty);
   "¡Esa mera! Ponte la correa en el tobillo." → "¡Listo!"; "¡Vamos al agua!" → "¡Ya voy!".
3. **Paddles out**, lying on it: "¡Rema!" → four strokes (E, or ← → one arm after the other; on a phone the button
   under her line, the round one, or a tap on the picture). A wave comes and hangs back: "¡Ola! ¡Pasa por debajo!" → ↓
   (left too long it sweeps them back a little, and comes again). "Ya estamos. Siéntate en la tabla." → "¿Y ahora?".
4. **Waits for the set**, sitting on the board beside her. A wave shows and the learner asks: "¿Esta?" → "Esta no…",
   "¿Y esta?" → "¡Esta sí! ¡Gira la tabla!" → ← or →. Further out she also asks whose wave it is: "La anterior fue
   mía. ¿Vas?" → "¡Voy!" / "Te toca."
5. **Catches it**: "¡Rema, rema, rema!" → the strokes bring the wave up behind them; "¡Ahí viene!" → "¿Ahora?" →
   "¡Todavía no! Espera…" → "¿Ahora?" → "¡Ahora! ¡Levántate!" → ↑ (or Space, the jump button), within six seconds
   (three further out). Up before her "¡Ahora!" is a fall; too late, and the wave goes by.
6. **Rides it** to the beach, one command at a time (four; six further out): "Inclínate a la izquierda", "Dobla las
   rodillas", "Mira al frente" (hold steady), "Peso adelante"; further out also "¡Sube a la cresta!", "¡Gira a la
   derecha!", "¡Ahora, un truco! ¡Salta!" (the flip). A beginner's command waits for its move (after a while she says
   it again in other words); a wrong move costs balance, three of them are a fall. Further out a command waits five
   seconds, and two misses are a fall. Once in a lesson she asks between two commands: "¿Todo bien?" → "¡Todo bien!" /
   "Más o menos." At the beach: "¡Hasta la orilla! ¡Tu primera ola! ¡Felicidades!" → "¡Gracias!" / "¡Qué divertido!".
7. **A fall is a talk**: "¡Qué revolcón! ¿Estás bien?" → "Estoy bien." / "¡Tragué agua!"; "No pasa nada. Todos nos
   caemos. ¿Qué pasó?" → one of three reasons ("Me levanté antes de tiempo.", "No doblé las rodillas."…). The right
   one: "¡Exacto!" and a tip; another: "No, mira:" and what it was → "Entendido."; then "¿Otra vez?": "Otra vez." takes
   them straight back to the line-up.
8. **The score**: waves ridden, seconds on them, commands followed at the first try. Kept in the learner's progress
   (`progress.surf`), with how often each line has been heard.

**The help fades line by line**: the first times a line is heard it shows with its glosses and its meaning, then the
Spanish alone, then only her voice (a tap shows the text; the small speaker on her card says the line again).
"Lėčiau" slows her and gives more time where time counts. The commands one acts on, the questions, the rewards and
the learner's own answers become phrase cards when the lesson ends.

**A picture of what she asks for** (where the edition has them; 16 Nov 2026): beside her words, a small framed
picture of the instructor doing it ("¡Rema!": paddling; "Inclínate a la izquierda": leaning left; "¡Ola! ¡Pasa por
debajo!": ducking under the foam). It slides in as she calls the command and gives way to the next one; short praise
keeps the command's picture, a line with no picture of its own shows her words alone. On a computer it sits left of
the words in the card at the top; on a phone held upright across the card's top, the words under it; sideways, small
beside them. The card always ends well above the learner's board and the waves (the browser test measures it). The
picture is help like the glosses: it stays when the words lose their translation and goes when only her voice is
left (the tap that shows the words shows it too). With reduced motion it does not slide. All of a lesson's pictures
are fetched as it begins. The card and the lesson's other panels are painted with the game's theme variables, so
they follow a course's dark themes.

**Two levels**: beginner (whitewater, the long foam board, she waits for every move, three wrong ones to a fall) and
advanced (green waves further out, the short board, turns and the trick, taking turns in the line-up, a wave that
won't wait long, two misses).

## The files

| | |
| --- | --- |
| `src/game/surf/logic.ts` | the rules: what she says, whose turn it then is (`choice`: the learner's lines to answer with; `todo`: the move to make), what a fall is blamed on, the score. No three.js, no sound; tested alone. `CUES` lists every line of the lesson, `ANSWERS` the learner's own |
| `src/game/surf/Surf.ts` | the lesson in the sea: the board, the waves (a strip of water lifted in its shader, over the sea's own swell), the instructor on her board, the camera for each part |
| `src/game/surf/play.ts` | the lesson as the game runs it: her lines said and shown, the microphone in the learner's turn (`listen`), a tapped answer said for them (`answer`), the move's button (`act`), the keys, the score and the cards kept |
| `src/game/surf/shapes.ts` | the surfboards |
| `src/game/surf/store.ts`, `src/ui/Surf.tsx`, `surf.css` | what is on the screen: her line, the move under it (`Move`), the learner's turn with its microphone and lines (`Mic`), what they said, the balance, the score, the level's choice, the score card |
| `src/game/world/surf.ts` | where this town's lesson is (null: none). Puerto Colibrí's: `src/editions/es/game/world/surf.ts` |
| `src/content/surf.ts` | which conversation holds her lines, who she is, and (optional) `pictures`: a folder under `public/` and a picture per cue (null: no lesson). Puerto Colibrí's: `src/editions/es/content/surf.ts`, its 17 pictures in `public/scenes-es/x01-surf-game/` |
| `src/game/Game.ts` | `updateSurf`, `onSurf` / `offSurf`, the prompt at the boards, the conversation's event |
| `src/game/characters/Character.ts` | `surf`: lying on the board and paddling, standing side-on, astride it |
| `src/game/camera.ts` | the "stage" mode: the camera goes where the lesson puts it |

## Her words are a conversation's lines

Every cue is a key `sg_<cue>` in the `lines` of the school's conversation (Puerto Colibrí: `x01-surf`, from
`src/editions/es/content/surf-lines.ts`). So the three Spanishes, the voices (recorded with the conversation's, in
her voice), the Lithuanian layer's table and the cards treat them as any line. The learner's own lines are there too
(`sg_a_…`, and the boards `sg_b_…`): recorded in the coach voices of both genders (`tools/es-voices/lines-es.ts` 2b,
`reach-es.ts` `UNSPOKEN` keeps them out of her voice); one with no recording yet is only shown when tapped. An edition without a cue stays silent
there. The pictures are optional: an edition without `pictures` shows her words alone. A new edition's surf school needs: the spot (`world/surf.ts`), the content pointer (`content/surf.ts`), the
lines, and a conversation that raises `c.event("surf", { level: "beginner" | "advanced" })`.

## Tests

`tests/surf.test.ts` (the rules, played by learners who answer and follow, stay silent, don't paddle, lean the wrong
way, stand up early or late, on twelve seeds at both levels; she never says more than three lines before the
learner's turn) and `tests/browser/surf.mjs` (the real game, a computer and a phone, time stepped by hand, the
browser's speech recognition stood in for: answers said aloud, by key and by tap, something else said, every move
named under her line with its key and clear of the learner, two lessons with a fall, the score card, the
conversation's hand-over, the way out).

## Left for later

- Maple Harbor has no surf school yet (`SURF_SPOT`, `SURF` are null there).
- The instructor is on her board at the line-up for the whole lesson; she does not ride her own waves.
- The trial world styles (`StyledCharacter`) have no surfing poses.
- No sound of its own beyond the game's splashes, the jump and the cheer.
