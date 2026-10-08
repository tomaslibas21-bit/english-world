# Illustrated conversation scenes

During a conversation, the game can show a still illustration of the place with the person in it, behind the conversation panel, instead of the 3D view. There is **one picture per phase** of the conversation: the person does what that moment is about, like holding up three cup sizes or handing over the key cards. The picture changes as they start asking the next question, and a "done" picture can show once the task is complete. Changes are a soft crossfade, and a very slow zoom keeps the picture alive. A phone or video call shows the other person at their end of the line; a call without a scene file keeps the plain call screen.

## Files

| What | Where |
|---|---|
| Pictures | `public/scenes/<scene>/<name>.webp`, 2048 × 1143 px (16:9), WebP quality 80, about 50–130 KB each |
| Scene file (which picture for which moment) | `src/ui/scene-data/<scene>.json` |
| Loader | `src/ui/scenes.ts` (reads every scene file) |
| Display | `src/ui/SceneBackdrop.tsx`; styles at the end of `src/ui/styles.css` |
| Check | `npx tsx tools/scene-walk.ts [scene …]` |

- **Scene names.** `<scene>` is the situation id, e.g. `s72-cafe`. When the person depends on the player (the date, Emma or Sam), there is one scene per person: `s84-date@emma.json` with pictures in `public/scenes/s84-date-emma/` (`@` becomes `-` in the folder name).
- **Settings.** `Settings → Iliustruotos scenos` turns the pictures off. While a picture is shown, the 3D view is not rendered, which saves battery.

### Scene file

```json
{
  "npc": "Mia, barista",
  "images": ["greet", "size", "milk", "temp", "food", "dine", "name", "pay", "done"],
  "start": "greet",
  "done": "done",
  "phases": { "order": "greet", "size": "size", "milk": "milk", "whole_ok": "milk", "closing": "done" },
  "focus": [36, 28],
  "jobs": { "greet": "95c11b0e-5304-47b6-afd9-3b649609a6d2" }
}
```

- **`phases`:** maps an id to a picture. The id is the id of the pending question or of the step when the person starts talking (`conv.pending?.id ?? conv.effectiveStep()?.id`, set in `src/game/session.ts`). `howareyou` is the shared small-talk question. `closing` is the goodbye: the "anything else?" question, and also the last turn whenever the conversation ends.
- **Unlisted ids** keep the current picture.
- **`done`** (optional): shown after the task is complete, for moments without their own picture.
- **`sticky`** (optional): pictures that stay for the rest of the conversation once shown. The small talk (s33) uses it for the rain: once it starts raining, no dry picture comes back.
- **`focus`:** where the person's face is, in % of the picture, so narrow screens crop around it.
- **`jobs`:** the Higgsfield job id of each picture, so it can be edited later.

**Which picture shows:** a sticky picture that is already showing; else that id's picture; else, once the task is complete, `done`; else the current picture; else `start`. Every new conversation starts fresh, even in the same situation.

`tools/scene-walk.ts` runs every simulated conversation of the situation with 12 seeds. It prints the picture at each moment, how often each picture is shown, and the ids that have no picture of their own. It also checks each picture file: that it exists and is a complete WebP picture, about 2048 px wide and 16:9, and under about 200 KB. It warns about files in the folder that the game doesn't use, such as a leftover `.jpg`.

## Style (reuse word for word)

**Style reference image:** job `c73d8f0e-65cb-4283-bc58-0190de0afb51`, the Sunny Cup café that set the look. Pass it as `medias: [{ "value": "c73d8f0e-65cb-4283-bc58-0190de0afb51", "role": "image_references" }]` when making the first picture of a new place.

**Opening of every first-picture prompt:**

> Use the reference image ONLY as a style reference: match its clean, modern semi-flat illustration style exactly (simple confident shapes, minimal soft shading, fine grain texture, warm natural daylight, slightly muted palette with deep teal and warm orange accents and creamy whites), its level of detail and its framing (person slightly left of center, waist up, facing the viewer, right third calm). Do not copy its content.

**Framing:** eye-level first-person view from the learner's side (across the counter, desk or table, or from the back seat of a taxi). The person is about one third from the left edge, waist up, facing the viewer, with their head in the upper half. The right third stays calm, because on computers the conversation panel covers it.

**People:** look them up in `src/content/npcs.ts`: skin tone, hair style and colour, clothes colours and accessories. They are grown-ups with friendly, natural expressions, and each person looks the same in every picture.

## Workflow

Model: Higgsfield `nano_banana_pro` (Nano Banana Pro), `aspect_ratio: "16:9"`, `resolution: "2k"`, `use_unlim: false`. It costs **2 credits per picture**, including pictures that get redone.

