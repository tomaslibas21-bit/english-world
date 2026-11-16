// What the grotto's glyph stones say (16–17 Nov 2026; the owner: "can we make them more vibe of the magical cenote,
// not about a latte?"). Before, each stone said one of the learner's own phrases from the town (café orders, greetings).
// Now every stone has its own line about the place it stands in: the water, the roots, the light, the stars, the
// aluxes, the old Maya, the way on. Short, A1–A2, the same words in the three Spanishes (no vosotros/ustedes, no
// regional words; the imperatives are tú, as the aluxes speak), and still Spanish one can use. Each has its meaning in
// English (SME, the English edition's helper) and Lithuanian (es-lt), and a word-by-word gloss in both, for the
// card's words once shown.
// Spoken in the learner's coach voice (es_/esn_/esp_coach_m|f): tools/es-voices/lines-es.ts lists them.
// The puzzle is unchanged (plan.ts meaningChoices, saidBack): the meanings to choose from are the other stones'.

export interface StoneLine {
  /** The glyph stone it belongs to (plan.ts CHAMBERS[].stones[].id). */
  stone: string;
  /** What the stone says. */
  es: string;
  /** Its meaning, and word by word (units split by " | ", one per Spanish word or fixed group). */
  en: string; enGloss: string;
  lt: string; ltGloss: string;
}

export const STONE_LINES: StoneLine[] = [
  // La Sala del Agua: the water one comes up through, the ceiba under the cenote's eye, the falls
  { stone: "agua-1", es: "El agua guarda la memoria.", en: "The water keeps the memory.", enGloss: "The | water | keeps | the | memory.",
    lt: "Vanduo saugo atmintį.", ltGloss: "— | Vanduo | saugo | — | atmintį." },
  { stone: "agua-2", es: "La luz entra por el ojo del cenote.", en: "The light comes in through the cenote's eye.", enGloss: "The | light | comes in | through | the | eye | of-the | cenote.",
    lt: "Šviesa ateina pro cenotės akį.", ltGloss: "— | Šviesa | ateina | pro | — | akį | — | cenotės." },
  { stone: "agua-3", es: "La ceiba une el cielo y la tierra.", en: "The ceiba joins the sky and the earth.", enGloss: "The | ceiba | joins | the | sky | and | the | earth.",
    lt: "Ceiba jungia dangų ir žemę.", ltGloss: "— | Ceiba | jungia | — | dangų | ir | — | žemę." },
  // El Jardín de Raíces: pillars of roots, glowing mushrooms, fireflies
  { stone: "raices-1", es: "Las raíces beben en silencio.", en: "The roots drink in silence.", enGloss: "The | roots | drink | in | silence.",
    lt: "Šaknys geria tyloje.", ltGloss: "— | Šaknys | geria | — | tyloje." },
  { stone: "raices-2", es: "Sigue la luz de las luciérnagas.", en: "Follow the light of the fireflies.", enGloss: "Follow | the | light | of | the | fireflies.",
    lt: "Sek jonvabalių šviesą.", ltGloss: "Sek | — | šviesą | — | — | jonvabalių." },
  { stone: "raices-3", es: "Aquí crecen hongos de colores.", en: "Colorful mushrooms grow here.", enGloss: "Here | grow | mushrooms | of | colors.",
    lt: "Čia auga spalvoti grybai.", ltGloss: "Čia | auga | grybai | — | spalvoti." },
  // El Río Escondido: the river, Nikté's bridge of roots
  { stone: "rio-1", es: "El río conoce el camino.", en: "The river knows the way.", enGloss: "The | river | knows | the | way.",
    lt: "Upė žino kelią.", ltGloss: "— | Upė | žino | — | kelią." },
  { stone: "rio-2", es: "Escucha el agua: te habla.", en: "Listen to the water: it's talking to you.", enGloss: "Listen to | the | water: | to-you | it-talks.",
    lt: "Klausykis vandens: jis tau kalba.", ltGloss: "Klausykis | — | vandens: | tau | kalba." },
  { stone: "rio-3", es: "Cruza el puente sin miedo.", en: "Cross the bridge without fear.", enGloss: "Cross | the | bridge | without | fear.",
    lt: "Pereik tiltą be baimės.", ltGloss: "Pereik | — | tiltą | be | baimės." },
  // La Sala de las Estrellas: crystals, the wall of old glyphs, glow-worms like a night sky
  { stone: "estrellas-1", es: "Aquí las estrellas viven bajo la tierra.", en: "Here the stars live under the earth.", enGloss: "Here | the | stars | live | under | the | earth.",
    lt: "Čia žvaigždės gyvena po žeme.", ltGloss: "Čia | — | žvaigždės | gyvena | po | — | žeme." },
  { stone: "estrellas-2", es: "Los mayas leían el cielo.", en: "The Maya read the sky.", enGloss: "The | Maya | used-to-read | the | sky.",
    lt: "Majai skaitė dangų.", ltGloss: "— | Majai | skaitė | — | dangų." },
  { stone: "estrellas-3", es: "Cada piedra cuenta una historia.", en: "Every stone tells a story.", enGloss: "Each | stone | tells | a | story.",
    lt: "Kiekvienas akmuo pasakoja istoriją.", ltGloss: "Kiekvienas | akmuo | pasakoja | — | istoriją." },
  // El Corazón de Ka'an: the round lake, the island, the Yaxché that holds up the world
  { stone: "corazon-1", es: "El corazón de la gruta late despacio.", en: "The heart of the grotto beats slowly.", enGloss: "The | heart | of | the | grotto | beats | slowly.",
    lt: "Grotos širdis plaka lėtai.", ltGloss: "— | Širdis | — | — | grotos | plaka | lėtai." },
  { stone: "corazon-2", es: "Los aluxes cuidan este lugar.", en: "The aluxes look after this place.", enGloss: "The | aluxes | look-after | this | place.",
    lt: "Aluksai saugo šią vietą.", ltGloss: "— | Aluksai | saugo | šią | vietą." },
  { stone: "corazon-3", es: "El árbol sagrado sostiene el mundo.", en: "The sacred tree holds up the world.", enGloss: "The | tree | sacred | holds up | the | world.",
    lt: "Šventas medis laiko pasaulį.", ltGloss: "— | Medis | šventas | laiko | — | pasaulį." },
];

export const STONE_LINE = new Map(STONE_LINES.map((l) => [l.stone, l]));
