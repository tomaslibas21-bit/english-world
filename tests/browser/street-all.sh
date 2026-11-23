#!/usr/bin/env bash
set -euo pipefail

: "${WORLD_TEST_URL:?Set the English learner dev server URL}"
: "${WORLD_TEST_URL_LT:?Set the Lithuanian learner dev server URL}"
: "${WORLD_SHOTS:?Set the screenshot output directory}"

script_dir=$(cd -- "$(dirname -- "$0")" && pwd)
unset WORLD_PHONE_WIDTH WORLD_PHONE_HEIGHT

WORLD_STORAGE=puerto-colibri WORLD_LEARNER=en WORLD_SHOTS="$WORLD_SHOTS/en" \
  node "$script_dir/street.mjs"
WORLD_STORAGE=puerto-colibri WORLD_LEARNER=lt WORLD_TEST_URL="$WORLD_TEST_URL_LT" WORLD_SHOTS="$WORLD_SHOTS/lt" \
  node "$script_dir/street.mjs"
