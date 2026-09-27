# Situation specifications (v1)

There are 30 songs (62–91), split into 36 conversation parts (35 below plus the café, s72). Each part is one file `src/content/situations/<id>.ts` with a default export of type `SituationDef`. Use the ids, NPCs (`src/content/npcs.ts`) and locations (`src/content/locations.ts`) exactly as given here.

The coverage lists are the **minimum**. Research the real American interaction and add whatever a learner genuinely needs. Keep NPC turns short and natural. Twists should appear only on some visits.

**Chapters:**

1. Atvykimas (Arrival)
2. Pirmosios dienos mieste (First days in town)
3. Įsikūrimas (Settling in)
4. Darbas (Work)
5. Žmonės (People)
6. Kelionės (Getting around)
7. Pagalba (Help)

Use the `chapter` and `order` values given for each part. **Address** is jūs unless the NPC is `informal` in `npcs.ts`.

---

## Batch A: arrival and air travel

### s65a-passport · song 65 "Business or Pleasure?" · ch 1, order 1
- **Location** `airport` · **NPC** `diaz` (Officer Diaz, formal, brisk but fair).
- **Title** EN "Business or Pleasure?", LT "Darbo reikalais ar poilsiui?". **Topic** "Passport control" / "Pasų kontrolė".
- **Goal (LT)** "Praeik pasų kontrolę: atsakyk į pareigūnės klausimus."
- **Cover:**
  - "Next!"
  - passport / ESTA or visa
  - purpose of visit (business / pleasure / vacation / visiting family / work / study)
  - how long staying (days / weeks / until a date)
  - where staying (hotel name or a friend's address)
  - return ticket
  - first time in the US?
  - occupation
  - anything to declare (food, plants, cash over $10,000)
  - fingerprints and photo: "Please put your four fingers on the scanner", "Look at the camera"
  - "Welcome to the United States"
  - learner's clarification questions ("Sorry, do you mean my job?")
- **Twists:**
  - "Can I see your return ticket?"
  - "Do you have any food with you?" — the learner has cheese/chocolate and must declare it

### s65b-baggage · song 65 · ch 1, order 2
- **Location** `airport` · **NPC** `priya` (baggage services).
- **Title** EN "My Bag Didn't Arrive", LT "Mano lagaminas neatvyko".
- **Goal** "Pranešk, kad neatvyko tavo lagaminas, ir susitark dėl pristatymo."
- **Cover:**
  - my bag hasn't arrived
  - flight number
  - baggage claim tag / check number
  - describe the bag: color, size, material, brand, stripe, name tag
  - what's inside (optional)
  - where are you staying
  - phone number (`{digits}`)
  - delivery to the hotel and when (within 24 hours)
  - "What should I do in the meantime?" (overnight kit, reimbursement of essentials with receipts)
  - reference number (`spell` / `write`)
- **Twist:** "We found it — it's on the next flight."

### s66-taxi · song 66 "Keep the Change" · ch 1, order 3
- **Location** `taxi-stand` · **NPC** `vinnie` (chatty driver who sings along with the radio).
- **Title** EN "Keep the Change", LT "Grąžos nereikia". **Topic** "Taking a taxi" / "Taksi".
- **Goal** "Pasakyk vairuotojui, kur važiuoti, pasiteirauk kainos ir susimokėk."
- **Cover:**
  - "Where to?"
  - destinations: entity list of town places with LT names — Harborview Hotel, Union Station, the museum, Town Square, Sunny Cup, the airport, Maple Street Apartments, Brightline office, The Pier
  - "Could you put my bag in the trunk?"
  - how much will it be (about $20–30); how long will it take (15–20 min, traffic)
  - is there a quicker way; turn the radio up/down; open the window / AC
  - "Could you stop here / at the corner / in front of the hotel?"
  - how much is it; paying by card or cash; receipt; tip; "Keep the change"
- **World event:** after the destination is known and paid (or at arrival), `c.event("taxi-ride", { to: <locationId> })`. The world then moves the player there, so taxis work as fast travel. Use location ids from `locations.ts`.
- **Twists:**
  - rideshare pickup ("Are you waiting for a ride to the airport?")
  - heavy traffic, so the driver suggests a detour

### s68-hotel · song 68 "Late Check-Out" · ch 1, order 4
- **Location** `hotel` · **NPC** `olivia`.
- **Title** EN "Late Check-Out", LT "Vėlesnis išsiregistravimas".
- **Goal** "Užsiregistruok viešbutyje ir sužinok, kas įskaičiuota."
- **Cover:**
  - reservation and name: the NPC asks to spell the surname (use `{letters}`; accept the player's surname or any spelling)
  - number of nights; passport / ID; credit card for incidentals; sign here
  - breakfast included and time; Wi-Fi password (`spell` / `write`)
  - room number, floor, elevator; check-out time; late check-out (until noon, maybe a fee)
  - luggage storage; calling a taxi; extra towels / pillow; room type change
- **Twist (visits ≥1):** a problem call: "Hi, it's room 412. The air conditioning isn't working." → apology, a fan, room change offer.

### s64a-checkin · song 64 "Window or Aisle?" · ch 6, order 5
- **Location** `airport` · **NPC** `kevin`.
- **Title** EN "Window or Aisle?", LT "Prie lango ar prie praėjimo?".
- **Goal** "Užsiregistruok skrydžiui: parodyk pasą, priduok lagaminą, išsirink vietą ir sužinok vartus."
- **Cover:**
  - destination
  - passport
  - checking a bag; how many bags; put it on the scale
  - "Did you pack this bag yourself?"
  - overweight in pounds, a $100 fee or move items to the carry-on
  - window or aisle; boarding pass
  - gate number and boarding time; is the flight on time
  - where is security; "Have a nice flight"
- **Twist:** the bag is 3 pounds over.

### s64b-security · song 64 · ch 6, order 6
- **Location** `airport` · **NPC** `grant` (TSA officer).
- **Title** EN "Laptops Out, Please", LT "Nešiojamuosius kompiuterius išimkite".
- **Goal** "Praeik saugumo patikrą."
- **Cover:**
  - boarding pass and ID
  - "Take out your laptop and liquids"; liquids in a quart-size bag
  - shoes, belt, jacket off; empty your pockets
  - "Step through, please"; "Arms up"
  - beep: "Do you have anything in your pockets?" → "Just my keys"
  - "Is this your bag? I need to check it" (a water bottle) → "Oh, sorry, I forgot"
  - "Can I have my bag back?"; "Where can I put my shoes on?"

### s64c-gate · song 64 · ch 6, order 7
- **Location** `airport` · **NPC** `nina`.
- **Title** EN "Is This the Right Gate?", LT "Ar tai tie vartai?".
- **Goal** "Pasitikslink vartus ir skrydžio laiką, tada įlipk į lėktuvą."
- **Cover:**
  - is this the right gate for flight 223 to Boston
  - is the flight on time (delay 20 minutes, the reason)
  - when does boarding start; boarding groups ("group 3")
  - can I take this bag on board; is there Wi-Fi on board
  - where can I get coffee; "Now boarding group 3"
  - boarding pass scan; "Enjoy your flight"
- **Twist:** gate change to gate 12.

## Batch B: first days in town and transport

### s62-visitor-center · song 62 "Could You Say That Again?" · ch 2, order 1
- **Location** `visitor-center` · **NPC** `chuck` (fast talker, `speed` 1.18).
- **Title** EN "Could You Say That Again?", LT "Ar galėtumėte pakartoti?".
- **Goal** "Gauk miesto žemėlapį ir sužinok, kaip nueiti į kavinę. Chuck kalba labai greitai – drąsiai prašyk pakartoti, kalbėti lėčiau ar paraidžiui."
- **Cover:**
  - map; where is X (directions with left / right / straight / across from / next to / two blocks)
  - opening hours; bus pass; events this week (jazz on Friday)
  - Wi-Fi code
  - **checking understanding:** "So I go straight and turn left at the bank?", "Is it far?", "Do you mean the big one?", "On the right or on the left?" (situation intents)
- **Mechanics:**
  - Chuck's lines are long; give them `spell` / `write` where useful.
  - The situation should reward clarification. The goal completes after the learner has the map **and** has confirmed at least one direction. It works with or without a clarification request.
  - Override global handlers if needed: import `GLOBAL_HANDLERS` from `../global` and call them from your own `g_slower` to add a flag.
- **Twist:** Chuck uses a word the learner may not know ("courthouse", "crosswalk") and the learner asks "What does … mean?"

### s69-local · song 69 "What Would You Recommend?" · ch 2, order 3
- **Location** `town-square` · **NPC** `rosa` (local on a bench, warm, born and raised).
- **Title** EN "What Would You Recommend?", LT "Ką rekomenduotumėte?".
- **Goal** "Paprašyk vietinės gyventojos patarimų: kur pavalgyti ir ką pamatyti."
- **Cover:**
  - "Excuse me, are you from around here?"
  - a good place to eat that's not too expensive
  - what's worth seeing; is it within walking distance; is it touristy; best time to go
  - where do the locals go; is it safe at night
  - do I need to book (the boat tour); what's there to do at night (jazz)
  - best coffee in town; "Thanks for the tip!"; "You've been really helpful"
- **Twist:** Rosa offers to walk with you.

### s70-museum · song 70 "Please Don't Touch" · ch 2, order 4
- **Location** `museum` · **NPCs** `ben` (tickets), `harold` (guard; twist lines only).
- **Title** EN "Please Don't Touch", LT "Prašome neliesti".
- **Goal** "Nusipirk bilietą, pasiimk audiogidą ir sužinok, kur nauja paroda."
- **Cover:**
  - tickets (adult, student, senior) and prices; student discount (ID)
  - audio guide and languages ("Do you have it in Lithuanian?" → no, but Russian/Polish/English); coat check
  - can I take photos (no flash); where's the new exhibition ("The Colors of the Night", upstairs on the right); is it included
  - opening hours / closing time; gift shop; café; restrooms
- **Twist:** `c.speaker("harold")`: "Excuse me! Please don't touch the paintings." → apology → "Thank you."

### s73-restaurant · song 73 "This Isn't What I Ordered" · ch 2, order 5
- **Location** `trattoria` · **NPCs** `marco_host` (Lucia, host), then `marco` (server).
- **Title** EN "This Isn't What I Ordered", LT "Ne tai užsisakiau".
- **Goal** "Pavakarieniauk restorane: užsisakyk, jei reikia – pasiskųsk, ir paprašyk sąskaitos."
- **Cover:**
  - reservation (a table for two at 7, name) or walk-in wait time; table by the window
  - drinks: still / sparkling water, red / white wine, lemonade, soda
  - specials; what do you recommend; is it spicy
  - allergies (nuts, gluten); vegetarian options
  - starter / main / side; steak doneness (rare / medium / well-done)
  - "How is everything?"; dessert menu; coffee
  - "Could we get the check?"; together or separately / split it; card or cash; is the tip included (no, 15–20%); to-go box
- **Twists:**
  - wrong dish arrives ("I ordered the fish, but this is a burger")
  - cold soup ("could you warm it up?")

### s67a-tickets · song 67 "Single or Return?" → US "One-Way or Round-Trip?" · ch 6, order 1
- **Location** `station` · **NPC** `walter`.
- **Title** EN "One-Way or Round-Trip?", LT "Į vieną pusę ar į abi?".
- **Goal** "Nusipirk traukinio bilietą į pajūrį ir sužinok, kada ir iš kurio kelio išvyksta traukinys."
- **Cover:**
  - a ticket to Seaside (or Portland / Boston: an entity list); one-way or round-trip
  - price; pay by card; senior / student discount
  - when's the next train; which track; do I need to change (direct); how long does it take
  - first class vs coach; return date; "Is this seat taken?" (optional)
- **Twist:** delay announcement ("The 7:15 is running 20 minutes late").

### s67b-bus · song 67 · ch 6, order 2
- **Location** `station` · **NPC** `denise` (bus driver).
- **Title** EN "Does This Bus Go Downtown?", LT "Ar šis autobusas važiuoja į centrą?".
- **Goal** "Sužinok, ar autobusas važiuoja ten, kur reikia, ir paprašyk pasakyti, kur išlipti."
- **Cover:**
  - does this bus go to Old Town / the beach / the museum; how much is the fare ($2.50)
  - exact change; can I pay by card / tap; a day pass
  - "Could you tell me when to get off?"; which stop for …; how many stops
  - "Press the button / pull the cord"; "Is this my stop?"; thanks
- **Twist:** "This bus is out of service, take the 12."

## Batch C: shops and services

### s74-clothes · song 74 "Can I Try It On?" · ch 3, order 6
- **Location** `threads` · **NPC** `chloe`.
- **Title** EN "Can I Try It On?", LT "Ar galiu pasimatuoti?".
- **Goal** "Išsirink drabužį, pasimatuok ir nusipirk (ar pasikeisk)."
- **Cover:**
  - "Can I help you?" → just looking / looking for a jacket
  - "Do you have this in a medium / in blue?"
  - where are the fitting rooms; too small / tight / big / long; try another size
  - "It really suits you"; is it on sale (20% off); how much; I'll take it / I'll think about it
  - bag?; payment
  - clothing entity list with LT forms: jacket, shirt, T-shirt, sweater, jeans, pants, dress, coat, scarf, shoes. Handle "a pair of" only for jeans / pants / shoes.
  - colors and sizes S–XL
- **Twist (visits ≥1):** a return or exchange: "I'd like to return this", receipt, what's wrong with it, refund / exchange / store credit.

### s75-pharmacy · song 75 "Something for a Headache" · ch 3, order 5
- **Location** `pharmacy` · **NPC** `okafor`.
- **Title** EN "Something for a Headache", LT "Ką nors nuo galvos skausmo".
- **Goal** "Nusipirk vaistų ir pasiteirauk, kaip juos vartoti."
- **Cover:**
  - do you have something for a headache / sore throat / cough / cold / fever / allergies / upset stomach / sunburn
  - how long have you had it; any other medicines; are you allergic to anything
  - dosage ("Take two every six hours with food, no more than eight a day")
  - does it make you drowsy; do I need a prescription
  - prescription pickup (name, date of birth; ready in 10 minutes)
  - for children; Band-Aids; sunscreen; "If it doesn't get better, see a doctor"; "Feel better!"

### s77-salon · song 77 "Just a Trim" · ch 3, order 7
- **Location** `salon` · **NPC** `jessie` (chatty).
- **Title** EN "Just a Trim", LT "Tik truputį patrumpinkite".
- **Goal** "Pasakyk kirpėjai, ką nori, ir susimokėk."
- **Cover:**
  - appointment at 3, name; "What are we doing today?"
  - just a trim; how much off (an inch / two inches); layers; bangs (tip for "fringe"); not too short
  - wash?; water too hot; blow-dry straight / curly
  - small talk (Jessie's cat, vacation)
  - "Do you like it?"; "How much do I owe you?" ($45 with wash and blow-dry); tip; book the next appointment
- **Twist:** it came out shorter than expected: polite reactions.

### s78-bank · song 78 "The Machine Ate My Card" · ch 3, order 3
- **Location** `bank` · **NPC** `aaron`.
- **Title** EN "The ATM Ate My Card", LT "Bankomatas prarijo mano kortelę".
- **Goal** "Atsidaryk banko sąskaitą (ir sužinok, kaip pervesti pinigus į Lietuvą)."
- **Cover:**
  - open an account (checking / savings); ID (passport); proof of address (lease / utility bill)
  - Social Security number ("I don't have one yet" → still possible)
  - fill in this form / sign here; debit card by mail in 5–7 business days; PIN
  - mobile app / check balance; exchange euros to dollars (rate, fee); international transfer to Lithuania (fee, 1–2 days); minimum balance / monthly fee
- **Twist (visits ≥1):** "The ATM outside kept my card" → block the card, send a new one, temporary cash withdrawal with ID.

### s79-post · song 79 "Where's My Parcel?" → "Where's My Package?" · ch 3, order 4
- **Location** `post-office` · **NPC** `gloria`.
- **Title** EN "Where's My Package?", LT "Kur mano siuntinys?".
- **Goal** "Išsiųsk siuntinį į Lietuvą ir gauk sekimo numerį."
- **Cover:**
  - "Next in line, please"; I'd like to send this package to Lithuania
  - what's inside (fragile?); weigh it
  - Priority Mail International (6–10 business days) vs Express (3–5 days) with prices; customs form (contents and value); insurance
  - tracking number (`write` / `spell`); stamps for postcards
- **Twist (visits ≥1):** picking up a package: "I got a notice / I missed a delivery", ID, sign here.

## Batch D: calls, apartment, neighbors, car

### s76-dentist-call · song 76 "Could You Spell That?" · ch 3, order 8 · `mode: "phone"`
- **Location** `phone` · **NPC** `linda` (dental office receptionist).
- **Title** EN "Could You Spell That?", LT "Ar galėtumėte paraidžiui?".
- **Goal** "Paskambink į odontologijos kliniką ir užsiregistruok vizitui."
- **Cover:**
  - "Green Street Dental, this is Linda, how can I help you?"; I'd like to make an appointment
  - reason (toothache for three days, checkup, cleaning, broken tooth)
  - new patient?; name and "Could you spell your last name?" (`{letters}`, accept the player's surname)
  - date of birth (`{date}` + `{year}`); phone number; insurance (no / pay myself)
  - times ("Tuesday at 10?" → "Do you have anything earlier?" → "Tomorrow at 8:15") and confirm; "See you tomorrow"
  - bad line: "Sorry, you're breaking up / could you speak up?"
- **Twist (visits ≥1):** reschedule: "I have an appointment tomorrow, could I move it?" → Thursday at 3:30.

### s80-support-call · song 80 "Your Call Is Important to Us" · ch 3, order 9 · `mode: "phone"`
- **Location** `phone` · **NPCs** `netwave_bot` (automated menu), `claire`.
- **Title** EN "Your Call Is Important to Us", LT "Jūsų skambutis mums svarbus".
- **Goal** "Paskambink interneto tiekėjui: pranešk apie gedimą ir susitark dėl meistro vizito."
- **Cover:**
  - IVR: "For billing, say 'billing' or press 1. For technical support, say 'support' or press 2" (accept "two", "technical support", "support", "tech support"); "Please hold"
  - Claire: name, account number (`{digits}`); problem (internet not working since yesterday, router light blinking red)
  - "Have you tried turning it off and on again?"; charged twice → refund
  - technician visit (Thursday between 8 and 12) → "I'm at work, could someone else be home?" / another time
  - "Can I speak to a manager?"; reference number (`write`); "Is there anything else I can help you with?"

### s81-apartment · song 81 "Are the Bills Included?" → "Are Utilities Included?" · ch 3, order 1
- **Location** `apartments` · **NPC** `patel` (landlord).
- **Title** EN "Are Utilities Included?", LT "Ar komunaliniai įskaičiuoti?".
- **Goal** "Apžiūrėk butą ir išsiaiškink nuomos sąlygas."
- **Cover:**
  - "Hi, I'm here to see the apartment"; rent ($1,400 a month); are utilities included (water / heat yes, electricity and internet no)
  - is it furnished; security deposit (one month); pets (a cat is fine); lease (12 months); when can I move in (the 1st)
  - parking; laundry (in the basement); is it quiet; close to the bus stop
  - "I'll take it" / "I need to think about it"; sign the lease
- **Twist (visits ≥1):** reporting a problem: the heating isn't working / the kitchen faucet is leaking → the plumber can come tomorrow at 10.

### s82-neighbor · song 82 "Sorry About the Noise" · ch 3, order 2
- **Location** `apartments` · **NPC** `rita` (neighbor, informal).
- **Title** EN "Sorry About the Noise", LT "Atsiprašau dėl triukšmo".
- **Goal** "Susipažink su kaimyne ir paprašyk jos paslaugos (arba atsiprašyk dėl triukšmo)."
- **Cover:**
  - "Hi, I'm … I just moved in next door"; where do the trash and recycling go (pickup Monday); laundry room
  - "If you need anything, just knock"; coffee on Sunday
  - favors: could you water my plants / take in a package while I'm away; "Could I borrow a ladder?"
  - noise: "Sorry about the noise last night" / "Could you turn the music down a little?"
- **Twist:** Rita complains about noise first.

### s71a-rental · song 71 "Fill It Up" · ch 6, order 3
- **Location** `car-rental` · **NPC** `jake`.
- **Title** EN "I've Booked a Car", LT "Esu užsisakęs automobilį".
- **Goal** "Išsinuomok automobilį: pasitikslink draudimą, užstatą ir grąžinimo laiką."
- **Cover:**
  - booking name; driver's license; credit card; automatic or manual; car size
  - insurance (basic vs full coverage, price per day); deposit hold ($300)
  - fuel policy (full to full); mileage limit; GPS / child seat
  - return: date, time, place; "Where's the car?" (parking spot B4); "Have a great trip"

### s71b-gas · song 71 · ch 6, order 4
- **Location** `gas-station` · **NPC** `dot` (cashier inside).
- **Title** EN "Fill It Up", LT "Pilną baką".
- **Goal** "Užsipilk degalų ir susimokėk kasoje."
- **Cover:**
  - "$40 on pump three" / "Fill it up on pump three" (US prepay); regular / premium / diesel
  - pay inside / card at the pump; receipt; snacks and coffee; restroom key
  - directions to the highway ("Take a right and follow the signs"); air for tires
- **Twist:** car trouble: flat tire / the car won't start → "Is there a mechanic nearby? / Can you call roadside assistance?"

## Batch E: work and help

### s87-interview · song 87 "Why Should We Hire You?" · ch 4, order 1
- **Location** `office` · **NPC** `brooks` (formal).
- **Title** EN "Why Should We Hire You?", LT "Kodėl turėtume priimti Jus į darbą?".
- **Goal** "Sėkmingai atsakyk į darbo pokalbio klausimus."
- **Cover:**
  - "I have an interview at 9:30"; "Thank you for coming in"
  - tell me about yourself: name, job, years of experience (entity lists for fields and jobs, `{number}` years)
  - why do you want to work here; strengths (organized, a team player, a fast learner, good with people); weaknesses (with a positive spin)
  - where do you see yourself in five years; an example of teamwork (short); salary expectations
  - questions for us (working hours, training, when would I start, team size); when can you start
  - "We'll be in touch"; "Thank you for your time"
- The NPC reacts to answers with short acknowledgments and doesn't judge truthfulness.

### s88-first-day · song 88 "Where's the Coffee Machine?" · ch 4, order 2
- **Location** `office` · **NPC** `maria` (coworker, informal).
- **Title** EN "Where's the Coffee Machine?", LT "Kur kavos aparatas?".
- **Goal** "Pirmąją darbo dieną susipažink su kolege ir išsiaiškink, kur kas yra."
- **Cover:**
  - "Hi, I'm … — it's my first day"; welcome, show around
  - desk, laptop, password card; meeting room; restrooms; dress code (business casual)
  - kitchen and coffee machine ("How does it work?"); printer
  - "Could you show me how this works?"; "Could you send me that file?"
  - lunch invitation (Thai place) → accept / decline; "How was your first day?"; "See you tomorrow"

### s89-video-call · song 89 "You're on Mute!" · ch 4, order 3 · `mode: "video"`
- **Location** `phone` · **NPCs** `kate` (lead), `paul`, `sara` (informal team).
- **Title** EN "You're on Mute!", LT "Tavo mikrofonas išjungtas!".
- **Goal** "Dalyvauk komandos vaizdo skambutyje ir padėk kolegoms su technika."
- **Cover:**
  - "Can everyone hear me?" / "Can you see me?"; "Let's give it two more minutes"
  - Paul is on mute → the learner tells him ("Paul, you're on mute!")
  - "Your camera's off"; "You're breaking up / you froze"; "Sorry, go ahead" / "No, you go ahead"
  - "Can everyone see my screen?" → yes / no; "Could you share the slides / send the link?"
  - learner's short update ("I finished the report", "I'm working on …"); questions
  - "I have to jump off, I have another call at 11"; "Same time next week?"; "Bye, everyone"

### s90-running-late · song 90 "I'm Running Late" · ch 4, order 4 · `mode: "phone"`
- **Location** `phone` · **NPC** `harris` (boss, formal).
- **Title** EN "I'm Running Late", LT "Aš vėluoju".
- **Goal** "Paskambink viršininkui ir pranešk, kad vėluoji."
- **Cover:**
  - "Hi Mr. Harris, it's … — I'm running late"
  - reasons (my alarm didn't go off, I overslept, I missed the bus, I'm stuck in traffic, the train is delayed)
  - how late (be there in 10 / 20 minutes, by 9:30); "Please start without me"; "Could you save me a seat?"
  - apologies; "It won't happen again"
  - Harris's reactions (no problem / we'll wait / the meeting moved to room 302)
- **Twist:** the meeting moved to the other building (room 302).

### s91a-lost-wallet · song 91 "Can You Help Me, Please?" · ch 7, order 1
- **Location** `town-square` · **NPC** `mrs_lee` (flower stall).
- **Title** EN "Can You Help Me, Please?", LT "Ar galite man padėti?".
- **Goal** "Paprašyk pagalbos: pametei piniginę."
- **Cover:**
  - "Excuse me, can you help me? I've lost my wallet"; "When did you last have it?" (at the café, when I paid)
  - "Stay calm"; describe it; "Where's the nearest police station?"; "Could you show me on the map?"
  - "Should I call 911?" → only for emergencies; thanks
- **Twist:** someone found it.

### s91b-police · song 91 · ch 7, order 2
- **Location** `police` · **NPC** `reyes`.
- **Title** EN "I'd Like to Report a Theft", LT "Noriu pranešti apie vagystę".
- **Goal** "Pranešk policijai apie pamestą piniginę."
- **Cover:**
  - "I'd like to report a stolen / lost wallet"; what happened; when and where (the farmers' market, around 11)
  - describe it (brown, leather, small); what was in it (cards, driver's license, about $40 cash)
  - "Please fill in this form"; name (spell); phone number; "We'll call you if it's found"
  - "Should I cancel my cards?" → call your bank; case number (`write`)

## Batch F: people

### s63-party · song 63 "So, Where Are You From?" · ch 5, order 1
- **Location** `sophies-house` · **NPCs** `sophie` (host, opens: "Hi! So glad you came! Come meet Mark!"), `mark` (informal).
- **Title** EN "So, Where Are You From?", LT "Tai iš kur tu?".
- **Goal** "Susipažink su Marku Sofijos vakarėlyje: prisistatyk, papasakok apie save, paklausk jo ir apsikeiskite numeriais."
- **Cover:**
  - names, nice to meet you; how do you know Sophie (work / neighbors / a dance class)
  - where are you from: a country entity list with LT names; react to Lithuania (by the sea)
  - what do you do: a jobs list of about 40 with LT forms
  - how long have you been here; do you like it so far; what do you do for fun (hobbies list); what are you reading
  - Mark's answers when asked back ("And you?")
  - "Can I get you another drink?"; "Oh, look at the time!"; let's swap numbers; "It was great to meet you"
- Reciprocity matters: Mark asks, the learner answers and asks back, and Mark answers.

### s83-invite-call · song 83 "Are You Free on Friday?" · ch 5, order 2 · `mode: "phone"`
- **Location** `phone` · **NPC** `lizzie` (friend, informal).
- **Title** EN "Are You Free on Friday?", LT "Ar turi laiko penktadienį?".
- **Goal** "Pakviesk Lizzie į koncertą penktadienį ir susitarkite dėl laiko ir vietos."
- **The LEARNER invites.** Cover:
  - "Hi Lizzie, it's …!"; "What are you up to this weekend?"
  - "I've got two tickets for a concert on Friday — do you want to come?"
  - Lizzie asks what time it starts (doors at 8), where to meet (outside the station), can she bring her sister
  - "I'll text you"; declining / another day (Lizzie is busy Saturday: "Maybe another time"); "Talk soon!"

### s84-date · song 84 "Can I See You Again?" · ch 5, order 5
- **Location** `the-pier` · **NPC** `sam`; `npcs: ["emma"]`.
- **Title** EN "Can I See You Again?", LT "Ar galiu tave vėl pamatyti?".
- **Goal** "Pasikalbėk per pirmąjį pasimatymą ir susitarkite susitikti dar kartą."
- **The partner** is `c.player.datePartner` ("sam" / "emma"). Default: "emma" if `c.player.gender === "m"`, else "sam". Call `c.speaker(partner)` in `start`. Keep the lines gender-neutral in English; use `{sm:|sf:}` in Lithuanian for the speaker's gender.
- **Cover:**
  - greetings and compliments ("You look great"); sorry I'm late
  - drinks; tell me about yourself; hobbies; travel ("Have you ever been to Italy?"); music
  - "Let me get this" / "Let's split it"; "Can I walk you home?"
  - "I had a really nice time"; "Can I see you again?" / "Are you free on Saturday?"; "Text me when you get home"
- Keep it warm, light and respectful.

### s85-dinner · song 85 "Thanks for Having Me" · ch 5, order 4
- **Location** `dans-house` · **NPCs** `dan` (host), `nora` (informal).
- **Title** EN "Thanks for Having Me", LT "Ačiū, kad pakvietėte".
- **Goal** "Pabūk svečiuose vakarienėje: padėkok, pagirk maistą ir mandagiai atsisveikink."
- **Cover:**
  - arriving with flowers / wine / dessert ("These are for you" → "Oh, you shouldn't have!"); "Let me take your coat"; drink offer
  - "Can I help with anything?"; compliments ("It smells amazing", "This is delicious"); "Could you pass the salt?"
  - seconds ("Would you like some more?" → "Just a little" / "I'm full, thanks"); "You have a lovely home"; "Did you make this yourself?"
  - leaving ("I should get going", "Thanks for having me", "Get home safe")

### s86-old-friend · song 86 "Long Time No See" · ch 5, order 3
- **Location** `town-square` · **NPC** `lucy` (old school friend, informal).
- **Title** EN "Long Time No See", LT "Seniai nesimatėme".
- **Goal** "Pasikalbėk su sena drauge: papasakok, kaip gyveni, ir susitarkite palaikyti ryšį."
- **Cover:**
  - "Oh my gosh, is that you?"; long time no see; "You haven't changed a bit"
  - "How have you been?"; "What have you been up to?"; news (moved, new job, learning English, married, kids)
  - her news (moved back, got married, twins); ask about family; mutual friend Mike's restaurant
  - "Have you got time for a coffee?"; "Let's keep in touch"; swap numbers; "It was so good to see you"
