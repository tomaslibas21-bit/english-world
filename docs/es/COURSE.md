# Puerto Colibrí in Spanish Master English (phase 6)

The Spanish edition is played inside the course Spanish Master English (GitHub `tomaslibas21-bit/spanish-master-english`,
the Lovable app `lithuanian-english-reading-bridge`), as Maple Harbor is inside English Master. The course's own
`docs/GAME.md` describes its side in full: the way in (`/play`, behind the course gate), the lock (the game's page and
its voice clips only with the course's files token), the phrase cards, and the course's songs and stories each
conversation fits (`scripts/game/game-links.json`).

## The export

```sh
npx tsx tools/export-sme.ts <spanish-master-english checkout>
```

- builds this repository with `VITE_EDITION=es` for the base `/game/`, the clips from
  `https://audio.dvikalbesdainos.lt/spanish-master-en/game/audio-es/` (that course's files Worker), words saved into the
  course's flashcards (`VITE_CARDS_TARGET=fluentsteps`: the course keeps English Master's storage key and card format),
  a home button back to the course (`VITE_BACK_URL=/`), and neutral Latin American Spanish until the learner chooses
  (`VITE_DEFAULT_VARIETY=neutral`, `src/state/variety.ts`; the game on its own starts in Mexican Spanish). The choice
  stays in the game's key `puerto-colibri-variety`, which the course reads too: its game flashcards come in three decks
  (México, Latinoamérica, España, the same card ids) and show the one chosen;
- replaces the course's `public/game/`: the code, `scenes-es/` (without `ref/`), `title/`, and of the clips only their
  list (`audio-es/manifest.json`, `repair-versions.json`); Maple Harbor's `audio/`, `audio-v2/` and `scenes/` never go;
  the course's own `public/game/fs-theme.css` is kept; `version.json` records the branch and commit, the clips listed
  per voice set (`es_` Mexican, `esn_` neutral, `esp_` Spain's: all three in the one `audio-es/` folder and manifest,
  counted from `~/puerto-colibri-voicing/lines.json` when it is there) and the Spanish it starts in;
- refuses a checkout that is not that course (it needs `workers/files/wrangler.spanish-en.jsonc`).

Nothing in it touches the English edition or its English Master export (`tools/export-fluent-steps.ts`): the
fingerprint stays identical.

The course runs it together with its other steps: `scripts/game/reexport.sh <this checkout>` (the export, the themes
and the deployment-pin guard in the page, the phrase cards and the conversations' list with their songs). Run the
export from a checkout whose `public/audio-es/manifest.json` is the final one (after `install`): the clips the manifest
lists are what the course's `scripts/game/upload-game-clips.mjs` uploads, from `~/puerto-colibri-voicing/audio-es/`.
