# Voicing plan: the game with Gemini voices

**Status (28 Oct 2026): done; the game plays the Gemini voices.** All 33,682 lines were recorded on 27–28 Oct
with the owner's key through the Batch API: 2.32M audio tokens, about $10.4 at the batch price (plus 0.33M text
tokens, cents). Whisper's check sent 819 lines back for another take (871 takes in all). `DEFAULT_VOICES` is `"v2"`
since 28 Oct, and English Master's re-export of that day carries them. The key line was removed from `.env.local`
afterwards: to record again, the owner adds a key there (never in a chat).

## Why

Today the 60 characters share 18 local Kokoro voices. Every character should get a voice that fits their gender,
age and manner, and the learner's example answers should come in a female or a male voice, matching the learner.
The characters never say the learner's lines.

## Model and price (checked 27 Oct 2026; check again before running)

- **Model:** `gemini-3.8-flash-tts`, Google's newest text-to-speech model. It supports the Batch API.
- **Batch price:** $4.50 per 1M audio tokens until 31 Dec 2026, then $9.00. The standard rate is double.
- **Rate:** 25 tokens per second of speech, so in batch a minute costs under 1 cent.
- **Estimate:** `npx tsx tools/voice-batch.ts plan` counts every clip and prints the price (about $7–10 in batch before the new year). **Run it before 31 Dec 2026.**

## What changes in the game (done, behind the switch)

1. **Character voice ids.** In v2 each character has a voice id of its own (`g_<npcId>`, e.g. `g_mia`) instead of a Kokoro voice name. Clip keys are `audioKey(voice, speed, text)` (`src/audio-key.ts`), so even lines two characters share get each one's own voice.
2. **Coach voices.** The example answers use `g_coach_f` or `g_coach_m`, by the learner's profile gender. The two coach voices belong to no character, so a model answer never sounds like the person you talk to.
3. **Passers-by** in the town: `g_amb_f`, `g_amb_m`.
4. **A new folder.** The new clips go to `public/audio-v2/` (R2: `fluent-steps/game/audio-v2/`) with their own `manifest.json`, so no browser plays a stale cached clip. The old clips stay where they are, so switching back is one setting. The manifest and `repair-versions.json` are kept in git; the clips live on R2. The v2 repair map starts as `{}` so loading the optional metadata succeeds. Add a content hash when replacing a v2 recording at an existing key, preserving earlier entries. The separate v1 repair map must not be copied into v2.
5. **The switch:** `DEFAULT_VOICES` in `src/content/voices.ts` (`"v2"` since 28 Oct 2026). A build or the dev server can try v2 first with `VITE_VOICES=v2`; the English Master export follows the same switch (`tools/export-fluent-steps.ts`).

## How each line is asked for

One Batch API request per clip (`tools/voice-batch.ts`):
- the text as a verbatim transcript (`geminiText`: no sound tags, `&` → "and", `#4` → "number 4");
- the character's manner as `speech_metadata.style` ("warm and theatrical"), which Gemini follows and never reads aloud. Google advises keeping age, gender and accent out of it: the voice carries those;
- the voice as `speechConfig.voiceConfig.voice` from the casting below (`tools/casting.ts`).

A fast talker (Chuck, Tyler) is fast through the style; the game's speed in the clip key stays as it is.

## Commands (`npx tsx tools/voice-batch.ts …`)

| Step | Command | Key? |
|---|---|---|
| What would be recorded, minutes, price | `plan` | no |
| One clip right away, to hear a voice | `try "Hello there!" --who=maggie` (`--voice=Sulafat`, `--style="…"`) | yes |
| Request files | `prepare --sample`, later `prepare` | no |
| Start the batches | `send` | yes |
| Their state | `status` | yes |
| Download and make the clips | `fetch` | yes |
| Whisper listens to every new clip, then each is heard again piece by piece for repeats (see "Repeats") | `check` | no |
| Clips that failed the check go back into the next `prepare` | `redo` | no |
| A page to listen to the casting sample | `sheet` | no |
| Clips to R2 | `upload` | no (wrangler) |

