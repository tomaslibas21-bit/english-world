# Voicing plan: the game with Gemini voices

**Status (27 Oct 2026): ready to run, waiting for the owner.** The owner then either gives the lead a Gemini API key
(they add `GEMINI_API_KEY=…` to this repo's git-ignored `.env.local` themselves) or hands this plan to ChatGPT,
which has its own key. Nothing here has been sent to any service yet.

## Why

Today the 60 characters share 18 local Kokoro voices. Every character should get a voice that fits their gender,
age and manner, and the learner's example answers should come in a female or a male voice, matching the learner.
The characters never say the learner's lines.

## Model and price (checked 27 Oct 2026; check again before running)

- **Model:** Gemini 3.8 Flash TTS (preview), the newest Gemini text-to-speech model.
- **Batch price:** $4.50 per 1M audio tokens until 31 Dec 2026, then $9.00. The standard rate is double.
- **Rate:** 25 tokens per second of speech, so in batch a minute costs under 1 cent.
- **Estimate:** 775 min of character lines and example answers, plus the new conversations and check-backs, plus a second coach voice and a 15% retake margin, comes to about **$7–10** in batch before the new year. **Run it before 31 Dec 2026.**

## What changes in the game

1. **Character voice ids.** Each character gets a voice id of its own (`g_<npcId>`, e.g. `g_mia`) instead of a Kokoro voice name. Clip keys are `audioKey(voice, speed, text)` (`src/audio-key.ts`), so even lines two characters share get each one's own voice.
2. **Coach voices.** `COACH_VOICE` becomes two ids, `g_coach_f` and `g_coach_m`, picked by the learner's profile gender.
3. **A new folder.** All new clips go to `audio-v2/`, with a fresh `manifest.json`, so no browser plays a stale cached clip. The old clips stay on R2, so switching back is one setting.
4. **Behind a switch.** The code goes in behind a switch (`VOICES_V2`) and is turned on only after the checks below.

## The script (no key needed)

`tools/enumerate.ts` lists every line the game can say. A small builder (to write: `tools/voice-batch.ts`) turns it
into Gemini Batch API requests, one JSONL line per clip:
- the key;
- the text (with `ttsText` spellings);
- `speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName` from the casting below;
- a short style instruction from the character's note ("Say it as an older woman, warm and unhurried:").

Speed is 1, or 1.18 for a fast talker. If Gemini can't match 1.18, that clip is made from a normal take with
ffmpeg `atempo`.

## After the batch

- **Format:** the 24 kHz PCM becomes MP3 CBR, mono, 24 kHz, 32–48 kbps; silences are trimmed and loudness made even (the same as `tools/build-audio.ts`'s `trimAndNormalize`).
- **Words:** Whisper transcribes every clip (one at a time) and flags words that don't match the text.
- **Gender:** a pitch check flags a voice that sounds like the wrong gender.
- **Upload:** the clips go to R2 `fluent-steps/game/audio-v2/`, four at a time.
- **Switch:** the switch goes on, the game is re-exported to English Master, and it is pushed with the owner's OK.

## Order

1. **Casting sample:** 3 lines per character (about 200 clips, cents). The owner listens, and approves or swaps voices.
2. **The full batch.**
3. **Checks, upload, switch.**

## Casting (draft, `npx tsx tools/voice-casting.ts`)

Voices are Gemini's prebuilt voices. The gender is how each one usually sounds, which the sample confirms.

| Character | Role | Conversations | Gemini voice | Style note |
|---|---|---|---|---|
| Officer Diaz (f) | Passport control | s65a | Kore | a passport officer: strict but fair, firm and clear |
| Priya (f) | Baggage services | s65b | Zephyr | baggage services: bright, natural American English |
| Vinnie (m) | Taxi driver | s66 | Puck | taxi driver: upbeat, natural American English |
| Olivia (f) | Hotel reception | s68 | Aoede | hotel reception: breezy, natural American English |
| Chuck (m) | Visitor Center volunteer | s62 | Sadachbia | a visitor center volunteer who talks very fast |
| Mia (f) | Barista | s72 | Callirrhoe | barista: easy-going, natural American English |
| Rosa (f) | Local, born and raised | s69 | Autonoe | local, born and raised: bright, natural American English |
| Ben (m) | Museum tickets | s70 | Orus | museum tickets: firm, natural American English |
| Harold (m) | Museum guard | s70 | Schedar | an older museum guard: slow, dry humor |
| Marco (m) | Server | s73 | Enceladus | server: breathy, natural American English |
| Chloe (f) | Sales assistant | s74 | Laomedeia | sales assistant: upbeat, natural American English |
| Mr. Okafor (m) | Pharmacist | s75 | Iapetus | pharmacist: clear, natural American English |
| Jessie (f) | Hairdresser | s77 | Pulcherrima | hairdresser: forward, natural American English |
| Aaron (m) | Bank teller | s78 | Umbriel | bank teller: easy-going, natural American English |
| Gloria (f) | Postal clerk | s79 | Sulafat | postal clerk: warm, natural American English |
| Lucia (f) | Restaurant host | s73 | Zephyr | restaurant host: bright, natural American English |
| Walter (m) | Ticket office | s67a | Algieba | ticket office: smooth, natural American English |
| Denise (f) | Bus driver | s67b | Kore | bus driver: firm, natural American English |
| Jake (m) | Car rental agent | s71a | Rasalgethi | car rental agent: informative, natural American English |
| Dot (f) | Gas station cashier | s71b | Leda | gas station cashier: youthful, natural American English |
| Kevin (m) | Airline check-in | s64a | Alnilam | airline check-in: firm, natural American English |
| Officer Grant (m) | Airport security | s64b | Achird | airport security: friendly, natural American English |
| Nina (f) | Gate agent | s64c | Aoede | gate agent: breezy, natural American English |
| Linda (f) | Dental office reception | s76 | Callirrhoe | dental office reception: easy-going, natural American English |
| Claire (f) | NetWave customer service | s80 | Autonoe | netwave customer service: bright, natural American English |
| NetWave (f) | Automated phone menu | s80 | Despina | an automated phone menu: even, polished, slightly robotic |
| Mr. Patel (m) | Landlord | p29, s81 | Sadaltager | landlord: knowledgeable, natural American English |
| Rita (f) | Neighbor | p29, s82 | Erinome | neighbor: clear, natural American English |
| Ms. Brooks (f) | HR manager, Brightline | s87 | Laomedeia | hr manager, brightline: upbeat, natural American English |
| Maria (f) | Coworker | s88 | Achernar | coworker: soft, natural American English |
| Kate (f) | Team lead | s34, s89 | Gacrux | team lead: mature, natural American English |
| Paul (m) | Colleague | s34, s89 | Puck | colleague: upbeat, natural American English |
| Sara (f) | Colleague | s34, s89 | Pulcherrima | colleague: forward, natural American English |
| Mr. Harris (m) | Your boss | s90 | Charon | your boss: informative, natural American English |
| Sophie (f) | Party host | s63 | Vindemiatrix | party host: gentle, natural American English |
| Mark (m) | Party guest, chef | s63 | Fenrir | party guest, chef: excitable, natural American English |
| Lizzie (f) | Your friend | p24, s83 | Sulafat | your friend: warm, natural American English |
| Sam (m) | Your date | s84 | Orus | your date: firm, natural American English |
| Emma (f) | Your date | s84 | Zephyr | your date: bright, natural American English |
| Dan (m) | Your friend, dinner host | p30, s85 | Enceladus | your friend, dinner host: breathy, natural American English |
| Nora (f) | Dan's wife | p30, s85 | Kore | dan's wife: firm, natural American English |
| Lucy (f) | Old school friend | s86 | Leda | old school friend: youthful, natural American English |
| Mrs. Lee (f) | Flower stall | s91a | Vindemiatrix | an older flower seller: kind, calm, motherly |
| Officer Reyes (m) | Police officer | s91b | Iapetus | police officer: clear, natural American English |
| Dr. Carter (f) | Family doctor | s31 | Erinome | a family doctor: calm, careful, reassuring |
| Marcus (m) | Cashier | s32 | Umbriel | cashier: easy-going, natural American English |
| Self-checkout (f) | Self-checkout machine | s32 | Despina | a self-checkout machine: flat, polite, robotic |
| Frank (m) | Neighbor | s33 | Algenib | a retired neighbor: chatty, warm, a little slow |
| Jordan (f) | Personal trainer | s35 | Aoede | personal trainer: breezy, natural American English |
| Maggie Holt (f) | Selling her car | p25 | Gacrux | about 60, a retired drama teacher: warm, theatrical, enjoys a good haggle |
| Kyle (m) | Customer service, Harbor Home | p26 | Algieba | customer service, harbor home: smooth, natural American English |
| Harbor Home (f) | Recorded message | — | Despina | a recorded phone message: even, polished |
| Brenda (f) | Customer care manager, Harbor Home | p26 | Callirrhoe | customer care manager, harbor home: easy-going, natural American English |
| Vanessa (f) | Marketing lead, Brightline | p27 | Autonoe | marketing lead, brightline: bright, natural American English |
| Greg (m) | Team manager, Brightline | p27 | Algenib | team manager, brightline: gravelly, natural American English |
| Chef Whitaker (m) | Head chef, The Pier | p28 | Charon | a head chef in his sixties: quiet, precise, kind |
| Mia Russo (f) | Junior cook | p28 | Leda | 19, her first week in a kitchen: nervous, eager |
| Emily (f) | Your manager, Brightline | p28b | Achernar | a new manager in her late 30s: warm, a little nervous |
| Tyler (m) | Founder, Sproutly | p18 | Fenrir | a startup founder: fast, excitable, full of business idioms |
| Mr. Grant (m) | Your landlord | p24 | Zubenelgenubi | a landlord about 60: friendly, very casual on the phone |
| Coach (female learner) | example answers | all | Erinome | a clear, friendly model voice for a learner to repeat after: unhurried |
| Coach (male learner) | example answers | all | Iapetus | a clear, friendly model voice for a learner to repeat after: unhurried |

60 characters; voices shared within a conversation: none