1. **First picture of the place.** Pass the style reference. Describe the place and the person as above, and the gesture for the first moment. Add any text word for word:
   > …with EXACTLY this text and nothing else: …

   End with:
   > No other text anywhere in the image; name badges and screens stay blank.

   Check it carefully before going on, because every other picture is an edit of it.
2. **Every other phase.** Pass the first picture's job id as the reference (`role: "image_references"`). Use this prompt:
   > Edit the reference image. Keep EVERYTHING else exactly the same: the same scene, illustration style, colors, lighting, framing, camera position, background, [the sign/menu with its exact text], and [his/her] face, hair and clothes. Change only [his/her] hands, pose and expression: … No new text anywhere.

   Any new prop with text is named with its exact label. Submit a situation's phases together with `generate_image_batch` (up to 12), then poll with `jobs_wait`.
3. **A second place in the same situation** (the restaurant's host stand and table, the dinner's front door and dining table): make a new first picture with the style reference, and describe the same person with the same clothes.
4. **Check every picture.** Download the PNG from `result_url`. Look at it whole, then crop every piece of text at full size and read it letter by letter. Check:
   - hands: five fingers, holding things naturally
   - that the face, hair and clothes match the first picture
   - that nothing moved in the room
   - that there is no extra text, watermark or logo
   - that the right third is calm

   Redo anything wrong by editing from the same reference with a clearer prompt.
5. **Save** as WebP, 2048 px wide, quality 80 (`sips` can't write WebP, so this uses Python's Pillow):

   ```bash
   python3 -c "import sys; from PIL import Image; im = Image.open(sys.argv[1]).convert('RGB'); im.thumbnail((2048, 2048), Image.LANCZOS); im.save(sys.argv[2], quality=80, method=6)" in.png public/scenes/<scene>/<name>.webp
   ```
6. **Map.** Write `src/ui/scene-data/<scene>.json` and run `npx tsx tools/scene-walk.ts <scene>` until there are 0 errors. Every picture should be shown in the simulated conversations, and every important id should have a picture.

## Text in pictures

- Only text that we specify word for word, and that matches the game: prices, times, flight and bus numbers, and names from the situation file. No invented slogans.
- Short labels work best: a menu, a sign, a price card, a screen. Anything that changes during the conversation stays out of the picture or stays generic, like a total price or the player's name.
- No real brands or logos. Use generic signs like "POST OFFICE" or "PHARMACY", and the game's own fictional names ("Sunny Cup", "Harborview Hotel", "Threads").

## Status

**The first 41 situations have pictures:** 265 pictures in 42 scenes, for every face-to-face situation and the 5 phone and video calls. The date has two scenes, one for Emma and one for Sam. The six advanced conversations P25–P30 (8 Oct 2026) wait for theirs: 32 pictures, briefed with ready scene files in `docs/PICTURES-WANTED.md`.

