# Puerto Colibrí's pictures

The illustrated scenes of the Spanish edition: one still picture per moment of a conversation, shown behind the
conversation panel, as Maple Harbor's 315 pictures are (docs/SCENE-ART.md). The owner approved making them with
OpenAI's image API from their API credits, **$82 in all**; the scripts stop making new requests at **$75**, so
retries fit.

| What | Where |
|---|---|
| This guide: the API, the style, how to write a prompt, the wiring | `docs/es/PICTURES.md` |
| The scripts (python3) and the prompt pieces | `tools/es-pictures/` |
| The manifests (one entry per picture) | `tools/es-pictures/manifests/*.json` |
| The references: one portrait per person, one picture per place | `public/scenes-es/ref/cast/<npc id>.webp`, `public/scenes-es/ref/place/<place>.webp` |
| The situation pictures (next) | `public/scenes-es/<situation>/<name>.webp`, mapped by `src/editions/es/ui/scene-data/<situation>.json` |
| The originals (PNG), their sidecars (prompt, references, usage) and the ledger | the work folder, by default `/private/tmp/claude-501/-Users-gabrieledirmontaite/b3b443be-6044-459a-94fe-bcc6886dd88c/scratchpad/pictures/` (`ES_PICTURES_DIR` sets another) |

## Status (4 Nov 2026)

- **Done:** the docs read (section 1), the style guide (3), the scripts and the ledger (7), the reference manifest
  (96 pictures: 58 people, 38 places; section 4), the wiring plan (8).
- **Waiting:** the API key (`OPENAI_API_KEY=` in `~/english-world/.env.local`) for the test picture; then the
  references. Nothing has been spent.

## 1. OpenAI's image API (read on 4 Nov 2026)

Read from OpenAI's developer docs on **4 November 2026**. `platform.openai.com/docs/...` now redirects to
`developers.openai.com/api/docs/...`. `openai.com/api/pricing` and the help center answered scripts with HTTP 403 (a
bot check), so the prices below are from the developer docs' pricing page and model pages.

