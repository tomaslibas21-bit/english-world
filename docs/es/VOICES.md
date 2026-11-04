# Puerto Colibrí's voices (Gemini)

**Status (4 Nov 2026, 22:40):** **blocked on billing, everything else ready.** The key in `~/english-world/.env.local` belongs to a
Google project on the Gemini API's **free tier**: Google answered the first single requests, then refused with
"generate_content_free_tier_requests, limit: 10 … per day" (429), and refused a one-line batch with
`FAILED_PRECONDITION` (400): the free tier has no Batch API. Two clips were made (a test line and one sample,
$0.003 at paid prices, free in fact). To record, the owner turns on billing for **the project this key belongs to**
(Google AI Studio → the key's project → set up billing / the prepaid balance on that project), or puts a key from a
paid project into `.env.local`; then the run-book below goes on from step 1. The owner's later decisions (4 Nov):
**two accent sets** (Mexican and neutral Latin American, one Settings switch for text and voice, wired), **all bulk
work through the Batch API**, about $20–25 expected, **stop line $38** (the balance), the Mexican set first if the
samples project more.

The owner's brief (4 Nov 2026, evening): every character of the Spanish edition gets a voice of their own, made with
Gemini TTS the way Maple Harbor's English voices were (docs/VOICING-PLAN.md), adjusted to each setting: a voice and a
direction per character, a direction per conversation where it matters, samples first, with a cost ledger. Then:
**two clips per line**, one in Mexican Spanish and one in neutral Latin American Spanish (same voice and manner, only
the accent direction differs; a line with a neutral twin is voiced with the twin's text in the neutral set), picked
by the same Settings switch that picks the text; the Batch API for all bulk work; a **$38 stop line** for both sets,
samples and redos included. Nothing goes online: the clips stay on this computer until the owner says otherwise.

## How it is made

The Spanish edition has its own copies of the voice tools in `tools/es-voices/` (Maple Harbor's `tools/voice-batch.ts`,
`tools/casting.ts` and `tools/enumerate.ts` are unchanged):

| File | What it does |
|---|---|
| `tools/es-voices/lines-es.ts` | every line the Spanish game can speak, in both sets: Mexican (`es_…`) and neutral (`esn_…`, with the neutral twins' text), for both learner genders ("¿Está listo?" / "¿Está lista?"), the example answers in the coach voice of the learner's gender, the scripted sims as well as random conversations (so customs in s65b is reached and voiced by Agente Medina), speakers a conversation switches to |
| `src/editions/es/content/voices.ts` | the one switch: `npcVoice`, `coachVoice`, `ambientVoice` give `es_…` with Mexican Spanish chosen and `esn_…` with neutral Spanish (compose's variety, set by Settings through `src/state/variety.ts`); one folder and one manifest hold both sets |
| `tools/es-voices/casting-es.ts` | the casting below: a Gemini voice, an age, a manner and a pace per character, two accent directions, the settings per conversation; the checks (gender, no shared voice within a conversation, the coach voices for nobody else) |
| `tools/es-voices/voice-batch-es.ts` | samples, batches, checks, redos, the ledger, the install into `public/audio-es/` |
| `tools/es-voices/voice-casting-es.ts` | the casting as the tables below |

Every command runs with the edition overlay:

```sh
EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/es-voices/voice-batch-es.ts <command>
```

| Step | Command | Key? |
|---|---|---|
| What would be recorded: clips per voice, minutes, price | `plan` | no |
| A few lines per voice right away, both accents (the standard price) | `sample --round=<name> [--per=2] [--who=a,b] [--accent=mx\|neutral] [--age] [--no-accent]` | yes |
| Whisper (Spanish) and the length screen on a sample | `check-samples <round>` | no |
| A Gemini listener on a sample, not told the accent asked for: Mexican, neutral Latin American, Spain or other; native or not; the words | `judge <round>` | yes (cents) |
| What both sets would cost, fitted to the sample's real tokens | `project <round> [<round>…]` | no |
| One clip with any voice and style | `try "texto" --voice=… --style="…"` | yes |
| Google's voice catalog (free) | `voices [--lang=es-419] [--search=Mexican]` | yes |
| A page to listen to a sample | `sheet <round>` | no |
| Request files for every line not recorded yet (one set: `--accent=mx`) | `prepare [--size=3000] [--accent=mx\|neutral] [--kind=mx]` | no |
| Start the batches; their state; download one at a time and make the clips | `send`, `status`, `fetch` | yes |
| Whisper listens to every new clip, plus the length rule | `check` | no |
| Failed clips go back to the next `prepare` (their takes kept) | `redo [--below=0.8]` | no |
| The clips into the dev build: `public/audio-es/` | `install [--to=<repo>]` | no |
| The spend | `ledger` | no |

- **Work folder:** `~/puerto-colibri-voicing/` (outside git): the line list, request files, batch results (the raw
  takes, so a direction or a sound can be re-made without paying), the clean 16 kHz copies Whisper hears, rejected
  takes, the samples, `ledger.jsonl`, and the master copy of the clips in `audio-es/`.
- **The key** is `GEMINI_API_KEY` in `~/english-world/.env.local`; the script reads it into memory and only puts it
  into a request header. Nothing prints or logs it.
- **The ledger** (`ledger.jsonl`): one row per request (every sample, every listener call) or per batch (its real
  tokens when fetched), with the price and the running total. Before any paid call the script adds what is spent,
  what running batches will cost (their estimate) and the new request's estimate, and stops past `$38` (`PC_CAP`).
- **Prices** (Google's page, checked 4 Nov 2026): `gemini-3.8-flash-tts` Batch $0.25 per 1M text tokens and $4.50 per
  1M audio tokens until 31 Dec 2026 (double from 2027); single requests (the samples) twice that. 25 audio tokens
  are one second of speech.

### How each line is asked for

One request per clip, as in the English run: the line as a verbatim transcript (`geminiTextEs`: a peso sign before
digits is said as pesos, `&` as "y"), the voice as `speechConfig.voiceConfig.voice`, and the direction as
`speech_metadata.style`, which Gemini follows and never reads aloud:

> manner; pace; the setting (when every conversation the line is said in has the same one); the accent

The accent is the only part that differs between the sets: "natural Mexican Spanish, as spoken on Mexico's Caribbean
coast" (`es_…`) or "neutral Latin American Spanish (español neutro, as in dubbing), with no regional accent" (`esn_…`).

### The clips

- Gemini's 24 kHz take is trimmed and made as loud as every other clip, then MP3 CBR, mono, 24 kHz, 40 kbps (as the
  English clips); a clean 16 kHz WAV goes to Whisper.
- **Phone and video calls** also sound like one: the played clip goes through a phone line's band (300–3400 Hz,
  steep, as narrowband telephony) or a video call's (120–7000 Hz, gentle), then back to the same loudness. Whisper
  checks the clean take. The raw takes stay in the work folder, so the sound can be changed or dropped without
  recording again.
- Clip keys are the game's `audioKey(voice id, speed, text)`: `es_<npcId>`, `es_coach_f` / `es_coach_m`,
  `es_amb_f` / `es_amb_m`.

### Checks

Every clip: Whisper (`large-v3-turbo`, the multilingual model the English run used, in Spanish, niced and one run at
a time) and the length rule. The machine is shared: at most two heavy processes (the line list runs in two niced
workers, Whisper in one), so Whisper may still be working through the second set in the morning; the length rule
covers every clip at once. The comparison ignores accents, punctuation and how numbers are written (Spanish
number words become digits: "ochenta y cinco pesos con cincuenta centavos" = "$85.50", "las ocho y media" = "8:30").
Below 0.8, or a clip that says more than its line (Gemini sometimes says a line twice or a piece of it again), far
too long or cut short, goes back for another take; a line keeps its last take after 4 tries; rejected takes are
kept in `~/puerto-colibri-voicing/rejected/`.

### Installing, the manifest and repair versions

`install` copies the clips into `public/audio-es/` with `manifest.json` (`{ key: seconds }`) and
`repair-versions.json`, which `src/game/audio.ts` reads. The clips are git-ignored (`public/audio-es/*.mp3`); the
manifest and repair-versions.json are kept in git. **A checkout without the clips plays silence for every line in
the manifest**, so after merging this branch run `install --to=<that checkout>` (the master copy is in
`~/puerto-colibri-voicing/audio-es/`). A clip recorded again after it was installed gets a repair version (its
content hash), so a browser that cached the old take fetches the new one. A line whose text changes gets a new key,
so it is simply recorded (the next `prepare` finds it).

## Casting

Two castings are ready; the samples decide (the owner hears them on `sheet <round>`):

- **prebuilt** (the default now): Gemini's 30 prebuilt voices, as in Maple Harbor. Google's catalog lists them as
  *General American English* voices, so the samples have to show they speak Spanish without an English accent.
- **mexico** (`PC_CASTING=mexico`): the 33 voices Google's catalog (`GET /v1beta/voices`) lists as *Mexico Spanish*
  (es-419: native Mexican speakers, ages 21–63, e.g. `es-419-concierge-2`, "61-year-old tour guide from Mexico"); they
  work with `gemini-3.8-flash-tts`. Google advises choosing a regional voice for an accent rather than describing
  it; whether the same voice can also speak neutral Latin American Spanish is what the listener checks.

Both castings pass the same checks: the right gender, nobody shares a voice with someone in the same conversation
(Sofía, Pablo and Sara; Lucía and Luis; Itzel and Agente Medina; Don Ernesto and Doña Lupita…), people met one after
another get different voices, and the two coach voices belong to no character. Each character keeps one voice in
every conversation and in both accents.

| Character | Role | Conversations | Prebuilt voice | Mexican catalog voice | Age | Manner | Pace |
|---|---|---|---|---|---|---|---|
| Oficial Ramírez (f, `diaz`) | Agente de migración (Immigration officer) | s65a | Kore | advisor-6 | about 45 | firm, clear and businesslike, strict but fair | brisk |
| Itzel (f, `priya`) | Servicio de equipaje (Baggage services) | s65b | Autonoe | csagent-7 | late 20s | friendly and helpful | easy |
| Don Rigo (m, `vinnie`) | Taxista (Taxi driver) | s66 | Puck | concierge-8 | late 50s | cheerful and chatty, a taxi driver who knows everyone | relaxed |
| Fernanda (f, `olivia`) | Recepción del hotel (Hotel reception) | s68 | Zephyr | advisor-7 | late 20s | warm and welcoming | easy |
| Don Chuy (m, `chuck`) | Voluntario de turismo (Tourist information volunteer) | s62 | Sadachbia | concierge-2 | about 65 | enthusiastic, proud of his town | very fast |
| Mariana (f, `mia`) | Barista (Barista) | s72 | Leda | assistant-1 | early 20s | bright and friendly | lively |
| Doña Carmen (f, `rosa`) | Vecina de toda la vida (Local, born and raised) | s69 | Sulafat | tutor-3 | about 70 | relaxed, warm and motherly | unhurried |
| Iván (m, `ben`) | Taquilla del museo (Museum tickets) | s70 | Achird | commercial-1 | mid 20s | polite and helpful | easy |
| Don Arturo (m, `harold`) | Vigilante del museo (Museum guard) | s70 | Schedar | csagent-9 | about 65 | dry, with quiet humor | slow |
| Luis (m, `marco`) | Mesero (Waiter) | s73 | Umbriel | tutor-5 | about 30 | friendly and attentive | easy |
| Valeria (f, `chloe`) | Vendedora (Sales assistant) | s74 | Laomedeia | training-8 | mid 20s | upbeat and helpful | lively |
| Don Héctor (m, `okafor`) | Farmacéutico (Pharmacist) | s75 | Sadaltager | training-10 | about 60 | patient, calm and caring | unhurried |
| Paty (f, `jessie`) | Estilista (Hairdresser) | s77 | Pulcherrima | advisor-4 | about 40 | chatty and cheerful | lively |
| Ricardo (m, `aaron`) | Cajero del banco (Bank teller) | s78 | Algieba | podcaster-3 | about 35 | polite and professional | even |
| Gloria (f, `gloria`) | Empleada de correos (Postal clerk) | s79 | Achernar | assistant-2 | mid 50s | warm and patient | unhurried |
| Lucía (f, `marco_host`) | Anfitriona del restaurante (Restaurant host) | s73 | Aoede | commercial-8 | late 20s | welcoming and polite | easy |
| Don Raúl (m, `walter`) | Taquilla de autobuses (Bus ticket office) | s67a | Rasalgethi | concierge-7 | about 60 | polite and helpful | measured |
| Ana (f, `denise`) | Conductora de autobús (Bus driver) | s67b | Kore | advisor-4 | mid 40s | matter-of-fact | brisk |
| Andrés (m, `jake`) | Renta de autos (Car rental agent) | s71a | Achird | commercial-11 | early 30s | friendly and professional | easy |
| Doña Chela (f, `dot`) | Despachadora de gasolina (Gas station attendant) | s71b | Sulafat | csagent-8 | about 60 | casual and friendly | easy |
| Emilio (m, `kevin`) | Documentación de la aerolínea (Airline check-in) | s64a | Algieba | assistant-9 | late 20s | polite and efficient | brisk |
| Oficial Torres (m, `grant`) | Seguridad del aeropuerto (Airport security) | s64b | Orus | podcaster-4 | about 45 | calm and firm | brisk |
| Daniela (f, `nina`) | Agente de la puerta (Gate agent) | s64c | Aoede | commercial-6 | about 30 | polite and clear | brisk |
| Lorena (f, `linda`) | Recepción del consultorio dental (Dental office reception) | s76 | Callirrhoe | concierge-5 | about 35 | friendly and efficient | brisk |
| Karla (f, `claire`) | Atención a clientes (Customer service) | s80 | Zephyr | advisor-7 | about 30 | polite and helpful | even |
| NetWave (f, `netwave_bot`) | Menú telefónico (Automated phone menu) | s80 | Despina | commercial-9 | ageless | even and polished, an automated phone menu | measured |
| Don Ernesto (m, `patel`) | Dueño del departamento (Landlord) | s81 | Charon | concierge-7 | about 60 | polite and businesslike | measured |
| Doña Lupita (f, `rita`) | Vecina (Neighbor) | s82 | Sulafat | assistant-6 | about 65 | friendly, chatty and kind | easy |
| Licenciada Salinas (f, `brooks`) | Gerente de recursos humanos (HR manager) | s87 | Kore | advisor-4 | about 50 | professional and warm | measured |
| María (f, `maria`) | Compañera de trabajo (Coworker) | s88 | Callirrhoe | commercial-6 | late 20s | friendly and casual | easy |
| Sofía (f, `kate`) | Líder de equipo (Team lead) | s34, s89 | Pulcherrima | advisor-6 | late 30s | confident and friendly | brisk |
| Pablo (m, `paul`) | Colega (Colleague) | s34, s89 | Zubenelgenubi | commercial-12 | early 30s | upbeat and casual | easy |
| Sara (f, `sara`) | Colega (Colleague) | s34, s89 | Autonoe | csagent-7 | late 20s | lively and casual | lively |
| Ingeniero Montes (m, `harris`) | Tu jefe (Your boss) | s90 | Orus | tutor-2 | mid 50s | calm and authoritative | measured |
| Ximena (f, `sophie`) | Anfitriona de la fiesta (Party host) | s63 | Zephyr | training-8 | early 30s | warm and cheerful | lively |
| Marcos (m, `mark`) | Invitado, chef (Party guest, chef) | s63 | Puck | csagent-4 | early 30s | excited and playful, a chef who loves to talk about food | fast |
| Andrea (f, `lizzie`) | Tu amiga (Your friend) | s83 | Callirrhoe | training-7 | late 20s | warm and casual, a close friend | easy |
| Santiago (m, `sam`) | Tu cita (Your date) | s84 | Enceladus | tutor-5 | early 30s | relaxed, warm and a little shy | easy |
| Camila (f, `emma`) | Tu cita (Your date) | s84 | Leda | assistant-1 | about 30 | bright, warm and a little shy | easy |
| Diego (m, `dan`) | Tu amigo, anfitrión de la cena (Your friend, dinner host) | s85 | Umbriel | tutor-4 | about 40 | warm and easygoing | relaxed |
| Natalia (f, `nora`) | Esposa de Diego (Diego's wife) | s85 | Aoede | assistant-2 | late 30s | warm and lively | lively |
| Paola (f, `lucy`) | Amiga de la escuela (Old school friend) | s86 | Laomedeia | commercial-8 | early 30s | excited and cheerful, happy to see an old friend | fast |
| Doña Mari (f, `mrs_lee`) | Puesto de flores (Flower stall) | s91a | Vindemiatrix | tutor-3 | about 70 | kind, calm and gentle | slow |
| Oficial Reyes (m, `reyes`) | Policía (Police officer) | s91b | Alnilam | tutor-2 | about 45 | calm and professional | measured |
| Doctora Herrera (f, `carter`) | Médica familiar (Family doctor) | s31 | Achernar | assistant-6 | about 50 | calm, careful and reassuring | unhurried |
| Doña Lupe (f, `marcus`) | Puesto de frutas y verduras (Fruit and vegetable stall) | s32 | Gacrux | assistant-6 | about 60 | warm and loud, a market vendor with thirty years at her stall | lively |
| Caja de autoservicio (f, `sco`) | Caja de autoservicio (Self-checkout machine) | — | Despina | commercial-9 | ageless | flat and polite, a self-checkout machine | measured |
| Don Pancho (m, `frank`) | Vecino (Neighbor) | s33 | Algenib | concierge-2 | about 75 | chatty and warm | a little slow |
| Mónica (f, `jordan`) | Entrenadora personal (Personal trainer) | s35 | Autonoe | commercial-9 | about 30 | energetic and encouraging | lively |
| Doña Margarita (f, `maggie`) | Vende su auto (Selling her car) | — | Gacrux | tutor-3 | about 65 | warm and theatrical, enjoys a good haggle | lively |
| Jorge (m, `kyle`) | Atención a clientes (Customer service) | — | Rasalgethi | commercial-1 | about 30 | polite, a little scripted | even |
| Mensaje grabado (f, `harbor_bot`) | Mensaje grabado (Recorded message) | — | Despina | commercial-9 | ageless | even and polished, a recorded message | measured |
| Brenda (f, `brenda`) | Gerente de atención a clientes (Customer care manager) | — | Vindemiatrix | assistant-6 | mid 40s | calm, understanding and professional | measured |
| Vanessa (f, `vanessa`) | Líder de mercadotecnia (Marketing lead) | — | Laomedeia | advisor-6 | mid 30s | upbeat and confident | fast |
| Gerardo (m, `greg`) | Gerente de equipo (Team manager) | — | Alnilam | podcaster-4 | mid 40s | relaxed and direct | easy |
| Chef Villanueva (m, `whitaker`) | Jefe de cocina (Head chef) | — | Schedar | csagent-9 | about 65 | quiet, precise and kind | unhurried |
| Fátima (f, `russo`) | Cocinera principiante (Junior cook) | — | Leda | assistant-1 | 19 | nervous and eager | quick |
| Elena (f, `emily`) | Tu jefa (Your manager) | — | Achernar | assistant-2 | late 30s | warm and a little nervous | easy |
| Toño (m, `tyler`) | Fundador (Founder) | — | Fenrir | assistant-9 | early 30s | excitable, full of startup talk | fast |
| Don Gilberto (m, `mr_grant`) | Tu casero (Your landlord) | — | Zubenelgenubi | concierge-8 | about 60 | friendly and very casual | relaxed |
| Agente Medina (f, `aduana`) | Aduana (Customs) | s65b | Pulcherrima | concierge-5 | about 40 | polite, direct and businesslike | brisk |
| Coach (female learner) | example answers | all | Erinome | podcaster-2 | about 30 | clear, friendly and natural, every word distinct | unhurried |
| Coach (male learner) | example answers | all | Iapetus | podcaster-1 | about 30 | clear, friendly and natural, every word distinct | unhurried |
| Passer-by (f) | the town | — | Laomedeia | assistant-1 | about 35 | friendly and casual, a quick hello in the street | easy |
| Passer-by (m) | the town | — | Achird | commercial-11 | about 40 | friendly and casual, a quick hello in the street | easy |

| Conversation | Who | Setting | Sound |
|---|---|---|---|
| s76-dentist-call | everyone | speaking on the phone | phone line |
| s80-support-call | everyone | speaking on the phone | phone line |
| s83-invite-call | everyone | speaking on the phone | phone line |
| s90-running-late | everyone | speaking on the phone | phone line |
| p24-flood | everyone | speaking on the phone | phone line |
| p26-complaint | everyone | speaking on the phone | phone line |
| s89-video-call | everyone | on a video call from a laptop | video call |
| s34-meeting | Sara | on a video call from home, on the meeting-room screen | video call |
| s70-museum | Don Arturo | speaking quietly, almost under his breath, in a hushed museum hall | — |
| s32-mercado | everyone | calling out from her stall over the noise of a busy market | — |
| s64a-checkin | everyone | brisk and efficient at a busy airport counter | — |
| s64b-security | everyone | brisk and efficient at a busy airport checkpoint | — |
| s64c-gate | everyone | brisk and efficient at a busy airport gate | — |
| s65a-passport | everyone | brisk and efficient at a busy passport control desk | — |
| s65b-baggage | Agente Medina | brisk and efficient at the customs exit | — |
| s63-party | everyone | at a lively party, a little louder over the music and chatter | — |
| s66-taxi | everyone | chatting while driving his taxi | — |
| s67b-bus | everyone | from the driver's seat of a busy bus | — |
| s84-date | everyone | relaxed on a date by the sea | — |
| s85-dinner | everyone | at home at a relaxed dinner with friends | — |
| p30-start-over | everyone | at home, a relaxed evening with a friend | — |
| s33-small-talk | everyone | small talk at a bus stop | — |
| s35-gym | everyone | coaching at the gym | — |
| s87-interview | everyone | a job interview in an office | — |
| s91b-police | everyone | at a police station desk | — |

61 characters on 28 voices (the prebuilt casting), each in two accents: “natural Mexican Spanish, as spoken on Mexico's Caribbean coast” (es_…) and “neutral Latin American Spanish (español neutro, as in dubbing), with no regional accent” (esn_…). No clashes: nobody shares a voice with someone in the same conversation, and the coach voices belong to no character.

The settings are sent with the lines of that conversation only when every conversation a line is said in has the
same setting (a greeting Sofía says both in the meeting room and on the video call gets none, so it can serve both).
The coaches and the passers-by never get a setting.

## The lines

`plan` (4 Nov, the 41 conversations that passed their review, before the sims were added): **107,082 clips**, 53,548
in Mexican Spanish and 53,534 in neutral Latin American Spanish (732 of them a neutral twin's own text); 2,202 on the
phone, 574 on video; about 4,895 minutes of speech. Half the clips are prices and totals: lines with a value
(`{$price}`, `{$total}`) are recorded for every value of the conversation's domain (up to 800), as in Maple Harbor
(s31 doctor 14k clips, s73 restaurant 22k, s71b gas 6k); a few of those lines are only ever said with one fixed value
(s31 `consult_price` and `cost_info` with the fee, s73 `soup_offer`), about 3,000 clips a set that a later pass could
skip. The list with the sims (customs voiced by Agente Medina instead of Itzel) was being made when this was written:
`plan` prints it.

## Samples

Not made yet: the free tier stopped the first round after one clip. The plan, once billing is on (about $1 in all,
single requests at the standard price, then the listener):

1. `sample --round=p1 --per=2` (prebuilt casting) and `PC_CASTING=mexico sample --round=m1 --per=2` (the catalog's
   Mexican voices): two lines per character in both accents, the two coaches on the same example answers, and the
   words a voice could read its own way (digits, a peso sign, latte, Wi-Fi, NetWave, ahorita, ¿mande?, pásele…).
2. `check-samples p1`, `check-samples m1` (Whisper in Spanish and the length screen), `judge p1`, `judge m1` (the
   listener, not told the accent asked for: Mexican, neutral Latin American, Spain or other; native or not).
3. Keep the casting where the Mexican set is heard as Mexican and native and the neutral set as neutral; adjust the
   accent directions (and voices that sound foreign) and sample again those that missed.
4. `project p1 m1`: what both sets cost in batch from the sample's real tokens. Over $38: the Mexican set first, the
   neutral set waits for the owner's OK.

## The run-book (from the samples to the dev build)

```sh
V="nice -n 10 env EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/es-voices/voice-batch-es.ts"
$V sample --round=p1 --per=2; PC_CASTING=mexico $V sample --round=m1 --per=2
$V check-samples p1; $V check-samples m1; $V judge p1; $V judge m1; $V sheet p1; $V sheet m1; $V project p1 m1
# set DEFAULT_CASTING in casting-es.ts to the casting chosen, then
$V prepare --accent=mx --kind=mx && $V send          # the Mexican set (and --accent=neutral --kind=nt when it fits)
$V status; $V fetch                                   # until every batch is in (one download at a time)
$V check; $V redo; $V prepare --kind=redo && $V send  # until nothing is flagged
$V install                                            # clips + manifest + repair-versions into public/audio-es/
VITE_EDITION=es npx vite --port 8102                  # the dev build plays them
```

The ledger (`ledger.jsonl`) so far: two clips, $0.0026 at paid prices (the free tier didn't bill them), and the refused
requests at $0.

## The night's later conversations (p18, p24, p25–p30)

When they land on `origin/spanish-edition`: merge it into this branch, then `plan` (the line list is made again
because the content changed), `prepare` and `send`: only lines without a clip are asked for, so this is a small
second batch; their new characters are already cast (Toño, Don Gilberto, Doña Margarita, Jorge, Brenda, the recorded
message, Vanessa, Gerardo, Chef Villanueva, Fátima, Elena). A line whose text changed gets a new key and is simply
recorded; a clip recorded again after `install` gets a repair version.