| Scene | Person | Pictures | Names |
|---|---|---|---|
| s31-doctor | Dr. Carter | 8 | greet · listen · sleeve · breath · ah · hurt · rx · bye |
| s32-supermarket | Marcus, the self-checkout | 8 | greet · rewards · price · bags · pay · receipt · id · sco |
| s33-small-talk | Frank | 6 | greet · weather · chat · rain · late · bye (rain is sticky) |
| s34-meeting | Kate, Paul, Sara on the screen | 6 | mute · update · clarify · opinion · owner · wrap |
| s35-gym | Jordan | 12 | welcome · form · lockers · warmup · machine · sets · rep · spot · breath · careful · stretch · next |
| s62-visitor-center | Chuck | 5 | greet · map · route · cafe · bye |
| s63-party | Sophie | 7 | welcome · drink · chat · me · ask · numbers · bye |
| s64a-checkin | Kevin | 6 | greet · passport · bags · overweight · seat · bp |
| s64b-security | Officer Grant | 6 | docs · divest · walk · alarm · bottle · done |
| s64c-gate | Nina | 5 | greet · check · seat · announce · scan |
| s65a-passport | Officer Diaz | 7 | passport · purpose · stay · declare · fingers · photo · welcome |
| s65b-baggage | Priya | 6 | greet · tag · describe · delivery · kit · ref |
| s66-taxi | Vinnie | 6 | stand · ride · radio · traffic · stop · pay |
| s67a-tickets | Walter | 7 | greet · trip · class · pay · ticket · late · track |
| s67b-bus | Denise | 5 | greet · fare · seat · cord · stop |
| s68-hotel | Olivia | 7 | welcome · computer · id · sign · keys · sorry · checkout |
| s69-local | Rosa | 5 | greet · food · from · point · bye |
| s70-museum | Ben | 6 | greet · id · guide · pay · exhibit · harold |
| s71a-rental | Jake | 7 | greet · size · license · insurance · card · sign · keys |
| s71b-gas | Dot | 5 | greet · outoforder · pay · receipt · trouble |
| s72-cafe | Mia | 9 | greet · size · milk · temp · food · dine · name · pay · done |
| s73-restaurant | Lucia | 8 | host · greet · order · serve · wrong · dessert · check · tip |
| s74-clothes | Chloe | 7 | greet · size · color · tryon · fit · pay · return |
| s75-pharmacy | Mr. Okafor | 6 | greet · questions · recommend · dosage · rx · pay |
| s76-dentist-call | Linda (phone) | 5 | greet · sorry · details · hold · slot |
| s77-salon | Jessie | 7 | welcome · drink · consult · wash · chat · reveal · pay |
| s78-bank | Aaron | 6 | greet · card · id · form · cash · app |
| s79-post | Gloria | 6 | greet · scale · service · customs · pickup · pay |
| s80-support-call | NetWave menu, Claire (phone) | 5 | menu · hello · problem · router · technician |
| s81-apartment | Mr. Patel | 6 | hello · tour · questions · decision · lease · keys |
| s82-neighbor | Rita | 6 | hello · package · chat · trash · needs · coffee |
| s83-invite-call | Lizzie (phone) | 5 | hello · excited · plan · sister · bye |
| s84-date@emma | Emma | 6 | greet · drinks · talk · check · cold · again |
| s84-date@sam | Sam | 6 | greet · drinks · talk · check · cold · again |
| s85-dinner | Dan | 7 | door · coat · drink · dinner · cat · burnt · dessert |
| s86-old-friend | Lucy | 5 | surprise · chat · news · hurry · numbers |
| s87-interview | Ms. Brooks | 7 | greet · call · about · why · strengths · salary · questions |
| s88-first-day | Maria | 6 | hello · desk · tour · coffee · task · lunch |
| s89-video-call | Kate, Paul and Sara (video) | 6 | grid · camera · mute · screen · freeze · bye |
| s90-running-late | Mr. Harris (phone) | 4 | hello · concerned · watch · okay |
| s91a-lost-wallet | Mrs. Lee | 5 | greet · worried · police · found · bye |
| s91b-police | Officer Reyes | 7 | greet · notes · describe · contents · name · report · found |

- **Pilot (25 Sep 2026):** the café, hotel and check-in. It used 16 credits for the style test and 48 for the 22 pictures.
- **Rollout (25 Sep 2026):** the other 28 situations, made by five helpers in parallel from docs/SCENE-ART.md. They used 398 credits for 172 kept pictures, about 17% of them redos. Another 10 credits went on 5 fixes: a dish-free "here's your meal" in the restaurant, Walter's delay apology, Diaz typing, Ms. Brooks taking a call, and Rita's parcel.
- **Calls and extras (27 Sep 2026):** ChatGPT, connected to the GitHub repository, made the 25 call pictures and 6 extras from [`PICTURES-WANTED.md`](PICTURES-WANTED.md) and pushed them straight to `main`: Jessie's drink offer, Officer Reyes's "someone turned it in", and four garment-neutral pictures for the clothes shop. They were checked for style, text and `tools/scene-walk.ts`. Calls use the same scene files as face-to-face conversations; the picture shows the person at their end of the line.
- **WebP (26 Sep 2026):** all 198 pictures were converted from the JPEGs to WebP quality 80 at the same size, which took them from 68 MB to 16 MB. Side-by-side crops showed the text on the café menu, the departure boards and the museum price board as sharp as before. Only the faint paper grain in plain areas is a little smoother when zoomed in.
- **Job ids:** every picture's job id is in its scene file (`jobs`), so it can be edited later.
- **Known compromises:**
  - A rare branch shares a picture: a burger order gets the "wrong dish" burger.
  - A few people are framed full-length rather than waist up: Rita, Mr. Patel, and Vinnie at the taxi stand.

**Style fix (30 Sep 2026):** the owner noticed that some café pictures were more painterly than the rest. Face close-ups of all 265 pictures, scene by scene, showed the café's greet, size and milk as the only clear outliers (softer shading and a longer face; the other six café pictures and the rest of the game are the flatter look). They were redrawn by editing the café's `done` picture (uploaded as the reference) with the pose prompt above, 6 jobs (about 12 credits): greet took four tries, because the model kept putting her waving hand over the menu prices, so the new greet has both hands on the counter. Other differences seen in close-ups were only pose, expression or framing.

**Songs 31–35 (28 Sep 2026):** ChatGPT made the 40 pictures of s31–s35 from [`PICTURES-WANTED.md`](PICTURES-WANTED.md), one commit per scene. They were checked for style, the people's looks, the text (the lane number, the self-checkout screen and the gym's price board) and `tools/scene-walk.ts`. One compromise: the bus stop (s33) has a sunny sky, although the brief asked for a soft, partly cloudy one that fits every weather Frank talks about.
