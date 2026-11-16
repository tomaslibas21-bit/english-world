# The conversation's picture and the first minute (16 Nov 2026)

Item A2 of the 16 Nov review: the first conversation showed the learner's backpack over the officer's face, the view
never moved, and the first thing after "Start" was a seven-step manual. Both towns (`main`, `spanish-edition`).

## The conversation's camera (`src/game/talkShot.ts`, `Game.aimTalk` / `talkView` / `fitTalk`)

- **Over the learner's shoulder, from near.** Before its older framings, `fitTalk` tries `shoulderShots`: the camera
  3.3 m from the two (further if they stand apart), turned 46°, 58°, 36°, 70°, 82° away from the line behind the
  learner, on either shoulder, 17° down; then a step further out, and so on up to the theme's `talkCamera.max`. The
  first that passes every check is taken:
  - everyone's head and chest in the part of the screen the conversation leaves free (the old `fits`, with the phone's
    strip rules as they were; the learner, in front, may be cut by the picture's edge);
  - nobody's figure between the camera and a face (`covers`: the learner's own, and anyone standing about; the whole
    face, since the figures' heads are large);
  - outdoors nothing solid in the way (the old `seen`); in a room the camera inside its walls or out through its open
    front, and no part of the room between it and a face or the learner (a ray against the room's own meshes; glass
    is looked through to a face, but not right in front of the lens, nor to the learner).
- **Which shoulder first:** in a room, the one towards its open front (if the two stand across it); on a wide screen,
  the one that puts the learner at the picture's left; else the side the camera is on.
- **The older framings stay as the fallback**, now also refusing a covered face. If nothing at all shows a face past
  the learner, the learner's figure is hidden for the talk (`Shot.covered`): never met in the 50 conversations.
- **It turns to whoever speaks** (`aimTalk`, from the session's `npcTalk`): each of the conversation's people within
  `talkCamera.reach` has their own framing, found once; people standing within 2.6 m of each other share one. Someone
  more than 5 m from the learner is framed alone. The learner turns to them too.
- **It leans in** a tenth of the way while the other person speaks, and eases back (`talkLean`), where everyone still
  fits from there.
- The grotto (Puerto Colibrí, `fitTalkWild`) is as it was: its own search already keeps the learner out of the way.

## The first minute (`src/game/flyover.ts`, `src/game/coach.ts`, `Hud.tsx` Flight, `Guide.tsx`)

- **A first visit** (nothing saved of where the learner was) opens with a 6.5 s flight over the town along the
  theme's `flyover` points, down to the airport, with the town's name and one sentence of what to do first. Any key,
  a tap or a click ends it (`Game.endFlight`). Not for someone whose device asks for less motion. Then the airport,
  the task card, and the hint about walking. No list of situations and no manual on top of the town.
- **Later visits** open with the list of situations, as before.
- **The guide's hints come when their thing first matters**, one at a time, each once (`progress.coach.seen`):
  walking as the town opens; talking the first time one stands by somebody; the car, the boat and the sea the first
  time one comes up to them; jumping after 25 m on foot, the radio after 120 m, running after a long walk. A hint goes
  when the learner does it, with "Gerai", or after 25 s; done before its hint ever came, it never comes. "Daugiau
  nerodyti" ends them all (as a guide finished before 16 Nov does: `progress.coach.done`).
- **Everything they say stays reachable:** "Kaip žaisti?" (the ? button) has "Kaip judėti mieste?" with every hint,
  the keys and the choice of pictures or 3D, and "Rodyti patarimus iš naujo"; the list of situations has both the
  manual and that section, folded. The keys' strip at the bottom of a computer's screen is gone (its keys are there).

## Tests

- `tests/talk-shot.test.ts` (the geometry, the flight's path), `tests/coach.test.ts` (the hints).
- `tests/browser/talk-view.mjs`: the real game at 1280×800, 375×812 and 375×667: five conversations from the list and
  walked up to from three sides, two with a second speaker, and the first minute (the flight, its end by a key or a
  tap, the landing, the help, the next visit).

`tools/en-tour.mjs` / `tools/es-tour.mjs` (not part of the test run) still judge "every speaker in the picture at
once": since the camera turns to whoever speaks, that now holds speaker by speaker, and the tours' reports of a
speaker "out" at a conversation's start are expected for people standing apart.
