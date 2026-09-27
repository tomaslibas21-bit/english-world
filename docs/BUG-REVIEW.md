# Bug review, 25 Sep 2026

This was a read-only review by five parallel reviewers: the conversation engine, the session and UI, the 3D world, the s62–s75 conversations, and the s76–s91 conversations. Every bug below was reproduced or confirmed in the code. **Nothing has been fixed yet.** Most severe first within each section. Reproduce with `npx tsx tools/sim.ts <situation> <seed> "turn 1" "turn 2" …`.

## Status (26 Sep 2026): fixed

Seven parallel helpers fixed every item below, each owning separate files. They also found and fixed more bugs of the same kinds by playing the conversations. Checks after the fixes:
- the content check reports 0 errors and 0 warnings on all 36 situations
- 59/59 unit tests pass, 24 of them new
- 0 type errors
- the dev corpus scores 100% with 0 of 614 traps accepted
- in a real browser, the end box stays and Esc closes it

A backup from before the fixes is in the session scratchpad (`backup-before-fixes.tgz`).

**Still open (small, noted by the helpers).** Update, 26 Sep 2026: the seven conversation items are fixed (details below). Content check 0 errors, dev corpus 100% with 0 traps accepted. Three new NPC lines need audio: s67a `change_that`, s73 `right_place`, s84 `nervous_too`.
- **s90: fixed.**
  - "Sorry, I have to go, I'm driving." now ends the call with "Okay. Drive safe! Bye!". The shared leaving phrases (`LEAVING_PATTERNS` in `global.ts`) take a short reason in the same breath: I'm driving, busy, in a hurry or late; I have another call or meeting; my bus is here; my battery is dying; someone is at the door. Reasons with a preposition ("I'm at work", "I'm in the car") are left out on purpose, because "I have to go to work" would pass for one.
  - "I'm driving, I have to go." no longer asks "About how long?" right before the goodbye.
  - A bare "Ten." now follows Harris's question. After "When do you think you'll get here?" or "What time will you be here?" it means ten o'clock (9–12 only, since an earlier hour has passed), so he says "We'll start without you, then". After "How long…?" or "About how long?" it means ten minutes. "In ten" and "ten minutes" are always minutes; "at ten" is always the time.
- **s89: fixed.** Its own `leave` patterns are tagged `#leaving` like the shared ones, so "I have to go to work" is no longer taken as leaving the call. "I had to go to work on Saturday" is now a weekend answer.
  - Also fixed: after "Sorry, I have to go. Bye, everyone!" Kate asked for the quick update twice.
- **s84 and s86: fixed.** Both add `LEAVING_PATTERNS` to their own goodbye intents, so "Sorry, I have to go", "I have to leave early" and "I'll call you back later" work there as everywhere else.
  - s84: "Wait, are you leaving already?" is now a real question. "Yes, sorry." ends the date; "No, no!" or any other answer carries on. Before, the next question followed straight after it.
  - s86: "Sorry, I have to go." still declines coffee or dinner when Lucy has just invited you; otherwise it means leaving. Lucy asks for your number, waits for it, then says goodbye. Before, she asked another question right after "What's your number?" and didn't accept the number.
  - s86, also fixed: declining the Mike's Grill dinner ("Sorry, I can't.") was ignored, because the handler checked a step id for what is a pending question.
- **s73: fixed.** A new `hungry` intent ("Great, and hungry!", "Hungry!", "We're starving!") is expected at the reservation questions, so the words are never read as a name. The host says "Ha! You're in the right place!" and asks again.
- **s84: fixed.** "I'm a little nervous." (also "It's my first date in years.") gets "Aw, don't worry! I'm a little nervous too.", then the open question comes again.
- **s76: fixed.** While moving the appointment, "Do you have anything earlier?" offers Tuesday at 10:00, and asked again gets "I'm sorry, that's our first opening." Tomorrow at 8:15, the appointment being moved, is never offered, also not after "in the morning" twice. "Anything earlier" said during the hold is kept too.
- **s67a: fixed.** A change after paying (number of tickets, one-way or round-trip, destination) rings the sale up again: "Sure, let me change that." and the new total, then the learner pays again, gets the new ticket(s), and the goodbye comes again. Asking for the same thing again gets a short "Okay."
  - Also fixed: "When does it leave and from which track?" before a destination said "Sure. Where are you going?" twice.
