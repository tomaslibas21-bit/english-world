# Owner review: Lithuanian and interlinear decisions

The conversations were written by AI authors who followed TOMAS-INTERLINEAR-v2, LIBRARY-MINIMUM-UNIT-v3 and CONVENTIONS.md. Every file passes the checker: unit counts, registered merges, flags on non-article dashes, NLU tests, simulations and random-order crash tests. The checker can't judge Lithuanian quality, so these are the decisions the authors themselves marked as uncertain. Please confirm or correct them. Each file can be proofread with:

```bash
npx tsx tools/review.ts s84-date            # every simulated conversation, English + natural Lithuanian
npx tsx tools/review.ts s84-date --units    # plus the interlinear units
GENDER=f npx tsx tools/review.ts s84-date   # female player forms
```

## Conventions applied across files (please confirm)

- **Stranded prepositions** ("Where are you from?", "What floor is it on?") use the bracket convention: `[iš kur]`, `[kuriame]`. Some files instead attach the preposition to the question word and gloss the stranded word "—" with a flag ("Iš kurio", "Prie kurios"). Both read correctly; the bracket form is the documented one.
- **The copula absorbed by a verb** ("I'm late" → `Aš | vėluoju`; "I'm running late" → `Aš | — | vėluoju`) is flagged.
- **Elliptical answers** carry the missing verb in brackets: "No, I'm not." → `Ne, aš [nevežu]`; "I will" → `Aš [parašysiu]`.
- **Dative subjects:** "I love it" → *man labai patinka*; "I'll need" → *man reikės*.
- **Times:** 12-hour in English, 24-hour in Lithuanian (4:30 PM → 16:30).
- **Prices:** "$59.99" → *59,99 $*; "$1,400" → *1 400 dolerių*.
- **Addressing the player:** "dear" / "hon" → *{mielasis | mieloji}* by the player's gender.
- **Plural *jūs*:** used when the learner speaks to two hosts (s85) or a whole team (s89).
- **Gender in hints:** `{m|f}` = the learner, `{sm|sf}` = the NPC spoken to (now documented in AUTHORING.md).

## Per part

**s62 Visitor Center (Chuck)**
- Place names are one unit with a Lithuanian noun added: "Sunny Cup" → *kavinę „Sunny Cup“*. Street names likewise: "Oak Avenue" → *Oak Avenue gatvėje*.
- "out the door" → *išėję pro*.

**s63 Party (Sophie, Mark)**
- "Where are you from?" → `Iš kur | esi | tu | [iš]` (bracket convention); "How long have you been here?" → *Kiek laiko — tu esi čia*, with the perfect "have" as a flagged dash.
- "Let's swap numbers" and other "Let's X" lines are glossed with a Lithuanian imperative (*apsikeiskime*).
- "Oak Avenue" is translated *Ąžuolų alėjoje* here, while other files keep it in English.
- The song line "Here's to dancing badly!" became "Here's to bad dancers!".
- The player's job now follows the player's gender through the new `ltF` feminine forms ("Dirbu slaugytoja"). Mark's own job uses the masculine list.

**s64a–c Airport (Kevin, Grant, Nina)**
- "quart-size" → *litro talpos*, with a flag: a quart is 0.95 l.
- Gate numbers keep English order in the gloss (*vartai 8*); the natural line uses *8-ieji vartai*.
- Commands without verbs: "out" → *išimkite*; "belts off" → *nusijuoskite*; "Feet on the footprints, arms up" → accusative (*Pėdas… rankas aukštyn*).
- "power bank" → *išorinė baterija*; "You're all set" → *Jums viskas sutvarkyta*.
- **Content change:** Grant says "Your shoes can stay on", following the TSA's July 2025 change.

**s65a/b, s66, s68 Arrival (Diaz, Priya, Vinnie, Olivia)**
- "a | little" → *— | truputį*; "king bed" → *didele dvigule lova*.
- "upgraded you" → *perkėlėme jus*. This gloss loses the "better room" sense; the natural sentence keeps it.
- ESTA is written without quotes; brands are quoted („Harborview“, „Samsonite“).
- Merges: "where to", "for a living", "hop in", "buckle up", "give or take", "in the meantime", "just in case".

