# The world's sounds

Quiet sounds under the voices: the game should sound like a place, and never get in the way of listening or
speaking. Code: `src/game/audio.ts` (the sounds), `src/game/soundscape.ts` (what is underfoot, how loud a place is
where the player stands, the recordings), `src/game/townSounds.ts` (what this edition's town sounds like; the
Spanish edition has its own), `src/game/Game.ts` (where they are asked for).

## What there is

| Sound | When | How it is made |
| --- | --- | --- |
| The jump | taking off | a short springy note that rises, with a breath of air (two plain waves; after no game's or show's sound) |
| The landing | coming down | a soft thud of the surface landed on; a splash in the shallows |
| Footsteps | each step, in time with the legs | filtered noise by surface: stone, sand, grass, boards (a low knock), tiles (a tiny tap) |
| Wading | steps in the water, walking into the sea | splashes and a small wave (the shore's own code) |
| The surf | within 38 m of the waterline, louder towards it | a recorded loop, `public/sfx/sea.mp3` |
| People's murmur | in the market and the cafés, on the square, around Puerto Colibrí's market hall | a recorded loop, `public/sfx/market.mp3` |
| Birds | among the trees, away from the sea | chirps; in Puerto Colibrí also a few seconds of `public/sfx/birds.mp3` now and then |
| Gulls, a buoy's bell, a boat's horn | by the sea and the pier | synthesized, at random moments |
| A cup on a saucer | in the cafés | synthesized |
| A few far-off notes | on the square, not under the radio | synthesized, never a known tune (a marimba's in Puerto Colibrí) |

## The rules

- **Under the voices.** At the waterline the surf is about 10 to 14 dB under a voice; steps are far lower.
- **Silent when something must be heard or said.** Everything of the world goes through one bus that falls silent
  in a conversation or with a panel open, while a voice plays, while the microphone listens (at once), and on a
  hidden page (`audio.hush`). Effects (a task done, a door, a coin) have a bus of their own.
- **Under the radio** the loops play at 40 %, and the square's own notes not at all (`audio.underRadio`).
- **The settings.** "Garsumas" (volume) scales everything; "Garsai" (Sounds) scales the world's sounds and the
  effects beside the voices (0: none).
- **Small and late.** The three recordings are about 70 kB each (MP3, mono, 64 kbit/s) and are fetched the first
  time they are wanted. A loop repeats between two points inside the file (`LOOPS` in soundscape.ts), with a little
  of the loop before and after them, so the seam is silent whatever padding the decoder adds.

## The recordings

Generated on 14 Nov 2026 with Higgsfield's sound-effect model (Mirelo SFX), 10 s each, 2.5 credits each (four
clips, 10 credits; a harbour clip was not used: one loud creak in it would have come round every ten seconds).
The sea and the market were made into loops by cross-fading the tail into the head; the birds are played a few
seconds at a time from a different place in the recording.

## Checking them

`window.__ew.audio` is the audio system in the browser. A meter on `audio.worldBus` (an AnalyserNode) gives the
level in dBFS with the player moved about (`game.enterZone("town", { x, z, rot })`); that is how the mix was set.
