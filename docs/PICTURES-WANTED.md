# Pictures wanted: brief for an image assistant

**English World** is a browser game for Lithuanian adults practising spoken American English.
- Live game: https://tomaslibas21-bit.github.io/english-world/
- Code: https://github.com/tomaslibas21-bit/english-world

During a conversation, the game shows **one illustrated picture per phase** of the conversation, behind the conversation panel. 198 pictures exist for the 31 face-to-face conversations. This brief lists the pictures still wanted, mainly the **5 phone and video calls**. The game already supports call pictures: adding the files below is enough, with no code changes.

## Where to look

- **The existing pictures, in the style to match:** [`public/scenes/`](https://github.com/tomaslibas21-bit/english-world/tree/main/public/scenes). The best style references are:
  - [`s72-cafe/greet.webp`](https://github.com/tomaslibas21-bit/english-world/blob/main/public/scenes/s72-cafe/greet.webp)
  - [`s68-hotel/welcome.webp`](https://github.com/tomaslibas21-bit/english-world/blob/main/public/scenes/s68-hotel/welcome.webp)
  - [`s64a-checkin/greet.webp`](https://github.com/tomaslibas21-bit/english-world/blob/main/public/scenes/s64a-checkin/greet.webp)
  - [`s88-first-day/hello.webp`](https://github.com/tomaslibas21-bit/english-world/blob/main/public/scenes/s88-first-day/hello.webp) (an office)
  - [`s86-old-friend/surprise.webp`](https://github.com/tomaslibas21-bit/english-world/blob/main/public/scenes/s86-old-friend/surprise.webp) (outdoors)
- **The full art guide:** [`docs/SCENE-ART.md`](SCENE-ART.md), with the style, framing, text rules and file format.
- **Each person's look:** [`src/content/npcs.ts`](../src/content/npcs.ts): skin tone, hair style and colour, clothes colours, accessories.
- **The conversations:** [`src/content/situations/<id>.ts`](../src/content/situations/), with what each person says.
- **The scene files** (which picture shows at which moment): [`src/ui/scene-data/`](../src/ui/scene-data/).

## Style (must match the existing pictures)

> Clean, modern semi-flat illustration for an adult language-learning app, in the style of a premium travel or wellness app: simple confident shapes, minimal soft shading, fine grain texture, warm natural daylight, harmonious slightly muted palette with deep teal and warm orange accents and creamy whites. Grown-up and elegant, not childish, not cartoonish. The background is simplified and a little soft so attention stays on the person.

- **Framing:** eye level. The person is about **one third from the left edge**, waist up, facing the viewer, with their head in the upper half. **Keep the right third calm**, because the conversation panel covers it on computers.
- **One scene, one set-up:** every picture of a scene has the same room, the same person, the same clothes and the same camera. Only the pose, gesture, expression and props change. Make the first picture, then edit it for the others.
- **Text:** none, except text given below word for word. No logos or brands. Screens, badges and papers stay blank or show simple shapes. American spelling.
- **People:** grown-ups with friendly, natural expressions and natural hands (five fingers).

## Files

- **Pictures:** `public/scenes/<scene>/<name>.webp`
  - 2048 px wide, 16:9 (2048×1152; about 1143 high is fine too)
  - WebP, quality about 80, under 250 KB each
  - lower-case names
- **Scene file:** `src/ui/scene-data/<scene>.json`. It is given below for each new scene, ready to use. Optionally add `"jobs": { "<name>": "<generation id>" }` for later edits.
- **Check:** if you can run code, `npx tsx tools/scene-walk.ts <scene>` must report 0 errors, and `npm test` and `npm run build` must pass.
- **Push straight to `main`.** No one is using the game yet, so no pull request is needed.
  - Every push publishes the live site in about a minute (GitHub Actions, "Deploy to GitHub Pages"). If a build fails, the previous version stays online.
  - Commit one scene at a time: its pictures and its scene file together, so that a scene file never points to pictures that aren't there yet.
  - After pushing, check the scene in the live game: https://tomaslibas21-bit.github.io/english-world/ → "Visos situacijos" → the call.

## A. The five calls (25 pictures)

A phone call shows the **other person at their end of the line**, talking on the phone or a headset. The video call shows the meeting **on the learner's laptop screen**.

### s76-dentist-call: Linda, dental office reception

- **Linda:** a woman with fair skin, a brown chin-length bob and glasses, wearing a light teal top and a phone headset.
- **Place:** the front desk of a small, bright dental office. On the wall behind her is a sign with exactly the text **GREEN STREET DENTAL**.

| Picture | Shows | Moments |
|---|---|---|
| `greet` | Answering the call with a warm smile, one hand on the headset microphone | help, help_move, reason, hear, more, closing |
| `sorry` | Sympathetic: eyebrows raised, hand on chest ("Oh no, I'm sorry to hear that") | pain_len |
| `details` | Typing at her computer while listening | new_pt, name, surname, spell, dob, phone, insurance |
| `hold` | One finger raised, "one moment, please", glancing at her screen | hold |
| `slot` | Looking at an open appointment book with blank lines, pen ready | slot |

```json
{
  "npc": "Linda, dental office reception (phone call)",
  "images": ["greet", "sorry", "details", "hold", "slot"],
  "start": "greet",
  "phases": {
    "help": "greet", "help_move": "greet", "reason": "greet", "hear": "greet", "more": "greet", "closing": "greet",
    "pain_len": "sorry",
    "new_pt": "details", "name": "details", "surname": "details", "spell": "details", "dob": "details", "phone": "details", "insurance": "details",
    "hold": "hold",
    "slot": "slot"
  },
  "focus": [34, 30]
}
```

### s80-support-call: the NetWave phone menu, then Claire, customer service

- **Claire:** a woman with tan skin and a chestnut ponytail, wearing a purple top and a headset.
- **Place:** a calm, modern customer-service desk with a monitor. The first picture is different: it shows the learner's own phone on a kitchen table.

| Picture | Shows | Moments |
|---|---|---|
| `menu` | A smartphone on a kitchen table during a call. The screen shows only the name **NetWave** (exactly) and a simple sound-wave. Beside it is a Wi-Fi router with one red light. | menu |
| `hello` | Claire at her desk, friendly greeting | name, account, someone |
| `problem` | Claire listening with concern while typing | problem, problem_bill, since |
| `router` | Claire holding up a small Wi-Fi router (no text on it), pointing at its lights | lights, restart, restart_now, still_red |
| `technician` | Claire smiling, pointing at a desk calendar (no text) | tech, more, closing |

```json
{
  "npc": "Claire, NetWave customer service (phone call)",
  "images": ["menu", "hello", "problem", "router", "technician"],
  "start": "menu",
  "phases": {
    "menu": "menu",
    "name": "hello", "account": "hello", "someone": "hello",
    "problem": "problem", "problem_bill": "problem", "since": "problem",
    "lights": "router", "restart": "router", "restart_now": "router", "still_red": "router",
    "tech": "technician", "more": "technician", "closing": "technician"
  },
  "focus": [34, 30]
}
```

### s83-invite-call: Lizzie, your friend

- **Lizzie:** a woman with light skin and a red ponytail, wearing a green top and blue jeans.
- **Place:** her cozy living room at home. She is talking on her smartphone.

| Picture | Shows | Moments |
|---|---|---|
| `hello` | On the phone, happy to hear from you | hello, howareyou, invite, bad_line |
| `excited` | Thrilled, free hand raised in a "yes!" | day, band, start, other_day |
| `plan` | Thinking, writing on a sticky note (no text) | place, meet_time, suggest_place, suggest_time |
| `sister` | A hopeful, asking face | sister, pay, bbq |
| `bye` | Waving goodbye, phone at her ear | closing |

```json
{
  "npc": "Lizzie, your friend (phone call)",
  "images": ["hello", "excited", "plan", "sister", "bye"],
  "start": "hello",
  "phases": {
    "hello": "hello", "howareyou": "hello", "invite": "hello", "bad_line": "hello",
    "day": "excited", "band": "excited", "start": "excited", "other_day": "excited",
    "place": "plan", "meet_time": "plan", "suggest_place": "plan", "suggest_time": "plan",
    "sister": "sister", "pay": "sister", "bbq": "sister",
    "closing": "bye"
  },
  "focus": [34, 30]
}
```

### s89-video-call: team meeting with Kate, Paul and Sara

- **The view:** a laptop screen fills most of the picture. It shows a video meeting in a generic app, with no brand and no names or text on the tiles. **Kate** has a large tile on the left, **Paul** and **Sara** smaller tiles, and the learner's own small self-view tile is dark with a camera-off icon.
- **Kate** (team lead): fair skin, blonde ponytail, blue top, headset.
- **Paul:** tan skin, short brown hair, glasses, a beard, brown top.
- **Sara:** brown skin, curly black hair, raspberry top.

| Picture | Shows | Moments |
|---|---|---|
| `grid` | Kate talking with a friendly smile, the others listening | hear, hear2, weekend, cat, first, goahead, questions, anything_else, next_week |
| `camera` | Kate pointing at the learner's dark self-view tile ("your camera's off") | camera, cam_still |
| `mute` | Paul talking, with a red crossed-out microphone icon on his tile; Kate signalling "you're muted" | mute, paul_hear |
| `screen` | Kate sharing her screen: a simple bar-chart slide (no text) fills the main area, with the faces small at the side | screen, update, send_q |
| `freeze` | Sara's tile frozen and blurry; Kate and Paul look puzzled | freeze, freeze_q, echo |
| `bye` | Everyone waving goodbye | paul_leave, closing |

```json
{
  "npc": "Kate, Paul and Sara (video call)",
  "images": ["grid", "camera", "mute", "screen", "freeze", "bye"],
  "start": "grid",
  "phases": {
    "hear": "grid", "hear2": "grid", "weekend": "grid", "cat": "grid", "first": "grid", "goahead": "grid", "questions": "grid", "anything_else": "grid", "next_week": "grid",
    "camera": "camera", "cam_still": "camera",
    "mute": "mute", "paul_hear": "mute",
    "screen": "screen", "update": "screen", "send_q": "screen",
    "freeze": "freeze", "freeze_q": "freeze", "echo": "freeze",
    "paul_leave": "bye", "closing": "bye"
  },
  "focus": [32, 34]
}
```

### s90-running-late: Mr. Harris, your boss

- **Mr. Harris:** a man with light skin, grey side-parted hair and glasses, wearing a light grey shirt and a dark red tie.
- **Place:** his office, at a desk with a laptop. He is talking on his phone.

| Picture | Shows | Moments |
|---|---|---|
| `hello` | Answering the phone at his desk | opening, who |
| `concerned` | "What happened?": a concerned face | late, reason |
| `watch` | Checking his wristwatch while on the phone | eta, plan_q, room, need_help |
| `okay` | Relaxed, with a reassuring smile ("See you soon") | plan, closing |

```json
{
  "npc": "Mr. Harris, your boss (phone call)",
  "images": ["hello", "concerned", "watch", "okay"],
  "start": "hello",
  "phases": {
    "opening": "hello", "who": "hello",
    "reason": "concerned", "late": "concerned",
    "eta": "watch", "plan_q": "watch", "room": "watch", "need_help": "watch",
    "plan": "okay", "closing": "okay"
  },
  "focus": [34, 30]
}
```

## B. A few extra pictures for existing scenes (6, optional)

Edit the existing picture of the scene, so that everything else stays exactly the same. Then update that scene's file in `src/ui/scene-data/`.

- **s74-clothes (Chloe).** Four pictures show yellow jackets, but learners also shop for shoes, jeans, sweaters and dresses. Replace them with versions that don't show one kind of garment:
  - `size.webp`: a tape measure around her neck, open hand, "What size?"
  - `color.webp`: gesturing at a wall of neatly folded clothes in many colours
  - `tryon.webp`: pointing to the fitting rooms, hands empty
  - `return.webp`: a receipt in her hand, a shopping bag on the counter

  File names and mapping stay the same.
- **s91b-police (Officer Reyes):** a new `found.webp`. He smiles, holding the desk phone's receiver aside: "Good news! Someone turned it in." Add `"found"` to `images`, and change the phase `"found": "greet"` to `"found": "found"`.
- **s77-salon (Jessie):** a new `drink.webp`. She offers a cup of coffee and a glass of water. Add `"drink"` to `images`, and change `"drink": "welcome"` to `"drink": "drink"`.
