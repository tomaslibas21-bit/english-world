# Pictures wanted: brief for an image assistant

**English World** is a browser game for Lithuanian adults practising spoken American English.
- Live game: https://tomaslibas21-bit.github.io/english-world/
- Code: https://github.com/tomaslibas21-bit/english-world

During a conversation, the game shows **one illustrated picture per phase** of the conversation, behind the conversation panel.

**Status (28 Sep 2026): nothing is wanted right now.** All 41 conversations have their pictures (265 in total). The 40 pictures for songs 31–35 below were made by ChatGPT from this brief. The sections stay as a record and as a template for the next brief: a new conversation gets a section like these, with a ready scene file.

## Where to look

- **The existing pictures, in the style to match:** [`public/scenes/`](https://github.com/tomaslibas21-bit/english-world/tree/main/public/scenes). The best style references are:
  - [`s72-cafe/greet.webp`](https://github.com/tomaslibas21-bit/english-world/blob/main/public/scenes/s72-cafe/greet.webp) (a counter)
  - [`s75-pharmacy/greet.webp`](https://github.com/tomaslibas21-bit/english-world/blob/main/public/scenes/s75-pharmacy/greet.webp) (health care)
  - [`s88-first-day/hello.webp`](https://github.com/tomaslibas21-bit/english-world/blob/main/public/scenes/s88-first-day/hello.webp) (the Brightline office, with its glass-walled meeting room on the left)
  - [`s89-video-call/grid.webp`](https://github.com/tomaslibas21-bit/english-world/blob/main/public/scenes/s89-video-call/grid.webp) (Kate, Paul and Sara, who are also in the meeting below)
  - [`s82-neighbor/hello.webp`](https://github.com/tomaslibas21-bit/english-world/blob/main/public/scenes/s82-neighbor/hello.webp) (outdoors in the residential part of town)
- **The full art guide:** [`docs/SCENE-ART.md`](SCENE-ART.md), with the style, framing, text rules and file format.
- **Each person's look:** [`src/content/npcs.ts`](../src/content/npcs.ts): skin tone, hair style and colour, clothes colours, accessories. The descriptions below already say it in words.
- **The conversations:** [`src/content/situations/<id>.ts`](../src/content/situations/), with what each person says.
- **The scene files** (which picture shows at which moment): [`src/ui/scene-data/`](../src/ui/scene-data/).

## Style (must match the existing pictures)

> Clean, modern semi-flat illustration for an adult language-learning app, in the style of a premium travel or wellness app: simple confident shapes, minimal soft shading, fine grain texture, warm natural daylight, harmonious slightly muted palette with deep teal and warm orange accents and creamy whites. Grown-up and elegant, not childish, not cartoonish. The background is simplified and a little soft so attention stays on the person.

- **Framing:** eye level, seen from the learner's side (across the desk, the counter or the table). The person is about **one third from the left edge**, waist up, facing the viewer, with their head in the upper half. **Keep the right third calm**, because the conversation panel covers it on computers.
- **One scene, one set-up:** every picture of a scene has the same room, the same person, the same clothes and the same camera. Only the pose, gesture, expression and props change. Make the first picture, then edit it for the others. Where a scene has a second set-up (the self-checkout, the gym floor), make its first picture the same way, with the same person and clothes.
- **Text:** none, except text given below word for word. No logos or brands. Screens, badges and papers stay blank or show simple shapes. American spelling.
- **People:** grown-ups with friendly, natural expressions and natural hands (five fingers).

## Files

- **Pictures:** `public/scenes/<scene>/<name>.webp`
  - 2048 px wide, 16:9 (2048×1152; about 1143 high is fine too)
  - WebP, quality about 80, under 250 KB each
  - lower-case names
- **Scene file:** `src/ui/scene-data/<scene>.json`. It is given below for each scene, ready to use. Optionally add `"jobs": { "<name>": "<generation id>" }` for later edits.
- **Check:** if you can run code, `npx tsx tools/scene-walk.ts <scene>` must report 0 errors, and `npm test` and `npm run build` must pass.
- **Push straight to `main`.** No one is using the game yet, so no pull request is needed.
  - Every push publishes the live site in about a minute (GitHub Actions, "Deploy to GitHub Pages"). If a build fails, the previous version stays online.
  - Commit one scene at a time: its pictures and its scene file together, so that a scene file never points to pictures that aren't there yet.
  - Commit as `tomaslibas21-bit <299487494+tomaslibas21-bit@users.noreply.github.com>` (set `git config user.name` and `user.email` in your copy of the repository), so that no personal name or email address appears in the public history.
  - After pushing, check the scene in the live game: https://tomaslibas21-bit.github.io/english-world/ → "Visos situacijos" → the conversation.

## Done: the five conversations of songs 31–35 (40 pictures, 28 Sep 2026)

### s31-doctor: Dr. Carter, family doctor (8 pictures)

- **Dr. Carter:** a woman with brown skin and black hair in a neat bun, wearing glasses, a white doctor's coat over a navy top, navy trousers and a blank name badge, with a stethoscope around her neck. Calm and kind.
- **Place:** a bright exam room at Harbor Family Clinic: an exam table covered with white paper, a small desk with a computer, a blood-pressure cuff on the wall, cabinets and a window with daylight. No text anywhere.

| Picture | Shows | Moments |
|---|---|---|
| `greet` | Standing by the desk with a tablet, a warm, welcoming smile ("How are you feeling today?") | dob, feeling, problem |
| `listen` | Sitting on her rolling stool, leaning forward a little, listening with concern and typing notes on the tablet | sick_q, more_sym, howlong, scale, fever, meds, meds_what |
| `sleeve` | Holding up a blood-pressure cuff with both hands ("Could you roll up your sleeve?") | sleeve |
| `breath` | The stethoscope in her ears, holding its chest piece out toward the viewer and breathing in herself to show how ("Take a deep breath") | exam, breath |
| `ah` | Holding a wooden tongue depressor and a small penlight, her own mouth open in a demonstrating "ah" | ah |
| `hurt` | Reaching gently toward the viewer with her fingertips, a caring, questioning look ("Does it hurt here?") | hurt |
| `rx` | Back at the desk, writing on a prescription pad (lines only, no readable text), glancing up as she explains | allergy, chart, allergy_which, rx, rx_q, pharmacy, note |
| `bye` | Standing, handing over a folded prescription (no readable text) with a warm smile ("Feel better soon!") | questions, closing |

```json
{
  "npc": "Dr. Carter, family doctor",
  "images": ["greet", "listen", "sleeve", "breath", "ah", "hurt", "rx", "bye"],
  "start": "greet",
  "phases": {
    "dob": "greet", "feeling": "greet", "problem": "greet",
    "sick_q": "listen", "more_sym": "listen", "howlong": "listen", "scale": "listen", "fever": "listen", "meds": "listen", "meds_what": "listen",
    "sleeve": "sleeve",
    "exam": "breath", "breath": "breath",
    "ah": "ah",
    "hurt": "hurt",
    "allergy": "rx", "chart": "rx", "allergy_which": "rx", "rx": "rx", "rx_q": "rx", "pharmacy": "rx", "note": "rx",
    "questions": "bye", "closing": "bye"
  },
  "focus": [34, 30]
}
```

### s32-supermarket: Marcus, cashier, and the self-checkout (8 pictures)

- **Marcus:** a man with dark skin and a short black buzz cut, wearing a green shirt under a darker green apron, a blank name badge and charcoal trousers. Cheerful and quick.
- **Place:** checkout lane 4 at Harbor Market, a bright neighborhood supermarket: a conveyor belt with groceries (eggs, bread, apples and a bag of chips, all without brands), a card reader on a small stand, paper and plastic bags. Above the lane, a small lane sign with exactly the number **4**.
- **Second set-up (`sco`):** the self-checkout area of the same store.

| Picture | Shows | Moments |
|---|---|---|
| `greet` | Scanning an item with a friendly smile ("Did you find everything okay?") | find, missing, howareyou |
| `rewards` | Holding up a plain green loyalty card (no text) with an asking look | rewards, join, phone |
| `price` | The register phone at his ear, holding up the bag of chips in his other hand ("Price check on register four") | price, second |
| `bags` | Holding up a paper bag in one hand and a plastic bag in the other ("Paper or plastic?") | bags, bag_kind |
| `pay` | Gesturing with an open hand toward the card reader ("Cash or card?") | pay, cash, debit, cashback, cb_amount, charge |
| `receipt` | Handing over a receipt (no readable text) with a big smile | receipt, closing |
| `id` | Holding a bottle of red wine (plain label, no text), his other hand held out politely ("Can I see your ID?") | id |
| `sco` | The self-checkout: its screen shows exactly **Unexpected item in the bagging area** with a simple warning triangle, and a paper bag sits on the bagging scale. Marcus walks up with a raised hand and a helpful smile. | sco, sco_explain |

```json
{
  "npc": "Marcus, cashier (and the self-checkout)",
  "images": ["greet", "rewards", "price", "bags", "pay", "receipt", "id", "sco"],
  "start": "greet",
  "phases": {
    "find": "greet", "missing": "greet", "howareyou": "greet",
    "rewards": "rewards", "join": "rewards", "phone": "rewards",
    "price": "price", "second": "price",
    "bags": "bags", "bag_kind": "bags",
    "pay": "pay", "cash": "pay", "debit": "pay", "cashback": "pay", "cb_amount": "pay", "charge": "pay",
    "receipt": "receipt", "closing": "receipt",
    "id": "id",
    "sco": "sco", "sco_explain": "sco"
  },
  "focus": [34, 30]
}
```

### s33-small-talk: Frank, your neighbor (6 pictures)

- **Frank:** a retired man with light skin, short white hair and glasses, wearing a brown flat cap, a light olive-green jacket and charcoal trousers, a little heavy-set. A closed dark-green umbrella hangs on his arm. Chatty and warm.
- **Place:** a bus-stop shelter on a quiet residential street in Maple Harbor: a bench, a small bus-stop sign with only a bus symbol (no text), trees and houses behind. **The weather changes in the game** (lovely, cold, hot or cloudy), so the sky must fit all of them: partly cloudy and soft, mostly hidden by the shelter roof, with no strong sun and no dark clouds.

| Picture | Shows | Moments |
|---|---|---|
| `greet` | Waving hello with a big smile ("Hey, neighbor! How's it going?") | howareyou |
| `weather` | Looking up at the sky from under the shelter roof, one palm turned up, a knowing smile ("Lovely weather, isn't it?") | weather, winter |
| `chat` | Leaning on the closed umbrella, chatting happily, one hand gesturing | new_q, intro, from_q, weekend_past, week, busy_why, weekend_plans, wkf_what, wkp_what, your_turn, react |
| `rain` | It has started to rain: Frank holds his big umbrella open and tilts it toward the viewer to share it ("Quick, get under my umbrella!"). Rain streaks, a wet street, a grayer sky. | rain |
| `late` | Checking his wristwatch, eyebrows raised, a patient shrug ("The bus is late again. Typical!") | late, like_q |
| `bye` | Pointing down the street with a smile, as if the bus is coming (no bus in the picture), waving goodbye with the other hand | closing |

`"sticky": ["rain"]` keeps the rain picture until the end once it starts raining, so no dry picture comes back after it.

```json
{
  "npc": "Frank, your neighbor (at the bus stop)",
  "images": ["greet", "weather", "chat", "rain", "late", "bye"],
  "start": "greet",
  "sticky": ["rain"],
  "phases": {
    "howareyou": "greet",
    "weather": "weather", "winter": "weather",
    "new_q": "chat", "intro": "chat", "from_q": "chat", "weekend_past": "chat", "week": "chat", "busy_why": "chat",
    "weekend_plans": "chat", "wkf_what": "chat", "wkp_what": "chat", "your_turn": "chat", "react": "chat",
    "rain": "rain",
    "late": "late", "like_q": "late",
    "closing": "bye"
  },
  "focus": [34, 30]
}
```

### s34-meeting: team meeting with Kate, Paul and Sara (6 pictures)

- **The people** are the same as in the video call ([`s89-video-call/grid.webp`](https://github.com/tomaslibas21-bit/english-world/blob/main/public/scenes/s89-video-call/grid.webp)): keep their faces, hair and clothes.
  - **Kate** (team lead): fair skin, wavy blonde hair in a loose ponytail, a teal-blue button-up shirt. No headset: she is in the room.
  - **Paul:** tan skin, short brown hair, glasses, a short beard, a rust-brown top.
  - **Sara:** brown skin, curly black hair, a raspberry top, small gold earrings. She joins from home, so she is only on the wall screen.
- **Place:** the glass-walled meeting room of the Brightline office ([`s88-first-day/hello.webp`](https://github.com/tomaslibas21-bit/english-world/blob/main/public/scenes/s88-first-day/hello.webp)): a light wooden table with laptops and coffee mugs, sage-green chairs, a whiteboard, plants, a big wall screen showing Sara in a video tile (no names, no text, no app branding). The viewer sits at the table. Kate stands at the head of the table about one third from the left, Paul sits at the table, and the screen is near the middle of the picture. The right third stays calm (the glass wall, a plant).

| Picture | Shows | Moments |
|---|---|---|
| `mute` | Sara talking on the screen, with a red crossed-out microphone icon on her tile; Kate points at the screen with an amused, puzzled smile; Paul looks at the screen ("You're on mute!") | mute, sara_hear |
| `update` | Kate turned to the viewer with an open, inviting hand ("And you? How's it going?"); Paul and Sara listening | notes, update, what_task, send_q, when_q, help_offer, summary, add, add_what |
| `clarify` | Paul explaining with both hands, a small gesture growing into a big one ("first a few users, then everyone"); Kate listening | clarify, makes_sense |
| `opinion` | Paul and Sara disagreeing (Paul with a hand raised, Sara gesturing on the screen); Kate turns to the viewer ("What do you think?") | opinion, why, talk_after, dl_view, dl_who |
| `owner` | Kate at the whiteboard with a marker, next to three drawn checkboxes with wavy lines (no readable text), looking at the viewer ("Who's taking this?") | owner |
| `wrap` | Kate smiling as she closes her notebook, Paul standing up, Sara waving on the screen ("Let's wrap up. Thanks, everyone!") | aob, aob_more, aob_what, closing |

```json
{
  "npc": "Kate, Paul and Sara (team meeting)",
  "images": ["mute", "update", "clarify", "opinion", "owner", "wrap"],
  "start": "mute",
  "phases": {
    "mute": "mute", "sara_hear": "mute",
    "notes": "update", "update": "update", "what_task": "update", "send_q": "update", "when_q": "update", "help_offer": "update", "summary": "update", "add": "update", "add_what": "update",
    "clarify": "clarify", "makes_sense": "clarify",
    "opinion": "opinion", "why": "opinion", "talk_after": "opinion", "dl_view": "opinion", "dl_who": "opinion",
    "owner": "owner",
    "aob": "wrap", "aob_more": "wrap", "aob_what": "wrap", "closing": "wrap"
  },
  "focus": [34, 30]
}
```

### s35-gym: Jordan, personal trainer (12 pictures)

- **Jordan:** a woman with tan skin and a long black ponytail, wearing a teal athletic top, black leggings, sneakers and a blank badge. Energetic and always smiling.
- **Place:** Harbor Fitness, a bright, modern gym with big windows. Two set-ups:
  - **The front desk** (`welcome`, `form`, `lockers`): a counter; on the wall behind it, a sign with exactly **HARBOR FITNESS** and a small price board with exactly two lines, **MONTHLY $35** and **DAY PASS $10**; the door to the locker room in the background, on the left.
  - **The workout floor** (the other nine): exercise bikes and treadmills, a leg-press machine, a bench press, dumbbells and a water fountain. These pictures share the room, the light and Jordan's look; the camera may move a little to show each moment's machine.

| Picture | Shows | Moments |
|---|---|---|
| `welcome` | Behind the front desk, waving, with a big smile ("Welcome to Harbor Fitness!") | new, plan, alt_plan, howareyou |
| `form` | Sliding a clipboard with a form (lines only, no readable text) and a pen across the counter ("Sign at the bottom") | form, pay |
| `lockers` | Pointing toward the locker-room door, a folded towel over her arm ("The locker room is right over there") | lockers, lock_q, changing |
| `warmup` | On the workout floor between an exercise bike and a treadmill, gesturing at both ("Warm up first!") | warmup |
| `machine` | A hand on the leg-press machine, a forgotten water bottle on its seat ("Is this machine free?") | machine, broken |
| `sets` | Holding up three fingers, a clipboard in her other hand ("Three sets of ten reps") | sets |
| `rep` | Cheering with both fists up, excited ("One more rep! You can do it!") | rep |
| `spot` | Standing at the head of the bench press, hands ready just under the bar, focused and encouraging ("I'll stay right here") | spot |
| `breath` | Laughing kindly as she holds out a water bottle ("Take a break, grab some water") | breath, breath_q |
| `careful` | Stepping closer with a concerned face, one hand raised ("Whoa, are you okay? Stop right there.") | okay_q, where_hurt |
| `stretch` | Showing an easy standing stretch, calm and smiling ("Let's do some easy stretching instead") | stretch |
| `next` | Thumbs up with a big smile ("Same time tomorrow?") | next, thursday_q, closing |

`feel_q` ("How do you feel?") is left out on purpose: it comes after the warm-up and after the stretching, so it keeps the picture already showing.

```json
{
  "npc": "Jordan, personal trainer",
  "images": ["welcome", "form", "lockers", "warmup", "machine", "sets", "rep", "spot", "breath", "careful", "stretch", "next"],
  "start": "welcome",
  "phases": {
    "new": "welcome", "plan": "welcome", "alt_plan": "welcome", "howareyou": "welcome",
    "form": "form", "pay": "form",
    "lockers": "lockers", "lock_q": "lockers", "changing": "lockers",
    "warmup": "warmup",
    "machine": "machine", "broken": "machine",
    "sets": "sets",
    "rep": "rep",
    "spot": "spot",
    "breath": "breath", "breath_q": "breath",
    "okay_q": "careful", "where_hurt": "careful",
    "stretch": "stretch",
    "next": "next", "thursday_q": "next", "closing": "next"
  },
  "focus": [34, 30]
}
```

## Done

- **The five calls** (25 pictures): s76-dentist-call, s80-support-call, s83-invite-call, s89-video-call and s90-running-late. Made on 27 Sep 2026.
- **Extras** (6 pictures): four garment-neutral pictures for s74-clothes, `found` for s91b-police and `drink` for s77-salon. Made on 27 Sep 2026.
