# Authoring a situation

Each situation is one TypeScript module in `src/content/situations/`. It is data plus small handler functions: prepared NPC lines, a grammar of accepted learner responses, Lithuanian suggestions, English hints and a step agenda. There is **no generative AI at runtime**. Every NPC sentence is authored, and every accepted response is covered by the grammar.

**Reference implementation:** `src/content/situations/s72-cafe.ts`. Read it completely before writing anything. It shows every feature described here.

Check your work with:

```bash
npx tsx tools/check-content.ts src/content/situations/<your-file>.ts            # all checks
npx tsx tools/check-content.ts src/content/situations/<your-file>.ts --verbose  # + warnings and sim logs
npx tsx tools/sim.ts <situation-id> <seed> "Hi!" "…"  # print one conversation (needs the file registered in index.ts)
```

The target is **0 errors**, every NLU test passing, and every simulation passing on 12/12 seeds.

## 1. What the learner experiences

A Lithuanian adult (often 40+) walks up to an NPC in a stylized American town and presses E. The NPC speaks, with audio pre-recorded from your lines. On the learner's turn the screen shows:

- **Lithuanian suggestions** (`suggest`): *what* they could communicate. Examples: "Užsisakyti gėrimą" with chips [latė] [kapučino] …, or "Paklausti kainos". Choosing a chip never submits anything. It only selects the item that completed English examples use.
- **English hints** (`hints`): *how* to say it. About 10 natural patterns for common intentions, fewer for rare ones. Each pattern comes with a completed example that uses correct articles.
- The learner **speaks** (Web Speech API) or types. The grammar must accept the hint patterns **and many more natural alternatives**. Hints are examples, not the list of accepted answers.

The NPC must react to what was actually said:

- Fill any slot the learner mentioned, and never ask again for information already given.
- Accept short answers ("To go, please", "Large", "Card").
- Handle side questions, then return to the open question.
- Ask a natural clarifying question when something is vague ("A coffee, please" → "What kind of coffee?").
- **Never flip meaning.** "I don't want a cappuccino" must never order a cappuccino.
- Communication succeeds even with blunt or imperfect English ("I want a latte" places the order). Tag such forms `#blunt` or `#tip:key` so a short optional tip is shown. Don't block the conversation over politeness or grammar.

Returning players should meet variation: 2–4 variants for common NPC lines, optional steps decided by `c.chance()` in `init`, and 1–3 **twists** (e.g. "we're out of oat milk"), usually gated by `c.visits >= 1`.

## 2. Language: American English

The world is Maple Harbor, a US coastal town. Use American vocabulary and forms: dollars, *check* (restaurant bill), *apartment*, *elevator*, *restroom*, *gas*, *round-trip / one-way*, *line* (queue), *trunk*, *sidewalk*, *cell phone*, *zip code*, *ATM*, *driver's license*, *pharmacy / drugstore*, *bangs* (fringe), *resume* (CV), *vacation*, *fall*, *911*, *Social Security*, *utilities*, *lease*, *security deposit*. Write dates American-style in English ("June 4th", "the fourth of June" is also fine).

The source songs (in `/private/tmp/claude-501/-Users-gabrieledirmontaite/39781b01-c41e-4e09-b7e9-f2a8d4c93c07/scratchpad/songs/en30.txt`, with Lithuanian line translations in `~/Desktop/Vienakalbės dainos/Situation songs/_source/songs_situations_en.json`) are British. Use them as a **starting point only**. Research the real-world interaction and expand substantially. Cover:

- typical greetings
- the questions staff really ask
- the choices available
- useful learner questions
- clarifications
- common problems

**Accept British variants** in the grammar (take away, the bill, flat, queue, lift, petrol, return ticket, fringe, CV, cash machine, toilet …). Tag them `#tip:<key>` and define a short Lithuanian tip in `tips`: "Suprasta! Amerikoje dažniau sakoma „…“."

## 3. Sentences and the interlinear rules (mandatory)

Every NPC line and hint sentence is `t(en, lt, nat, extra?)`:

```ts
t("Hi! | What | can | I | get | you?", "Sveiki! | Ką | galiu | aš | paduoti | jums?", "Sveiki! Ką jums paduoti?")
```

