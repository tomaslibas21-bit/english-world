# Batch 5 browser checks

Run from the worktree root. The scripts use an existing Playwright installation with Chromium and WebKit. In the test terminal, set the path to that installation and the screenshot directory.

```sh
export WORLD_PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs
export WORLD_SHOTS="$PWD/life-shots"
export WORLD_BROWSER_CHANNEL=chromium
run_life() {
  node tests/browser/reacts.mjs &&
  node tests/browser/texts.mjs &&
  node tests/browser/radio-spots.mjs
}
```

Start the matching Vite server in a separate terminal. The radio script serves its own song and recording fixtures.

| Profile | Server command |
| --- | --- |
| Maple Harbor | `VITE_EDITION=en VITE_LEARNER= VITE_RADIO_INDEX=/songs/index.json VITE_RADIO_FILES=/radio-files npm run dev -- --port 8310 --strictPort` |
| Puerto Colibrí, English learner layer | `VITE_EDITION=es VITE_LEARNER= VITE_RADIO_INDEX=/songs/index.json VITE_RADIO_FILES=/radio-files npm run dev -- --port 8311 --strictPort` |
| Puerto Colibrí, Lithuanian learner layer | `VITE_EDITION=es VITE_LEARNER=lt VITE_RADIO_INDEX=/songs/index.json VITE_RADIO_FILES=/radio-files npm run dev -- --port 8312 --strictPort` |

Run the matching command in the test terminal.

```sh
WORLD_TEST_URL=http://127.0.0.1:8310 WORLD_STORAGE=english-world WORLD_LEARNER= WORLD_VARIETY=default run_life
WORLD_TEST_URL=http://127.0.0.1:8311 WORLD_STORAGE=puerto-colibri WORLD_LEARNER= WORLD_VARIETY=neutral run_life
WORLD_TEST_URL=http://127.0.0.1:8312 WORLD_STORAGE=puerto-colibri WORLD_LEARNER=lt WORLD_VARIETY=neutral run_life
```

Use `WORLD_VARIETY=default` for Mexican Spanish or `WORLD_VARIETY=spain` for Spain. Screenshots in `$WORLD_SHOTS` start with `mh-lt-`, `pc-en-`, or `pc-lt-`.
