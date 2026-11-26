# Maple Harbor backpack copy

Maple Harbor displays Lithuanian controls, English targets with their stored Lithuanian helpers, and bilingual keepsake names. English control labels below serve as the editorial reference. Counts in braces are values supplied by the game.

| Location | American English | Lithuanian |
| --- | --- | --- |
| Town and picture-mode tool | Backpack | Kuprinė |
| Tool with due badge | Backpack ({count}) | Kuprinė ({count}) |
| Inside cover and tab list | My notebook | Mano užrašinė |
| First tab | Saved cards {count} | Išsaugotos kortelės {count} |
| Second tab | Practiced phrases {count} | Kartotos frazės {count} |
| Third tab | Keepsakes {count} | Suvenyrai {count} |
| Source context | Source sentence | Sakinys, iš kurio išsaugojai kortelę |
| Friday card source tab | Phone conversation | Pokalbis telefonu |
| Reveal and hide | Show meaning / Hide meaning | Rodyti reikšmę / Slėpti reikšmę |
| Next batch | Show more | Rodyti daugiau |
| Sound controls | Hear phrase / Hear source sentence | Klausytis frazės / Klausytis viso sakinio |
| Recording status | Audio unavailable | Garso įrašas nepasiekiamas |
| Manifest retry | Try again | Bandyti dar kartą |
| Recording retry | Try again · Hear phrase / Try again · Hear source sentence | Bandyti dar kartą · Klausytis frazės / Bandyti dar kartą · Klausytis viso sakinio |
| Practiced phrase actions | Save to cards / Save all / In your cards | Išsaugoti kortelėse / Išsaugoti visas / Tavo kortelėse |
| Practice count and saved indicator | × {count} / × {count} · In your cards | × {count} / × {count} · Tavo kortelėse |
| Due round | Review due cards · {count} | Kartoti korteles · {count} |
| Reveal and grades | Reveal answer / Got it / Again | Rodyti atsakymą / Pažymėti kaip išmoktą / Kartoti dar kartą |
| Empty deck | Save a word or sentence in a conversation. | Pokalbyje išsaugok žodį arba sakinį. |
| Next due date | Next review · {date} | Kitas kartojimas · {date} |
| Empty practice list or source | Your practiced phrases will appear here. | Čia rasi pokalbiuose vartotas frazes. |
| Empty pockets | Finish a conversation to get a keepsake. | Užbaik pokalbį ir gausi suvenyrą. |
| Pocket source list | View phrases | Peržiūrėti frazes |
| Course link | Open course cards | Atverti kurso korteles |
| Navigation | Back / Close | Grįžti / Uždaryti |
| Main Street bench | Sit on the bench / Stand up | Prisėsti ant suolelio / Atsistoti |
| Save confirmation in a conversation | You’ll find the card in your backpack. | Kortelę rasi kuprinėje. |
| Conversation summary | New phrases in your notebook: {count} | Naujų frazių užrašinėje: {count} |
| Help, with the Backpack icon | Tap any English word to save it to your cards and review it later (Backpack → Saved cards). | Paspausk bet kurį anglišką žodį – galėsi jį išsaugoti kortelėse ir vėliau pakartoti (Kuprinė → „Išsaugotos kortelės“). |

## Existing card tools and review copy

| American English | Lithuanian |
| --- | --- |
| Download cards (JSON) | Atsisiųsti korteles (JSON) |
| Delete card / Delete? / Yes, delete | Ištrinti kortelę / Ištrinti? / Taip, ištrinti |
| Level {box} of 5 | Lygis {box} iš 5 |
| today / tomorrow / the day after tomorrow / in {days} days | šiandien / rytoj / poryt / po {days} d. |
| Card {position} of {total} | Kortelė {position} iš {total} |
| Scheduled retries after the card count | {count} retry / retries | {count} pakartojimas / pakartojimai / pakartojimų |
| Current retry | Retry {turn}/{total} | Pakartojimas {turn}/{total} |
| Say it in English | Pasakyk angliškai |
| Great! / All done for today! | Puiku! / Šiandien viskas! |
| You reviewed {count} card(s). | Pakartojai {count} kortelę / korteles / kortelių. |
| Got it – {known}, again – {again}. | Mokėjai – {known}, dar kartą – {again}. |
| Review more ({count}) / Back to cards | Kartoti dar ({count}) / Grįžti į korteles |

## Pocket names

These are the owner-approved English names for the backpack and town hall. Each pocket shows the English name and its Lithuanian nominative from `KIND` in `src/content/keepsakes.ts`. Each source button uses its situation’s Lithuanian title.

| American English | Lithuanian |
| --- | --- |
| Pool chalk | Biliardo kreida |
| Passport stamp | Antspaudas pase |
| Boarding pass | Įlaipinimo talonas |
| Baggage claim ticket | Bagažo kvitas |
| Ticket | Bilietas |
| Room key | Kambario raktas |
| Apartment key | Buto raktas |
| Car key | Automobilio raktelis |
| Town map | Miesto žemėlapis |
| Coffee cup | Kavos puodelis |
| Receipt | Kvitas |
| Shopping bag | Pirkinių maišelis |
| Business card | Vizitinė kortelė |
| Employee badge | Darbuotojo kortelė |
| Note | Raštelis |
| Flower | Gėlė |
| Balloon | Balionas |
| Water bottle | Gertuvė |
| Prescription | Receptas |
| Wallet | Piniginė |
| Small slate pebble | Mažas skalūno akmenėlis |
| Oak leaf | Ąžuolo lapas |

## Recordings and editorial check

The friend-register card reads “Are you free on Friday?” / “Ar turi laiko penktadienį?” The MH v2 manifest has the female and male coach takes at speed 1 under `5fb44353be01` and `e6086c3c84ee`. The written target and the saved spoken form can differ, for example when a sentence contains a price.

TODO for the owner and editor — listen to both Friday takes in an authorized course session and review the EN/LT ledger before release. Controls, helpers and entries without a matching take remain text-only. Any future recording work needs the owner.