- **Content ideas, not bugs:** a damaged suitcase (s65b), medicine in liquids (s64b), child fares (s67a), "I'm a tester" (s63).
- **Engine:** "Can you help me?" on its own is only a lead-in phrase, so it isn't understood unless a situation has its own pattern (s62 and s65b now do).
- **New, still open (engine or other helpers' files):** a "to" can be read as the tail "too" and "work" as the tail "works", so "…to work" passes as a finished answer. s63 reads "I have to go to work." as `bye_nice` and "I'm driving to work." as `drink_no`; s85 reads "I have to go to work." as `leave`; s84 reads "I'm driving to work." as `no_alcohol`. A small change in `nlu.ts` (accept "to" as the tail "too" only as the last word) would stop this everywhere. It isn't made yet, because it changes parsing in every situation; s63 and s85 should first tag their own "I have to go" patterns `#leaving`, as s89 now does.

## Fix first (my priority order)

1. **Engine: "$12,000" is read as $12,** so the customs declaration is lost. This is a meaning flip in an exam-like moment.
2. **Session: the end-of-conversation box disappears after 1.6 s.** This affects every conversation, including the "Kopijuoti" button teachers rely on.
3. **Session / 3D: a taxi, bus or plane ride fires into the next conversation** after "Dar kartą" or Esc. Two reviewers found this separately.
4. **Café: the wrong total after "just one", and the change handed back twice.** The café is the first situation most learners play.
5. **3D: the NPCs' GPU memory leaks on every building visit.** This is a phone crash risk.
6. **Session: the model-answer "Klausyti" buttons play into the open mic.** The game may take the coach's voice as the learner's answer.
7. **Dead ends and loops:**
   - the hotel walk-in can't say "too expensive"
   - s80 keeps asking "When did it stop working?"
   - s76 books Thursday instead of Wednesday
   - s83 asks a question after saying goodbye
8. **Engine:**
   - replay intros pile up
   - duplicate pieces run their handler twice
   - "7.30" times aren't understood
   - leaving a call early isn't understood
9. **Everything else below:** touch handling, shortcuts outside conversations, the auto-retry timer, the style URL, small leaks, and typed text carrying over.

## Conversations s62–s75

Covered: s66, s67a, s68, s71b and s72 in depth, plus one run each of s65b, s71a, s73, s74 and s75. Not played: s62, s63, s64a–c, s65a, s67b, s69.

1. **s72-cafe: "just one" after ordering two adds an item.** Wrong total.
   - Seed 1: "Can I get two cappuccinos?" / "Small" / "Whole milk" / "Actually, just one cappuccino" / "Small" / "Whole milk" / "No, that's it" / "To go" / "Tomas" / "How much is it?"
   - Mia asks the size and milk again, and the total is $12 (three cappuccinos) instead of $4.
   - Fix: in the order/change handlers (`s72-cafe.ts` around line 953), "(just | only) one {item}" for an item already ordered should set its quantity to 1.
2. **s68-hotel: a walk-in guest can't turn down the room (dead end).**
   - Seed 3: "Hi! Do you have any rooms available?" / "Three nights." / "No, that's too expensive." → "Sorry, I didn't catch that."
   - Seed 1: "No, thank you." gets a pricier room ($179), and "It's too expensive." / "Do you have anything cheaper?" are not understood.
   - The step is at `s68-hotel.ts:689`. The "too expensive" pattern (line 265) only works at the late check-out step.
   - Fix: accept "too expensive", "anything cheaper" and "no, thanks" at `walk_offer`, with a cheaper room or a polite way out.
3. **s67a-tickets: the number of tickets can't be corrected.**
   - Seed 2: "Hi, two tickets to Boston, please." then "Actually, just one." / "Only one ticket, please." are not understood.
   - Fix: add a quantity-correction intent that works at any step.
4. **s72-cafe: the change is handed back twice.**
   - Seed 2: … "Cash" gets "Here's your change.", then "Here's twenty" gets "And here's your change." again.
   - Cause: `here_you_go` (`s72-cafe.ts:901–905`) doesn't check `c.s.paid`.
   - Fix: if already paid, answer with a short thanks.
5. **s71b-gas: "make it forty" is not understood when changing the prepay amount.**
   - Seed 1: "Hi, thirty on pump six, please." / "Actually, make it forty." is not understood.
   - The pattern exists (`s71b-gas.ts:122`) but isn't expected at the `pay` step (line 550).
   - "Actually, forty dollars." is accepted, but Dot never confirms the new amount.
6. **s66-taxi: changing the destination fails when it starts with "No,".**
   - Seed 2: "To the airport, please." / "No, actually, to the Harborview Hotel." is not understood; without "No," it works.
   - Fix: allow an optional leading "no," in `d_change` / `d_to`.
7. **Minor: the price is said twice when the learner asks for it at the paying step.**
   - Café: "That'll be $12. / Your total is $12."
   - Taxi, seed 4: "It's $24.50 on the meter. / That'll be $24.50."

## Conversation engine (src/convo)

No crashes: 33 odd inputs (empty, punctuation only, 400 characters, long digit strings, Lithuanian letters) were run through all 36 situations. Every parse took under 1.5 s. The new "always reply" fallback never fires wrongly.

1. **Serious: "$12,000" is read as $12, so a customs declaration is lost.**
   - The comma splits it into `12 dollars 000`, and `priceSlot` (`slots.ts:96–106`; root cause in `normalize.ts:162–165`) reads "000" as cents.
   - In s65a, "I have $12,000 in cash" becomes `cash_amount{price:1200}`, which is under the $10,000 limit, so `c.s.cash = "no"` (`s65a-passport.ts:1484`).
   - "$1,050" becomes $1.50 the same way.
   - Fix: join thousands separators first, `(\d),(\d{3})(?!\d)` → `$1$2`, keeping the European "4,50". Don't read a 3-digit token or a leading-zero token as cents.
2. **"Say that again" / "slower" replay their own intro lines, and it builds up** (`dialogue.ts:433–436`, `replayLast` at `:448`).
   - `finishTurn` saves the replay turn as `lastTurn`.
   - `sim s72-cafe 5 "slower please" "can you speak more slowly" "more slowly please"`: the third reply repeats three intros before the question.
   - Fix: when a turn is a replay, keep the earlier `lastTurn`.
3. **The same intent split into two pieces runs its handler twice** (`dialogue.ts:282–288`).
   - s66 at "Where are you headed?": "4.5.6" says "Sure, you can pay when we arrive." twice.
   - s77 at "Do you have an appointment?": "Labas, aš noriu kavos" is read as two names and confirmed twice.
   - s65a: "yes, 12,000 dollars" gives two `cash_amount` pieces.
   - Fix: skip a piece whose intent was already handled this turn. In `nlu.ts`, reject readings that split into several free-text name pieces.
4. **Times typed with a dot ("7.30", "19.30") are never understood.** Lithuanians often write times this way.
   - `timeSlot` (`slots.ts:142`) only accepts `h:mm`.
   - Fix: also accept `^\d{1,2}\.\d{2}$` when the hour is 23 or less and the minutes are under 60.

## Conversations s76–s91

The reviewer ran out of time before checking Lithuanian gender and formality forms. No British English turned up in the paths played.

1. **s80 support call: "When did it stop working?" is asked again after "yesterday", and keeps coming back.**
   - Seed 1: "Two" / "Tomas Mikalauskas." / "742-9133" / "My internet stopped working yesterday." / "It's blinking red." / …
   - Every reply ends with the question until the learner says "since yesterday" again. That sentence is even shown as a model answer (`:615`).
   - Fix: `prob_stopped` (`s80-support-call.ts:215`) and the "since yesterday" part of `prob_down` (`:212`) should set `c.s.since = true`.
2. **s76 dentist call: Linda books Thursday after the learner accepts Wednesday.**
   - Seed 1: "Hi, I have an appointment tomorrow. Could I move it?" / "Tomas Mikalauskas." / "June 4th, 1990." / "Sure." / "Wednesday is fine." → "Your appointment is now Thursday at 3:30."
   - It also happens when Wednesday was offered during the hold.
   - Fix: `slot_perfect` (`:370`) with a different day should mean "that day, please". Keep an offer Linda already made (`:918`).
3. **s83 invite call: Lizzie says goodbye, then asks "Which day is it?", and the call ends not completed.**
   - Seed 3: "Hi Lizzie!" / "Would you like to go to a concert with me on Saturday?" / "Great, see you then!"
   - Fix: don't ask `which_day` (`:282`) after the goodbye handler (`:373`); ask for the day before accepting the goodbye.
4. **s76 dentist call: the spelling step swallows other answers.**
   - Seed 3: "June 4th, 1990." at the spelling step is not understood, and "Wednesday is fine." is taken as the spelling.
   - Fix: take the spelling only when the answer is letters. Accept a date of birth there too, save it, and ask for the spelling again (around `:1092–1124`).
5. **s83 invite call: "Oh, too bad. What about Sunday?" is not understood.**
   - "That's too bad. How about Sunday?" works, but gets an odd "No worries!", because "That's…" matched the "it's Tomas" greeting.
6. **Leaving early is not understood in the calls.**
   - s89 and s76: "Sorry, I have to go.", "I have to leave early." and "I'll call back later." are not understood (a plain "Bye." works).
   - Fix: add a shared "I have to go / leave (early) / I'll call back later" pattern that runs the goodbye handler.
7. **s80 support call: a reference number is promised but never given.**
   - Claire says "No problem." (`reference_q`, `:298`) and never gives a number.
   - "No, that's all. Bye." is taken as turning down Thursday, so Claire asks a question in the same turn she hangs up.
   - Fix: say an actual number; handle the goodbye before the "no".
8. **s83 invite call: Lizzie asks "Why?" after the learner already mentioned the tickets.**
   - Seed 1: "Are you free on Friday? I have two tickets for a jazz concert." → "Yeah, I'm free. Why?"
9. **Seen once, not investigated:**
   - s77: "Hi! Do you have time for a haircut now?" is not understood at "Are you my three o'clock?".
   - s91b: "What happens next?" is not understood.
   - s80: "The light is orange." gets the red-light explanation.

## 3D world (src/game, except session.ts)

1. **Every zone change leaks the old NPCs' GPU memory (default "blocks" style).**
   - `spawnNpcs()` (`Game.ts:274`) removes the old NPC roots without disposing their geometries (about 40 per `Character`) or the per-character blush material (`Character.ts:62–273`, material at `:123`).
   - Walking in and out of buildings keeps growing `renderer.info.memory.geometries`. On phones this can end in a crash.
   - Fix: add `Character.dispose()` and call it in `spawnNpcs()`. Don't dispose the shared `toonMat` or the cached style geometries.
2. **A pending taxi, bus or plane ride fires into the next or restarted conversation.**
   - The taxi `finish` (and the gate's `board`) queues a ride. If the learner then presses "Dar kartą" or "Kita situacija", `endSession` starts the ride anyway (`Game.ts:596`, `:499`, `:614–615`).
   - About 1.4–2.6 s into the new conversation, the player is teleported, the camera jumps out of the conversation view, and a black fade covers the start.
   - Fix: set `this.pendingRide = null` in `startScenario` before `session.close()`, and skip the delayed teleport if a session is active.
3. **Touch: two fingers make the camera jump wildly, and a cancelled touch stays "down"** (`Game.ts:306–318`).
   - The handlers ignore `pointerId`, so a second finger overwrites the pointer position.
   - There is no `pointercancel` / `lostpointercapture` handler, so camera auto-follow stays off after an iOS edge gesture.
   - Fix: track the first `pointerId`, and reset on cancel or lost capture.
4. **With `?style=` in the address, the world-style setting stops working** (`style.ts:17`, `Panels.tsx:343`).
   - The reload keeps the parameter, so the world stays in that style while Settings shows another.
   - Fix: reload to `location.pathname`.
5. **Minor: each ground click leaks one marker material** (`Game.ts:390`, `:398`).
   - Fix: dispose the material, or share one.

Checked and fine: the render pause behind the scene pictures (frame time is capped at 0.05 s, name tags are hidden, the pause condition matches), cached interiors, the style characters' shared geometry, clicks passing through the UI layers, and resizing.

## Session and UI

`Panels.tsx` only got a quick look. Checked and fine:
- every scene maps its first step, so a restart never shows the previous run's picture
- the Emma/Sam scene lookup
- old saved settings get the new defaults (`migrateSettings`)

1. **The end-of-conversation box disappears after 1.6 s** (`session.ts:245`, `Game.ts:590`, `Conversation.tsx:79`).
   - "Užduotis įvykdyta!" with "Kita situacija / Dar kartą / Kopijuoti pokalbį mokytojui" vanishes almost at once, because `done()` calls `endSession`.
   - The student guide (`STUDENT-GUIDE-LT.md:36`) tells students to copy the conversation from exactly there.
   - Fix: on a natural end, keep the session in the "ended" phase until the learner picks an action or presses Esc.
2. **After a close, the rest of `play()` still runs** (`session.ts:96–107`).
   - Esc during the taxi driver's "bye" still fires "taxi-ride". That queues a ride for the next, unrelated conversation. The gate's "board" event and the stamp toast behave the same way.
   - Fix: `if (!this.alive) return;` right after the lines loop. See also 3D world #2.
3. **The "Klausyti" buttons next to model answers play into an open microphone** (`Conversation.tsx:299`, `:480`).
   - With auto-listen (the default) and laptop speakers, the coach voice can be recognized as the learner's own answer.
   - Fix: call `game?.activeSession?.stopListening()` before `audio.play`, as the NPC replay already does.
4. **The auto-retry timer cuts off an attempt the learner already started** (`session.ts:184`, and `:116`).
   - After a miss, "Bandyti dar" or Space and speaking at once gets interrupted 1.4 s after the miss, and the half-sentence is lost. The timer also ignores typing mode.
   - Fix: keep the timer handle and clear it in `listen()` / `stopListening()` / `close()`; skip auto-listen when already listening or typing.
5. **The conversation shortcuts (L, I, H, T) work outside conversations** (`Conversation.tsx:51–77`).
   - Pressing L or I while walking silently flips and saves the LT or IPA setting.
   - Fix: `if (!st.conv.active) return;`.
6. **Minor: half-typed text carries over into the next conversation** (`Conversation.tsx:44`).
   - Fix: reset `typed` when `sitId` or `active` changes.