Sources:
[image generation guide](https://developers.openai.com/api/docs/guides/image-generation) ·
[image prompting guide](https://developers.openai.com/api/docs/guides/image-prompting) ·
[pricing](https://developers.openai.com/api/docs/pricing) ·
[GPT Image 2.5 Sunburst](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst) ·
[GPT Image 2.5 Flare](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare) ·
[GPT Image 2](https://developers.openai.com/api/docs/models/gpt-image-2) ·
[Images API: edit](https://developers.openai.com/api/reference/resources/images/methods/edit) and
[generate](https://developers.openai.com/api/reference/resources/images/methods/generate) ·
[Batch API](https://developers.openai.com/api/docs/guides/batch) ·
[rate limits](https://developers.openai.com/api/docs/guides/rate-limits) ·
[error codes](https://developers.openai.com/api/docs/guides/error-codes) ·
[images and vision](https://developers.openai.com/api/docs/guides/images-vision) ·
[API organization verification](https://help.openai.com/en/articles/10910291-api-organization-verification)
(help center; not readable by script).

### Models

| Model id (snapshot) | What the docs say |
|---|---|
| `gpt-image-2.5-sunburst` (`gpt-image-2.5-sunburst-2026-09-08`) | "Our most capable model for image generation and editing"; the base model, "optimized for quality, with higher image quality than GPT Image 2"; choose it "for workflows where editing precision matters most". Speed: medium. The Images API's default model. |
| `gpt-image-2.5-flare` (`gpt-image-2.5-flare-2026-09-08`) | "Fast, high-quality everyday image generation"; the small model, "optimized for speed, with image quality comparable to GPT Image 2". Speed: very fast. |
| `gpt-image-2` (`gpt-image-2-2026-04-21`) | The previous generation; quality up to `high`; image inputs always at high fidelity. |
| `gpt-image-1.5`, `gpt-image-1-mini`, `chatgpt-image-latest` | Older, still listed. |
| `gpt-image-1` | Shut down on 23 October 2026. DALL·E 2 and 3 were retired on 12 May 2026. |

"Both [2.5] models offer improvements in precise editing and subject preservation." Both support generation,
edits with reference pictures, masks, a transparent background, and a new `markup` overlay on edits.

### Prices

Per 1M tokens (pricing page and model pages):

| | Text input | Image input | Image output |
|---|---|---|---|
| GPT Image 2.5 Sunburst and Flare, GPT Image 2: **Standard** | $5.00 (cached $1.25) | $8.00 (cached $2.00) | $30.00 |
| The same models: **Batch** | $2.50 (cached $0.625) | $4.00 (cached $1.00) | $15.00 |

- "Text output is not billed because this model outputs images, not text."
- Cached input prices apply only to the Responses API's image tool, "not to direct Images API requests, including
  `/v1/images/edits`".
- A request costs its prompt's text tokens, the reference pictures' image tokens (edits) and the picture's output
  tokens. The guide's calculator (the page's `GptImageTokenCalculator`) gives the output tokens: a grid of *f*
  tiles along the long edge (*f* = 16 low, 24 medium, 48 high, 64 xhigh, 96 max on 2.5; 16, 48, 96 on GPT Image 2),
  the short edge in proportion, times (2,000,000 + width × height) / 4,000,000. So the quality, much more than the
  size, sets the price. "Equal token rates don't mean equal cost per image": the response's `usage` is the real
  count, and the ledger uses it.
- Image input tokens of a reference picture: not documented for 2.5 ("Because gpt-image-2 always processes image
  inputs at high fidelity, edit requests that include reference images can use more input tokens"). Measured here:
  see "What a picture costs".

Output price per picture on the 2.5 models (tokens; Standard; Batch is half):

| Size | low | medium | high | xhigh | max |
|---|---|---|---|---|---|
| 1024×1024 | 196 · $0.006 | 439 · $0.013 | 1,756 · $0.053 | 3,122 · $0.094 | 7,024 · $0.211 |
| 1536×1024 or 1024×1536 | 158 · $0.005 | 343 · $0.010 | 1,372 · $0.041 | 2,459 · $0.074 | 5,488 · $0.165 |
| **2048×1152** (the scene size) | 157 · $0.005 | 367 · $0.011 | 1,413 · $0.042 | 2,511 · $0.075 | 5,650 · $0.170 |
| 2560×1440 | 205 · $0.006 | 478 · $0.014 | 1,843 · $0.055 | 3,276 · $0.098 | 7,370 · $0.221 |

For comparison, the guide's per-picture table for GPT Image 2 (1024² / 1024×1536 / 1536×1024): low $0.006 / $0.005
/ $0.005, medium $0.053 / $0.041 / $0.041, high $0.211 / $0.165 / $0.165.

### Sizes, quality and formats

- Any `WIDTHxHEIGHT` with both edges multiples of 16, at most 3:1, at most 3,840 px a side, 655,360 to 8,294,400
  pixels; above 2560×1440 is "experimental". Listed sizes include **2048x1152 (2K landscape)**, exactly the scene
  size, so nothing is cropped. Also `auto`.
- Quality: `low`, `medium`, `high`, `xhigh`, `max`, `auto` (the default) on 2.5; "Use xhigh or max only when they
  improve an unmet quality requirement". "Complex prompts may take up to 2 minutes."
- `output_format` png (default), jpeg or webp, with `output_compression` 0–100; the Images API returns base64 only
  (no URLs). `n` 1–10. `moderation`: `auto` (default) or `low`.

### Reference pictures (edits)

- `POST /v1/images/edits` takes up to **16** input pictures: as multipart `image[]` uploads, or as JSON
  `"images": [{"image_url": …} | {"file_id": …}]`, where `image_url` is an https URL or a base64 data URL (up to
  20 MB) and `file_id` a Files API upload (purpose `vision`). Optional `mask` (applies to the first picture) and, on
  2.5, `markup`. `input_fidelity` is for GPT Image 1.5 / 1 Mini only; GPT Image 2 always uses high fidelity.
- The Responses API's `image_generation` tool also takes a URL, a data URL or a file id, and allows multi-turn
  edits; it bills the mainline model's tokens on top. The scripts use the Images API.
- The prompting guide: "Assign roles to references. Identify each input by number and purpose: subject, style,
  clothing, or background"; for edits, "say 'change only X' and list the details to preserve"; for a recurring
  character, reuse its reference picture and "repeat the character's defining details". The limitation it names:
  the model "may occasionally struggle to maintain visual consistency for recurring characters".

### The Batch API

- Endpoints include **`/v1/images/generations` and `/v1/images/edits`**: "GPT Image 2.5 supports batch image
  generation and editing with gpt-image-2.5-flare and gpt-image-2.5-sunburst, including their 2026-09-08 snapshots."
  The pricing page lists Batch prices for GPT Image 2 as well.
- **50% off** every token (the table above). Completion window: `24h` only; "Each batch completes within 24 hours
  (and often more quickly)". Expired batches charge only for the requests they completed.
- Input: a `.jsonl` uploaded with purpose `batch`, one request per line (`custom_id`, `method`, `url`, `body`), the
  body as for the endpoint, one model per file, up to 50,000 requests and 200 MB; up to 2,000 batches an hour; a
  separate rate-limit pool. Pictures in a batch are passed as `file_id` (uploaded with purpose `vision`) or
  `image_url`: "Prefer referencing remote assets with image_url (instead of base64 blobs)" to stay under 200 MB.
- Results: an output `.jsonl` (each line's `response.body` is the endpoint's response, with `b64_json` and `usage`)
  and an error file.

### Rate limits and errors

- GPT Image 2.5 Sunburst, Flare and GPT Image 2, per usage tier (tokens a minute · images a minute): Free: not
  supported; **Build** (after $5 of credit purchases): 250,000 TPM · **20 IPM**; Launch ($100): 3,000,000 · 150;
  Grow ($500): 8,000,000 · 250. The tier upgrades itself as credit purchases add up; the limits are in the dashboard
  (Settings → Organization → Limits).
- 429 `rate_limit_error` / `slow_down` and 503 `server_is_overloaded`: follow `Retry-After`, back off with jitter.
  Billing errors (`insufficient_quota`, 429 `credit_balance_exhausted`, spend limits): retrying won't help.
- A refused prompt: 400 `image_generation_user_error` with `code: "moderation_blocked"` and `moderation_details`
  (`moderation_stage` input or output); "Don't automatically retry these errors without modifying the prompt".

### Organization verification

- The guide: "To ensure these models are used responsibly, you may need to complete the API Organization
  Verification from your developer console before using GPT Image models." ("may need": not described as always
  required.) The help center's article on it could not be read by script (HTTP 403).
- What an unverified organization gets (community reports, Oct 2025, for gpt-image-1): HTTP **403** "Your
  organization must be verified to use the model `gpt-image-1`", with a pointer to
  platform.openai.com/settings/organization/general → Verify Organization, and "it can take up to 15 minutes for
  access to propagate". The test below records what this account gets.

## 2. What we use and what a picture costs

- **Model: `gpt-image-2.5-sunburst`.** Same token prices as Flare; the docs' choice for editing precision and
  subject preservation, which is what keeps a person the same across 10–12 pictures. Flare is the fallback if
  Sunburst is slow or rate-limited.
- **Size: `2048x1152`** for scenes and places (the English pictures' size, no crop); `1024x1536` for the cast
  portraits.
- **Quality: `high` for the references; for the situation pictures, decided after the test (section 2 is updated then).**
- **Price per situation picture: about $0.05–0.10 at `high` with two references (the reference tokens are measured by the test); half that in a batch.**

## 3. The style

### One product with Maple Harbor

The Spanish pictures belong to the same family as Maple Harbor's, so the two editions feel like one product. A
dozen English pictures were looked at for this (the café, the pharmacy, the hotel keys, the neighbor, the taxi, the
first day at the office, the local on her bench, the used car, the restaurant host, the dinner door, the baggage
desk, the visitor center, the video call, the bus stop, the gym, the flower stall, the doctor, the bus): a **clean,
modern semi-flat illustration**, simple confident shapes, minimal soft shading, a fine grain texture, warm natural
daylight, a slightly muted palette with **deep teal and warm orange accents and creamy whites**, grown-up and
elegant (never cartoonish), backgrounds simplified and a little soft. The English brief's style paragraph is kept
almost word for word (`style` in `tools/es-pictures/prompt-parts.json`), and the first references take an English
picture with no text in it as their style reference (`en/s31-doctor/greet` for portraits, `en/s69-local/greet` for
places).

### Puerto Colibrí

What moves the style to Mexico's Caribbean coast (`town` in prompt-parts.json):
- **Light:** bright tropical sun, softened into the same warm, muted palette: no neon, no oversaturated colors.
- **Colors:** sun-faded Caribbean walls: terracotta, ochre, mango yellow, coral pink, turquoise, lime-washed white;
  the deep teal and warm orange accents stay.
- **Buildings:** one and two stories, flat roofs with low parapets and black water tanks (tinacos), arches, wooden
  shutters, wrought-iron window grilles.
- **Plants:** coconut palms, sea grapes, bougainvillea, flame trees, a big laurel on the zócalo; no cacti (the coast
  is jungle, not desert).
- **The zócalo:** the kiosco (an octagonal stone bandstand with green iron columns and a red-tiled dome), the
  parroquia with its bell gable, papel picado, iron benches, the Saturday tianguis's striped awnings.
- **The malecón and the beach:** a wide paved walk with a low white wall, lamp posts with two lanterns, palapas
  (thatched palm umbrellas) and loungers on white sand, lanchas (small open fishing boats, white with a colored
  stripe), a turquoise sea.
- **Mexican touches, used lightly:** papel picado, talavera tiles, clay pots, woven palm, embroidered cotton (a
  hipil, a guayabera, a rebozo). Everyday modern Mexico, not a postcard: **no sombreros, ponchos or clichés**.

### Framing, and how the learner is shown

As in the English pictures (checked on the dozen above):
- **The camera is the learner's eyes:** eye level, from the learner's side of the counter, desk or table (or the
  back seat of the taxi, the door of the bus).
- **The learner is never shown**: no face, no body, no back of the head. The English pictures show at most a
  forearm (the handshake in p25's `deal`, an olive sleeve) or a hand holding the phone (p26's `transfer`), and the
  learner's own tile in the video call is a camera-off icon. Here: only when the moment needs it (a handshake,
  handing over a passport), the learner's **hand and forearm come in from the bottom edge, in a plain sand-colored
  sleeve, with no ring, watch or nail polish** (the learner may be any gender and from any English-speaking country).
  Prefer the object on the counter or in the person's hands over the learner's hand.
- **The person:** about one third from the left edge, waist up, facing the viewer, head in the upper half.
- **The right third stays calm** (a wall, a window, open space): the conversation panel covers it on computers.
- **Phone and video calls:** the person at their end of the line (their office, their kitchen); a video call shows
  the laptop screen with the faces, the learner's own tile off.

### People

- **The cast's looks are set by their portraits** (section 4): the face, skin tone, hair, build and clothes stay the
  same in every picture. Their 3D figures follow the pictures later, as in Maple Harbor.
- **Varied looks, no default brunette:** skin tones from light to deep brown; hair black, gray, white,
  salt-and-pepper, copper, burgundy, caramel or blonde highlights, curly, braided, buzzed or bald; ages from the 20s
  to the 70s; slim, sturdy, tall, short. Extras in the background are varied too (`people` in prompt-parts.json).
- Grown-ups with friendly, natural expressions; uniforms and badges blank.

### No text, anywhere

Unlike Maple Harbor's pictures, **no text at all**: no letters, words, numbers, prices, logos, brand marks,
watermarks or signatures. Signs, menus, boards, screens, labels, badges, patches, tickets, papers, maps and license
plates are blank or show simple shapes and icons. (The prices, times and names come from the conversation itself;
the model also misspells Spanish.) Check every picture for stray letters, above all on signs and screens.

### Hands

Only when the action needs them: relaxed, natural, **five fingers each**. Portraits keep the hands out of the
frame. Look at every hand in every picture before keeping it.

## 4. The references

The manifest `tools/es-pictures/manifests/refs.json`: one portrait per person of the Spanish cast and one picture per
place (waiting for the key).

## 5. How to write a situation prompt

The lead plans 10–12 pictures per conversation, one per step and twist. Each conversation gets a manifest,
`tools/es-pictures/manifests/<situation id>.json` (the format: section 6), with:

1. **The first picture** (usually the greeting): references `"place:place/<place>"` and `"person:cast/<npc>"` (and
   any second person), and a prompt that says only what this moment adds: who stands where, the gesture, the props,
   the expression. The shared pieces (style, town, framing, people, no text, hands) are added by the scripts; don't
   repeat them.
2. **Every other picture: an edit of the first**, so the room, the light and the person stay the same: references
   `"edit:<situation>/<first>"` and `"person:cast/<npc>"`, and a prompt that names only the change: "She holds up
   three paper cups of different sizes, eyebrows raised (asking which size)." Make and check the first picture
   before the others (a manifest run with `--only <situation>/<first>`).
3. **A second set-up** in the same conversation (the restaurant's host stand, then the table): a new first picture
   from its place reference and the same person.
4. **Twists** get their own picture when they change what is seen (the oat milk is out: she shows an empty carton;
   the card machine is down: she shows the terminal with a blank screen and a sorry face). Put the twist id in
   `moment`, and the step or pending-question ids that show it in `phases`.
5. **Phases:** the ids are the ones `session.ts` reports: the pending question's id, or the step's id when the person
   starts talking; `howareyou` is the shared small talk and `closing` the goodbye (docs/SCENE-ART.md "Scene file").
   Find them in the situation file (`steps`, `expect({ id: … })`) and check them with scene-walk (section 7).

A prompt that works, in this order: **who** (by name and role: "Mariana, the barista"), **where they are**
("behind the counter, about one third from the left"), **what they do** (the gesture, with what in which hand),
**the expression**, and **what the learner sees** of the moment ("a paper cup on the counter in front of the
learner"). Name each prop's look ("a small clay cup", "a card terminal with a blank screen"). Say "blank" for
anything that could carry text. One action per picture.

Example (the café's first two pictures; illustrative, not a plan):

```json
{
  "scenes": { "s72-cafe": { "npc": "Mariana, barista", "focus": [34, 30], "start": "greet", "done": "done" } },
  "defaults": { "kind": "scene", "model": "gpt-image-2.5-sunburst", "size": "2048x1152", "quality": "high" },
  "items": [
    { "id": "s72-cafe/greet", "scene": "s72-cafe", "situation": "s72-cafe", "moment": "order",
      "phases": ["howareyou", "order", "kind"],
      "refs": ["place:place/cafe-la-ceiba", "person:cast/mia"],
      "prompt": "Mariana, the barista, stands behind the counter about one third from the left, both hands resting on the counter, smiling at the learner as they walk up (\"¡Buenos días! ¿Qué le sirvo?\").",
      "out": "public/scenes-es/s72-cafe/greet.webp" },
    { "id": "s72-cafe/size", "scene": "s72-cafe", "situation": "s72-cafe", "moment": "size", "phases": ["size"],
      "refs": ["edit:s72-cafe/greet", "person:cast/mia"],
      "prompt": "Change only her pose: she holds up three blank paper cups of different sizes, small, medium and large, in a row at chest height, eyebrows raised, asking which size.",
      "out": "public/scenes-es/s72-cafe/size.webp" }
  ]
}
```

**Checking a picture** (every one, before the next): the person matches the portrait (face, skin, hair, clothes);
nothing moved in the room; no letters or numbers anywhere (zoom into signs, screens, badges); hands natural with
five fingers; the learner unseen (or only the sand sleeve); the right third calm; the moment is readable without
words. Redo with a clearer prompt from the same references; note redos in the manifest (`"note"`).

## 6. The manifest format

A manifest is JSON: `defaults` (fields every item gets unless it sets its own), `items` (one per picture) and, for
situations, `scenes` (per scene: `npc` label, `focus`, `start`, `done`, `sticky`, as in src/ui/scenes.ts).

| Field | Meaning |
|---|---|
| `id` | Unique: `cast/<npc id>`, `place/<place>`, `<situation>/<picture name>` (the picture name is the last part) |
| `kind` | `cast`, `place`, `scene` or `test`: picks the framing paragraph and the web size |
| `label` | A person's or place's name, used when another prompt refers to it ("the character reference for …") |
| `situation` | The situation id (or, for a reference, the list of situations that use it) |
| `moment` | The step, pending-question or twist id the picture illustrates |
| `scene`, `phases` | Situations: the scene file it belongs to (`s84-date@sam` for a per-person scene) and the ids that show it |
| `prompt` | Only this picture's own part; the shared pieces are added by `espics.build_prompt` |
| `refs` | References in order, each `role:id`: roles `style`, `person`, `place`, `edit`; ids `en/<scene>/<name>` (an English picture), `cast/<npc>`, `place/<place>`, `<situation>/<name>` (a Spanish picture), `file:<path>` |
| `model`, `size`, `quality`, `n` | The request (`size` WIDTHxHEIGHT, multiples of 16) |
| `out` | The web version's path in the repository (or `{work}/…` for the work folder) |
| `focus` | Optional [x%, y%]: where to crop when an original isn't 16:9 |
| `skip` | A reason not to make it (the three non-people in the cast) |
| `note` | Free text: what was redone and why |

The originals are `<work>/originals/<id>.png` with a sidecar `<id>.json` (the final prompt, the references and
their SHA-256, the usage, the price, the request id). A redo keeps the old ones as `<id>~1.png`.

## 7. The scripts

All in `tools/es-pictures/`, python3 (3.9+) and its standard library; `convert.py` (and the scaling of references in
the others) uses Pillow, as the English workflow did. The key: `OPENAI_API_KEY=` in `~/english-world/.env.local`,
read by the scripts and kept in memory only (never printed, logged or written).

```sh
python3 tools/es-pictures/generate.py refs --dry-run                 # what would be made, at what estimate
python3 tools/es-pictures/generate.py refs --show-prompt --only cast/mia   # the full prompt (sends nothing)
python3 tools/es-pictures/generate.py refs --only cast/mia --convert # make one, write its web version
python3 tools/es-pictures/generate.py s72-cafe --convert --workers 2 # a whole manifest (skips what exists)
python3 tools/es-pictures/generate.py refs --only place/zocalo --force --convert   # a redo (keeps the old one)
python3 tools/es-pictures/batch.py submit s72-cafe                   # the same at half price, within 24 h
python3 tools/es-pictures/batch.py status
python3 tools/es-pictures/batch.py fetch <batch id> --convert
python3 tools/es-pictures/convert.py refs                            # PNG → WebP (q80; scenes 2048×1152)
python3 tools/es-pictures/scene_file.py s72-cafe --write             # the scene file from the manifest
python3 tools/es-pictures/ledger.py                                  # spent, reserved, left before $75
python3 tools/es-pictures/ledger.py --price 2048x1152 high 2         # the estimate for one picture with 2 refs
```

- `generate.py`: the regular API. References are sent as data URLs (scaled to 1536 px on the long edge), to
  `/v1/images/edits`; without references, `/v1/images/generations`. Two requests at a time by default (at most 4),
  at most 10 a minute (the Build tier allows 20); 429 and 5xx are retried with `Retry-After` and backoff; a 403
  (verification), 401, 404 or a billing error stops the run (and is written to `<work>/last-fatal.txt`); a refused
  prompt is logged and skipped. One generator at a time (a lock file).
- `batch.py`: the Batch API; one batch per endpoint and model; references uploaded once (purpose `vision`, cached by
  SHA-256); a submit reserves its estimate in the ledger, a fetch books the real usage and releases the reservation.
- `convert.py`: the web format (WebP quality 80; scenes and places exactly 2048 × 1152, portraits as they are);
  warns over 250 kB.
- `scene_file.py`: writes `src/editions/es/ui/scene-data/<scene>.json` from a manifest, once the pictures exist.
- `ledger.py`: totals and the price check.

### The ledger

`<work>/ledger.jsonl`, one JSON line per request: time, id, endpoint, model, size, quality, the number of
references, batch or not, status (ok, error, no-response), HTTP status and error code, the request id, the `usage`,
the tokens (text in, image in, image out), the estimate and the **cost** (from the usage at Standard or Batch
prices), and the running totals (`total_usd` spent, `committed_usd` with open batch reservations). A request with no
response counts its estimate (it may have been billed). Batches add `reserve` and `release` lines. **Before every
request the scripts check committed + in flight + this request's estimate ≤ $75**, and refuse otherwise; the stop can
be lowered (`--stop`) but not raised. The estimate takes the largest image-input count measured so far per reference
(+10%).

## 8. The wiring plan

How the Spanish scene files and pictures plug into the game (not done yet: it touches shared engine files, so it is
the lead's change; the English edition must stay byte-for-byte the same):

1. **The folder.** `src/ui/scenes.ts` builds picture URLs as `scenes/<stem>.webp`. Give `src/ui/scene-files.ts` a
   second export, `export const SCENE_DIR = "scenes";`, and use it in `sceneUrl`:
   `` `${import.meta.env.BASE_URL}${SCENE_DIR}/${stem}.webp` ``. The Spanish `src/editions/es/ui/scene-files.ts` (an
   edition file has its base file's exports) becomes:
   ```ts
   import type { SceneFile } from "../../../ui/scenes";
   export const SCENE_DIR = "scenes-es";
   export const SCENE_FILES: Record<string, SceneFile> = import.meta.glob<SceneFile>("./scene-data/*.json", { eager: true, import: "default" });
   ```
   (the glob is relative to the Spanish file: `src/editions/es/ui/scene-data/`).
2. **The files.** Scene files: `src/editions/es/ui/scene-data/<situation id>.json`, Spanish situation ids
   (`s32-mercado`, not `s32-supermarket`), `<id>@<npc>` for a per-person scene (the date: `s84-date@sam`,
   `s84-date@emma`). Pictures: `public/scenes-es/<situation id>/<name>.webp` (`@` → `-` in the folder). The JSON
   fields are the English ones (`npc`, `images`, `start`, `done`, `sticky`, `phases`, `focus`); leave out `jobs`
   (OpenAI has no job ids to edit later; the sidecars hold the request ids). `scene_file.py` writes them from the
   manifests.
3. **The check.** `tools/scene-walk.ts` reads `src/ui/scene-data` and `public/scenes`; make both depend on the
   edition (`editionFromEnv()` from tools/edition-overlay.mjs: `src/editions/es/ui/scene-data` and
   `public/scenes-es` for `es`) and print the folder it read. Then
   `EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/scene-walk.ts s72-cafe` walks the Spanish
   conversations (the hook already gives it the Spanish situations and cast).
4. **The builds.** Vite copies all of `public/` into every build. Leave out the other edition's pictures and the
   references: the English build doesn't need `scenes-es/` (nor the Spanish one `scenes/`, 28 MB), and neither
   needs `scenes-es/ref/` (inputs for making pictures, not game assets). A small plugin in vite.config.ts
   (`closeBundle`: remove those folders from the out dir by edition) or the same step in the export scripts.
5. **The interface** needs nothing new: Settings → illustrated scenes, the crossfade, the call screen all work from
   the scene files.
6. **Order of work**, per conversation: its manifest → the first picture, checked → the rest → `convert.py` →
   `scene_file.py --write` → scene-walk with 0 errors → one commit with the pictures and the scene file together.

## 9. For the owner

- Put `OPENAI_API_KEY=…` in `~/english-world/.env.local` (one line; the scripts read it, nothing prints it).
- If the test answers 403 "must be verified": verify the organization at platform.openai.com → Settings →
  Organization → General → Verify Organization, then wait up to 15 minutes.