- `en` and `lt` are **units separated by ` | `** (space, pipe, space) and must line up one to one. The clean English is the units joined by spaces, so write punctuation exactly as it should appear.
- `nat` is the separate, fluent Lithuanian sentence. It may reorder words and must preserve meaning, tense, negation and register.

These rules come from the owner's bilingual book rules: TOMAS-INTERLINEAR-v2 in `~/.codex/.chatgpt-projects/g-p-6aa6fc5f50ac8191953bcfe76b39abf9/planning/tomas/INTERLINEAR-GUIDELINES.md` and `…/planning/tomas/drafts/claude-batches/CONVENTIONS.md`. Read both. In summary:

1. **One English word per unit.** A multiword unit (a *merge*) is allowed only when splitting would give a false meaning or a missing correspondence. One English word may need several Lithuanian words (`English → anglų kalba`, `again → dar kartą`).
2. **Articles.** *a / an / the* with no Lithuanian word get their own unit with the gloss `—` (`a | beautiful | museum` → `— | gražus | muziejus`). Never attach an article to a neighbour just to avoid the dash. Don't invent *vienas / tas*.
3. **Contextual glosses in correct case, number, gender and tense.** Keep English order in the gloss line, but the gloss line must read as Lithuanian left to right: agreeing joints, prepositions governing case, genitive under negation, dative experiencers (`I'm | good` → `Man | gerai`).
4. **Conventions:**

   | Code | Construction | Treatment |
   |---|---|---|
   | C-CONTR | *It's / I'm / That's* | One unit: `Tai yra`, `Aš esu` |
   | C-COP | *is / are* | `yra` even where natural LT drops it |
   | C-Q | Yes/no questions | `Ar` attaches to the first auxiliary (`Can → Ar galiu`, `Do → Ar`, `Would → Ar` plus a flag saying the conditional sits on the verb) |
   | C-WHQ | Wh-question *do / does / did* | `—` with a flag |
   | C-NEG | *don't know, didn't catch* | One unit, glossed with the negated verb (`nežinau`) |
   | C-FUT | *I'll have* (ordering) | One unit: `Imsiu` |
   | C-PROG | *is coming* | One unit |
   | C-INF | *to see* | One unit: `matyti` |
   | C-CASE | *in the back, by card, of coffee, for you* | One unit when the Lithuanian case ending carries the preposition and no adjective/possessive/numeral intervenes. If one does, the preposition gets `—` plus a flag. |
   | C-PHR | Phrasal verbs whose particle has no truthful gloss (*pick up, warm up*) | One unit |
   | C-PHR (truthful) | Particle with a real gloss (*come back* → `grįžti · atgal`) | Split |
   | C-LEX | Fixed expressions (*of course, you're welcome, here you go, how much*) | One unit |
   | C-ONE | *which one* | One unit |

5. **Every multiword unit must be registered.** The shared rules and entries live in `src/content/merges.ts`. **Do not edit that file.** Put your situation's extra merges in the `merges` field of your situation, key = lowercase unit without outer punctuation:

   ```ts
   merges: { "check in": { reason: "lexical_expression", split: "check → patikrinti + in → į is false; = užsiregistruoti", minimal: "Two words." } }
   ```

   The checker lists every unregistered multiword unit.
6. **Flags.** A `—` that is not an article (question *do*, progressive *are*, discontinuous particle, partitive *some*) needs a note in `flags: { unitIndex: "why; which unit carries it" }`. It is shown as a tooltip.
7. **Punctuation:** Lithuanian glosses mirror the unit's terminal punctuation. Quotation marks are not mirrored.
8. **Address.** Lithuanian uses *jūs* for strangers and staff, *tu* for friends and peers in social settings. Write `{j:jums|t:tau}` wherever it differs. The NPC's `informal` flag chooses. The same applies to hints: that is how the learner addresses the NPC.
9a. **Words describing the player** (jobs and similar): give the entity feminine forms in `ltF` (same unit count as `lt`). The composer uses them whenever the player is female, in hints and in NPC lines about the player ("Dirbu slaugytoja"), and suggestion chips show them too.
9. **Gender.** `{m:pasiruošęs|f:pasiruošusi}` always follows the **player's** gender and `{sm:…|sf:…}` the **NPC's**. In NPC lines that means the addressee and the speaker. In hints (the learner speaks) `{m:…|f:…}` is the learner's own gender ("Esu {m:buvęs|f:buvusi}…") and `{sm:…|sf:…}` is the NPC being spoken to ("Ar {j:esate|t:esi} {sm:laisvas|sf:laisva}?"), taken from the NPC who spoke last.
10. **Numbers and money.**
    - Use value placeholders `{$price}` (cents), `{$time}` (`{h, m}`), `{$num}`, `{$letters}` (spelled letters) or `{$text}`. They are formatted automatically.
    - Declare the audio domain for any value you use (the café's `domains.price` shows how).
    - Otherwise write numbers as digits and give a spoken form in `say:` ("That's $12." → `say: "That's twelve dollars."`).
    - **Never put the player's name into an NPC line.** Audio can't be pre-recorded for it.
11. **Entity placeholders:** `{X}` (head noun), `{X.np}` (article plus head), `{X.the}` and `{X.pl}` in `en`; `{X:acc}`, `{X.np:gen}` and so on in `lt` and `nat`, with case nom/gen/dat/acc/ins/loc. Bind them with `c.say("line", { X: "latte" })` or `{ X: { id: "latte", mods: ["large"] } }`. Articles (*a/an*) and adjective agreement are computed. Hint items use `X` for the hint group's `slot` entity type.
12. `spell:` and `write:` on a line let "How do you spell that?" and "Could you write it down?" work. Add them to lines with names, codes, addresses and passwords.

Natural Lithuanian must be genuinely natural, contemporary and correct: cases, aspect, the partitive genitive (*Norėčiau kavos*), clock times (*pusę aštuonių* = half past seven). Don't calque. Service staff are polite (*jūs*).

## 4. Entities

```ts
ent("latte", "latte", "latė/latės/latei/latę/late/latėje", "f", { pl: "lattes", ltPl: "…6 forms…", forms: ["cafe latte", "lattes"], attrs: { price: [425, 475, 525] } })
```

- `lt` lists the six case forms nom/gen/dat/acc/ins/loc per unit, and units are separated by ` | ` (`"green | tea"` → `"žalioji/… | arbata/…"`). A single form means indeclinable (`kapučino`).
- `g` is the Lithuanian gender, used for agreement.
- `forms` adds recognised synonyms and common speech-recognition spellings.
- `chip` is the Lithuanian label for the suggestion chip.
- Entity types become grammar slots: `{drink}` matches any drink form.
- Adjective-like entities used as modifiers (sizes, colors) take the masculine forms. The composer declines them to agree with the noun.

## 5. Grammar of accepted responses

```ts
grammar: { macros: { … }, slots: { item: { pattern: "[@qty] {size} {drink}" } } },
intents: { order: { patterns: ["@order_prefix {items} [@dine]", "{items}"] } },
```

- Syntax:

  | Syntax | Meaning |
  |---|---|
  | `(a \| b)` | Alternatives |
  | `[optional]` | Optional part |
  | `{slot}` or `{name:type}` | Slot capture |
  | `@macro` | Macro reference |
  | `#tag` | Tag |

  Contractions are expanded for you, so "i'll" equals "i will". Write lowercase and no punctuation.
- **Full coverage.** Every word the learner says must be matched by your pattern or by the built-in edge fillers:
  - leading: hi/hello/good morning/oh/okay/so/well/actually/sorry/excuse me/i think/maybe/let me see …
  - trailing: thanks/thank you/then/for me/too/please/i think/for now/is that okay …
  - the NPCs' names and titles, first or last ("Hi Mia, …", "…, thanks, Officer Diaz", "sir", "ma'am")
  - removed everywhere: please and um/uh

  So write the core of each utterance and let the fillers do the rest.
- **Built-in learner tolerance** (engine, all situations). Don't write patterns for these:
  - Function words may be missing: articles, *some*, *to*, *of*, *is/are/am*, *do/does/did*, a preposition, the subject *I* ("I want latte", "where you live", "I am teacher", "pay cash", "I would like check in"). Per intent, at least one literal word must remain and no more words may be left out than are kept (slots count as kept), so "to {place}" never becomes a bare place, "at the what" never shrinks to "what" and "i am not" never to a lone "not". With `{name}`, `{any}`, `{letters}` or `{digits}` in the match, at most one word may be missing and two literal words must remain ("my name Tomas", but not "I [am] {name}" for "I said Lithuania").
  - One extra small word (*a/the/to/is/am/do/just/really/very/so/also/maybe/like/then*) may appear inside a pattern once it has started matching ("I am agree", "I want to a latte"). Never at the start of an intent, between two intents, or right before a name or free-text slot.
  - Word forms: endings (*want/wants*, *book/booked*, *order/ordering*), irregular forms (*pay/paid*, *lose/lost*), *can/could/may*, *will/would*, *in/on/at*, *with/by*, *for/to*, *a/the*, *I/me* (*do/did* are not swapped: "I didn't know" ≠ "I don't know"). Recognizer typos are tolerated (one letter in 5+ letter words), but a real English word the game uses is never "corrected" into another ("hungry" ≠ Hungary, "hostel" ≠ hotel; list: `src/generated/known-words.json`, rebuilt by `tools/build-vocab.ts`).
  - Yes/no openers may lead into an answer: *yes/no/sure/exactly/that's right/you're right/correct/why not/not really/not now/not yet/I don't think so* + answer.
  - A negation is never cut off from what follows: after a piece ending in *not/never*, a new answer must start its own clause ("I don't | want to open an account" is not two answers; "No, I'm not. I need a taxi." is).
  - If nothing (or only a catch-all) matches, a clear answer to the current question with 1–3 extra words at the start or end is still accepted when the rest matches confidently ("Can I get a latte with caramel?"). Never for sentences with a negation, never dropping question words, auxiliaries or numbers, never split into several answers, never guessing a name, spelling or free words.
  - Write patterns for **different constructions and vocabulary** instead: "I'm gonna go with…", "Let's do…", "A window seat would be great", "I don't eat meat", synonyms (*surname / last name / family name*), and the short answers.
- The built-in yes/no layer handles bare yes, no, sure, "no thanks", "that's fine" and so on. Handle them with `yes` / `no` on the step or pending question. A leading "yes/no" plus an intent also works ("No, to go").
- Built-in slot types:
  - `{number}`, `{ordinal}`
  - `{price}` (cents)
  - `{time}` (`{h, m, ampm?}`: "half past seven", "7:30", "noon")
  - `{day}` (monday… / today / tomorrow / next friday)
  - `{date}` (`{day, month}`), `{year}`
  - `{letters}` (spelled letters)
  - `{name}` (1–3 non-function words; costly unless it's the player's name)
  - `{digits}` (phone and account numbers)
  - `{any}`: 1–5 unknown words; negation is never allowed inside
- Tags:
  - `#h:<hintItemId>` credits the learner's phrasebook when that expression is used. **Tag every hint pattern's matching grammar alternative.**
  - `#blunt` shows the politeness tip.
  - `#tip:<key>` shows your tip.
  - Other tags pass information to handlers (`seg.tags`, or `__tags` inside slot objects).
- Intent id suffixes:
  - `_ctx` = only accepted when the current step or pending question expects it. Use it for bare names or any pattern that would otherwise swallow random words.
  - `_unknown` = a catch-all with a cost penalty, for graceful "Sorry, we don't have that".
- **Negation.** Write explicit negative intents ("i do not want {item}", "no {item}", "not {item}", "without {x}") so a negative sentence can never fall through to a positive one. Include tests for them.

## 6. Steps, handlers and flow

- `steps`: the NPC's agenda in order. The first step with `when` true and `done` false is asked automatically after each learner turn, unless a handler called `c.hold()` or set a pending question with `c.expect({...})`.
  - `expects` lists the intents that answer the step; they get a ranking bonus.
  - `suggest` lists the Lithuanian suggestions shown, with `hint` naming the hint group and `options` naming the chips.
  - `help` handles "I don't know" or "What do you have?".
- Handlers receive `(c, slots, seg)`. Update `c.s`, call `c.say(lineId, vars)`, `c.expect(...)`, `c.complete()` when the goal is reached, and `c.end()` to end. Keep handlers short and deterministic. Use `c.chance()` and `c.pick()` for variety, never `Math.random`.
- `init` sets up state and decides the optional steps and twists for this visit. `start` produces the NPC's opening line or lines. For "How are you?" openers use `expectHowAreYou(c, then)` from `../global`. `finish` runs when no step is left: closing lines, `c.complete()`, and a closing pending question, as in the café.
- Global skills work everywhere automatically: repeat, slower, spell, write it down, what does X mean, "I'm still learning English", thanks, bye, how are you, just a moment, I don't know. Don't re-implement them.
- Multi-NPC scenes use `c.speaker("npcId")` before `c.say`. List the extra NPCs in `npcs`.
- Use `c.event(name, data)` for world effects: `"pay"`, `"give"` (item), `"serve"`, `"taxi-ride"` (`{ to: locationId }`).

## 7. Hints

- A hint group has an `lt` label, an optional `slot` (entity type for chips and examples), `examples` (default entity ids) and `items`.
- Aim for about 8–12 items for the main intention of the situation and 3–6 for secondary ones. Include only genuinely natural, common expressions. Don't pad the list.
- Mark `register: "polite" | "casual"` where useful, and add a short Lithuanian `note` for anything subtle.
- Use `only: (e) => …` so a pattern is never combined with an unsuitable item: "a cup of …" only with hot drinks, "a pair of …" only with plural clothing.
- Group ids referenced by steps must exist. Global groups also exist: `g_clarify`, `g_social`, `g_howareyou` and `g_yesno`.

## 8. Tests (required)

- `tests`: at least 25 NLU tests per situation part. Include:
  - every hint pattern
  - natural alternatives that are not in the hints
  - short answers with `step`
  - British variants
  - at least 3 negation or meaning-preservation cases (`intent` other than the positive one, `not: ["order"]`)
  - at least 2 gibberish or unrelated sentences with `intent: "none"`
- `sims`: at least 3 full conversations that must complete on all 12 seeds and use their whole script. check-content warns about scripted turns that are never said, because those weren't tested.
  - **How a sim is played** (`tools/sim-play.ts`, the same in every tool): the learner says the next scripted turn.
    - At a moment with an auto answer (the sim's `auto`, keyed by step or pending id, or the defaults for "howareyou" and "closing"), a turn meant for a later moment waits, and the auto answer is said instead. That covers a turn that answers a step not done yet or a pending question, and a bare yes/no/okay/thanks that this moment doesn't take.
    - A question (ending in "?") never waits. A change of mind about an earlier step is said when its turn comes.
  - Provide `auto` answers keyed by step or pending id for every optional question your steps may ask, and for moments that vary by seed.
  - A generic answer ("Yes.", "Okay.") can't show which question it answers. When an optional question or a twist would take it on some seeds, pin it with `setup: (s) => { s.askScale = false; }` (it runs right after `init`, on every seed), or give the answer content ("Yes, I brought one.").
  - A sim about a twist forces the twist with `setup`, so it tests it on all 12 seeds.
  - Cover the happy path, a path with questions and changes of mind, and a twist.
  - `npx tsx tools/review.ts <id> --seed=N` prints every sim of a situation with "(auto)" marking the auto answers.
- Check your conversations with `tools/sim.ts` (register your file in `index.ts` locally, or ask the lead). Read the output as a native speaker would. Is every NPC reply natural and appropriate, and do the Lithuanian glosses read correctly?

## 9. Don'ts

- Don't edit shared files (`global.ts`, `merges.ts`, `npcs.ts`, `locations.ts`, the engine in `src/convo`) unless the lead asks. If you need something from them, write it down in a comment at the top of your file under `// NEEDS:`.
- No `Math.random`, no network, no player names in NPC audio lines, no British-only NPC vocabulary.
- Don't accept a response only because it contains a keyword. Don't let `{any}` or `{name}` swallow a normal answer (use `_ctx` or `_unknown`).