Work files live in `voicing/` (git-ignored). `voicing/recorded.json` says which Gemini voice and style made each clip,
so when a character is recast, `prepare` asks for their lines again. A line is tried at most 4 times.

## After the batch

- **Format:** Gemini's 24 kHz audio becomes MP3 CBR, mono, 24 kHz, 40 kbps; silences are trimmed and loudness made even (`trimAndNormalize`, as for the Kokoro clips).
- **Words:** Whisper (`whisper-cli`, large-v3-turbo) transcribes every clip (short clips first in a 10-second window, a doubtful one again in the full window) and lists those where it heard something different (below 0.85), and those whose length fits the line said more than once (`saysMore`: Gemini sometimes says a line twice, or a piece of it again). `redo` sends back those below 0.8 and the ones that say more; a line that has had 4 tries keeps its last take.
- **Upload:** the clips go to R2 `fluent-steps/game/audio-v2/`, four at a time (`--parallel=6` for six); a clip recorded again goes up again (its MD5 changed).
- **Switch:** `DEFAULT_VOICES = "v2"`, the game is re-exported to English Master, and it is pushed with the owner's OK. A clip re-recorded after the switch also needs a repair version (`repair-versions.json`), like the Kokoro repairs.

## Order

1. **Casting sample:** `prepare --sample`, `send`, `fetch`, `sheet`: 3 lines per character, about 200 clips, cents. The owner listens and approves or swaps voices (`tools/casting.ts`).
2. **The full batch:** `prepare`, `send`, then `status` / `fetch` until every batch is in.
3. **Checks, upload, switch:** `check`, `redo` and small batches for those until nothing is flagged, `upload`, the switch.

## What the run of 27 Oct 2026 taught

- **Gemini's slips:** 819 of 33,682 lines (about 1 in 40) needed another take: most said the line twice or a piece of it again ("All done? All done?"), now and then a different line altogether ("Hi!" came out as "Bye."); Whisper's check and the length rule find them. It refused one line as `PROHIBITED_CONTENT` (a false alarm on the shop name in "I'm looking for Threads."): `SAY_AS` sends the name in quotes. A line with no letters (a hint's empty blank, ".") gets no clip: Gemini made up words for it.
- **Whisper's slips:** in the 10-second window it sometimes repeats what it heard; it writes numbers its own way ("$17.97", "-4", "20s", "June 4th") and drops a laugh ("Ha!"), which the comparison allows for; Lithuanian place names come back as anything.
- **Pace:** Whisper checks about 140–200 clips a minute on this Mac when nothing else runs, about 60 while uploads run; keep the Mac on the charger.

## Repeats: the piece-by-piece check (15 Nov 2026)

**What happened.** The owner heard the clerk at Threads say "Would you like your… would you like your receipt printed
or emailed?" (clip `ff05ec900eb7`, 3.87 s). Whisper had written that clip as the line, once, and scored it 1.0: a
recognizer that hears a whole clip tends to smooth a restart away, and the length rule only caught clips more than
twice their usual length. Heard piece by piece the same clip says "Would you like your | Would you like your receipt? |
Printed or emailed?". It was far from the only one: of the 80 Maple Harbor clips that ran longest for their line,
about half were restarts.

**The check now** (`tools/voice-pieces.ts`, `tools/voice-pieces.py`; `check` runs it on every new clip, and `redo`
sends a flagged clip back like any other):

1. **Pieces.** The clip is cut in the middle of each inner pause (80 ms or more at −38 dB under its loud level;
   pieces under 250 ms join a neighbour), and each piece is recognized on its own, as well as the whole clip. The
   recognizer is Parakeet (`parakeet-tdt-0.6b-v3` through sherpa-onnx), which writes what it hears word for word, in
   English and Spanish. What the top of `tools/voice-pieces.py` says it needs must be installed; `VOICE_PIECES=whisper`
   uses Whisper instead, which writes a short piece's words twice now and then, so its echoes inside one piece are
   folded and a one-word repeat can hide.
2. **Words heard again.** The words heard (whole clip, and pieces in a row) are counted against the line's: a run of
   words heard more often than the line says it ("would you like your"), a word twice in a row ("sure sure"), a line
   begun again after a word cut short ("They're 34 na… They're 3499"), one of the line's words once more ("Good, thank
   you. Good."), a piece of a number twice ("thirty-five thirty-five forty-seven"), a word begun twice ("reg- regular",
   "Fry, fries please"). A line that repeats words itself ("No, no",
   "seven thousand … seven thousand") is counted with its own repeats.
