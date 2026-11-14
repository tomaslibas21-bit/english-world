# The surf lesson (15 Nov 2026)

The game's first mini-game: a surf lesson in the town's sea, driven by what the instructor says. The learner acts on
what they understand. The owner's design (13 Nov 2026); built for Puerto Colibrí's surf school, La Ola
(docs/es/TOWN.md "La Ola"), with the engine shared so that Maple Harbor can have one too.

## What the learner does

1. **Starts it**: by saying yes to "¿Probamos una ola?" at the end of the conversation at the school (its event
   `c.event("surf", { level })`), or at the school's boards by the water (the prompt "Banglenčių pamoka", then a
   choice of level).
2. **The board**: "¿Qué tabla quieres?" then "Agarra la tabla larga, la de espuma." Three boards to tap; the wrong one
   gets a word ("Esa no. ¡La otra!"), not a penalty.
3. **Paddles out**, lying on it: "¡Rema! ¡Más fuerte!" (E, or ← → one arm after the other; on a phone the round
   button, or a tap on the picture). A wave comes: "¡Ola! ¡Pasa por debajo!" (↓ or the stick down: under it; else it carries them back a few
   metres).
4. **Waits for the set**, sitting on the board beside her: "Esta no…" (do nothing), then "¡Esta sí! ¡Gira la tabla!"
   (← or →). Further out she also asks whose wave it is: "La anterior fue mía. ¿Vas?" → "¡Voy!" / "Te toca."
5. **Catches it**: "¡Rema, rema, rema!" then "¡Ahora! ¡Levántate!" (Space, the jump button). Too early is a fall; too
   late, or too little paddling, and the wave goes by.
6. **Rides it** to the beach, with her corrections every two or three seconds: "Inclínate a la izquierda", "Dobla las
   rodillas", "Mira al frente" (hold steady), "Peso adelante"; further out also "¡Sube a la cresta!", "¡Gira a la
   derecha!", "¡Ahora, un truco! ¡Salta!" (the flip). A command followed in time adds balance, one missed costs some;
   with none left, a fall.
7. **A fall is a question**: "¡Qué revolcón!" → "¿Qué pasó?" → three answers to tap ("Me levanté antes de tiempo.",
   "No doblé las rodillas."…). The right one: "¡Exacto!" and a tip; another: "No, mira:" and what it was. Then "¿Otra
   vez?": "Otra vez." takes them straight back to the line-up.
8. **The score**: waves ridden, seconds on them, commands followed in time. Kept in the learner's progress
   (`progress.surf`), with how often each line has been heard.

**The help fades line by line**: the first times a line is heard it shows with its glosses and its meaning, then the
Spanish alone, then only her voice (a tap shows the text). "Lėčiau" slows her and gives more time for everything.
What the keys and buttons do is said in the learner's language; what she asks for never is. The commands one acts on,
the questions and the rewards become phrase cards when the lesson ends.

**Two levels**: beginner (whitewater, the long foam board, wide windows, three misses to a fall) and advanced (green
waves further out, the short board, turns and the trick, taking turns in the line-up, two misses).

## The files

| | |
| --- | --- |
| `src/game/surf/logic.ts` | the rules: what is said when, what must be done by when, what a fall is blamed on, the score. No three.js, no sound; tested alone. `CUES` lists every cue she can say |
| `src/game/surf/Surf.ts` | the lesson in the sea: the board, the waves (a strip of water lifted in its shader, over the sea's own swell), the instructor on her board, the camera for each part |
| `src/game/surf/play.ts` | the lesson as the game runs it: her lines said and shown, the keys and buttons, the score and the cards kept |
| `src/game/surf/shapes.ts` | the surfboards |
| `src/game/surf/store.ts`, `src/ui/Surf.tsx`, `surf.css` | what is on the screen: her line, the answers, the balance, the score, the level's choice, the score card |
| `src/game/world/surf.ts` | where this town's lesson is (null: none). Puerto Colibrí's: `src/editions/es/game/world/surf.ts` |
| `src/content/surf.ts` | which conversation holds her lines, and who she is (null: none). Puerto Colibrí's: `src/editions/es/content/surf.ts` |
| `src/game/Game.ts` | `updateSurf`, `onSurf` / `offSurf`, the prompt at the boards, the conversation's event |
| `src/game/characters/Character.ts` | `surf`: lying on the board and paddling, standing side-on, astride it |
| `src/game/camera.ts` | the "stage" mode: the camera goes where the lesson puts it |

## Her words are a conversation's lines

Every cue is a key `sg_<cue>` in the `lines` of the school's conversation (Puerto Colibrí: `x01-surf`, from
`src/editions/es/content/surf-lines.ts`). So the three Spanishes, the voices (recorded with the conversation's, in
her voice), the Lithuanian layer's table and the cards treat them as any line. An edition without a cue stays silent
there. A new edition's surf school needs: the spot (`world/surf.ts`), the content pointer (`content/surf.ts`), the
lines, and a conversation that raises `c.event("surf", { level: "beginner" | "advanced" })`.

## Tests

`tests/surf.test.ts` (the rules, played by learners who follow, ignore, lean the wrong way, stand up early or late,
on twelve seeds at both levels), `tests/browser/surf.mjs` (the real game, a computer and a phone, time stepped by
hand: the prompt, two lessons with a fall, the score card, the conversation's hand-over, the way out).

## Left for later

- Maple Harbor has no surf school yet (`SURF_SPOT`, `SURF` are null there).
- The instructor is on her board at the line-up for the whole lesson; she does not ride her own waves.
- The trial world styles (`StyledCharacter`) have no surfing poses.
- No sound of its own beyond the game's splashes, the jump and the cheer.