**s67a Tickets, s71a/b Car rental and gas (Walter, Jake, Dot)**
- "I'm … sorry" → *Aš … atsiprašau*, flagged.
- "How is everything?" is glossed with *patinka*; "coach" → *ekonominė klasė*.
- Pump numbers: *kolonėlė Nr. 3*; "Seaside" is left undeclined.
- Where the Lithuanian gloss would add a comma that the English unit lacks, the comma is dropped (the mirror rule). The café's `Aš | manau,` keeps its comma, so the two files are inconsistent. Please pick one rule.

**s69 Rosa, s70 Museum (Ben, Harold)**
- "tacos" → *tako* (not declined); "audio guide" → *audiogidas* (one unit).
- The exhibition is called *„Nakties spalvos“*.

**s73 Restaurant (Lucia, Marco)**
- Tipping follows US practice: 15–20% on the card reader. The goal completes when the bill is paid.

**s74 Clothes, s75 Pharmacy, s77 Salon (Chloe, Mr. Okafor, Jessie)**
- Colors are genitive + *spalvos* ("in blue" → *mėlynos spalvos*), so they don't agree with the garment.
- "this" meaning the model → *tokių*.
- shirt → *marškiniai*, T-shirt → *marškinėliai* (plural only).
- Sizes: "I'm a medium" → *Aš esu — M dydžio*.
- "gift receipt" → *dovanos čekis* (not *dovanų čekis*, which means a voucher); "store credit" → *parduotuvės kreditas*.
- "six a day" → *šešių per dieną*, flagged.
- "layers" → *pakopos* (the song said *kopėtėlės*); "inch" → *colis*, with a centimetre tip.
- **Content change:** dosages follow real US labels (ibuprofen up to six a day), not the spec's "eight a day".

**s76, s78, s79, s80 Dentist, bank, post, support (Linda, Aaron, Gloria, Claire)**
- "photo ID" → *dokumentas su nuotrauka*; "this is" on the phone → *klauso*; "you're breaking up" → *ryšys trūkinėja*.
- "proof | of address" is split, giving *įrodymas adreso* (reversed but not misleading).
- "account number" → *kliento numeris*; routing number → *maršruto numeris* in the gloss, *banko kodas* in the natural line.
- Claire → *Kler*. Distributive "a" ("1.5 percent a year") → *per*.

**s81 Apartment, s82 Neighbor (Mr. Patel, Rita)**
- "I had some friends over" → `Pas mane | buvo | — | draugų | —`. This is the gloss the author was least sure of.
- "security deposit" is split (*garantinis | užstatas*).
- Mr. Patel → *ponas Patelis* (*pono Patelio*). "one-bedroom" → *vieno miegamojo butas*.

**s83–s86 Invite, date, dinner, old friend (Lizzie, Sam/Emma, Dan and Nora, Lucy)**
- "I'd love to" → *mielai*; "it's on me" → *aš vaišinu*; "shouldn't have" → *nereikėjo*; "got married" → *vedžiau / ištekėjau*.
- Hobbies are glossed as infinitives ("cooking" → *gaminti*).
- s86's intro says Lucy was an American exchange student at the learner's school in Lithuania. **Please confirm this framing.**

**s89–s91 Video call, boss, lost wallet, police (Kate/Paul/Sara, Mr. Harris, Mrs. Lee, Officer Reyes)**
- Call phrases are single units: "on mute" (*nutildytas*), "you're breaking up" (*tu trūkinėji*), "go ahead" (*kalbėk*), "loud and clear"; "Let's X" → *duokime*, *pradėkime*.
- "ago" keeps the English order and is flagged (*— valandą prieš*).
- "I'm running late" → `Aš | — | vėluoju` (flagged); in "I'll be about 20 minutes late", "late" gets a flagged dash.
- "Can" with hearing and seeing verbs: *Ar* in questions, "—" in statements (flagged); "Yes, we can." → *[girdime]*.
- Names: *Harrisas / Harisai*, *Keitė*, *Paulas*, *Reyesas*.
