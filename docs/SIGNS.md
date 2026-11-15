# Nothing covers a place's name (the sign check)

Every name in the town must read whole from the street: a bush, a bougainvillea, a palm's leaves, an awning, a lamp,
papel picado or a parked car in front of a sign's words is a fault (14 Nov 2026: the owner found "Estética Tijeras"
in Puerto Colibrí with a bougainvillea over its "Es").

## The tool

`src/dev/signAudit.ts` (dev only, not in the build) finds every sign in the town:

- a mesh that is a flat board with lettering drawn on a canvas (a building's sign, a standing sign, a canopy's name;
  `util.ts textTexture` names its texture after its words, so the report can say which sign it is), and
- every board of a merged sign atlas (`mesh.userData.signQuads`: Puerto Colibrí's painted signs, street names,
  stands and stalls are one mesh, `mexican.ts SignAtlas`).

For each sign it ray-casts a grid of 11 × 4 points over the lettering (the board's middle, inside its margins) from
where a player sees it, and counts the points where the ray meets anything else of the town first:

- **eye**: standing in the street in front, 1.6 m up, 4, 7 and 10 m off, straight on and 18° and 35° to either side;
- **cam**: where the follow camera stands when the player walks up to it (camera.ts `FOLLOW`: 10.2 m behind the
  player, 6.5 m up), 12 and 16 m off, straight on and 25° to either side. A phone held upright uses the same arm (only
  the lens is narrower), so what hides a sign on a computer hides it on a phone.

A viewpoint is left out where it is not open street (the player could not stand there: inside something, off the
town's ground). **front** is the median hidden share over the viewpoints up to 25° aside; a sign over the limit
(5%) is a fault. **worst** is the worst single viewpoint (a lamp post can hide a sliver from far to one side; that is
not a fault). The report also names what hides it most.

The other way round, each sign is flagged when it **faces a wall** (its front is right against something solid),
its lettering is **in a wall**, it **floats** (nothing behind it within 0.8 m and nothing under it within 0.6 m), or
there is **no view** of it at all from open street.

## Running it

```bash
WORLD_PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node tests/browser/signs.mjs --out=../signs-out
```

On `spanish-edition` add `WORLD_STORAGE=puerto-colibri`. It starts its own dev server from the checkout
(`--port=5291` by default), prints the signs over the limit (`--all`: every sign), writes `signs.json`, and takes a
picture of each sign over the limit or flagged (and of any named with `--show=Name,Name`) from the follow camera's
place at computer (1280 × 800) and phone (390 × 844) size. `--strict` fails when any sign is over the limit.

From the browser console of a running game:

```js
(await import("/src/dev/signAudit.ts")).signAudit(window.__ew.game.town).filter((r) => r.front > 0.05)
```

## Fixing

Move what covers the words (beside or below the sign, keeping the street's look: greenery is moved, not removed),
or trim it, or nudge the sign; then run the check again.
