# Puerto Colibrí — the Spanish edition

The game for English speakers learning Spanish, built from the same engine as Maple Harbor (the English edition for
Lithuanian speakers). Start here.

| File | What it is |
|---|---|
| [PLAN.md](PLAN.md) | phases, who does what, the acceptance gate, how work comes back for review, budget, open questions |
| [EDITIONS.md](EDITIONS.md) | how one engine builds two editions (the overlay), the commands, what the Spanish edition does differently |
| [STYLE.md](STYLE.md) | the owner's decisions, usted/tú, glosses, money and time, the glossary, names and places |
| [AUTHORING-ES.md](AUTHORING-ES.md) | how to write a Spanish conversation (with `AUTHORING.md`) |
| [BRIEFS.md](BRIEFS.md) | a brief for each of the 47 conversations still to write, in batches |
| [TOWN.md](TOWN.md) | the town's restyle: what is done (the zócalo and the mercado) and the tasks still to do |
| [HANDOFF-SOL.md](HANDOFF-SOL.md) | the prompt for the executor's trial conversation |
| [REPORT.md](REPORT.md) | the first stretch's report for the owner, with screenshots |

The models: `src/editions/es/content/situations/s72-cafe.ts`, `s32-mercado.ts`, `s66-taxi.ts`.

Try it: `VITE_EDITION=es npm run dev -- --port 8094`, open http://localhost:8094.