3. **The sound against itself.** Without any recognizer, the clip's cepstra are compared with themselves at every
   lag: a phrase said twice is a stripe beside the diagonal of the self-similarity matrix. A stripe of 450 "moving"
   ms or more (frames counted by how much the sound changes in them, so a held vowel counts little) flags the clip,
   unless the line repeats a word itself. This also works as a fast first screen (`--engine=none`: about 30 clips a
   second) to choose what the recognizer hears first.

**How much it finds.** Measured on the 873 takes the first run rejected (`voicing/rejected/`, kept by `redo`): 397
of them run much longer than the take that replaced them (0.6 s and 35 % or more); the check flags 363 of those. The
other 33 (34 with the final rules) were read one by one and cut on trial: slow takes with long pauses, a filler ("Uh"), a wrong word or a
Lithuanian place name, and no repeat in either hearing, but for one "See you!" that may hide a false start. The check
also flags 55 rejected takes that are not much longer (a word said twice quickly).

**Two traps in the pieces.** A stop's closure inside a word can be as long as a short pause, so the cut falls inside
"six" and both pieces are heard to say it ("That'll be ninety six. | Six twenty five."): a word doubled across a
pause under 180 ms counts once, unless the whole clip's transcript doubles it too. And a number said in pieces is one
number: "98. | 98 a gallon" is the line's "ninety-eight ninety-eight", "one hundred | one forty-nine" its "one
hundred one forty-nine"; a number counts as heard again only when two or more of its digits come twice (3547 as
353547). Whisper, asked for a second opinion on the same pieces, writes "96 | X-25" there.

A third trap is the recognizer's own: Parakeet writes a breath or a noise as a word ("Yeah. | Yeah.", in a Spanish
clip "Ha ha"), so a repeat counts only when it repeats words of the line. And Spanish sounds more like itself than
English: its stripe threshold is 560 moving ms.

**What the pass of 15 Nov 2026 found and repaired.**

| | Maple Harbor | Puerto Colibrí |
|---|---|---|
| Clips screened by sound and length | 39,325 | 141,331 |
| Suspects heard piece by piece (long for the line, or striped) | 4,676 with a line (+ 1,490 without) | 5,888 |
| A piece of the line heard again | 305 | 165 |
| Repaired by a cut | 224 | 203 |
| Repaired by a new take | 162 | 141 |

The repairs are more than the flags of the last row but one because some came from other evidence: the old
whole-clip Whisper transcripts judged with the new word rules (24 Maple Harbor lines, stutters such as "P-P-Pretty
good"; 79 in Puerto Colibrí, "No, no hay problema"), cuts that held on clips no recognizer had flagged (a false start
too short to be written), about 40 Maple Harbor clips flagged by the split-word trap before it was understood (their
new takes pass the check), and 12 Puerto Colibrí clips that said other words altogether and had been kept after four
tries (one "¡Ah, Quebec!" was a 24-second made-up monologue). Gemini: 552 single requests, $0.40.

