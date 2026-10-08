# Pictures wanted: brief for an image assistant

**English World** is a browser game for Lithuanian adults practising spoken American English.
- Live game: https://tomaslibas21-bit.github.io/english-world/
- Code: https://github.com/tomaslibas21-bit/english-world

During a conversation, the game shows **one illustrated picture per phase** of the conversation, behind the conversation panel.

**Status (8 Oct 2026): 32 pictures are wanted** for the six advanced conversations P25–P30: see "Wanted" below. The first 41 conversations have their pictures (265 in total); the 40 pictures for songs 31–35 were made by ChatGPT from this brief, and their sections stay as a record.

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

## Wanted: the six advanced conversations P25–P30 (32 pictures, 8 Oct 2026)

These conversations come from the advanced situation songs P25–P30 (chapter 8, „Pažengusiems“). They play without pictures until these exist (the 3D view, or the call screen for the phone call). Each section has the people, the place, the pictures and the ready scene file. The scene files were checked against the simulated conversations: every picture shows up, and every moment name exists.

- **Size, for every picture:** 2048 × 1152 px (16:9), WebP quality about 80, under 250 KB, as in "Files" above.
- **People who are already in the game** (Mr. Patel, Rita, Dan, Nora) must look as in their existing pictures, which are linked. The others are new; their looks also match their 3D figures in `src/content/npcs.ts`.
- **Text:** only the words given in **bold**, word for word.

### p25-used-car: Maggie Holt sells her convertible on Cedar Lane (5 pictures)

- **Maggie Holt** (new): about 60, light skin, short silver hair in a bob, big sunglasses pushed up on her head, a denim shirt with rolled-up sleeves, khaki trousers, small earrings, the car keys on a red keychain. A retired drama teacher: warm, funny, proud of her car, and she enjoys a good haggle.
- **The car:** a cherry-red 1998-style convertible (no brand marks), top down, cream seats, chrome bumpers, a hand-written sign in the windshield with exactly **FOR SALE $9,000**.
- **Place:** Maggie's drive on Cedar Lane, a quiet residential street, on a sunny late afternoon: a white clapboard house with a porch, a maple tree, a mailbox with a small dent at the curb. The car stands in the drive, facing the street.

| Picture | Shows | Moments |
|---|---|---|
| `driveway` | Maggie beside the car, one hand on its door, smiling at the viewer, the keys on the red keychain in her other hand | arrive, look, drive, drive_q |
| `back` | Seen from the driver's seat as the car rolls back into the drive after the test drive: the red hood in the foreground, Maggie waiting with her arms open ("Welcome back!") | opinion |
| `haggle` | Maggie leaning against the car, arms folded, a sly smile (haggling) | talk, price, offer, confirm, final, flaw |
| `phone` | The same, Maggie glancing at her buzzing phone (the screen shows only a message bubble, no readable text), eyebrows raised | rival (another buyer texts) |
| `deal` | A handshake beside the car; the keys on the red keychain changing hands; Maggie beaming | shake, pay |

```json
{
  "npc": "Maggie Holt, selling her car",
  "images": ["driveway", "back", "haggle", "phone", "deal"],
  "start": "driveway",
  "phases": {
    "arrive": "driveway", "look": "driveway", "drive": "driveway", "drive_q": "driveway", "howareyou": "driveway",
    "opinion": "back",
    "talk": "haggle", "haggle": "haggle", "decide": "haggle", "price": "haggle", "offer": "haggle", "confirm": "haggle", "final": "haggle", "flaw": "haggle",
    "rival": "phone",
    "shake": "deal", "pay": "deal"
  },
  "focus": [34, 32]
}
```

### p26-complaint: Kyle and Brenda at Harbor Home, on the phone (5 pictures)

A phone call: the pictures show the learner's kitchen and the other end of the line.

- **Kyle** (new): early twenties, tan skin, short brown hair, an orange polo shirt, a headset and a blank name badge. Friendly and eager, reading from a script.
- **Brenda** (new): in her fifties, dark skin, a short black bob, reading glasses on a chain, a navy cardigan, small earrings and a headset. Calm, experienced, kind but businesslike.
- **Places:**
  - the learner's kitchen in Maple Harbor: a shiny new fridge with a small screen on its door;
  - Harbor Home's call center: bright and a little too cheerful, a wall of identical blue cubicles, a plain logo shape without letters;
  - Brenda's neat glass office: a shelf of identical mugs behind her, a coupon pad on the desk.

| Picture | Shows | Moments |
|---|---|---|
| `hold` | The kitchen: the new fridge, whose screen still glows green with exactly **Good morning, sunshine!**, while a puddle spreads in front of it; a phone on speaker on the counter | the start, problem, plugged |
| `kyle` | Kyle in his cubicle, reading from a laminated script whose top line says exactly **1. Is it plugged in?**, a big helpful smile | name, history, offer_manager, book_tuesday |
| `transfer` | The kitchen again: the phone held to the ear (only a hand and the phone are seen), small music notes and waves floating from it (on hold) | transfer |
| `brenda` | Brenda in her glass office, glasses on, listening and taking notes, the coupon pad and the shelf of mugs behind her | offer, refund_or, anything |
| `deal` | Brenda smiling, typing; a sticky note on her monitor says exactly **HH-4471** | deadline, which_day, confirm, reference, readback |

