# Puerto Colibrí's voices (Gemini)

**Status (5 Nov 2026, 09:45):** **recording on a paid key.** The owner saved a new key on 5 Nov at 08:16; its project accepted a one-line batch at 08:19 (last night's free-tier key got a 400 `FAILED_PRECONDITION`), so billing and the Batch API are on. The samples are done (below) and chose the casting: **the catalog's native Mexican voices** (`DEFAULT_CASTING = "mexico"`). The projection from their real tokens: **85,508 clips for both sets (all 50 conversations), about $29.82 with 5% for redos, $31.34 with what the samples cost**, under the $38 stop. The full sets go to the Batch API once every spoken line is frozen (the five open calls and the 5 Nov dialogue audit land first); a line changed after that is re-voiced inside the $38. Last night's state, for the record: the free tier answered 10 requests a day and had no Batch API, so nothing was recorded then.

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
| `tools/es-voices/lines-es.ts` | every line the Spanish game can speak, in both sets: Mexican (`es_…`) and neutral (`esn_…`, with the neutral twins' text), for both learner genders ("¿Está listo?" / "¿Está lista?"), the example answers in the coach voice of the learner's gender; each line in the voice of everyone heard saying it or made to say it by the code, an item line with the item lists it is heard with and its items bound one or two as the line binds them ("los papadzules"), a value line with the values reach-es.ts keeps, a line with two placeholders with reach-es.ts's bindings; each clip says how it was found (`why`) |
| `tools/es-voices/runs-es.ts` | what the conversations really say, played once for both sets: random conversations (fuzzSituation's own runs), the scripted sims for both genders (and both date partners in s84), and probes where a conversation has more than one speaker (a line said by whoever holds the floor asked again where each other person holds it) |
| `src/editions/es/content/voices.ts` | the one switch: `npcVoice`, `coachVoice`, `ambientVoice` give `es_…` with Mexican Spanish chosen and `esn_…` with neutral Spanish (compose's variety, set by Settings through `src/state/variety.ts`); one folder and one manifest hold both sets |
| `tools/es-voices/casting-es.ts` | the casting below: a Gemini voice, an age, a manner and a pace per character, two accent directions, the settings per conversation; the checks (gender, no shared voice within a conversation, the coach voices for nobody else) |
| `tools/es-voices/voice-batch-es.ts` | samples, batches, checks, redos, the ledger, the install into `public/audio-es/` |
| `tools/es-voices/voice-casting-es.ts` | the casting as the tables below |
| `tools/es-voices/reach-es.ts` | which values (and items) a line can really be said with: fixed values read in its calls, rules for values that hang together, the bindings of lines with two placeholders (`BINDINGS`: a place and its fare), and who the code makes say a line (speaker helpers); the line list uses it (the table: run it) |
| `tools/es-voices/breakdown-es.ts` | where the clips come from, by kind and value list, per set and per conversation (also on Maple Harbor's list); `--diff=<an earlier lines.json>`: before → after per conversation and kind |
| `tools/es-voices/values-es.ts` | the check of the cuts: every value random conversations, the sims and the probes say, whether reach-es.ts keeps it and (`--lines=`) whether its clip is in the list |
| `tools/es-voices/check-list-es.ts` | the check of the list against other runs than its own: every clip they say is in it (a speaker it lacks, a value, an item), every (line, speaker) pair, and the clips made from a guess nobody was heard saying (junk) |

Every command runs with the edition overlay:

```sh
EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/es-voices/voice-batch-es.ts <command>
```

| Step | Command | Key? |
|---|---|---|
| What would be recorded: clips per voice, minutes, price (`--only=s73,s65b`: those conversations alone, into `lines-only.json`, to try a change) | `plan [--only=…]` | no |
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

Every line the Spanish game can speak, in both sets, for the 41 conversations that passed their review
(`tools/es-voices/lines-es.ts`; the full report with the JSON behind it: `~/puerto-colibri-voicing/BREAKDOWN.md`).
Per set, against Maple Harbor's one English set:

| What | Maple Harbor (English, 1 set) | Spanish first list (per set) | Spanish with the sims (per set) | **Spanish after the cuts (per set)** |
|---|---:|---:|---:|---:|
| conversation lines, plain | 6,156 | 5,922 | 5,728 | **5,728** |
| conversation lines with an item | 2,969 | 3,696 | 3,170 | **3,170** |
| conversation lines with a value (prices, totals, numbers, times) | 7,961 | 28,864 | 25,258 | **14,351** |
| lines only random conversations or sims make | 144 | 271 | 305 | **309** |
| sound-alike check-backs | 2,885 | 3,069 | 3,069 | **3,069** |
| the shared lines in each person's voice | 2,867 | 2,374 | 2,424 | **2,424** |
| example answers (two coach voices) | 10,658 | 9,302 | 9,302 | **9,302** |
| shared example answers, passers-by | 44 | 52 | 52 | **52** |
| **all, Mexican set** | **33,684** | **53,550** | **49,308** | **38,405** |
| neutral set (… of which a neutral twin's own text) | — | 53,536 (732) | 49,294 (724) | 38,391 (719) |
| **both sets** | 33,684 (one set) | 107,086 | 98,602 | **76,796** |

- **Where the extra ~40,000 came from:** all of it from the lines with a value: 28,864 a set against 7,961 (+41,806
  for both sets); every other kind together is 1,000 a set below Maple Harbor. A line with a value is voiced with every
  value of its conversation's list (up to 800) because the value can come from the learner or a sum; the Spanish
  conversations handle more money, and some lines were voiced with the whole list though their code only ever gives
  them one value.
- **With the sims:** the list also plays every conversation's scripted sims, which reach the parts random talk rarely
  does; that put customs in Agente Medina's voice instead of Itzel's, and the restaurant's bill, tip and cash in Luis's
  voice alone (the first list had them in Lucía's too): 4,242 clips a set fewer.
- **The cuts** (`tools/es-voices/reach-es.ts`, applied in the list itself): 71 lines whose calls all give a fixed value
  (the doctor's fee, the museum's discounts, the rental's insurance and upgrade…) get only that value; 17 lines get
  only the values that hang together or the range the code allows (a sale price is the price less 20 or 30%; the
  doctor's change is at most $1,500; a full tank costs one of three prices; a dish × 1–4…), each rule with the file and
  line it was read at. 10,903 clips a set fewer. Lines whose value comes from the learner or from a sum keep their
  whole list (the restaurant's totals, tips and cash, 4,900 clips; the post office's totals; the bank's exchange).
  `tools/es-voices/values-es.ts` checked the cuts against what 120 random conversations and every sim say.
  174 lines with a value were said 6,873 times with 462 different values there, and not one of those values is cut.
- **Duplicates:** none exact (a clip's key is its voice, speed and text; the sets have their own voice ids); 189 near
  ones (only the punctuation differs: "¡Claro!" / "Claro."), kept, since the game looks clips up by their exact text.
- **Not cut, for the owner to decide:** about 2,500 item lines a set no random conversation or sim reached, voiced
  with every item list of their conversation (some pairings never happen, "esa Mérida se queda aquí" at customs;
  others do, "¿Otro …?" for any dish); the restaurant's totals, tips and cash above $1,500 (about 2,100 a set,
  $0.85).

### The list since 5 Nov: every speaker, plural and item list

The dialogue audit (s73, s74, s64a, s66 and others) found the list missing clips the game can say and holding some it
can't. Since 5 Nov (`tools/es-voices/runs-es.ts`, `lines-es.ts`, `reach-es.ts`; the report: the shared notes'
VOICE-LIST.md):

- **One pass, both sets.** Each conversation is played once (random runs, the sims, the probes); every line heard is made
  in both Spanishes from the same line, variant and values (only the text and the voice ids differ between them), so
  the two sets cover the same moments. The tools share one language model per conversation as the game does
  (`sharedNlu`) and read each sentence once per moment.
- **Who says it.** A line said by whoever holds the floor (no `c.speaker()` before it in that turn: "held") is asked
  again, with the words that made it, at the moments where each other person holds the floor (forks of the runs' and
  sims' own moments; up to 24 per person: one for each step, open question and the goodbye first; up to 4 sentences a
  line): Luis answers at the
  table what Lucía answered at her stand, Don Arturo what Iván answered at the ticket desk; a step only Lucía asks
  stays hers. A line the code gives a speaker (a speaker helper such as
  `K(c, "line")`, or `c.speaker("x")` before `c.say("line")` in the same block: `codeSpeakers`) is in that voice too,
  heard or not. A line nobody was heard saying and the code doesn't place goes to whoever says the lines around it,
  else to everyone in the conversation (`why: "who?"`). In s84 the date is the learner's choice (Santiago or Camila):
  every line in both voices (the sims play both dates). The global lines (g_ack, g_repeat…) go to whoever can hold the
  floor when the learner speaks: p26's recorded message, which only plays between Jorge's and Brenda's lines, has none.
- **Plural items.** An item line binds each item as the runs show the line binding items of its kind: the quantity
  heard with them; else as most of the conversation's item lines bind that kind (s32 says its produce in the plural);
  else two for an item always said in the plural (`attrs.plural`, `attrs.many`: "los papadzules", "sus pantalones
  nuevos"), as the conversations' own B(), taskVar(), tv() and bind() do, and one for the rest. A line and its `_pl`
  twin heard with the two kinds apart (s74's sayN, s73's veg_no) keep them apart. The hint examples bind such an item
  with two as well, in the game (`hintBinding` in the Spanish target.ts, used by suggest.ts: "Estoy hasta el cuello con
  los reportes de errores", "Quisiera los papadzules") and in the list; Maple Harbor's binds the bare id as before.
- **Item lists.** Only the item lists a line is heard with, in random runs, sims and probes, and those reach-es.ts
  `LISTS` reads in its code (s73's serve: a starter when no main); a line never heard with an item keeps every list
  (`why: "list?"`, counted by the junk check).
- **Two placeholders.** A line with two items, or an item and a value, is made from `BINDINGS` in reach-es.ts, read in
  its code (s66's place and its own fare; s74's garment and its own colors; s32's product and its price, kilos or
  pieces; s71a's car, extras and return days; p26's delivery days; s75's two prices), and an item described with
  modifiers the same way (s65b's bag and its color; s91a's and s91b's lost item with its color, material or size); a
  value with
  no list of its own takes the fixed values its calls give. Any other such line is voiced only as heard, and `plan`
  lists it ("lines the list can't make from their text").
- **Rules from the audits** (`RULES`): s64a's seat question never names one seat twice; s68's walk-in offers and fee
  their own prices; s70's audio guide only in a language the museum has, "no la tenemos" only in one it hasn't; s71a's
  daily rate one of the five car rates; s72's single-item price at most the dearest item, the size question only for
  a drink that comes in sizes; s76's two openings one of the eleven pairs the code offers (110 before); s80's
  technician windows with their own days. A rule or binding that no longer fits its line (renamed placeholders) is
  not used and `plan` says so; tests/es/voices.test.ts fails on one.
- **The checks.** `check-list-es.ts` plays other runs than the list's (from run #1000, the sims on three seeds, the
  probes) and checks every clip they say is in the list, every (line, speaker) pair, and counts the clips made from a
  guess nobody was heard saying (junk); `values-es.ts --lines=` does the same for values with the cuts.
- **What it changed** (spanish-edition 8b8571ab, 48 of 50 audits in; the old tools against the new on the same lines):
  83,324 → 83,729 clips for both sets (+2,233 −1,828 texts); `plan` $32.05 → $32.19, fitted to the samples' tokens
  (`project m1 m1b`, 5% redos) $28.63 → $28.70. Added: new speakers for a line 1,295 (1,186 of them s73's totals in
  Lucía's voice, said when she holds the floor at the goodbye; 86 Don Arturo's answers in s70), lines with two
  placeholders 582, plural hints and items 338. Removed: never-said item lists and kinds (s91b, s65b, s74, s35, p28, s73…), s76's 110 pairs, the audits'
  value rules, p26's recorded message's global lines. The list is made in about 6 min instead of 19 (one pass, the
  shared language model). The shared notes' VOICE-LIST.md has the table per conversation.

### What it costs

| | Clips | Batch price |
|---|---:|---:|
| Mexican set | 38,403 | $14.94 |
| neutral set | 38,389 | $15.00 |
| both, + 5% for redos | 76,792 | $31.44 |
| + the samples and the listener | 486 | about $1.10 |
| + the 9 conversations still to land (about 11% more, both sets) | about 8,500 | about $3.50 |
| **all** | | **about $36**, stop line $38 |

The audio tokens are Maple Harbor's measured 20.3 + 1.477 a character, plus 15% (the first two Spanish clips came out
5% and 27% above it); the Spanish lines average 35.5 characters (English 31.3). Range: about $27–35.5 for both sets of
the 41 conversations with redos. In the morning `project` fits the samples' real tokens and says whether both sets fit
with the later conversations, or the Mexican set goes first and the neutral set waits for the owner's OK.

## Samples

Made 5 Nov 2026 (08:22–09:20), two lines per character plus the coaches on the same example answers and the words a voice
could read its own way, in both accents, in both castings: `p1` (Gemini's prebuilt voices) and `m1` (the catalog's
Mexican voices), 243 clips each, and `p1b` / `m1b` for the 11 characters of the later conversations, 44 each. All 574
clips came back.

| | prebuilt, Mexican | prebuilt, neutral | catalog, Mexican | catalog, neutral |
|---|---:|---:|---:|---:|
| the listener heard Mexican / neutral / Spain | 85 / 16 / 21 | 73 / 21 / 27 | 86 / 12 / 24 | 86 / 11 / 24 |
| native | 122/122 | 121/121 | 122/122 | 121/121 |
| the words as written | 119/122 | 121/121 | 120/122 | 121/121 |
| naturalness (1–5) | 4.96 | 4.96 | 4.93 | 4.98 |

- **The "Spain" calls are the listener's, not the voices':** a second, feature-by-feature question (each c/z word: [s] or
  [θ]; apical or Latin American s; the j) on 14 clips first called Spain and 14 called Mexican: the same model (Gemini
  3.8 Flash) took back 10 of the 14 and still heard a θ in 4 words, two of them from the catalog's native Mexican
  voices; Gemini 3.1 Pro heard no θ in any of the 16 c/z words, no apical s, and Latin America for all 28.
  `~/puerto-colibri-voicing/samples/accent-probe-*.json`.
- **Whisper** (Spanish, the length screen): the 88 clips of the later characters, 0 flagged.
- **The casting:** both castings sound native and Latin American, and the neutral direction moves neither far from
  Mexican (neutral dubbing Spanish is close to it anyway). The catalog's voices are native Mexican speakers of stated
  ages, and Google advises a regional voice over describing an accent, so the catalog casting is the default now;
  each character keeps one voice in both sets.
- **The projection** (`project m1 m1b`): audio tokens ≈ 23.3 + 3.98 × syllables + 6.5 × pauses (±20), so 3.13M audio
  tokens for the Mexican set and 3.12M for the neutral one: about $14.90 and $14.92 in batch with 5% for redos. (The
  prebuilt casting: $29.42 for both.)

## The run-book (the morning, after billing is on)

Every step is one command, from the worktree; `v` is the tool with the edition overlay, niced:

```sh
cd <the es-voices worktree>
v() { nice -n 10 env EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/es-voices/voice-batch-es.ts "$@"; }
v ledger                                   # 0. the spend so far ($0.0026)
v sample --round=p1 --per=2                # 1. samples, Gemini's prebuilt voices (~$0.22); a 429 "free_tier" = billing not on yet
PC_CASTING=mexico v sample --round=m1 --per=2   # 2. samples, the catalog's Mexican voices (~$0.22)
v check-samples p1 && v check-samples m1   # 3. Whisper in Spanish + the length screen (no key)
v judge p1 && v judge m1                   # 4. the listener: which accent, native or not, the words (~$0.6)
v sheet p1 && v sheet m1                   # 5. pages to listen to: ~/puerto-colibri-voicing/samples/<round>/index.html
v project p1 m1                            # 6. the cost of both sets from the real tokens, and whether they fit
v plan --fresh                             # 6b. the line list again from the frozen lines (two niced workers): clips, price, lines only heard
c() { nice -n 10 env EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/es-voices/"$@"; }
c check-list-es.ts                         # 6c. the list against other runs: every clip they say in it, every (line, speaker); junk counted
#   7. choose the casting: DEFAULT_CASTING in tools/es-voices/casting-es.ts ("prebuilt" or "mexico"); if it changed,
#      v prepare --accent=mx --kind=mx && v prepare --accent=neutral --kind=nt   (a minute, no request)
v send --kind=mx                           # 8. the Mexican set's 13 batches ($14.94)
v send --kind=nt                           # 9. the neutral set's 13 batches ($15.00), only if step 6 says both fit
v status; v fetch                          # 10. until every batch is in (one download at a time)
v check                                    # 11. Whisper on every clip, plus the length rule
v redo && v prepare --kind=redo && v send --kind=redo   # 12. the bad takes again; then 10–12 until nothing is flagged
v install                                  # 13. clips + manifest + repair-versions into public/audio-es/
VITE_EDITION=es npx vite --port 8102       # 14. the dev build plays them (Settings switches the set)
```

`send` stops before any batch that would pass $38 (spent + running batches + the new one's estimate), and the ledger
(`~/puerto-colibri-voicing/ledger.jsonl`) has every request with its tokens and price.

## The night's later conversations (p18, p24, p25–p30)

When they land on `origin/spanish-edition` (about 11% more lines, about $3.50 for both sets):

```sh
git merge origin/spanish-edition            # in the es-voices worktree
v plan                                      # the list is made again (two niced workers, ~15 min): the new lines, cut the same way
v prepare --accent=mx --kind=mx2 && v send --kind=mx2      # only lines without a clip: a small second batch
v prepare --accent=neutral --kind=nt2 && v send --kind=nt2 # if project still says both fit
v fetch; v check; v redo; v install                         # as above
```

Their new characters are already cast (Toño, Don Gilberto, Doña Margarita, Jorge, Brenda, the recorded message,
Vanessa, Gerardo, Chef Villanueva, Fátima, Elena); a value line in them is cut the same way only where `reach-es.ts`
reads a fixed value in its calls (new rules need a person to read the code: `tools/es-voices/reach-es.ts` prints the
table). A line whose text changed gets a new key and is simply recorded; a clip recorded again after `install` gets a
repair version.
