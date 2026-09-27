# English World: plan (v1, 24 September 2026)

A browser game for Lithuanian adults practising spoken **American English**. You arrive in **Maple Harbor**, a friendly, stylized coastal town. You walk around, enter places and talk to people in 30 everyday situations based on the situation songs 62–91.

## Sources reviewed

- 30 situation songs, English 62–91: lyrics from the MP3 tags and `Desktop/Vienakalbės dainos/Situation songs/_source/songs_situations_en.json`, with LT titles, topics and natural line translations.
- Interlinear rules: `planning/tomas/INTERLINEAR-GUIDELINES.md` (TOMAS-INTERLINEAR-v2), `planning/library/13-Minimum-unit-rules-and-audit.md` (LIBRARY-MINIMUM-UNIT-v3), `planning/library/05-Language-interlinear-and-audio.md` (LIBRARY-STYLE-v3), and `claude-batches/CONVENTIONS.md` with the gloss-sequence, concord and everyday protocols.
- Reader look: `claude-batches/make_html.py` (EB Garamond English, small grey sans glosses, units centred and wrapping only between units).
- IPA convention: `claude-batches/ipa.py`. Broad General American, CMU primary pronunciations, no length marks, ʌ/ə and ɝ/ɚ, strong forms except *the* and *a*.
- Speech: the Dvikalbės Dainos app, `work/course/src/lib/speech-check.ts`, `speech-attempt.ts` and `components/SpeechMic.tsx`.

The songs are in British English. At the owner's request (24 September) the game uses **American English**: dollars, *for here or to go*, *check*, *apartment*, *gas*, *round-trip*, *line* and *911*. Common British wording such as *take away*, *the bill*, *flat* or *queue* is still accepted, and the game gives an optional note on the American usage.

## Principles

1. **Choose, then say it your way.** Lithuanian suggestions show *what* you could communicate: intentions and choices such as the drinks on the menu. English hints show *how* to say it, with about ten natural patterns for common intentions and completed examples. Choosing a suggestion never submits an answer.
2. **The NPC understands the meaning, not a script.** The engine does deterministic grammar parsing with full coverage and slot filling:
   - The whole utterance must be accounted for.
   - Negation is never dropped.
   - Items and details are extracted, so the NPC doesn't ask again for what you already said.
   - Short answers work.
   - Unclear or partial input leads to a natural clarifying question.
3. **Communication first, polish second.** "I want a latte" places the order. A small optional tip then suggests "I'd like a latte, please."
4. **Supports can be turned off separately and brought back any time.** The supports are Lithuanian interlinear (glosses plus a natural sentence), IPA, hints and suggestions. There are no rigid levels.
5. **No live generative AI and no metered services.** All dialogue is prepared. NPC audio is pre-generated during development with a local open-source TTS (Kokoro-82M, Apache-2.0). Speech input uses the browser's Web Speech API, which is free for the site. On-device recognition is preferred where the browser offers it, and typing is the fallback.

## Architecture

- **Vite + TypeScript**. **Three.js** renders the world. **React** renders the HUD and conversation overlay. **zustand** holds shared state.
- `src/convo/`: the conversation engine:
  - normalizer (contractions and homophones, ported from the songs app)
  - pattern grammar and matcher (full-coverage and prefix checks)
  - NLU ranking
  - dialogue manager (steps, slots, pending questions, twists)
  - interlinear composer (templates plus Lithuanian agreement)
  - speech attempt (adapted from the songs app)
- `src/content/`: one module per situation, plus the global intents, entity lexicons, locations and NPCs. Situations are data plus small logic functions, so they are easy to extend.
- `src/game/`: procedural low-poly town, interiors, characters, player controller, camera, collisions, navigation grid and A* for click-to-walk, the guidance trail, the beacon and the minimap.
- `tools/`: IPA lexicon builder, audio generator (Kokoro, local), content validator and NLU/dialogue test runner.

## World: Maple Harbor

| District | Places (situation songs) |
|---|---|
| Airport | Arrivals and passport control (65), baggage desk (65), check-in, security and gate (64) |
| Downtown, Main Street | Visitor Center (62), Sunny Cup Café (72), Lucia's Trattoria (73), Threads clothing (74), Harbor Pharmacy (75), Snip & Style salon (77), Harbor Bank and ATM (78), Post Office (79), Harborview Hotel (68), Art Museum (70) |
| Town Square and market | Rosa, a local (69), old friend Lucy (86), lost wallet (91), Police (91) |
| Residential, Oak Avenue | Maple Street Apartments: landlord (81), neighbor (82); Sophie's backyard party (63); Dan & Nora's dinner (85) |
| Work | Brightline office: interview (87), first day (88), video call (89) |
| Getting around | Taxi stand (66), Union Station (67), Car rental and gas station (71), bus stop (90) |
| Harbor | The Pier restaurant: date (84) |
| Phone calls | Dentist (76), NetWave support (80), invite Lizzie (83), boss (90) |

Guidance comes from:
- an objective card (in Lithuanian) with distance
- a glowing path on the ground, a beacon over the destination and the minimap
- a full map where any situation can be picked as the goal, with auto-walk and taxi travel
- name tags and "E – kalbėtis" prompts

## Build sequence

1. Scaffold the project and the core world: player, camera, collisions, click-to-walk.
2. Conversation engine and UI with the café as the flagship situation. NLU tests and dialogue simulations.
3. Authoring guide. The other 29 situations are written in parallel against the validator and tests.
4. Town and interiors for every location, NPC roster, phone calls, progression (stamps, stars, phrasebook), settings and onboarding.
5. IPA lexicon and pre-generated audio for all NPC lines and hint examples.
6. Browser testing: movement, every situation by typed input and the speech path, desktop and phone widths.
7. Lithuanian review pass. Documentation: running, extending, network and cost disclosure.
