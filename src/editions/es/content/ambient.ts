// What passers-by in Puerto Colibrí say when you click on them (replaces src/content/ambient.ts): Spanish, with the
// English meaning.
export const AMBIENT_VOICES = { f: "es_amb_f", m: "es_amb_m" } as const;

export const AMBIENT_LINES: { en: string; lt: string }[] = [
  { en: "¡Buenas!", lt: "Hi!" },
  { en: "¡Hola! ¿Qué tal?", lt: "Hi! How's it going?" },
  { en: "¡Qué bonito día!, ¿verdad?", lt: "Lovely day, isn't it?" },
  { en: "¡Bienvenidos a Puerto Colibrí!", lt: "Welcome to Puerto Colibrí!" },
  { en: "¡Que le vaya bien!", lt: "Have a good one!" },
  { en: "Perdón, ¡tengo un poco de prisa!", lt: "Sorry, I'm in a bit of a hurry!" },
  { en: "¡Disfrute su estancia!", lt: "Enjoy your stay!" },
];

/** What staff with no conversation of their own say when talked to (roomPeople.ts `says`): none in Puerto Colibrí
 *  (Tienda El Faro's cashier has his own conversation, x05-tienda). */
export const STAFF_LINES: Record<string, { en: string; lt: string }> = {};

/** What the tianguis' vendors behind their stalls say when clicked (theme.ts `vendors`; the passers-by's lines would
 *  have them in a hurry behind a table): a welcome, and where the shopping conversation is (Doña Licha at the
 *  mercado, s32). Words every Spanish says alike: one text for the three sets. */
export const VENDOR_LINES: { en: string; lt: string }[] = [
  { en: "¡Buenas! Pase a ver, sin compromiso.", lt: "Hi! Come and have a look, no obligation." },
  { en: "Aquí ya estamos recogiendo. En el mercado, Doña Licha todavía atiende.", lt: "We're packing up here. At the market, Doña Licha is still serving." },
];
