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
4. **A new folder.** The new clips go to `public/audio-v2/` (R2: `fluent-steps/game/audio-v2/`) with their own `manifest.json`, so no browser plays a stale cached clip. The old clips stay where they are, so switching back is one setting. Only the manifest is kept in git; the clips live on R2.
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
| Whisper listens to every new clip | `check` | no |
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
