# Game wording, answer recognition and mobile follow-up — 8 November 2026

## Conversation wording

The cafe's saved last drink retained the quantity of a previous group order. The returning greeting rendered that plural quantity with a singular article, while accepting the offer already ordered one drink. The greeting, repeat prompt and accepted order now consistently refer to one drink. Price replies likewise name the single drink whose unit price they quote, without changing the quantity in the basket.

The shared noun-phrase composer prevents `a/an` before a plural binding and avoids adding `the` to a name that already starts with it, such as The Pier. The text review matched all 39,218 published clip keys to metadata, found 44 historical plural-article variants across several drinks, and checked 36,511 current composed utterances for these wording patterns and doubled function words. None of those patterns remain in the current enumeration. All 144 combinations of supported usual drinks, sizes, temperatures and saved quantities reuse 48 existing correct greeting recordings. No MP3 was generated, replaced or deleted by this follow-up. Both Mia pronunciation repairs and Walter's repair remain intact.

Clarification requests (repeat, slower, explanation, spelling and writing) now retain an optional pending offer. Previously, asking Mia to repeat the usual could replay the right sentence but discard the offer, so the following “yes” failed to order it.

## Spoken-answer representations

The shared input normalizer preserves `%` as `percent` (including full-width forms and `per cent`), `&` as `and`, numeric degree signs with Celsius/Fahrenheit units, and numeric cent signs. A half-inch written `½` or `1/2` is recognized in measurement context; mixed `1½ inches` is also supported. Date slashes are not turned into measurement fractions.

The corpus audit compared 551 symbol variants of 547 already-parsed examples: 22 percent, 110 dollar, 418 ampersand and one half-inch variant. It found two further exact-amount gaps: “Here's $5” at the visitor centre and “I'll pay the $100” at check-in. Their patterns now accept the numeric forms while tests reject different amounts and negative payment statements. All 551 comparisons pass. Nine context-free canonical probes were excluded; these include intentionally negative examples and context-dependent replies. They are not counted as successful equivalence checks.

The reported `dream` mishearing is accepted as `trim` only through the salon's trim-request macro, including short and adjective-qualified requests. Written teaching examples and spoken models remain `trim`. Global fuzzy thresholds and negation handling are unchanged. Existing scoped sound-alike confirmation and number-slot tolerance remain in place; no speculative global substitutions were added for other ordinary words.

## Loading and mobile controls

The loading wordmark previously used a swapping webfont: at 390 px viewport width its visible width changed from about 241 to 188 px when the font arrived. One outlined EB Garamond SVG now serves the course entry, static boot and React loading screens. Its fixed aspect ratio and responsive width do not depend on webfonts. It retains an accessible loading label and existing theme colours.

The main toolbar groups its tools separately from LR, which sits below the entire group. Short screens and touch tablets use multiple tool columns so the last button stays clear of the movement controls.

The joystick supports a sustained held pointer without selection or the long-press copy menu. Pointer cancellation, capture loss, focus loss, hidden pages and unmount release its state. Selection suppression is scoped to the game canvas and movement controls. Tap-to-destination and drag-to-look remain available on the canvas.

The game-generated microphone-start chime was removed from answer listening and repeat practice. Speech capture, permission requests, visible microphone state and lifecycle safeguards are unchanged. A browser or operating-system sound, if present on a particular phone, is outside this app-generated effect.

## Green boundary scenery

The reported original location was unknown. Phone-sized boundary views reproduced a large flat green hill face. Background hills now stay at least 40 m outside the playable area on every side and have lower vertical scale, leaving more sky above them. Road, building, navigation and collision layouts are unchanged. The deterministic hill-placement regression covers the full generated sequence. This addresses the reproduced boundary effect; it does not establish that every intentionally green surface elsewhere was the owner's original report.

## Validation and limits

- Source typecheck and production build pass; 35 regression files / 692 checks pass.
- Full content check with 20 random-order paths per situation: zero errors or warnings. Fresh checks for all four changed situations also pass after the final pattern edits.
- Chrome and WebKit: 46 toolbar, hold, release, cancel, focus and runtime checks across 320×568, 390×844, 844×390, 1280×720 and 1280×800.
- Before/after captures check the boundary scenery; delayed-font loading captures retain the same wordmark dimensions after the fix.
- The recording manifest remains 39,218 entries, SHA-256 `70f96db652b7d81ac11600fd51f95ecb1149888b7cdc1d6c690a51bf84ad9845`. The three-entry repair map remains SHA-256 `ed28af052aaf8ea5911c81dc696aa6d30a662b43c4ca7d9724da7c978ae3cff4`.

The structured [wording and representation audit](GAME-QUALITY-AUDIT-2026-11-08.json) records outcomes and limits. These are bounded text, dialogue and browser checks, not an exhaustive human copy-edit of every possible branch or a physical-phone certification. No learner audio was accessed or sent to any provider for this follow-up. All development uses local code and GitHub; no Lovable AI generation or credit-consuming edit is involved.
