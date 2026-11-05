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
| The originals (PNG), their sidecars (prompt, references, usage) and the ledger | the work folder, by default `~/puerto-colibri-pictures/` since the 5 Nov audit (`ES_PICTURES_DIR` sets another; the first copy, in the session's scratch folder, is older: use one ledger only) |

## Status (5 Nov 2026)

- **Every conversation has its pictures:** 50 conversations, 51 scenes (the date has Santiago's and Camila's),
  **579 situation pictures** (chapters 1–7: 478; chapters 8–9: 101), each checked (section 5 "Checking a picture"),
  wired into the game (section 8). The references: 58 portraits and 47 places (section 4).
- **Audited on 5 Nov 2026** (the picture audit's notes, PICTURES-AUDIT.md): every situation picture checked against
  its portrait, the lines on screen while it shows (simulated conversations), the text and name-tag rules,
  near-duplicates, the style, anatomy and place details; 110 findings (4 high, 23 medium, 83 low). **52 pictures
  remade** (the high and medium ones and 15 low ones: a third hand, a second passport, the mute icon back on a
  video, a banknote that looked like a dollar, moments that showed the wrong thing, near-copies, a hat that came and
  went, the gym's leg press; and s66's four pictures at the taxi stand, which the s66 dialogue audit moved from the
  zócalo to the airport terminal), and the phases of 6 moments in s33, s82 and s89 remapped so the picture fits its line
  (s82's medium finding was fixed that way; in s33 Don Pancho's painting shows on Fridays and his fishing on Mondays,
  and react, the pending after each of his stories, keeps his listening pose). Each remade entry has a `note` in its manifest. Left as they are: the
  low findings (above all the sea seen from inland places, which comes from the place references).
- **Spent: $42.78** of the $75 stop (the owner approved $82), 769 requests. Until the audit: $40.59 (regular API: 506
  requests, $33.30: the test $0.03; the references, their redos and name tags: 132, $7.43; situation pictures: 373,
  $25.85 = 75 first pictures and their redo, 298 edits. Batch API: 209 situation pictures, $7.29: 158 + 49 edits, 2
  redos). The audit: $2.18 (45 edits in one batch, $1.62; 8 through the regular API, $0.56).
- **Weight:** since the audit every situation picture is WebP quality 65 (section 9): 76.8 MB for the 579, 26% less
  than at quality 80, with no visible difference at the game's display sizes.
- **Why most went through the regular API:** the first pictures by design (each checked before its edits); then the
  edits' one big batch failed at once on the organization's queue limit (1,000,000 enqueued tokens per model), the
  first queue-sized batch (158) showed no progress for 45 minutes (it finished after 1.5 hours), and the rest was
  made through the regular API that night. From the owner's word on 5 Nov, everything after the first pictures went
  in batches (the chapter 8–9 edits: 49 in 18 minutes; the redos).
- **Next:** the owner's look at the pictures in the game; the lead's export to the course.

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
  and an error file. With pictures it is big (a 2048×1152 PNG is about 3.5 MB, 4.7 MB in base64): `batch.py`
  streams it to disk.
- **The queue limit (found on 4 Nov 2026):** batches are also limited by the tokens enqueued per model in running
  batches. Our first batch (420 edits, about 2.1 M tokens with outputs) failed at once with `token_limit_exceeded`:
  "Enqueued token limit reached for gpt-image-2.5-sunburst in organization … Limit: 1,000,000 enqueued tokens."
  So pictures go in queue-sized batches, one after the other (`batch.py run`, about 158 edits each).
- **Turnaround seen on 4–5 Nov 2026:** 158 edits took 1 h 36 min (the status said 0 done for the first 45 minutes,
  then jumped); 49 edits took 18 minutes; 2 redos took 33 minutes.

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
- **Quality: `high`.** The test at `medium` already showed the style well (no text, clean shapes, the grain); `high`
  is crisper in faces and small things for $0.03 more a picture, and the budget allows it. `xhigh`/`max` only if a
  picture needs it.
- **References are sent at 1536 px on the long edge** and cost **one image-input token per 32-px patch** (measured:
  a 1536×864 reference = 48 × 27 = 1,296 tokens = $0.0104; a 1024×1536 portrait = 1,536 tokens = $0.0123). A
  smaller reference costs less (`--ref-edge 1024`: 576 tokens for a 16:9 picture).
- **Measured on 4 Nov 2026** (the ledger): the test picture (`medium`, 2048×1152, one reference) **$0.0253** (791 text
  tokens, 1,296 image-input tokens, 367 output tokens, 25 s); a portrait (`high`, 1024×1536, one reference)
  **$0.054** (about 460 text, 1,296 image in, 1,372 out, about 27 s); a place (`high`, 2048×1152, one reference)
  **$0.057** (about 800 text, 1,296 image in, 1,413 out, about 34 s). The output tokens match the calculator exactly.
- **Price per situation picture: $0.07 through the regular API** (`high`, 2048×1152, two references: the scene's
  first picture or its place, and the person's portrait; about 900 prompt tokens), **$0.035 in a batch**. Without the
  portrait (an edit of the scene's first picture only): $0.06 / $0.03. At `medium`: $0.04 / $0.02.
- **What that buys:** 600 situation pictures (50 conversations × 12) at `high` cost about $42 through the regular
  API or $21 in batches, plus redos (about 20% in the English rollout). With the references (about $6) that fits
  under the $75 stop either way; batches leave room for more redos.

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
- **The sea only at the waterfront** (the malecón, the beach, the pier, El Muelle); elsewhere windows and doors open
  onto streets, patios, palms and painted houses. (The first places put the sea in almost every window; the town text
  now says so.)
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

### No text, except a worker's name tag

Unlike Maple Harbor's pictures, **no text**: no letters, words, numbers, prices, logos, brand marks, watermarks or
signatures. Signs, menus, boards, screens, labels, other badges and patches, tickets, papers, maps and license plates
are blank or show simple shapes and icons. (The prices, times and names come from the conversation itself; the model
also misspells Spanish.)

**The one exception (the owner, 4 Nov 2026): a worker's name tag, where a real worker would wear one**, with the
name exactly as the game spells it, accents included (src/editions/es/content/npcs.ts); officials show the surname.
Yes: hotel reception, the bank, airline and airport staff, the pharmacy counter, shop clerks, customer service,
uniform name plates for police and officials, the name embroidered on the doctor's coat. No: the market vendor, the
taxi driver, neighbors, friends, people at a party (and here also: the café, the restaurant, the salon, the bus
driver, the gas station, the museum guard, office colleagues).

| Kind | Who (npc id: text) |
|---|---|
| `plate` (a metal name plate on the uniform) | diaz: Ramírez · grant: Torres · aduana: Medina · reyes: Reyes |
| `lanyard` (the card on the lanyard) | priya: Itzel · ben: Iván |
| `badge` (a small badge on the chest) | olivia: Fernanda · chloe: Valeria · okafor: Héctor · aaron: Ricardo · gloria: Gloria · walter: Raúl · jake: Andrés · kevin: Emilio · nina: Daniela · linda: Lorena · claire: Karla · jordan: Mónica · kyle: Jorge · brenda: Brenda |
| `embroidered` (on the white coat) | carter: Dra. Herrera |

- **The data** is `nametag: {"text", "kind"}` on the cast entries of `tools/es-pictures/manifests/refs.json` (with
  `name`, the game's name). The wording is `nametag` in prompt-parts.json.
- **It is automatic:** `espics.build_prompt` adds the tag sentence (and swaps the no-text rule for one that allows
  only that tag) whenever a tagged person is in the picture: their portrait, any picture with `"person:cast/<npc>"`
  in its references, and any edit of such a picture (an `"edit:…"` reference inherits the people of the picture it
  edits). A situation prompt never describes the tag itself.
- **Check the spelling of every tag** (accents too) when reviewing. A misspelled one: redo it
  (`--fix "Correct the name tag to read exactly …"`), or turn the person a little so the tag faces away.

Check every picture for any other letters, above all on signs and screens (`textcheck.swift` helps; section 7).

### Hands

Only when the action needs them: relaxed, natural, **five fingers each**. Portraits keep the hands out of the
frame. Look at every hand in every picture before keeping it.

## 4. The references

All made on 4 Nov 2026 with `gpt-image-2.5-sunburst` at `high` through the regular API, each with one English picture
with no text as its style reference (`en/s31-doctor/greet` for the portraits, `en/s69-local/greet` for the places), and
checked one by one (contact sheets, full-size crops, `textcheck`). The originals are in `<work>/originals/cast/` and
`<work>/originals/place/` (a redo keeps the earlier one as `~1`); the web versions (WebP, at most 240 kB) are in
`public/scenes-es/ref/` (10.5 MB). Situation pictures use them as `"person:cast/<npc id>"` and `"place:place/<id>"`.

**58 portraits** (1024 × 1536: waist up, facing the viewer, on a warm cream background, hands out of the frame).
Each follows the person's role and the look written for them in `refs.json` (varied skin tones, hair, ages and builds);
the 21 with a name tag got it as an edit of their portrait, so the face and clothes stayed the same, and every tag
was read back letter by letter (accents included). Three cast ids are not people and have no portrait: `netwave_bot`
(the phone menu), `sco` (Maple Harbor's self-checkout), `harbor_bot` (a recorded message).

| Portrait | Who | Tag |
|---|---|---|
| `cast/diaz` | Oficial Ramírez (Immigration officer) | plate: Ramírez |
| `cast/priya` | Itzel (Baggage services) | lanyard: Itzel |
| `cast/vinnie` | Don Rigo (Taxi driver) |  |
| `cast/olivia` | Fernanda (Hotel reception) | badge: Fernanda |
| `cast/chuck` | Don Chuy (Tourist information volunteer) |  |
| `cast/mia` | Mariana (Barista) |  |
| `cast/rosa` | Doña Carmen (Local, born and raised) |  |
| `cast/ben` | Iván (Museum tickets) | lanyard: Iván |
| `cast/harold` | Don Arturo (Museum guard) |  |
| `cast/marco` | Luis (Waiter) |  |
| `cast/chloe` | Valeria (Sales assistant) | badge: Valeria |
| `cast/okafor` | Don Héctor (Pharmacist) | badge: Héctor |
| `cast/jessie` | Paty (Hairdresser) |  |
| `cast/aaron` | Ricardo (Bank teller) | badge: Ricardo |
| `cast/gloria` | Gloria (Postal clerk) | badge: Gloria |
| `cast/marco_host` | Lucía (Restaurant host) |  |
| `cast/walter` | Don Raúl (Bus ticket office) | badge: Raúl |
| `cast/denise` | Ana (Bus driver) |  |
| `cast/jake` | Andrés (Car rental agent) | badge: Andrés |
| `cast/dot` | Doña Chela (Gas station attendant) |  |
| `cast/kevin` | Emilio (Airline check-in) | badge: Emilio |
| `cast/grant` | Oficial Torres (Airport security) | plate: Torres |
| `cast/nina` | Daniela (Gate agent) | badge: Daniela |
| `cast/linda` | Lorena (Dental office reception) | badge: Lorena |
| `cast/claire` | Karla (Customer service) | badge: Karla |
| `cast/patel` | Don Ernesto (Landlord) |  |
| `cast/rita` | Doña Lupita (Neighbor) |  |
| `cast/brooks` | Licenciada Salinas (HR manager) |  |
| `cast/maria` | María (Coworker) |  |
| `cast/kate` | Sofía (Team lead) |  |
| `cast/paul` | Pablo (Colleague) |  |
| `cast/sara` | Sara (Colleague) |  |
| `cast/harris` | Ingeniero Montes (Your boss) |  |
| `cast/sophie` | Ximena (Party host) |  |
| `cast/mark` | Marcos (Party guest, chef) |  |
| `cast/lizzie` | Andrea (Your friend) |  |
| `cast/sam` | Santiago (Your date) |  |
| `cast/emma` | Camila (Your date) |  |
| `cast/dan` | Diego (Your friend, dinner host) |  |
| `cast/nora` | Natalia (Diego's wife) |  |
| `cast/lucy` | Paola (Old school friend) |  |
| `cast/mrs_lee` | Doña Mari (Flower stall) |  |
| `cast/reyes` | Oficial Reyes (Police officer) | plate: Reyes |
| `cast/carter` | Doctora Herrera (Family doctor) | embroidered: Dra. Herrera |
| `cast/marcus` | Doña Lupe (Fruit and vegetable stall) |  |
| `cast/frank` | Don Pancho (Neighbor) |  |
| `cast/jordan` | Mónica (Personal trainer) | badge: Mónica |
| `cast/maggie` | Doña Margarita (Selling her car) |  |
| `cast/kyle` | Jorge (Customer service) | badge: Jorge |
| `cast/brenda` | Brenda (Customer care manager) | badge: Brenda |
| `cast/vanessa` | Vanessa (Marketing lead) |  |
| `cast/greg` | Gerardo (Team manager) |  |
| `cast/whitaker` | Chef Villanueva (Head chef) |  |
| `cast/russo` | Fátima (Junior cook) |  |
| `cast/emily` | Elena (Your manager) |  |
| `cast/tyler` | Toño (Founder) |  |
| `cast/mr_grant` | Don Gilberto (Your landlord) |  |
| `cast/aduana` | Agente Medina (Customs) | plate: Medina |

**42 places** (2048 × 1152, the scene size), framed like the conversation pictures with the person's spot left
empty: the situation's first picture puts the person there. Places inside a bigger one were made with it as a
`setting:` reference, so the town and the airport look the same from every spot.

| Place | What | Used by | Note |
|---|---|---|---|
| `place/zocalo` | The zócalo (main square) | s69-local, s86-old-friend, s91a-lost-wallet |  |
| `place/zocalo-flores` | Doña Mari's flower stall at the tianguis | s91a-lost-wallet | setting: `place/zocalo`; redone with the zócalo as its setting (the first one had a different kiosco) |
| `place/mercado` | The Mercado Municipal: Doña Lupe's stall | s32-mercado | redone as a covered hall (the first was open-air, and its juice taps read as digits) |
| `place/malecon` | The malecón and the beach | s83-invite-call, s67b-bus |  |
| `place/aeropuerto-equipaje` | The arrivals hall: baggage desk and customs | s65b-baggage | the customs traffic light taken out (an edit; Cancún has had none since 2020) |
| `place/aeropuerto-migracion` | Immigration control | s65a-passport | setting: `place/aeropuerto-equipaje` |
| `place/aeropuerto-documentacion` | The airline check-in counter | s64a-checkin | setting: `place/aeropuerto-equipaje`; the baggage-claim carousel replaced by a check-in belt (an edit) |
| `place/aeropuerto-seguridad` | The security checkpoint | s64b-security | setting: `place/aeropuerto-equipaje` |
| `place/aeropuerto-sala` | The departure gate (sala) | s64c-gate | setting: `place/aeropuerto-equipaje` |
| `place/hotel-mar-azul` | Hotel Mar Azul's lobby | s68-hotel |  |
| `place/cafe-la-ceiba` | Café La Ceiba | s72-cafe |  |
| `place/cocina-de-lucia` | La Cocina de Lucía | s73-restaurant |  |
| `place/el-muelle` | Restaurante El Muelle | s84-date, p28-kitchen |  |
| `place/terminal-autobuses` | The bus terminal's ticket office | s67a-tickets |  |
| `place/camion` | Inside the city bus | s67b-bus, s90-running-late |  |
| `place/gasolinera` | The gas station's pump | s71b-gas |  |
| `place/banco` | Banco del Puerto | s78-bank |  |
| `place/farmacia` | Farmacia del Puerto | s75-pharmacy |  |
| `place/consultorio` | The doctor's consulting room | s31-doctor, s75-pharmacy |  |
| `place/linea-clara` | The office of Línea Clara | s34-meeting, s87-interview, s88-first-day, p27-meeting, p28b-review |  |
| `place/calle-residencial` | A residential street | p25-used-car, s82-neighbor |  |
| `place/gimnasio` | Gimnasio Colibrí | s35-gym |  |
| `place/museo` | Museo de la Costa Maya | s70-museum |  |
| `place/sitio-taxis` | The taxi stand (sitio) | s66-taxi | setting: `place/zocalo`; since the s66 dialogue audit the sitio stands by the airport terminal: s66's pictures were edited (start from `s66-taxi/greet`) |
| `place/informacion-turistica` | The tourist information office | s62-visitor-center |  |
| `place/correos` | The post office | s79-post |  |
| `place/boutique-hilos` | Boutique Hilos | s74-clothes |  |
| `place/estetica-tijeras` | Estética Tijeras | s77-salon |  |
| `place/policia` | The Policía Municipal | s91b-police |  |
| `place/departamento` | An apartment for rent (Las Palmas) | s81-apartment, p29-landlord, p24-flood |  |
| `place/edificio-pasillo` | The apartment building's corridor | s82-neighbor, p29-landlord | setting: `place/departamento` |
| `place/casa-ximena-patio` | Ximena's backyard party | s63-party |  |
| `place/casa-diego` | Diego and Natalia's front door | s85-dinner, p30-start-over | redone at dusk on a residential street (the first was sunny, with a beach) |
| `place/renta-autos` | Renta de Autos Colibrí | s71a-rental |  |
| `place/parada` | The bus stop on Calle Ceiba | s33-small-talk |  |
| `place/brotecito` | Brotecito, the startup | p18-startup |  |
| `place/el-muelle-cocina` | El Muelle's kitchen | p28-kitchen | setting: `place/el-muelle` |
| `place/taxi-interior` | Inside Don Rigo's taxi | s66-taxi |  |
| `place/consultorio-dental` | The dental office's reception | s76-dentist-call |  |
| `place/oficina-cocina` | Línea Clara's office kitchen | s88-first-day | setting: `place/linea-clara` |
| `place/casa-diego-interior` | Inside Diego and Natalia's house | s85-dinner, p30-start-over | setting: `place/casa-diego`; the window made dusk (an edit) |
| `place/call-center` | A customer service office | s80-support-call, p26-complaint |  |

Later, for the situation pictures, 9 more places (5 Nov 2026), each in its own small manifest
(`tools/es-pictures/manifests/refs-plan-a.json` … `refs-plan-e.json`): the learner's kitchen at Las Palmas
(`place/departamento-cocina`), Doña Margarita's drive with her red convertible (`place/casa-margarita`), the meeting
room and Elena's office at Línea Clara (`place/sala-de-juntas`, `place/oficina-elena`), Diego and Natalia's door on a
sunny morning (`place/casa-diego-dia`, an edit of the dusk one), and four for the chapter 1–7 planners
(`place/taxi-interior`, `place/consultorio-dental`, `place/oficina-cocina`, `place/casa-diego-interior`, in refs.json).

Redone or fixed: 6 places (above) and none of the portraits apart from the name tags. Cost: portraits $3.11 + name
tags $1.16, places $2.82 (with the redos and fixes), the test $0.03: **$7.12 in all** (128 requests).

## 5. How to write a situation prompt

The lead plans 10–12 pictures per conversation, one per step and twist. Each conversation gets a manifest,
`tools/es-pictures/manifests/<situation id>.json` (the format: section 6), with:

1. **The first picture** (usually the greeting): references `"place:place/<place>"` and `"person:cast/<npc>"` (and
   any second person), and a prompt that says only what this moment adds: who stands where, the gesture, the props,
   the expression. The shared pieces (style, town, framing, people, no text, name tags, hands) are added by the
   scripts; don't repeat them.
2. **Every other picture: an edit of the first**, so the room, the light and the person stay the same: references
   `"edit:<situation>/<first>"` and `"person:cast/<npc>"`, and a prompt that names only the change: "She holds up
   three paper cups of different sizes, eyebrows raised (asking which size)." Make and check the first picture
   before the others (a manifest run with `--only <situation>/<first>`).
3. **A second set-up** in the same conversation (the restaurant's host stand, then the table): a new first picture
   from its place reference and the same person.
4. **Twists** get their own picture when they change what is seen (the oat milk is out: she shows an empty carton;
   the card machine is down: she shows the terminal with a blank screen and a sorry face). Put the twist id in
   `moment`, and the step or pending-question ids that show it in `phases`.
5. **A picture with no named person** (a phone on a table, an empty room) gets a framing paragraph without a person
   (`frame_nobody` in prompt-parts.json) and no "people" paragraph, so the model doesn't add someone (the first
   phone-menu picture showed a stranger, who reads as the learner).
6. **Phases:** the ids are the ones `session.ts` reports: the pending question's id, or the step's id when the person
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
| `name`, `nametag` | Cast entries only: the game's name, and the name tag (`{"text": "Ramírez", "kind": "plate"}`) where the person wears one |
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
python3 tools/es-pictures/generate.py s72-cafe --only s72-cafe/size --fix "Remove the letters on the cup; change nothing else." --convert
                                                                     # an edit of the picture itself (keeps the old one)
python3 tools/es-pictures/batch.py submit s72-cafe                   # the same at half price, within 24 h
python3 tools/es-pictures/batch.py run s31-doctor s32-mercado … --convert   # submit, wait, fetch, a queue at a time
python3 tools/es-pictures/batch.py status
python3 tools/es-pictures/batch.py fetch <batch id> --convert
python3 tools/es-pictures/convert.py refs                            # PNG → WebP (q65; scenes 2048×1152)
python3 tools/es-pictures/scene_file.py s72-cafe --write             # the scene file from the manifest
python3 tools/es-pictures/ledger.py                                  # spent, reserved, left before $75
python3 tools/es-pictures/ledger.py --price 2048x1152 high 2         # the estimate for one picture with 2 refs
python3 tools/es-pictures/sheet.py s72-cafe                          # contact sheets of the originals, to look at
swiftc -O tools/es-pictures/textcheck.swift -o <work>/textcheck      # once; then:
<work>/textcheck <work>/originals/s72-cafe                           # any letters or digits macOS can read
```

- `--only` takes exact ids, or prefixes ending in `*` or `/` (`cast/`, `s72-cafe/*`). In zsh, a list held in a
  variable needs `${=LIST}` to split into words.
- `generate.py`: the regular API. References are sent as data URLs (scaled to 1536 px on the long edge), to
  `/v1/images/edits`; without references, `/v1/images/generations`. Two requests at a time by default (at most 4),
  at most 10 a minute (the Build tier allows 20); 429 and 5xx are retried with `Retry-After` and backoff; a 403
  (verification), 401, 404 or a billing error stops the run (and is written to `<work>/last-fatal.txt`); a refused
  prompt is logged and skipped. One generator at a time (a lock file).
- `batch.py`: the Batch API; one batch per endpoint and model, at most `--queue` (900,000) estimated tokens each;
  references uploaded once (purpose `vision`, cached by SHA-256); a submit reserves its estimate in the ledger, a
  fetch books the real usage and releases the reservation (also for a failed batch). `run` chains submit → wait →
  fetch until every selected picture exists, resuming an unfetched batch first.
- `convert.py`: the web format (WebP quality 65, 80 until the 5 Nov audit; scenes and places exactly 2048 × 1152,
  portraits as they are); steps down by 4 while a file is over 240 kB; warns over 250 kB.
- `scene_file.py`: writes `src/editions/es/ui/scene-data/<scene>.json` from a manifest, once the pictures exist.
- `ledger.py`: totals and the price check.
- `sheet.py`: contact sheets (several originals side by side, labeled) for a first look; then look at doubtful
  pictures at full size.
- `review_text.py`: runs textcheck on a manifest's originals and prints every picture with text other than the
  name tags of the people in it, or with a tag read differently from its spelling (a misread is common on small
  plates: look before redoing).
- `generate.py`, `batch.py submit` and `sheet.py` take several manifests at once
  (`generate.py s31-doctor s32-mercado … --only …`). A batch refuses an edit whose source picture doesn't exist yet
  (no chains inside one batch: make the sources first through the regular API).
- **Remakes through a manifest of their own** (the 5 Nov audit's are in the work folder's `audit/`): the scripts take
  a path, and a manifest outside `manifests/` never shadows a scene manifest's entries for the other tools. Each entry
  copies the picture's `id`, `scene`, `phases` and `out` and sets its own `refs` and `prompt`: `"edit:<its own id>"`
  edits the picture itself (what `generate.py --fix` does, and it works in a batch too: `batch.py submit <path>
  --force`), `"edit:<another picture of the scene>"` remakes it from that one. The scene manifest keeps its plan and
  gets a `note`; the new original's sidecar holds the exact prompt and references.
- `textcheck.swift`: macOS's text recognizer (Vision) over the originals: prints every picture where it reads
  letters or digits, and where. It reads Maple Harbor's menus and signs; a clean result is still no substitute for
  looking (it misses squiggles that look like writing), and a pattern can raise a false alarm.

### The ledger

`<work>/ledger.jsonl`, one JSON line per request: time, id, endpoint, model, size, quality, the number of
references, batch or not, status (ok, error, no-response), HTTP status and error code, the request id, the `usage`,
the tokens (text in, image in, image out), the estimate and the **cost** (from the usage at Standard or Batch
prices), and the running totals (`total_usd` spent, `committed_usd` with open batch reservations). A request with no
response counts its estimate (it may have been billed). Batches add `reserve` and `release` lines. **Before every
request the scripts check committed + in flight + this request's estimate ≤ $75**, and refuse otherwise; the stop can
be lowered (`--stop`) but not raised. The estimate takes the largest image-input count measured so far per reference
(+10%).

## 8. The wiring (done 4 Nov 2026)

How the Spanish scene files and pictures plug into the game; the English edition is unchanged (same URLs, same
files, same checks):

1. **The folder.** `src/ui/scene-files.ts` exports `SCENE_DIR = "scenes"` next to `SCENE_FILES`, and
   `src/ui/scenes.ts` builds picture URLs as `` `${BASE_URL}${SCENE_DIR}/${stem}.webp` ``. The Spanish
   `src/editions/es/ui/scene-files.ts` exports `SCENE_DIR = "scenes-es"` and globs its own `./scene-data/*.json`.
2. **The files.** Scene files: `src/editions/es/ui/scene-data/<situation id>.json` (Spanish situation ids,
   `s84-date@sam` / `s84-date@emma` for the per-person date), written by `scene_file.py --write` from the manifests.
   Pictures: `public/scenes-es/<situation id>/<name>.webp` (`@` → `-`). The JSON fields are the English ones (`npc`,
   `images`, `start`, `done`, `sticky`, `phases`, `focus`), without `jobs` (OpenAI has no job ids; the sidecars hold
   the request ids).
3. **The check.** `tools/scene-walk.ts` reads `src/editions/es/ui/scene-data` and `public/scenes-es` when the
   edition is Spanish (`EDITION.id`, through the hook):
   `EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/scene-walk.ts [scene …]`.
4. **The builds.** A small plugin in vite.config.ts (`editionPictures`) removes the other edition's pictures from
   the build output: the English build drops `scenes-es/`, the Spanish one `scenes/` and `scenes-es/ref/` (the
   references are inputs for making pictures, not game assets).
5. **The interface** needs nothing new: Settings → illustrated scenes, the crossfade and the call screen work from
   the scene files.

## 9. For the owner

- Nothing is needed for the pictures to go on: the key works (no verification step was asked for).
- The ledger and the full-size originals live in the work folder, `~/puerto-colibri-pictures/` (2 GB; the scripts'
  default since the 5 Nov audit). The first copy in the session's scratch folder (`/private/tmp/…/scratchpad/pictures/`)
  stopped at $40.59 and a restart of the Mac can clear it; don't run the scripts against it.
- **Weight:** since the 5 Nov audit the situation pictures are WebP quality 65: 133 kB on average (Maple Harbor's
  85 kB: their fine grain compresses less well), 76.8 MB for the 579 (quality 80: 103.7 MB, 179 kB on average), plus
  13 MB of references, which no build ships (still quality 80). A scene loads its 9–14 pictures, about 1.5 MB. Quality
  65 was compared with 80 side by side on 20 varied pictures (faces, name tags, a chalkboard, skies, night and dusk)
  at the desktop backdrop's size (1440 × 900 at 2×: the picture enlarged 1.56 times) and on a phone (375 × 812 at
  3×): no visible difference; measured, PSNR against the original 36.5 → 34.9 dB on average, and flat areas keep
  77% of the original's grain against 82%. 1600 px wide would save more (scene-walk accepts 1600–2048).
- To compare the spending with OpenAI's own count: the dashboard's Usage page, against `python3 tools/es-pictures/ledger.py`.
