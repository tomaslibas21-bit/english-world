# Union Station public phone · EN / LT review

The station sign is English. The actions, instructions and navigation below are Lithuanian in Maple Harbor. They are printed UI. Only the eight English dialogue lines in the recording table play.

| Use | American English | Lithuanian |
| --- | --- | --- |
| Sign and touch control | Public Phone | Viešasis telefonas |
| World prompt | Use public phone | Naudotis viešuoju telefonu |
| Book and dialog name | Town directory | Miesto telefonų knyga |
| Directory section and practice heading | Practice calls | Mokomieji skambučiai |
| Directory section | People in town | Miesto žmonės |
| Place heading | Found in town | Galima sutikti mieste |
| Contact without practice | No practice call available | Mokomojo skambučio nėra |
| Lizzie’s practice topic | Invite a friend | Pakviesti draugę |
| Mr. Harris’s practice topic | Call about being late | Pranešti apie vėlavimą |
| Main action | Start practice call | Pradėti mokomąjį skambutį |
| Personal calls heading | Phone | Telefonas |
| Video label in the directory and personal phone | Video call | Vaizdo skambutis |
| Outstanding missed call | Open on my phone | Atverti savo telefone |
| Accessible callback destination | Open on my phone · {situation title} | Atverti savo telefone · {situacijos pavadinimas} |
| Speaker label | Your turn | Tavo eilė |
| Turn label | {speaker} · {turn} / 4 | {kalbėtojas} · {replika} / 4 |
| Private reply prompt | Try saying it aloud. | Pabandyk pasakyti garsiai. |
| Model | Hear model reply | Klausytis atsakymo pavyzdžio |
| Contact replay | Replay line | Dar kartą klausytis eilutės |
| Advance | Next turn | Pereiti prie kitos replikos |
| Translation | Show meaning | Rodyti reikšmę |
| Translation | Hide meaning | Slėpti reikšmę |
| Finish | Practice complete | Praktika baigta |
| Restart | Practice again | Kartoti skambutį |
| Configured course link | Open in the course · {mission title} | Atverti kurse · {misijos pavadinimas} |
| S83 mission | Making plans | Planai ir kvietimai |
| S90 mission | Running late | Vėlavimas |
| Recording failure | Audio unavailable | Garso įrašas nepasiekiamas |
| Retry recording or script | Try again | Bandyti dar kartą |
| After returning to the page | Resume | Tęsti |
| Script loading (existing UI copy) | Loading conversation… | Kraunamas pokalbis… |
| Script load failure (existing UI copy) | Couldn’t load the conversation | Nepavyko atsisiųsti pokalbio |
| Leave practice | Hang up | Padėti ragelį |
| Return from details | Back to directory | Grįžti į telefonų knygą |
| Close book | Close | Uždaryti |

## Spoken turns

The fixed first line or hint item in each source supplies the English units and the natural Lithuanian sentence. Keys are for speed 1 in `public/audio-v2/manifest.json`. For a learner turn the female coach key precedes the male key. All takes below are manifest-verified and **unheard in this review**. TODO for device review: listen on the authorized game surface.

| Speaker | Authored source | English recording | Natural Lithuanian | Recording keys |
| --- | --- | --- | --- | --- |
| Lizzie | S83 · hello_q[0] | Hello? | Alio? | 8414938a6ee1 |
| Learner | S83 · free/free_q | Are you free on Friday? | Ar turi laiko penktadienį? | 5fb44353be01 / e6086c3c84ee |
| Lizzie | S83 · free_yes[0] | I think so. Why? | Manau, kad taip. O ką? | 4a39bf19d87f |
| Learner | S83 · invite/inv_tickets, first fixed item | I've got two tickets for a concert. | Turiu du bilietus į koncertą. | 008f0031cc52 / 6a5b1b12a38b |
| Mr. Harris | S90 · hello[0] | Hello, this is Harris. | Alio, čia Harisas. | d3be99fe43d4 |
| Learner | S90 · late/running_late, first item | I'm running late. | Aš vėluoju. | 2b740a4fab29 / bfd047e02215 |
| Mr. Harris | S90 · ask_eta[0] | When do you think you'll get here? | Kada, Jūsų manymu, atvyksite? | 933dcda8650b |
| Learner | S90 · eta/eta_halfhour | In about half an hour. | Maždaug po pusvalandžio. | af14a40186fe / c627968cb959 |

## Existing directory text

Names and translated roles come from `src/content/npcs.ts`, including the town quest cast. Each location uses the English name and Lithuanian label in `src/content/locations.ts`. Entries use the active situation catalog’s primary and supporting people. A saved Lizzie invitation adds the actual agreed location. The current course mission labels use the situation’s Lithuanian topic, as in English Master’s mission catalog.

The seven personal-phone situations reuse their existing titles. Organization names rendered with a contact are Green Street Dental, NetWave, Brightline and Harbor Home. These proper names are the same in both languages.

| English personal-phone title | Lithuanian |
| --- | --- |
| Kind Regards, I'm Drowning | Pagarbiai, skęstu |
| I'd Like to Make a Complaint | Norėčiau pateikti skundą |
| Could You Spell That? | Ar galėtumėte paraidžiui? |
| Your Call Is Important to Us | Jūsų skambutis mums svarbus |
| Are You Free on Friday? | Ar turi laiko penktadienį? |
| You're on Mute! | Tavo mikrofonas išjungtas! |
| I'm Running Late | Aš vėluoju |