```json
{
  "npc": "Kyle and Brenda, Harbor Home customer service (phone)",
  "images": ["hold", "kyle", "transfer", "brenda", "deal"],
  "start": "hold",
  "phases": {
    "problem": "hold", "plugged": "hold",
    "name": "kyle", "history": "kyle", "offer_manager": "kyle", "book_tuesday": "kyle",
    "transfer": "transfer",
    "offer": "brenda", "refund_or": "brenda", "anything": "brenda",
    "deadline": "deal", "which_day": "deal", "confirm": "deal", "reference": "deal", "readback": "deal"
  },
  "focus": [34, 32]
}
```

### p27-meeting: Vanessa and Greg in the Brightline meeting room (5 pictures)

- **Vanessa** (new): early 40s, fair skin, dark curly shoulder-length hair, a red blazer over a dark top, small earrings and a lanyard with a blank badge. Quick, confident and theatrical, warm underneath.
- **Greg** (new): mid-50s, light skin, short gray hair, a gray beard, reading glasses pushed up on his head, a gray-green cardigan over a shirt. Calm, dry, always holding a huge coffee mug.
- **Place:** the Brightline glass meeting room as in [`s34-meeting/update.webp`](https://github.com/tomaslibas21-bit/english-world/blob/main/public/scenes/s34-meeting/update.webp): light wood table, sage-green chairs, a big wall screen, glass walls, plants; Monday-morning light, the harbor through the window. The learner's empty chair faces Vanessa; two young interns sit at the back of the room. The screen shows simple charts and shapes only, except where text is given below.

| Picture | Shows | Moments |
|---|---|---|
| `pitch` | Vanessa by the wall screen (a rising bar chart), clicker in hand, mid-sentence and smiling; Greg at the head of the table with his huge mug; the two interns at the back sharing a bag of popcorn | pitch |
| `charts` | Closer on Vanessa in full flow, one hand raised toward a screen full of charts; the interns lean in, popcorn halfway to their mouths | charts, reason |
| `counter` | The screen shows a phone mockup of an old website and exactly **$4,000/month**; Vanessa turned toward the viewer, eyebrows raised; Greg sipping, amused | counter, alternative, twist |
| `resolve` | Everyone leaning over the table; Greg with one hand raised, about to make the call | resolve, so_agree |
| `teal` | The screen shows three button swatches: blue, green and a teal one between them; Vanessa half-smiling, two coffee cups on the table (shown at the end of a meeting that went well) | coffee, teal, teal2, and the end |

```json
{
  "npc": "Vanessa, marketing lead (and Greg, team manager)",
  "images": ["pitch", "charts", "counter", "resolve", "teal"],
  "start": "pitch",
  "done": "teal",
  "phases": {
    "pitch": "pitch",
    "charts": "charts", "reason": "charts",
    "counter": "counter", "alternative": "counter", "twist": "counter",
    "resolve": "resolve", "so_agree": "resolve",
    "coffee": "teal", "teal": "teal", "teal2": "teal"
  },
  "focus": [32, 30]
}
```

### p28-kitchen: Chef Whitaker and Mia Russo in the kitchen of The Pier (5 pictures)

- **Chef Whitaker** (new): early 60s, tall, brown skin, short gray hair, a gray beard, a white chef's jacket and apron, a tasting spoon. Quiet, precise and kind; nothing gets past him.
- **Mia Russo** (new): 19, olive skin, black hair tied back in a ponytail, a white top and an oversized deep-blue apron. Her first week in the kitchen: nervous, but talented.
- **Place:** the back kitchen of The Pier (the restaurant of [`s84-date-emma`](https://github.com/tomaslibas21-bit/english-world/tree/main/public/scenes/s84-date-emma), warm wood and lanterns out front): stainless steel, a rail of order tickets (no readable text), copper pans, a porthole window to the harbor. Across the pass, a bowl of bright-pink cold beet soup with dill and half a boiled egg: the learner's dish.
- **Second set-up (`mia`, `done`):** the range in the same kitchen, with a pot of creamy clam chowder.

| Picture | Shows | Moments |
|---|---|---|
| `serve` | Whitaker behind the pass, arms relaxed, looking at the pink soup the learner has just served | serve |
| `taste` | The same, he tastes the soup from a spoon, eyes half closed, in thoughtful silence | consent, receive |
| `lemon` | The same, he holds up half a lemon, a gentle smile | example, again, second, handoff |
| `mia` | The range: Mia over the pot of clam chowder, holding out a wooden spoon toward the viewer, a nervous half-smile; Whitaker in the background, arms folded, smiling | mia_open, mia_worked, mia_try, mia_howmuch, mia_encourage |
| `done` | The same as `mia`: Mia relieved and smiling, the chef laughing (shown at the end of a conversation that went well) | mia_back, and the end |

```json
{
  "npc": "Chef Whitaker, head chef (and Mia Russo, junior cook)",
  "images": ["serve", "taste", "lemon", "mia", "done"],
  "start": "serve",
  "done": "done",
  "phases": {
    "serve": "serve",
    "consent": "taste", "receive": "taste",
    "example": "lemon", "again": "lemon", "second": "lemon", "handoff": "lemon",
    "mia_open": "mia", "mia_worked": "mia", "mia_try": "mia", "mia_howmuch": "mia", "mia_encourage": "mia",
    "mia_back": "done"
  },
  "focus": [36, 30]
}
```

### p29-landlord: Mr. Patel in the lobby of Maple Street Apartments (6 pictures)

- **Mr. Patel** (as in [`s81-apartment/hello.webp`](https://github.com/tomaslibas21-bit/english-world/blob/main/public/scenes/s81-apartment/hello.webp): brown skin, short gray hair, a gray mustache, glasses), today dressed for his trip: a bright Hawaiian shirt under an open winter coat, sunglasses pushed up on his head, a rolling suitcase beside him. Friendly, a little guilty, in a hurry.
- **Rita** (as in [`s82-neighbor/hello.webp`](https://github.com/tomaslibas21-bit/english-world/blob/main/public/scenes/s82-neighbor/hello.webp): curly red hair, a beige top and jeans), in one picture only.
- **Place:** the first-floor lobby of Maple Street Apartments, cold in winter: a row of metal mailboxes on the left wall (no names or numbers), the stairs going up, the glass front door with frost on it. The learner's breath and Mr. Patel's show as small clouds in the cold air.

| Picture | Shows | Moments |
|---|---|---|
| `hello` | Mr. Patel by the front door with his suitcase and keys, caught on his way out, a guilty smile | problem, guess, thermostat, duration |
| `rita` | Rita at the mailboxes with a few letters in her hand, arms crossed, a "really?" look at Mr. Patel; he looks deadpan | rita |
| `dodge` | Mr. Patel with his palms up and a shrug ("it's an old building"), then holding out a big wrench with a hopeful grin | dodge, offer |
| `date` | Mr. Patel looking at the calendar on his phone (the screen shows only a simple grid), one finger raised ("let me see…") | date, home |
| `rent` | Mr. Patel holding a small receipt pad and a pen (no readable text), the suitcase handle in his other hand | wrap, rent |
| `bye` | Mr. Patel at the open front door, sunglasses down, waving, the suitcase rolling out behind him | the goodbye |

```json
{
  "npc": "Mr. Patel, landlord",
  "images": ["hello", "rita", "dodge", "date", "rent", "bye"],
  "start": "hello",
  "phases": {
    "problem": "hello", "guess": "hello", "howareyou": "hello", "thermostat": "hello", "duration": "hello",
    "rita": "rita",
    "dodge": "dodge", "offer": "dodge",
    "date": "date", "home": "date",
    "wrap": "rent", "rent": "rent",
    "closing": "bye"
  },
  "focus": [34, 30]
}
```

### p30-start-over: Dan (and Nora) at their front door (6 pictures)

- **Dan** (as in [`s85-dinner/door.webp`](https://github.com/tomaslibas21-bit/english-world/blob/main/public/scenes/s85-dinner/door.webp): brown skin, short black hair, glasses, a light-blue chambray shirt). Today he is hurt and guarded at first, warm underneath.
- **Nora** (as in the same picture: light skin, blonde hair in a bun, a rust-orange blouse), in one picture only.
- **Mittens**, their cat, in the last picture.
- **Place:** the front door of Dan and Nora's house as in `s85-dinner/door.webp` (dark teal door, gray-blue clapboard, a wall lantern), but on a sunny Saturday morning. To one side the garage door is open on a half-finished wooden boat on sawhorses, tools and a tarp around it.

| Picture | Shows | Moments |
|---|---|---|
| `porch` | Dan in the half-open door, arms crossed, an unreadable face | door, apology |
| `hurt` | The same, Dan leaning on the door frame, looking down, hurt | responsibility |
| `turn` | Arms uncrossed, rubbing the back of his neck, a crooked half-smile ("I was wrong too") | turn |
| `nora` | The door wide open; Nora leans out of the hall with a coffee pot, smiling; Dan rolls his eyes and smiles | nora |
| `deal` | Dan smiling, holding out his hand for a handshake ("Deal.") | make_up, start_over |
| `home` | The door wide open, Dan's hand reaching to the viewer's shoulder, inviting them in; Mittens the cat in the hall, the kitchen light on at the end (shown once they have made up) | the end |

```json
{
  "npc": "Dan, your friend (and Nora)",
  "images": ["porch", "hurt", "turn", "nora", "deal", "home"],
  "start": "porch",
  "done": "home",
  "phases": {
    "door": "porch", "apology": "porch",
    "responsibility": "hurt",
    "turn": "turn",
    "nora": "nora",
    "make_up": "deal", "start_over": "deal"
  },
  "focus": [36, 30]
}
```

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