Not covered: the recognizer heard the suspects, not every clip, so a quick one-word repeat in a clip of usual length
and without a stripe can still be there (the old Whisper transcripts catch those it wrote down). A full pass is
`repeats` over the whole clip folder: about 2 clips a second on this Mac, so some 5 hours for Maple Harbor and a day
for Puerto Colibrí. And 5,410 Maple Harbor clips (PR #14 of 7 Nov, slot-filled variants) have no line in the
enumeration: by sound alone none of the 1,490 heard has a restart a cut can mend.

**Repairs** (`npx tsx tools/voice-batch.ts …`; the Spanish tool has the same commands):

| Step | Command | Key? |
|---|---|---|
| The check over clips already made (changes nothing) | `repeats --clips=<folder> [--keys=<file>] [--engine=none]` | no |
| Cut the restart out; keep the cuts that hold | `cut --keys=<file> --clips=<folder> --to=<folder>` | no |
| New takes right away, each heard back before it is kept | `retake --keys=<file> --to=<folder>` | yes |
| The new lengths and repair versions into the clip lists | `adopt --from=<folder>` | no |

- **Cut** (`tools/voice-cut.py`). A restart begins where speech begins, so the cut is looked for among the clip's
  onsets: two onsets whose following sound is alike. Everything from the first up to the second goes (the first
  attempt and the pause after it), with 5 ms fades; the complete attempt stays. No recognizer chooses the cut, but
  every cut clip is heard again and kept only when nothing is heard again, the sound no longer comes twice, the clip
  is as like its line as before, no word heard before is missing (whole clip and pieces), and it isn't too short for
  its line. A cut that doesn't hold is tried at the next-best pair of onsets, three in all. About one clip in four
  whose sound suggests a cut has a real restart; the hearing afterwards is what sorts them. The cut clips are 64 kbps
  CBR (the source is an MP3 already).
- **Retake.** What a cut can't mend (a restart without a pause, a wrong word in the take) is recorded again with
  single requests, and each new take is heard back whole and piece by piece before it is kept, up to 4 tries.
- **Versions.** A clip replaced at its key needs a repair version (`adopt` writes it): the Worker's edge keeps an
  unversioned clip for an hour and browsers for a day.

## Casting (`npx tsx tools/voice-casting.ts`)

Voices are Gemini's prebuilt voices. The gender is how each one usually sounds, which the sample confirms.

| Character | Role | Conversations | Gemini voice | Style (how they speak) |
|---|---|---|---|---|
| Officer Diaz (f) | Passport control | s65a | Kore | firm, clear and businesslike |
| Priya (f) | Baggage services | s65b | Zephyr | friendly and helpful |
| Vinnie (m) | Taxi driver | s66 | Puck | cheerful and chatty |
| Olivia (f) | Hotel reception | s68 | Aoede | warm and welcoming |
| Chuck (m) | Visitor Center volunteer | s62 | Sadachbia | very fast and enthusiastic |
| Mia (f) | Barista | s72 | Callirrhoe | bright and friendly |
| Rosa (f) | Local, born and raised | s69 | Autonoe | relaxed and friendly |
| Ben (m) | Museum tickets | s70 | Orus | polite and helpful |
| Harold (m) | Museum guard | s70 | Schedar | slow and dry, with quiet humor |
| Marco (m) | Server | s73 | Enceladus | friendly and attentive |
| Chloe (f) | Sales assistant | s74 | Laomedeia | upbeat and helpful |
| Mr. Okafor (m) | Pharmacist | s75 | Umbriel | patient, calm and caring |
| Jessie (f) | Hairdresser | s77 | Pulcherrima | chatty and cheerful |
| Aaron (m) | Bank teller | s78 | Algieba | polite and professional |
| Gloria (f) | Postal clerk | s79 | Sulafat | warm and patient |
| Lucia (f) | Restaurant host | s73 | Zephyr | welcoming and polite |
| Walter (m) | Ticket office | s67a | Rasalgethi | polite and helpful |
| Denise (f) | Bus driver | s67b | Kore | brisk and matter-of-fact |
| Jake (m) | Car rental agent | s71a | Alnilam | friendly and professional |
| Dot (f) | Gas station cashier | s71b | Leda | casual and friendly |
| Kevin (m) | Airline check-in | s64a | Achird | polite and efficient |
| Officer Grant (m) | Airport security | s64b | Sadaltager | calm and firm |
| Nina (f) | Gate agent | s64c | Aoede | polite and clear |
| Linda (f) | Dental office reception | s76 | Callirrhoe | friendly and efficient |
| Claire (f) | NetWave customer service | s80 | Autonoe | polite and helpful |
| NetWave (f) | Automated phone menu | s80 | Despina | even and polished, like an automated phone menu |
| Mr. Patel (m) | Landlord | p29, s81 | Puck | polite and businesslike |
| Rita (f) | Neighbor | p29, s82 | Laomedeia | friendly and chatty |
| Ms. Brooks (f) | HR manager, Brightline | s87 | Gacrux | professional and warm |
| Maria (f) | Coworker | s88 | Pulcherrima | friendly and casual |
| Kate (f) | Team lead | s34, s89 | Vindemiatrix | confident and friendly |
| Paul (m) | Colleague | s34, s89 | Charon | upbeat and casual |
| Sara (f) | Colleague | s34, s89 | Sulafat | lively and casual |
| Mr. Harris (m) | Your boss | s90 | Fenrir | calm and authoritative |
| Sophie (f) | Party host | s63 | Zephyr | warm and cheerful |
| Mark (m) | Party guest, chef | s63 | Orus | excited and playful |
| Lizzie (f) | Your friend | p24, s83 | Kore | warm and casual |
| Sam (m) | Your date | s84 | Enceladus | relaxed and friendly |
| Emma (f) | Your date | s84 | Leda | bright and friendly |
| Dan (m) | Your friend, dinner host | p30, s85 | Umbriel | warm and easygoing |
| Nora (f) | Dan's wife | p30, s85 | Aoede | warm and lively |
| Lucy (f) | Old school friend | s86 | Callirrhoe | excited and cheerful |
| Mrs. Lee (f) | Flower stall | s91a | Vindemiatrix | kind, calm and gentle |
| Officer Reyes (m) | Police officer | s91b | Algieba | calm and professional |
| Dr. Carter (f) | Family doctor | s31 | Achernar | calm, careful and reassuring |
| Marcus (m) | Cashier | s32 | Algenib | friendly and easygoing |
| Self-checkout (f) | Self-checkout machine | s32 | Despina | flat and polite, like a machine |
| Frank (m) | Neighbor | s33 | Algenib | chatty and warm, a little slow |
| Jordan (f) | Personal trainer | s35 | Autonoe | energetic and encouraging |
| Maggie Holt (f) | Selling her car | p25 | Gacrux | warm and theatrical |
| Kyle (m) | Customer service, Harbor Home | p26 | Rasalgethi | polite, a little scripted |
| Harbor Home (f) | Recorded message | — | Despina | even and polished, like a recorded message |
| Brenda (f) | Customer care manager, Harbor Home | p26 | Laomedeia | calm, understanding and professional |
| Vanessa (f) | Marketing lead, Brightline | p27 | Achernar | upbeat and confident |
| Greg (m) | Team manager, Brightline | p27 | Alnilam | relaxed and direct |
| Chef Whitaker (m) | Head chef, The Pier | p28 | Charon | quiet, precise and kind |
| Mia Russo (f) | Junior cook | p28 | Leda | nervous and eager |
| Emily (f) | Your manager, Brightline | p28b | Achernar | warm and a little nervous |
| Tyler (m) | Founder, Sproutly | p18 | Fenrir | fast and excitable |
| Mr. Grant (m) | Your landlord | p24 | Zubenelgenubi | friendly and very casual |
| Coach (female learner) | example answers | all | Erinome | clear, friendly and unhurried |
| Coach (male learner) | example answers | all | Iapetus | clear, friendly and unhurried |
| Passer-by (f) | the town | — | Laomedeia | friendly and casual |
| Passer-by (m) | the town | — | Achird | friendly and casual |

60 characters; voices shared within a conversation: none; the coach voices belong to no character
