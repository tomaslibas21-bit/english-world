# The characters (second version, 13 Nov 2026)

Everyone in the town (the cast, the passers-by, the people in the rooms, the player) is a `Character`
(`src/game/characters/Character.ts`): built from a `Look` (`src/content/npcs.ts`) out of simple vertex-colored shapes,
baked into **one skinned mesh, one draw call a person**. The code is shared by every edition's town; each town's looks
and outfits are its own data.

## What a person is made of

- **The face**: eye whites with an upper lash line, a big dark iris with its pupil and two highlights (its own joint:
  the eyes look where the person looks), lids that shut to a curved line for a blink, a brow each (they lift and tilt),
  a closed mouth that is a stroke whose two ends follow a joint of their own (up: a smile, down: a frown), and an open
  mouth with upper teeth and a tongue that takes its width and its height separately. The iris is brown for most; blue,
  green or hazel now and then with fair skin (drawn from the look, so the same person always has the same eyes).
- **The body**: a shaped torso (hips, waist, chest, shoulders; narrower shoulders and waist and wider hips for a woman:
  `Look.female`, set from the cast's gender and for the passers-by, else guessed from the hair), upper arms and
  forearms on elbows, mitten hands with a thumb, thighs and shins, shoes with a sole and a rounded upper.
  Height, head size and seat heights are as before, so the conversation camera's framing is unchanged.
- **18 bones** standing (a skirt, a phone or something carried add one each), **24 scene nodes** (26 before: the main
  groups are their parts' bones), about **5,700 triangles** for one of the cast (5,860 before).

## What a person does

- **Breathes** at their own pace, **shifts their weight** from one leg to the other every few seconds, and holds
  themselves in their own way: grey hair or laugh lines (`Look.face.lines`) give a slight stoop and a slower pace; a
  temperament drawn from the look makes some livelier (straighter, quicker to shift, bigger gestures).
- **Looks at the learner**: `watch` is a point the game keeps on the player's head. Passers-by and people in rooms
  glance at it when it comes within `noticeWithin` meters; someone `attentive` (the player near) looks more often;
  someone `steady` (taking part in the conversation) keeps their eyes on it, with a look aside now and then as a phrase
  starts. The eyes go first, the head follows; people blink as their eyes move far. Two people chatting look at each
  other. The player looks at the person they talk with.
- **Talks** (`talk(seconds, level, vowel)`): the mouth opens with the recording's loudness and is shaped by its sound
  (`audio.vowel()`: round for "oo" and "oh", open for "ah", wide for "ee"; worked out from the same decoded buffer as
  the loudness, no extra download), closed between words. A nod and the hand's stroke land on the voice's beats; a
  gesture is chosen by the phrase (an open palm, both hands, a hand to the chest, a small explaining circle, a shrug),
  fewer while sitting or with busy hands.
- **Shows an expression** (`express(mood, seconds)`): friendly, neutral, surprised, concerned. The conversation gives
  each line its own from its words (`characters/mood.ts`, cues in English and in Spanish), then the person's own
  comes back. A puzzled reaction lifts one brow; applause shuts the eyes in a smile.
- **Waits** (the little things, one at a time, at random): a glance, the weight on one leg, a scratch of the head, the
  phone, a sip, typing, wiping; and since this version hands on the hips, a look at the wrist, a stretch of the neck;
  sitting: leaning back, crossed ankles, the phone.
- Everything is timed per person (their own breathing and swaying rates, random pauses), so a crowd never moves in step.

## Look options

Besides Maple Harbor's (hair, top, bottom, skirt, shorts, glasses, hats, aprons…): the Spanish edition's garments
(hipil, jipi, guayabera, rebozo, braid…) and, new, **beachwear**, which Maple Harbor never wears (a test keeps it so):
`sleeves: "short" | "none"`, `swim: "trunks" | "suit"`, and the accessories `sarong`, `coverup`, `sunhat`, `bucket`.
`recline` (radians) lays a sitting person back on a lounger. Who wears them is each town's data (the Spanish edition:
`theme.ts beachwear`).

## The dev page

`/lineup.html` in `npm run dev` (not part of the build), every look side by side. New parameters:
`?mood=friendly|neutral|surprised|concerned`, `?round=0…1` with `anim=talk&level=…` (the mouth's shape),
`?gesture=palm|both|chest|explain|shrug`, `?watch=x,y,z` (a point they look at), `?anim=clap`, `?recline=0.8` with
`anim=sit`, `?ids=beach` (one of each beachwear piece), and the moments `hips`, `watch`, `neck`, `back`, `ankles`.

## Cost

One draw call a person, as before. On a phone-sized screen with the CPU slowed four times, frame times at the rated
views are within the measurement's noise of the version before (see the round's notes).
